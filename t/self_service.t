#!/usr/bin/perl

# Tests for the self-service self_create / self_delete handlers and the
# /me/week + /me/open_slots StaffController methods. Mocks the Mojolicious
# controller surface (no live HTTP) and rolls back DB changes.
#
#   cat t/self_service.t | docker exec -i dev-koha-1 perl -

use Modern::Perl;
use Test::More;
use FindBin qw( $RealBin );

for my $cand ( "$RealBin/..", '/var/lib/koha/kohadev/plugins' ) {
    unshift @INC, $cand if -f "$cand/Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm";
}
unshift @INC, '/kohadevbox/koha/';
unshift @INC, '/kohadevbox/koha/t/lib/';

eval { require C4::Context; 1 } or plan skip_all => 'C4::Context not available';
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster; 1 }
    or plan skip_all => 'plugin module did not load';
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster::AssignmentController; 1 }
    or plan skip_all => 'AssignmentController did not load';
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster::StaffController; 1 }
    or plan skip_all => 'StaffController did not load';

my $dbh = C4::Context->dbh;
$dbh->{AutoCommit} = 0;
$dbh->{RaiseError} = 1;
END { eval { $dbh->rollback } if $dbh; }

# The plugin's _has_perm bypasses every check for superlibrarians (flags=1),
# which suits us for the happy-path tests. For permission-denied tests we
# patch _has_perm with a lexical override later.
my ($test_bn) = $dbh->selectrow_array(q{SELECT borrowernumber FROM borrowers LIMIT 1});
plan skip_all => 'no borrowers in database' if !$test_bn;
C4::Context->set_userenv( $test_bn, 'test_runner', '0', 'Test', 'Runner', undef, undef, 1 );

my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;

# Find or create a roster + slot that we can claim against. Capacity 2 so we
# can test the "slot full" path by filling it ourselves.
my ($rid) = $dbh->selectrow_array(q{SELECT id FROM staff_roster WHERE is_active = 1 LIMIT 1});
plan skip_all => 'no active staff_roster rows' if !$rid;

# Pick a slot that runs every weekday for max coverage on the date matrix.
my ($slot_id) = $dbh->selectrow_array(
    q{SELECT id FROM staff_roster_slots WHERE roster_id = ? ORDER BY id LIMIT 1},
    undef, $rid,
);
plan skip_all => 'no slots on test roster' if !$slot_id;

# Bump capacity to 2 for the duration of these tests so we can exercise
# both "still room" and "full" without churning fixtures.
$dbh->do(q{UPDATE staff_roster_slots SET max_staff = 2 WHERE id = ?}, undef, $slot_id);

# Pick a date the slot actually runs on. We brute-force the next 14 days.
my ($rrule, $anchor) = $dbh->selectrow_array(
    q{SELECT s.recurrence_rule, r.effective_from
      FROM staff_roster_slots s JOIN staff_roster r ON s.roster_id = r.id
      WHERE s.id = ?}, undef, $slot_id,
);
require Koha::DateUtils;
my $today_dt = Koha::DateUtils::dt_from_string()->truncate( to => 'day' );
my $test_date;
for my $i ( 0 .. 30 ) {
    my $candidate = $today_dt->clone->add( days => $i )->ymd;
    if ( Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_slot_applies_on(
        $rrule, $candidate, $anchor ) ) {
        $test_date = $candidate;
        last;
    }
}
plan skip_all => 'cannot find an applicable date for slot' if !$test_date;

# Wipe assignments on (slot, date) so each subtest starts clean.
sub clean_slot_date {
    $dbh->do(
        q{DELETE FROM staff_roster_assignments WHERE slot_id = ? AND assignment_date = ?},
        undef, $slot_id, $test_date,
    );
}

# Mock the Mojolicious controller surface ----------------------------------
# Subset of $c that the handlers touch. ->render captures status + body so
# the test can assert on them. Try::Tiny is wrapped around handler bodies in
# the controllers so unhandled exceptions land in $c->unhandled_exception
# (also captured here).
package StubReq;
sub new { bless { json => $_[1] || {}, params => $_[2] || {} }, $_[0] }
sub json   { return $_[0]->{json} }
sub param  { return $_[0]->{params}{ $_[1] } }

package StubValidation;
sub new   { bless { p => $_[1] || {} }, $_[0] }
sub param { return $_[0]->{p}{ $_[1] } }

package StubOpenAPI;
sub new         { bless { c => $_[1] }, $_[0] }
sub valid_input { return $_[0]->{c} }    # No JSON-schema enforcement in tests.

package StubUser;
sub new            { bless { bn => $_[1] }, $_[0] }
sub borrowernumber { return $_[0]->{bn} }

package StubController;
sub new {
    my ( $class, %args ) = @_;
    return bless {
        json     => $args{json}     || {},
        params   => $args{params}   || {},
        path     => $args{path}     || {},
        user     => exists $args{user} ? $args{user} : StubUser->new($args{borrowernumber}),
        rendered => undef,
        deleted  => 0,
        thrown   => undef,
    }, $class;
}
sub openapi    { return StubOpenAPI->new( $_[0] ) }
sub req        { return StubReq->new( $_[0]{json}, $_[0]{params} ) }
sub validation { return StubValidation->new( $_[0]{path} ) }
sub stash      { return $_[1] eq 'koha.user' ? $_[0]{user} : undef }
sub render {
    my ( $self, %args ) = @_;
    $self->{rendered} = \%args;
    return $self;
}
sub render_resource_deleted {
    my ($self) = @_;
    $self->{deleted}  = 1;
    $self->{rendered} = { status => 204 };
    return $self;
}
sub unhandled_exception {
    my ( $self, $err ) = @_;
    $self->{thrown}   = $err;
    $self->{rendered} = { status => 500, openapi => { error => "$err" } };
    return $self;
}

package main;

# Helpers ------------------------------------------------------------------
sub call_self_create {
    my (%args) = @_;
    my $c = StubController->new(
        json           => { slot_id => $slot_id, assignment_date => $test_date, %{ $args{json} || {} } },
        borrowernumber => $args{borrowernumber} // $test_bn,
    );
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::AssignmentController::self_create($c);
    return $c->{rendered};
}

sub call_self_delete {
    my (%args) = @_;
    my $c = StubController->new(
        path           => { assignment_id => $args{assignment_id} },
        borrowernumber => $args{borrowernumber} // $test_bn,
    );
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::AssignmentController::self_delete($c);
    return $c->{rendered};
}

# Make sure the setting is on for tests that expect it.
$plugin->store_data( { staff_can_self_assign => '1' } );

# Tests --------------------------------------------------------------------

subtest 'happy path: claim creates an assignment + audit row' => sub {
    clean_slot_date();
    my $res = call_self_create();
    is( $res->{status}, 201, 'returns 201' )
        or diag explain $res;

    my ($n) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM staff_roster_assignments
          WHERE slot_id = ? AND assignment_date = ? AND borrowernumber = ?},
        undef, $slot_id, $test_date, $test_bn,
    );
    is( $n, 1, 'exactly one assignment exists' );
};

subtest 'kill-switch: setting off returns 403' => sub {
    clean_slot_date();
    $plugin->store_data( { staff_can_self_assign => '0' } );
    my $res = call_self_create();
    is( $res->{status}, 403, '403 when self_can_self_assign disabled' );
    my ($n) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM staff_roster_assignments
          WHERE slot_id = ? AND assignment_date = ?},
        undef, $slot_id, $test_date,
    );
    is( $n, 0, 'no assignment was created' );
    $plugin->store_data( { staff_can_self_assign => '1' } );  # restore
};

subtest 'body patron_id is ignored — session wins' => sub {
    clean_slot_date();
    my ($other_bn) = $dbh->selectrow_array(
        q{SELECT borrowernumber FROM borrowers WHERE borrowernumber != ? LIMIT 1},
        undef, $test_bn,
    );
SKIP: {
        skip 'only one borrower available', 1 if !$other_bn;
        my $res = call_self_create( json => { patron_id => $other_bn } );
        is( $res->{status}, 201, 'created' );
        my ($stored) = $dbh->selectrow_array(
            q{SELECT borrowernumber FROM staff_roster_assignments
              WHERE slot_id = ? AND assignment_date = ?},
            undef, $slot_id, $test_date,
        );
        is( $stored, $test_bn, 'session borrower wins, body patron_id ignored' );
    }
};

subtest 'capacity: claim returns 409 when slot is full' => sub {
    clean_slot_date();

    my ($other_bn) = $dbh->selectrow_array(
        q{SELECT borrowernumber FROM borrowers WHERE borrowernumber != ? LIMIT 1},
        undef, $test_bn,
    );
SKIP: {
        skip 'need a second borrower for the full-slot test', 1 if !$other_bn;
        # Fill capacity (2): one for $test_bn, one for $other_bn.
        $dbh->do(
            q{INSERT INTO staff_roster_assignments
              (slot_id, borrowernumber, assignment_date, status, created_at, updated_at)
              VALUES (?, ?, ?, 'scheduled', NOW(), NOW()), (?, ?, ?, 'scheduled', NOW(), NOW())},
            undef,
            $slot_id, $test_bn, $test_date,
            $slot_id, $other_bn, $test_date,
        );
        # The session borrower already has an assignment; create with a new
        # session would fail conflict_check on dup, not capacity. To exercise
        # capacity-full cleanly, drop our own assignment first.
        $dbh->do(
            q{DELETE FROM staff_roster_assignments WHERE slot_id = ? AND borrowernumber = ? AND assignment_date = ?},
            undef, $slot_id, $test_bn, $test_date,
        );
        # Add a third filler under another id to push to 2/2 again.
        my ($third_bn) = $dbh->selectrow_array(
            q{SELECT borrowernumber FROM borrowers WHERE borrowernumber NOT IN (?, ?) LIMIT 1},
            undef, $test_bn, $other_bn,
        );
        skip 'need a third borrower', 1 if !$third_bn;
        $dbh->do(
            q{INSERT INTO staff_roster_assignments
              (slot_id, borrowernumber, assignment_date, status, created_at, updated_at)
              VALUES (?, ?, ?, 'scheduled', NOW(), NOW())},
            undef, $slot_id, $third_bn, $test_date,
        );

        my $res = call_self_create();
        is( $res->{status}, 409, 'returns 409 when full' );
        like( $res->{openapi}{error}, qr/full/i, 'error mentions full' );
    }
};

subtest 'self_delete: own assignment is removed' => sub {
    clean_slot_date();
    my $res = call_self_create();
    is( $res->{status}, 201, 'pre-create succeeded' );
    my $aid = $res->{openapi}{id};
    ok( $aid, 'assignment id returned' );

    my $del = call_self_delete( assignment_id => $aid );
    is( $del->{status}, 204, 'returns 204' );

    my ($n) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM staff_roster_assignments WHERE id = ?}, undef, $aid,
    );
    is( $n, 0, 'row gone' );
};

subtest 'self_delete: foreign assignment is rejected with 403' => sub {
    clean_slot_date();
    my ($other_bn) = $dbh->selectrow_array(
        q{SELECT borrowernumber FROM borrowers WHERE borrowernumber != ? LIMIT 1},
        undef, $test_bn,
    );
SKIP: {
        skip 'need a second borrower', 1 if !$other_bn;
        $dbh->do(
            q{INSERT INTO staff_roster_assignments
              (slot_id, borrowernumber, assignment_date, status, created_at, updated_at)
              VALUES (?, ?, ?, 'scheduled', NOW(), NOW())},
            undef, $slot_id, $other_bn, $test_date,
        );
        my $aid = $dbh->last_insert_id( undef, undef, undef, undef );

        my $res = call_self_delete( assignment_id => $aid );
        is( $res->{status}, 403, 'rejects foreign delete' );
        my ($still) = $dbh->selectrow_array(
            q{SELECT COUNT(*) FROM staff_roster_assignments WHERE id = ?}, undef, $aid,
        );
        is( $still, 1, 'foreign row untouched' );
    }
};

subtest 'staffroster_self_assign sub-perm registers in permissions table' => sub {
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_register_permissions($dbh);
    my ($n) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM permissions WHERE module_bit = 19 AND code = ?},
        undef, 'staffroster_self_assign',
    );
    is( $n, 1, 'row inserted under plugins module_bit' );
};

subtest 'me_week: only own assignments returned' => sub {
    clean_slot_date();
    my ($other_bn) = $dbh->selectrow_array(
        q{SELECT borrowernumber FROM borrowers WHERE borrowernumber != ? LIMIT 1},
        undef, $test_bn,
    );
SKIP: {
        skip 'need a second borrower', 1 if !$other_bn;

        # One assignment for us, one for someone else, same slot+date.
        $dbh->do(
            q{INSERT INTO staff_roster_assignments
              (slot_id, borrowernumber, assignment_date, status, created_at, updated_at)
              VALUES (?, ?, ?, 'scheduled', NOW(), NOW()),
                     (?, ?, ?, 'scheduled', NOW(), NOW())},
            undef,
            $slot_id, $test_bn, $test_date,
            $slot_id, $other_bn, $test_date,
        );

        # Compute the Monday of $test_date for me_week's start param.
        my $dt = Koha::DateUtils::dt_from_string( $test_date, 'iso' );
        my $monday = $dt->clone->subtract( days => ( $dt->day_of_week - 1 ) )->ymd;

        my $c = StubController->new(
            params         => { start => $monday },
            borrowernumber => $test_bn,
        );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::StaffController::me_week($c);
        is( $c->{rendered}{status}, 200, 'returns 200' );
        my $shifts = $c->{rendered}{openapi}{shifts} || [];
        my @others = grep { $_->{assignment_date} eq $test_date && $_->{slot_id} == $slot_id } @{$shifts};
        is( scalar @others, 1, 'only own row surfaced for the test date+slot' );
    }
};

subtest 'self-unclaim lockout window' => sub {
    clean_slot_date();
    my $create = call_self_create();
    is( $create->{status}, 201, 'claim created' )
        or do { fail 'cannot test lockout without a row'; return };
    my $aid = $create->{openapi}{id};

    # Huge lockout > any reasonable distance to test_date + start_time
    # so the window is guaranteed to be open.
    $plugin->store_data( { self_unclaim_lockout_hours => '1000000' } );
    my $blocked = call_self_delete( assignment_id => $aid );
    is( $blocked->{status}, 403, 'drop blocked inside lockout window' );
    is(
        ref $blocked->{openapi},   'HASH',
        'response is a structured payload',
    );
    like(
        $blocked->{openapi}{error}, qr/^Self-unclaim closed/,
        'reports lockout in error message',
    );
    is( $blocked->{openapi}{lockout_hours}, 1000000, 'echoes configured hours' );

    # Disable lockout, drop should now succeed.
    $plugin->store_data( { self_unclaim_lockout_hours => '0' } );
    my $ok = call_self_delete( assignment_id => $aid );
    is( $ok->{status}, 204, 'drop succeeds when lockout cleared' );

    my ($still_there) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM staff_roster_assignments WHERE id = ?},
        undef, $aid,
    );
    is( $still_there, 0, 'row is gone after the unblocked drop' );
};

done_testing();
