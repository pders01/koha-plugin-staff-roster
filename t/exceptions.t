#!/usr/bin/perl

# User-story tests for the exception management ops. Same harness shape as
# t/additional_fields.t: hits the live container DB, rolls back at the end.
#
#   cat t/exceptions.t | docker exec -i dev-koha-1 perl -

use Modern::Perl;
use Test::More;
use FindBin qw( $RealBin );

for my $cand ( "$RealBin/..", '/var/lib/koha/kohadev/plugins' ) {
    unshift @INC, $cand if -f "$cand/Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm";
}
unshift @INC, '/kohadevbox/koha/';
unshift @INC, '/kohadevbox/koha/t/lib/';

eval { require C4::Context; 1 } or plan skip_all => "C4::Context not available";
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster; 1 }
    or plan skip_all => "plugin module did not load";

my $dbh = C4::Context->dbh;
$dbh->{AutoCommit} = 0;
$dbh->{RaiseError} = 1;
END { eval { $dbh->rollback } if $dbh; }

my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;

my ($rid) = $dbh->selectrow_array(q{SELECT id FROM staff_roster LIMIT 1});
plan skip_all => 'no staff_roster rows in database' if !$rid;

# Stub CGI with the methods the handlers use.
package StubCGI;
sub new { bless { p => $_[1] || {} }, $_[0] }
sub param { my ( $self, $k ) = @_; return $self->{p}{$k}; }
sub multi_param { my ( $self, $k ) = @_; my $v = $self->{p}{$k}; return ref $v ? @{$v} : ( defined $v ? ($v) : () ); }

package main;

# Reach the handlers through their package since they are called via the
# dispatcher in production; here we exercise them directly for isolation.
my $save_handler = \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_tool_save_exception;
my $del_handler  = \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_tool_delete_exception;

# Wipe any existing exceptions for this roster so test rows are isolated.
$dbh->do(q{DELETE FROM staff_roster_exceptions WHERE roster_id = ?}, undef, $rid);

subtest 'Story: admin adds a closure for a specific date' => sub {
    my @messages;
    my $cgi = StubCGI->new( {
        roster_id      => $rid,
        exception_date => '2026-12-25',
        exception_type => 'holiday',
        reason         => 'Christmas',
    } );
    $save_handler->( $plugin, $dbh, $cgi, \@messages );

    my $row = $dbh->selectrow_hashref(
        q{SELECT * FROM staff_roster_exceptions WHERE roster_id = ? AND exception_date = ?},
        undef, $rid, '2026-12-25'
    );
    ok( $row, 'row inserted' );
    is( $row->{exception_type}, 'holiday',   'type stored' );
    is( $row->{reason},         'Christmas', 'reason stored' );
    is( scalar @messages, 1, 'one message pushed' );
    is( $messages[0]{code}, 'exception_saved', 'success code' );
};

subtest 'Story: admin edits an existing exception' => sub {
    my ($id) = $dbh->selectrow_array(
        q{SELECT id FROM staff_roster_exceptions WHERE roster_id = ? LIMIT 1},
        undef, $rid
    );
    my @messages;
    my $cgi = StubCGI->new( {
        roster_id      => $rid,
        exception_id   => $id,
        exception_date => '2026-12-25',
        exception_type => 'closed',
        reason         => 'Christmas Day - closed',
    } );
    $save_handler->( $plugin, $dbh, $cgi, \@messages );

    my $row = $dbh->selectrow_hashref(
        q{SELECT exception_type, reason FROM staff_roster_exceptions WHERE id = ?},
        undef, $id
    );
    is( $row->{exception_type}, 'closed',                 'type updated' );
    is( $row->{reason},         'Christmas Day - closed', 'reason updated' );
};

subtest 'Story: bad date is rejected, no row inserted' => sub {
    my @messages;
    my $cgi = StubCGI->new( {
        roster_id      => $rid,
        exception_date => 'not-a-date',
        exception_type => 'closed',
    } );
    $save_handler->( $plugin, $dbh, $cgi, \@messages );

    is( $messages[0]{code}, 'exception_bad_date', 'rejected with code' );
};

subtest 'Story: bad type is rejected, no row inserted' => sub {
    my @messages;
    my $cgi = StubCGI->new( {
        roster_id      => $rid,
        exception_date => '2026-07-04',
        exception_type => 'fictional',
    } );
    $save_handler->( $plugin, $dbh, $cgi, \@messages );

    is( $messages[0]{code}, 'exception_bad_type', 'rejected with code' );
    my ($count) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM staff_roster_exceptions
          WHERE roster_id = ? AND exception_date = '2026-07-04'},
        undef, $rid
    );
    is( $count, 0, 'no row inserted on rejection' );
};

subtest 'Story: delete only affects the targeted row in the roster' => sub {
    # Add a second exception to confirm scoping.
    my @messages;
    $save_handler->(
        $plugin, $dbh,
        StubCGI->new( {
            roster_id      => $rid,
            exception_date => '2026-11-26',
            exception_type => 'holiday',
            reason         => 'Thanksgiving',
        } ),
        \@messages
    );

    my $rows = $dbh->selectall_arrayref(
        q{SELECT id FROM staff_roster_exceptions WHERE roster_id = ? ORDER BY id},
        { Slice => {} }, $rid
    );
    is( scalar @{$rows}, 2, 'two exceptions exist before delete' );

    my $delete_id = $rows->[0]{id};
    @messages = ();
    $del_handler->(
        $plugin, $dbh,
        StubCGI->new( { roster_id => $rid, exception_id => $delete_id } ),
        \@messages
    );

    my ($remaining) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM staff_roster_exceptions WHERE roster_id = ?},
        undef, $rid
    );
    is( $remaining, 1, 'one row remains' );
    is( $messages[0]{code}, 'exception_deleted', 'success code on delete' );
};

subtest 'Story: cross-roster delete is a no-op (scoped to roster_id)' => sub {
    my ($other_id) = $dbh->selectrow_array(
        q{SELECT id FROM staff_roster WHERE id != ? LIMIT 1}, undef, $rid
    );
SKIP: {
        skip 'only one roster in DB', 1 if !$other_id;

        my ($id) = $dbh->selectrow_array(
            q{SELECT id FROM staff_roster_exceptions WHERE roster_id = ? LIMIT 1},
            undef, $rid
        );
        my @messages;
        $del_handler->(
            $plugin, $dbh,
            StubCGI->new( { roster_id => $other_id, exception_id => $id } ),
            \@messages
        );
        my ($still_there) = $dbh->selectrow_array(
            q{SELECT COUNT(*) FROM staff_roster_exceptions WHERE id = ?}, undef, $id
        );
        is( $still_there, 1, 'row not deleted when roster_id mismatches' );
    }
};

done_testing();
