#!/usr/bin/perl

# Regression tests for the swap request ownership invariant. The dropdown is
# server-filtered to the current borrower's own assignments; this verifies
# that even a forged from_assignment_id post cannot surrender someone else's
# shift.
#
#   cat t/swap_ownership.t | docker exec -i dev-koha-1 perl -

use Modern::Perl;
use Test::More;
use FindBin qw( $RealBin );

for my $cand ( "$RealBin/..", '/var/lib/koha/kohadev/plugins' ) {
    unshift @INC, $cand if -f "$cand/Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm";
}
unshift @INC, '/kohadevbox/koha/';
unshift @INC, '/kohadevbox/koha/t/lib/';

eval { require C4::Context;                                   1 } or plan skip_all => 'C4::Context not available';
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster; 1 }
    or plan skip_all => 'plugin module did not load';

my $dbh = C4::Context->dbh;
$dbh->{AutoCommit} = 0;
$dbh->{RaiseError} = 1;

END {
    eval { $dbh->rollback } if $dbh;
}

my ($self_bn) = $dbh->selectrow_array(q{SELECT borrowernumber FROM borrowers LIMIT 1});
my ($other_bn)
    = $dbh->selectrow_array( q{SELECT borrowernumber FROM borrowers WHERE borrowernumber != ? LIMIT 1}, undef, $self_bn, );
plan skip_all => 'need two borrowers in database' if !$self_bn || !$other_bn;

C4::Context->set_userenv( $self_bn, 'test_runner', '0', 'Test', 'Runner', undef, undef, 1 );

my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;

my ( $rid, $slot_id ) = $dbh->selectrow_array(
    q{SELECT r.id, s.id FROM staff_roster r
        JOIN staff_roster_slots s ON s.roster_id = r.id
       WHERE r.is_active = 1 LIMIT 1},
);
plan skip_all => 'no active roster + slot in database' if !$rid || !$slot_id;

my ( $rrule, $anchor ) = $dbh->selectrow_array(
    q{SELECT s.recurrence_rule, r.effective_from
        FROM staff_roster_slots s JOIN staff_roster r ON s.roster_id = r.id
       WHERE s.id = ?}, undef, $slot_id,
);
require Koha::DateUtils;
my $today_dt = Koha::DateUtils::dt_from_string()->truncate( to => 'day' );
my $test_date;
for my $i ( 1 .. 30 ) {
    my $candidate = $today_dt->clone->add( days => $i )->ymd;
    if ( Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule::slot_applies_on( $rrule, $candidate, $anchor ) ) {
        $test_date = $candidate;
        last;
    }
}
plan skip_all => 'cannot find an applicable date for slot' if !$test_date;

# Insert an assignment owned by the OTHER borrower. The current session is
# $self_bn, so requesting a swap with this from_assignment_id should be rejected.
$dbh->do(
    q{INSERT INTO staff_roster_assignments
      (slot_id, borrowernumber, assignment_date, status, created_at, updated_at)
      VALUES (?, ?, ?, 'scheduled', NOW(), NOW())},
    undef, $slot_id, $other_bn, $test_date,
);
my $foreign_aid = $dbh->last_insert_id( undef, undef, undef, undef );

# Stub CGI matching the existing test pattern.
package StubCGI;
sub new   { bless { p => $_[1] || {} }, $_[0] }
sub param { my ( $s, $k ) = @_; return $s->{p}{$k}; }

sub multi_param {
    my ( $s, $k ) = @_;
    my $v = $s->{p}{$k};
    return ref $v ? @{$v} : ( defined $v ? ($v) : () );
}

package main;

subtest 'forged from_assignment_id is rejected with swap_not_your_shift' => sub {
    my @messages;
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_tool_request_swap(
        $plugin, $dbh,
        StubCGI->new(
            {   roster_id          => $rid,
                from_assignment_id => $foreign_aid,
                to_borrowernumber  => $other_bn,
            }
        ),
        \@messages,
    );
    ok( ( grep { $_->{code} eq 'swap_not_your_shift' } @messages ), 'rejected with swap_not_your_shift' );

    my ($n) = $dbh->selectrow_array( q{SELECT COUNT(*) FROM staff_roster_swap_requests WHERE from_assignment_id = ?},
        undef, $foreign_aid, );
    is( $n, 0, 'no swap_request inserted' );
};

done_testing();
