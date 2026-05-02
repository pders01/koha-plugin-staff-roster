#!/usr/bin/perl

# Hot-path tests for the swap-response handler. The approve path mutates two
# assignments + the swap row inside a _txn with SELECT ... FOR UPDATE; this
# verifies the borrower-swap actually happens, the TOCTOU re-check fires when
# a concurrent approve has already moved the swap out of pending, and the
# reject path leaves assignments untouched.
#
#   cat t/swap_respond.t | docker exec -i dev-koha-1 perl -

use Modern::Perl;
use Test::More;
use FindBin qw( $RealBin );

for my $cand ( "$RealBin/..", '/var/lib/koha/kohadev/plugins' ) {
    unshift @INC, $cand if -f "$cand/Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm";
}
unshift @INC, '/kohadevbox/koha/';
unshift @INC, '/kohadevbox/koha/t/lib/';
use lib "$RealBin/lib";

eval { require C4::Context;                                   1 } or plan skip_all => 'C4::Context not available';
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster; 1 }
    or plan skip_all => 'plugin module did not load';
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps; 1 }
    or plan skip_all => 'Tool::Swaps did not load';

require StaffRosterFixture;
StaffRosterFixture->import(qw( ensure_roster ));

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

# flags=1 makes the current session a superlibrarian so the swap_approve
# permission check passes without seeding user_permissions rows.
C4::Context->set_userenv( $self_bn, 'test_runner', '0', 'Test', 'Runner', undef, undef, 1 );

my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
$plugin->store_data( { require_swap_approval => '1' } );

# Bootstrap a fresh roster with two distinct weekday slots so the
# mutual swap has somewhere to move borrowers between.
my ( $rid, $slot_a_id, $slot_b_id ) = ensure_roster();
my $slot_rows = $dbh->selectall_arrayref(
    q{SELECT id, recurrence_rule, start_time, end_time FROM staff_roster_slots
       WHERE id IN (?, ?) ORDER BY id}, { Slice => {} }, $slot_a_id, $slot_b_id,
);
my ( $slot_a, $slot_b ) = @{$slot_rows};

my ($anchor) = $dbh->selectrow_array( q{SELECT effective_from FROM staff_roster WHERE id = ?}, undef, $rid );
require Koha::DateUtils;
my $today_dt = Koha::DateUtils::dt_from_string()->truncate( to => 'day' );
my $test_date;
for my $i ( 1 .. 60 ) {
    my $cand = $today_dt->clone->add( days => $i )->ymd;
    if (   Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule::slot_applies_on( $slot_a->{recurrence_rule}, $cand, $anchor )
        && Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule::slot_applies_on( $slot_b->{recurrence_rule}, $cand, $anchor ) )
    {
        $test_date = $cand;
        last;
    }
}
plan skip_all => 'no date applies on both slots inside the next 60 days' if !$test_date;

sub _seed_assignments {
    $dbh->do( q{DELETE FROM staff_roster_swap_requests
                WHERE from_assignment_id IN (
                    SELECT id FROM staff_roster_assignments
                     WHERE slot_id IN (?, ?) AND assignment_date = ?
                )}, undef, $slot_a->{id}, $slot_b->{id}, $test_date );
    $dbh->do( q{DELETE FROM staff_roster_assignments
                WHERE slot_id IN (?, ?) AND assignment_date = ?},
        undef, $slot_a->{id}, $slot_b->{id}, $test_date );

    $dbh->do(
        q{INSERT INTO staff_roster_assignments (slot_id, borrowernumber, assignment_date, status, created_at, updated_at)
          VALUES (?, ?, ?, 'scheduled', NOW(), NOW())},
        undef, $slot_a->{id}, $self_bn, $test_date,
    );
    my $aid_a = $dbh->last_insert_id( undef, undef, undef, undef );

    $dbh->do(
        q{INSERT INTO staff_roster_assignments (slot_id, borrowernumber, assignment_date, status, created_at, updated_at)
          VALUES (?, ?, ?, 'scheduled', NOW(), NOW())},
        undef, $slot_b->{id}, $other_bn, $test_date,
    );
    my $aid_b = $dbh->last_insert_id( undef, undef, undef, undef );
    return ( $aid_a, $aid_b );
}

sub _seed_swap {
    my ( $from_aid, $to_aid ) = @_;
    $dbh->do(
        q{INSERT INTO staff_roster_swap_requests
          (from_assignment_id, to_borrowernumber, to_assignment_id, status, requested_at, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', NOW(), NOW(), NOW())},
        undef, $from_aid, $other_bn, $to_aid,
    );
    return $dbh->last_insert_id( undef, undef, undef, undef );
}

package StubCGI;
sub new   { bless { p => $_[1] || {} }, $_[0] }
sub param { my ( $s, $k ) = @_; return $s->{p}{$k}; }

sub multi_param {
    my ( $s, $k ) = @_;
    my $v = $s->{p}{$k};
    return ref $v ? @{$v} : ( defined $v ? ($v) : () );
}

package main;

subtest 'mutual approve swaps the two borrowers and stamps approved' => sub {
    my ( $aid_a, $aid_b ) = _seed_assignments();
    my $swap_id = _seed_swap( $aid_a, $aid_b );

    my @messages;
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps::respond_swap(
        $plugin, $dbh,
        StubCGI->new( { swap_id => $swap_id, decision => 'approve' } ),
        \@messages,
    );
    ok( ( grep { $_->{code} eq 'swap_approved' } @messages ), 'reports swap_approved' )
        or diag explain \@messages;

    my ($a_now) = $dbh->selectrow_array( q{SELECT borrowernumber FROM staff_roster_assignments WHERE id = ?}, undef, $aid_a );
    my ($b_now) = $dbh->selectrow_array( q{SELECT borrowernumber FROM staff_roster_assignments WHERE id = ?}, undef, $aid_b );
    is( $a_now, $other_bn, 'from_assignment now owned by target' );
    is( $b_now, $self_bn,  'to_assignment now owned by requester' );

    my ($status) = $dbh->selectrow_array( q{SELECT status FROM staff_roster_swap_requests WHERE id = ?}, undef, $swap_id );
    is( $status, 'approved', 'swap row stamped approved' );
};

subtest 'second approve loses the FOR UPDATE race -> swap_not_pending' => sub {
    my ( $aid_a, $aid_b ) = _seed_assignments();
    my $swap_id = _seed_swap( $aid_a, $aid_b );

    # Simulate a concurrent approver having already moved the swap.
    $dbh->do( q{UPDATE staff_roster_swap_requests SET status = 'approved' WHERE id = ?}, undef, $swap_id );

    my @messages;
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps::respond_swap(
        $plugin, $dbh,
        StubCGI->new( { swap_id => $swap_id, decision => 'approve' } ),
        \@messages,
    );
    ok( ( grep { $_->{code} eq 'swap_not_pending' } @messages ), 'rejected with swap_not_pending' )
        or diag explain \@messages;

    # Pre-state assignments should not move on the second pass.
    my ($a_now) = $dbh->selectrow_array( q{SELECT borrowernumber FROM staff_roster_assignments WHERE id = ?}, undef, $aid_a );
    my ($b_now) = $dbh->selectrow_array( q{SELECT borrowernumber FROM staff_roster_assignments WHERE id = ?}, undef, $aid_b );
    is( $a_now, $self_bn,  'from_assignment unchanged' );
    is( $b_now, $other_bn, 'to_assignment unchanged' );
};

subtest 'reject leaves both assignments untouched' => sub {
    my ( $aid_a, $aid_b ) = _seed_assignments();
    my $swap_id = _seed_swap( $aid_a, $aid_b );

    my @messages;
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps::respond_swap(
        $plugin, $dbh,
        StubCGI->new( { swap_id => $swap_id, decision => 'reject' } ),
        \@messages,
    );
    ok( ( grep { $_->{code} eq 'swap_rejected' } @messages ), 'reports swap_rejected' )
        or diag explain \@messages;

    my ($a_now) = $dbh->selectrow_array( q{SELECT borrowernumber FROM staff_roster_assignments WHERE id = ?}, undef, $aid_a );
    my ($b_now) = $dbh->selectrow_array( q{SELECT borrowernumber FROM staff_roster_assignments WHERE id = ?}, undef, $aid_b );
    is( $a_now, $self_bn,  'from_assignment owner unchanged on reject' );
    is( $b_now, $other_bn, 'to_assignment owner unchanged on reject' );

    my ($status) = $dbh->selectrow_array( q{SELECT status FROM staff_roster_swap_requests WHERE id = ?}, undef, $swap_id );
    is( $status, 'rejected', 'swap row stamped rejected' );
};

done_testing();
