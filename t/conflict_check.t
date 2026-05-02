#!/usr/bin/perl

# Coverage for AssignmentController::_conflict_check — capacity gate +
# per-borrower overlap check + RRule applies-on-date check + the
# $exclude_id branch used by the update path.
#
#   cat t/conflict_check.t | docker exec -i dev-koha-1 perl -

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
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster::AssignmentController; 1 }
    or plan skip_all => 'AssignmentController did not load';

require StaffRosterFixture;
StaffRosterFixture->import(qw( ensure_roster ));

my $dbh = C4::Context->dbh;
$dbh->{AutoCommit} = 0;
$dbh->{RaiseError} = 1;

END {
    eval { $dbh->rollback } if $dbh;
}

my $cc = \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::AssignmentController::_conflict_check;

my ( $rid, $slot_id ) = ensure_roster();

# Capacity 2 lets us exercise "room remains" and "slot full" against the
# same slot without per-test fixture churn.
$dbh->do( q{UPDATE staff_roster_slots SET max_staff = 2 WHERE id = ?}, undef, $slot_id );

my ( $rrule, $anchor ) = $dbh->selectrow_array(
    q{SELECT s.recurrence_rule, r.effective_from
      FROM staff_roster_slots s JOIN staff_roster r ON s.roster_id = r.id
      WHERE s.id = ?}, undef, $slot_id,
);
require Koha::DateUtils;
my $today_dt = Koha::DateUtils::dt_from_string()->truncate( to => 'day' );
my ( $applies_date, $skips_date );
for my $i ( 0 .. 30 ) {
    my $cand = $today_dt->clone->add( days => $i )->ymd;
    my $hits = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule::slot_applies_on( $rrule, $cand, $anchor );
    $applies_date //= $cand if $hits;
    $skips_date   //= $cand if !$hits;
    last if $applies_date && $skips_date;
}
plan skip_all => 'cannot find an applicable date for slot' if !$applies_date;

my ( $bn_a, $bn_b, $bn_c )
    = $dbh->selectall_arrayref( q{SELECT borrowernumber FROM borrowers ORDER BY borrowernumber LIMIT 3}, );
plan skip_all => 'need at least three borrowers' if !$bn_a || @{$bn_a} < 3;
( $bn_a, $bn_b, $bn_c ) = map { $_->[0] } @{$bn_a}[ 0, 1, 2 ];

sub clean {
    $dbh->do( q{DELETE FROM staff_roster_assignments WHERE slot_id = ? AND assignment_date = ?},
        undef, $slot_id, $applies_date );
}

sub seat {
    my ($bn) = @_;
    $dbh->do(
        q{INSERT INTO staff_roster_assignments
            (slot_id, borrowernumber, assignment_date, status, created_at, updated_at)
          VALUES (?, ?, ?, 'scheduled', NOW(), NOW())},
        undef, $slot_id, $bn, $applies_date,
    );
    return $dbh->last_insert_id( undef, undef, undef, undef );
}

subtest 'empty slot accepts new borrower' => sub {
    clean();
    is( $cc->( $dbh, $slot_id, $bn_a, $applies_date ), undef, 'no conflict' );
};

subtest 'capacity remaining: second distinct borrower passes' => sub {
    clean();
    seat($bn_a);
    is( $cc->( $dbh, $slot_id, $bn_b, $applies_date ), undef, 'second seat OK' );
};

subtest 'slot full: third borrower rejected' => sub {
    clean();
    seat($bn_a);
    seat($bn_b);
    my $r = $cc->( $dbh, $slot_id, $bn_c, $applies_date );
    like( $r->{error}, qr/Slot full \(2\/2\)/, 'reports full with N/M shape in error string' );
    is( $r->{template}, 'Slot full ({filled}/{max})', 'template emitted for client localization' );
    is( $r->{template_args}{filled}, 2, 'filled arg' );
    is( $r->{template_args}{max},    2, 'max arg' );
};

subtest 'overlap: same borrower already assigned to this slot/date' => sub {
    clean();
    seat($bn_a);
    is_deeply( $cc->( $dbh, $slot_id, $bn_a, $applies_date ),
        { error => 'Staff already assigned to overlapping slot that day' },
        'self-overlap caught (slot overlaps with itself in the time check)'
    );
};

subtest 'exclude_id lets the update path skip its own row' => sub {
    clean();
    my $own_id = seat($bn_a);
    is( $cc->( $dbh, $slot_id, $bn_a, $applies_date, $own_id ), undef,
        'no conflict when excluding the borrower\'s own row' );
};

subtest 'exclude_id still counts other rows toward capacity' => sub {
    clean();
    seat($bn_a);
    seat($bn_b);
    my $own_id = seat($bn_c);    # would be over capacity, but exclude removes it
                                 # Wait — seat() above already inserted a 3rd. Recount: capacity=2, 3 rows.
                                 # Excluding own_id leaves 2 rows → still full when checking a 4th.
    my $r = $cc->( $dbh, $slot_id, $bn_c, $applies_date, $own_id );
    like( $r->{error}, qr/Slot full/, 'exclude removes own row but the other two still fill it' );
};

subtest 'slot not found' => sub {
    is_deeply( $cc->( $dbh, 999_999_999, $bn_a, $applies_date ),
        { error => 'Slot not found' }, 'returns canonical not-found envelope' );
};

SKIP: {
    skip 'no skipped date in window (slot runs every day)', 1 if !$skips_date;
    subtest 'date does not apply per the recurrence rule' => sub {
        clean();
        is_deeply( $cc->( $dbh, $slot_id, $bn_a, $skips_date ),
            { error => 'Slot does not run on that day' },
            'RRule guard rejects off-day claims'
        );
    };
}

done_testing();
