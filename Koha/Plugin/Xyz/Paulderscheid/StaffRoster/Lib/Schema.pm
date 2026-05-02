package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Schema;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Schema -
Install/upgrade/uninstall lifecycle for the plugin's tables, with a
numbered migration registry.

=head1 DESCRIPTION

Owns the six C<staff_roster_*> tables, the seed roster types, the
notice-template seed (C<letter> rows for the nightly reminder), and
the per-version DDL migrations applied by C<install()> + C<upgrade()>.

A single ordered C<@MIGRATIONS> list keys each step by C<version> and
runs through C<apply_migrations($plugin, $dbh)> against the stored
C<__SCHEMA_VERSION__> plugin_data row. Every migration must be
idempotent so a re-run on the same version is a no-op (the gate is
strict-greater-than, but defensive idempotency keeps the door open
for repair runs).

C<install()> and C<upgrade()> share the same code path: walk the
registry, apply anything newer than the recorded schema version,
re-register permissions + notice templates (both are idempotent),
and stamp the new version. C<uninstall()> drops the tables in
FK-dependency reverse order, removes permissions, and clears the
plugin's letter rows.

=cut

use Modern::Perl;

use Exporter qw(import);

use C4::Context;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;

our @EXPORT_OK = qw( install upgrade uninstall );

# Notice template seed for the nightly reminder. INSERT IGNORE keeps any
# admin-edited copy in the letter table intact across upgrades while still
# seeding fresh installs. Token syntax matches Koha core's <<...>> markers
# resolved by C4::Letters::_substitute_tables / GetPreparedLetter.
my %NOTICE_TEMPLATES = (
    REMINDER => {
        title   => 'Reminder: roster shift on <<assignment_date>>',
        content => <<'HTML',
Hi <<patron_firstname>>,

Reminder of your upcoming roster shift:

  Roster:   <<roster_name>>
  Date:     <<assignment_date>>
  Time:     <<start_time>> - <<end_time>>
  Location: <<location>>

Thanks.
HTML
    },
);

# Ordered migration registry. Each entry runs once when the recorded
# __SCHEMA_VERSION__ is strictly less than `version`. Append new
# migrations at the bottom; never reorder, never edit a shipped one.
# Cmp uses Perl string-sort on dotted versions — every component must
# stay zero-padded if you skip past 9 (e.g. '0.0.10' sorts before
# '0.0.2' otherwise), so prefer monotonic suffixes within a major.
my @MIGRATIONS = (
    {   version => '0.0.1',
        up      => \&_migrate_initial_schema,
    },
);

sub _version_lt {
    my ( $a, $b ) = @_;
    my @a = split /\./smx, $a;
    my @b = split /\./smx, $b;
    for my $i ( 0 .. ( $#a > $#b ? $#a : $#b ) ) {
        my $av = $a[$i] // 0;
        my $bv = $b[$i] // 0;
        return 1  if $av < $bv;
        return 0  if $av > $bv;
    }
    return 0;
}

sub _apply_migrations {
    my ( $plugin, $dbh ) = @_;
    my $current = $plugin->retrieve_data('__SCHEMA_VERSION__') // '0.0.0';
    for my $m (@MIGRATIONS) {
        next if !_version_lt( $current, $m->{version} );
        $m->{up}->($dbh);
        $plugin->store_data( { __SCHEMA_VERSION__ => $m->{version} } );
        $current = $m->{version};
    }
    return;
}

=head2 install($plugin)

Apply every migration, register permissions + notice templates, and
stamp C<__INSTALLED_VERSION__>. Returns 1.

=cut

sub install {
    my ($plugin) = @_;
    my $dbh = C4::Context->dbh;
    _apply_migrations( $plugin, $dbh );
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::register($dbh);
    _register_notice_templates($dbh);
    $plugin->store_data( { __INSTALLED_VERSION__ => $plugin->get_metadata->{version} } );
    return 1;
}

=head2 upgrade($plugin)

Apply any migrations the installed version hasn't seen, re-register
permissions + notice templates so description tweaks land, and stamp
the new C<__INSTALLED_VERSION__>.

=cut

sub upgrade {
    my ($plugin) = @_;
    my $dbh = C4::Context->dbh;
    _apply_migrations( $plugin, $dbh );
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::register($dbh);
    _register_notice_templates($dbh);
    $plugin->store_data( { __INSTALLED_VERSION__ => $plugin->get_metadata->{version} } );
    return 1;
}

=head2 uninstall($plugin)

Drop tables in FK-dependency reverse order and unregister permissions.
Letter rows are intentionally preserved so an admin's edits to the
REMINDER notice survive uninstall/reinstall cycles. The
C<_register_notice_templates> seeder uses C<INSERT IGNORE> on the
re-install path, so leaving rows behind is consistent with the install
contract. To wipe them explicitly, run:

  DELETE FROM letter WHERE module = 'STAFFROSTER';

Returns 1.

=cut

sub uninstall {
    my ($plugin) = @_;
    my $dbh = C4::Context->dbh;

    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_swap_requests });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_exceptions });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_assignments });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_slots });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_types });

    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::unregister($dbh);
    return 1;
}

sub _register_notice_templates {
    my ($dbh) = @_;
    for my $code ( sort keys %NOTICE_TEMPLATES ) {
        my $tpl = $NOTICE_TEMPLATES{$code};
        $dbh->do(
            q{INSERT IGNORE INTO letter
                (module, code, branchcode, name, is_html, title, content,
                 message_transport_type, lang)
              VALUES ('STAFFROSTER', ?, '', ?, 0, ?, ?, 'email', 'default')},
            undef, $code, "Staff Roster: $code", $tpl->{title}, $tpl->{content},
        );
    }
    return;
}

sub _migrate_initial_schema {
    my ($dbh) = @_;

    # Table 1: Roster Types (categories of duties)
    $dbh->do(
        q{
        CREATE TABLE IF NOT EXISTS staff_roster_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            color VARCHAR(7) DEFAULT '#3498db',
            is_active TINYINT(1) DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY unique_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    }
    );

    # Table 2: Rosters (schedule definitions)
    # branch_id and library_group_id are mutually exclusive (enforced in app):
    # both NULL = all branches; branch_id set = single branch; library_group_id set = group.
    $dbh->do(
        q{
        CREATE TABLE IF NOT EXISTS staff_roster (
            id INT AUTO_INCREMENT PRIMARY KEY,
            roster_type_id INT NOT NULL,
            branch_id VARCHAR(10),
            library_group_id INT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            effective_from DATE NOT NULL,
            effective_to DATE,
            is_active TINYINT(1) DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_roster_branch_active (branch_id, is_active, effective_from, effective_to),
            KEY idx_roster_group (library_group_id),
            CONSTRAINT fk_roster_type FOREIGN KEY (roster_type_id)
                REFERENCES staff_roster_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT fk_roster_branch FOREIGN KEY (branch_id)
                REFERENCES branches(branchcode) ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT fk_roster_group FOREIGN KEY (library_group_id)
                REFERENCES library_groups(id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    }
    );

    # Table 3: Roster Slots (time slots with iCal RRULE recurrence)
    # recurrence_rule stores an RFC 5545 RRULE subset, e.g.
    #   FREQ=WEEKLY;BYDAY=MO,WE,FR
    # The plugin currently only parses FREQ=WEEKLY + BYDAY; richer rules
    # (INTERVAL, BYSETPOS, UNTIL, monthly patterns) are forward-compatible
    # because we keep the column wide.
    $dbh->do(
        q{
        CREATE TABLE IF NOT EXISTS staff_roster_slots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            roster_id INT NOT NULL,
            recurrence_rule VARCHAR(512) NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            min_staff INT DEFAULT 1,
            max_staff INT DEFAULT 1,
            location VARCHAR(255),
            notes TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_slots_roster (roster_id),
            CONSTRAINT fk_slot_roster FOREIGN KEY (roster_id)
                REFERENCES staff_roster(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    }
    );

    # Table 4: Roster Assignments (staff assigned to slots on specific dates)
    $dbh->do(
        q{
        CREATE TABLE IF NOT EXISTS staff_roster_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            slot_id INT NOT NULL,
            borrowernumber INT NOT NULL,
            assignment_date DATE NOT NULL,
            status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
            assigned_by INT,
            notes TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY unique_assignment (slot_id, borrowernumber, assignment_date),
            KEY idx_assignments_date (assignment_date),
            KEY idx_assignments_staff (borrowernumber, assignment_date),
            CONSTRAINT fk_assignment_slot FOREIGN KEY (slot_id)
                REFERENCES staff_roster_slots(id) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_assignment_staff FOREIGN KEY (borrowernumber)
                REFERENCES borrowers(borrowernumber) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_assignment_assigned_by FOREIGN KEY (assigned_by)
                REFERENCES borrowers(borrowernumber) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    }
    );

    # Table 5: Roster Exceptions (holidays, closures, special events)
    $dbh->do(
        q{
        CREATE TABLE IF NOT EXISTS staff_roster_exceptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            roster_id INT NOT NULL,
            exception_date DATE NOT NULL,
            exception_type ENUM('closed', 'holiday', 'special', 'reduced_hours') NOT NULL,
            reason VARCHAR(255),
            created_by INT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_exceptions_roster_date (roster_id, exception_date),
            CONSTRAINT fk_exception_roster FOREIGN KEY (roster_id)
                REFERENCES staff_roster(id) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_exception_created_by FOREIGN KEY (created_by)
                REFERENCES borrowers(borrowernumber) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    }
    );

    # Table 6: Swap Requests (shift swap management)
    $dbh->do(
        q{
        CREATE TABLE IF NOT EXISTS staff_roster_swap_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            from_assignment_id INT NOT NULL,
            to_borrowernumber INT NOT NULL,
            to_assignment_id INT,
            status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
            request_message TEXT,
            response_message TEXT,
            requested_at DATETIME NOT NULL,
            responded_at DATETIME,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_swap_status (status, requested_at),
            CONSTRAINT fk_swap_from_assignment FOREIGN KEY (from_assignment_id)
                REFERENCES staff_roster_assignments(id) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_swap_to_staff FOREIGN KEY (to_borrowernumber)
                REFERENCES borrowers(borrowernumber) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_swap_to_assignment FOREIGN KEY (to_assignment_id)
                REFERENCES staff_roster_assignments(id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    }
    );

    # Default roster types — INSERT IGNORE so the seed is safe to re-run.
    $dbh->do(
        q{
        INSERT IGNORE INTO staff_roster_types (code, name, description, color, is_active, created_at, updated_at) VALUES
        ('CIRC', 'Circulation Desk', 'Front desk checkout and returns', '#3498db', 1, NOW(), NOW()),
        ('REF', 'Reference Desk', 'Reference and research assistance', '#9b59b6', 1, NOW(), NOW()),
        ('CHILD', 'Children''s Section', 'Children''s library services', '#2ecc71', 1, NOW(), NOW()),
        ('INFO', 'Information Desk', 'General information and directions', '#e74c3c', 1, NOW(), NOW()),
        ('TECH', 'Technology Help', 'Computer and technology assistance', '#f39c12', 1, NOW(), NOW())
    }
    );

    return;
}

1;
