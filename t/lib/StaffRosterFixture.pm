package StaffRosterFixture;

# Test-only helpers that bring a fresh kohadev (or any container that
# only ships the Koha core schema) up to the minimum the plugin's
# prove suite needs: the staff_roster_* tables created, one active
# roster row, and a couple of weekday slots underneath it.
#
# Idempotent on the schema side (Lib::Schema::install runs
# CREATE TABLE IF NOT EXISTS / INSERT IGNORE) but always inserts a
# fresh roster + slots so each test sees its own row(s). Because
# every prove file in this repo flips $dbh->{AutoCommit} = 0 and
# rolls back in END, the inserts here vanish at end-of-test — so
# parallel runs and back-to-back invocations stay isolated.
#
# Usage:
#
#     use lib "$RealBin/lib";
#     use StaffRosterFixture qw( ensure_schema ensure_roster );
#
#     ensure_schema();                          # idempotent install
#     my ($rid, @slot_ids) = ensure_roster();   # fresh roster + 2 slots

use Modern::Perl;

use Exporter qw( import );

use C4::Context;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Schema;

our @EXPORT_OK = qw( ensure_schema ensure_roster );

=head2 ensure_schema()

Idempotent C<install()> against the current C4::Context dbh. Safe to
call once per test file — re-runs are no-ops because every DDL
statement uses C<IF NOT EXISTS> and the seed inserts use
C<INSERT IGNORE>.

=cut

sub ensure_schema {
    my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Schema::install($plugin);
    return;
}

=head2 ensure_roster(%opts)

Insert one active C<staff_roster> row plus two weekday slots
(09:00–12:00 and 13:00–17:00, FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR).
Returns C<($roster_id, @slot_ids)>.

Options:
  branch_id   - branchcode to attach the roster to (default: first
                branchcode found in C<branches>).
  type_code   - roster type code (default: first row from
                C<staff_roster_types>; the schema seed always puts
                CIRC there).

The fixture is committed to the connection only — every test file
opens with C<$dbh-E<gt>{AutoCommit} = 0> and rolls back in END, so
the row disappears at process exit.

=cut

sub ensure_roster {
    my (%opts) = @_;
    my $dbh = C4::Context->dbh;

    ensure_schema();

    my $type_id;
    if ( $opts{type_code} ) {
        ($type_id) = $dbh->selectrow_array(
            q{SELECT id FROM staff_roster_types WHERE code = ?},
            undef, $opts{type_code}
        );
    }
    if ( !$type_id ) {
        ($type_id) = $dbh->selectrow_array(q{SELECT id FROM staff_roster_types ORDER BY id LIMIT 1});
    }
    die "no staff_roster_types row available; install seed missing\n" if !$type_id;

    my $branch_id = $opts{branch_id};
    if ( !$branch_id ) {
        ($branch_id) = $dbh->selectrow_array(q{SELECT branchcode FROM branches ORDER BY branchcode LIMIT 1});
    }
    die "no branches row available; cannot anchor a fixture roster\n" if !$branch_id;

    $dbh->do(
        q{INSERT INTO staff_roster
            (roster_type_id, branch_id, name, effective_from, is_active, created_at, updated_at)
          VALUES (?, ?, ?, CURDATE(), 1, NOW(), NOW())},
        undef, $type_id, $branch_id, 'Test Fixture Roster',
    );
    my $roster_id = $dbh->last_insert_id( undef, undef, 'staff_roster', undef );

    my @slot_ids;
    for my $window ( [ '09:00:00', '12:00:00' ], [ '13:00:00', '17:00:00' ] ) {
        $dbh->do(
            q{INSERT INTO staff_roster_slots
                (roster_id, recurrence_rule, start_time, end_time,
                 min_staff, max_staff, created_at, updated_at)
              VALUES (?, 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', ?, ?, 1, 1, NOW(), NOW())},
            undef, $roster_id, $window->[0], $window->[1],
        );
        push @slot_ids, $dbh->last_insert_id( undef, undef, 'staff_roster_slots', undef );
    }

    return ( $roster_id, @slot_ids );
}

1;
