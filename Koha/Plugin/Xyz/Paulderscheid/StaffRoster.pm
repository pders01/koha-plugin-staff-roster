package Koha::Plugin::Xyz::Paulderscheid::StaffRoster v0.0.1;

use Modern::Perl;

use base qw(Koha::Plugins::Base);

use C4::Context;
use Mojo::JSON qw( decode_json );

our $metadata = {
    'author'           => 'Paul Derscheid',
    'date_authored'    => '2025-12-24',
    'date_updated'     => '2026-05-01',
    'description'      => 'Manage staff duty rosters and schedules across library branches',
    'maximum_version'  => '',
    'minimum_version'  => '24.05.00.000',
    'name'             => 'StaffRoster',
    'release_filename' => 'koha-plugin-staff-roster',
    'static_dir_name'  => 'static',
    'version'          => '0.0.1',
};

sub new {
    my ( $class, $args ) = @_;

    return $class->SUPER::new( { ( $args // {} )->%*, metadata => { $metadata->%*, class => $class } } );
}

=head3 install

This is the 'install' method. Any database tables or other setup that should
be done when the plugin is first installed should be executed in this method.

The installation method should always return true if the installation succeeded
or false if it failed.

Context: One-time setup when the plugin is first installed.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=item *

C<$args> - HashRef containing arguments for installation

=back

=item *

B<Returns>

Boolean (true on success, false on failure)

=back

=cut

sub install() {
    my ( $self, $args ) = @_;

    my $dbh = C4::Context->dbh;

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

    # Insert default roster types
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

    return 1;
}

=head3 upgrade

This subroutine is triggered when a newer version of the plugin is installed over an existing older version.

It is typically used to handle any data migration, cleanup, or updates that need to occur when the plugin is upgraded. The method can store relevant upgrade data, such as the timestamp of the last upgrade.

Context: Run on plugin upgrade to handle migrations or data changes.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=item *

C<$args> - HashRef containing optional parameters related to the upgrade process

=back

=item *

B<Returns>

Boolean - true if the upgrade succeeded

=back

=cut

sub upgrade {
    my ( $self, $args ) = @_;

    my $dbh = C4::Context->dbh;

    my $installed_version = $self->retrieve_data('__INSTALLED_VERSION__') // '0.0.0';

    # Version-based migrations
    # Add new migration blocks here as the schema evolves
    #
    # if ( _version_compare($installed_version, '0.0.2') < 0 ) {
    #     $dbh->do(q{
    #         ALTER TABLE staff_roster_assignments
    #         ADD COLUMN reminder_sent TINYINT(1) DEFAULT 0 AFTER notes
    #     });
    # }

    $self->store_data( { '__INSTALLED_VERSION__' => $self->get_metadata->{version} } );

    return 1;
}

sub _version_compare {
    my ( $v1, $v2 ) = @_;

    my @v1_parts = split /\./smx, $v1;
    my @v2_parts = split /\./smx, $v2;

    for my $i ( 0 .. 2 ) {
        my $p1 = $v1_parts[$i] // 0;
        my $p2 = $v2_parts[$i] // 0;
        return $p1 <=> $p2 if $p1 != $p2;
    }

    return 0;
}

=head3 uninstall

This subroutine is run just before the plugin files are deleted when a plugin is uninstalled.

It is good practice to clean up any data or database changes made by the plugin during its use. 
This might include removing custom database tables or other resources used by the plugin.

Context: Cleanup operations prior to plugin removal.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=item *

C<$args> - HashRef containing additional arguments for cleanup (optional)

=back

=item *

B<Returns>

Void

=back

=cut

sub uninstall {
    my ( $self, $args ) = @_;

    my $dbh = C4::Context->dbh;

    # Drop tables in reverse order of creation (respecting foreign key constraints)
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_swap_requests });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_exceptions });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_assignments });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_slots });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster });
    $dbh->do(q{ DROP TABLE IF EXISTS staff_roster_types });

    return 1;
}

=head2 admin

The existence of an 'admin' subroutine means the plugin has some functionality that
should only be available to Koha librarians with administrative privileges.

Such plugins will be displayed on the admin page and work in a similar way to the 'tool'
system.

Context: Admin-only entry point from the Admin page; similar to tools but privileged.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=item *

C<$args> - HashRef containing arguments for the admin functionality

=back

=item *

B<Returns>

Void (HTML output via output_html)

=back

=cut

my %ADMIN_ACTIONS = (
    'cud-save'   => \&_admin_save_type,
    'cud-delete' => \&_admin_delete_type,
);

my %ADMIN_VIEWS = (
    list           => \&_admin_view_list,
    add_form       => \&_admin_view_form,
    delete_confirm => \&_admin_view_form,
);

sub admin {
    my ( $self, $args ) = @_;

    my $cgi = $self->{'cgi'};
    my $dbh = C4::Context->dbh;
    my $op  = $cgi->param('op') // 'list';
    my $id  = $cgi->param('id');

    my $template = $self->get_template( { file => 'admin.tt' } );
    my @messages;

    if ( my $handler = $ADMIN_ACTIONS{$op} ) {
        $handler->( $dbh, $cgi, $id, \@messages );
        $op = 'list';
    }

    if ( my $renderer = $ADMIN_VIEWS{$op} ) {
        $renderer->( $dbh, $id, $template );
    }

    $template->param( op => $op, messages => \@messages );

    return $self->output_html( $template->output );
}

sub _admin_save_type {
    my ( $dbh, $cgi, $id, $messages ) = @_;

    my @fields = (
        uc( $cgi->param('code') // q{} ),
        $cgi->param('name'),
        $cgi->param('description'),
        $cgi->param('color')     // '#3498db',
        $cgi->param('is_active') // 1,
    );

    my ( $sql, @params, $verb );
    if ($id) {
        $sql = q{
            UPDATE staff_roster_types
            SET code = ?, name = ?, description = ?, color = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        };
        @params = ( @fields, $id );
        $verb   = 'update';
    }
    else {
        $sql = q{
            INSERT INTO staff_roster_types (code, name, description, color, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        };
        @params = @fields;
        $verb   = 'insert';
    }

    my $ok = $dbh->do( $sql, undef, @params );
    push @{$messages}, $ok
        ? { type => 'success', code => "success_on_$verb" }
        : { type => 'danger',  code => "error_on_$verb" };

    return;
}

sub _admin_delete_type {
    my ( $dbh, $cgi, $id, $messages ) = @_;

    my ($count) = $dbh->selectrow_array( q{SELECT COUNT(*) FROM staff_roster WHERE roster_type_id = ?}, undef, $id );

    if ( $count > 0 ) {
        push @{$messages}, { type => 'danger', code => 'cannot_delete_in_use', count => $count };
        return;
    }

    my $ok = $dbh->do( q{DELETE FROM staff_roster_types WHERE id = ?}, undef, $id );
    push @{$messages}, $ok
        ? { type => 'success', code => 'success_on_delete' }
        : { type => 'danger',  code => 'error_on_delete' };

    return;
}

sub _admin_view_list {
    my ( $dbh, $id, $template ) = @_;
    my $roster_types = $dbh->selectall_arrayref( q{SELECT * FROM staff_roster_types ORDER BY name}, { Slice => {} } );
    $template->param( roster_types => $roster_types );
    return;
}

sub _admin_view_form {
    my ( $dbh, $id, $template ) = @_;
    return if !$id;
    my $roster_type = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_types WHERE id = ?}, undef, $id );
    $template->param( roster_type => $roster_type );
    return;
}

=head3 configure

This subroutine provides the plugin's configuration interface.

On GET (no 'save' param): renders the configure.tt template with current settings
pre-filled via C<retrieve_data>. On POST (save param present): stores form data
via C<store_data> and redirects to the plugin home page.

Context: Add a configuration interface for the plugin (render and/or save form data).

=over 4

=item * Parameters

=over 8

=item * C<$self> - Koha::Plugin object (plugin instance)

=item * C<$args> - HashRef of optional arguments for configuration handling

=back

=item * Returns

Void (HTML output via output_html, or redirect via go_home)

=back

=cut

sub configure {
    my ( $self, $args ) = @_;

    my $cgi = $self->{'cgi'};
    my $op  = $cgi->param('op') // q{};

    my @config_keys = qw(
        enable_email_reminders reminder_days_before enable_swap_notifications
        staff_can_self_assign require_swap_approval
        library_group_mode default_library_group_id
        use_koha_calendar koha_calendar_branch koha_calendar_strict
        staff_categories use_koha_desks
        use_authorised_value_locations authorised_value_location_category
    );

    my $template = $self->get_template( { file => 'configure.tt' } );

    if ( $op eq 'cud-save' ) {
        my %config;
        for my $key (@config_keys) {
            if ( $key eq 'staff_categories' ) {
                $config{$key} = join q{,}, $cgi->multi_param('staff_categories');
            }
            else {
                $config{$key} = $cgi->param($key) // q{};
            }
        }
        $self->store_data( \%config );
        $template->param( saved => 1 );
    }

    for my $key (@config_keys) {
        $template->param( $key => $self->retrieve_data($key) );
    }

    require Koha::Library::Groups;
    require Koha::Libraries;
    require Koha::Patron::Categories;
    my $root_groups = Koha::Library::Groups->get_root_groups;

    my $selected_cats = $self->retrieve_data('staff_categories') // q{};
    my %selected_cat_map = map { $_ => 1 } split /,/smx, $selected_cats;

    my @categories = map {
        my $code = $_->categorycode;
        {   code        => $code,
            description => $_->description,
            selected    => $selected_cat_map{$code} ? 1 : 0,
        };
    } Koha::Patron::Categories->search( {}, { order_by => 'description' } )->as_list;

    $template->param(
        enable_email_reminders    => $self->retrieve_data('enable_email_reminders')    // '0',
        reminder_days_before      => $self->retrieve_data('reminder_days_before')      // '1',
        enable_swap_notifications => $self->retrieve_data('enable_swap_notifications') // '1',
        staff_can_self_assign     => $self->retrieve_data('staff_can_self_assign')     // '0',
        require_swap_approval     => $self->retrieve_data('require_swap_approval')     // '1',
        library_group_mode        => $self->retrieve_data('library_group_mode')        // 'off',
        default_library_group_id  => $self->retrieve_data('default_library_group_id')  // q{},
        use_koha_calendar         => $self->retrieve_data('use_koha_calendar')         // '1',
        koha_calendar_branch      => $self->retrieve_data('koha_calendar_branch')      // q{},
        koha_calendar_strict      => $self->retrieve_data('koha_calendar_strict')      // '1',
        use_koha_desks            => $self->retrieve_data('use_koha_desks')            // '0',
        use_authorised_value_locations =>
            $self->retrieve_data('use_authorised_value_locations') // '0',
        authorised_value_location_category =>
            $self->retrieve_data('authorised_value_location_category') // 'STAFFROSTER_LOCATION',
        library_groups            => _flatten_groups( $root_groups, 0 ),
        all_libraries             => [ Koha::Libraries->search( {}, { order_by => 'branchname' } )->as_list ],
        patron_categories         => \@categories,
    );

    return $self->output_html( $template->output );
}

# Returns a list of categorycodes considered "staff" for assignment lookup.
# Falls back to the Koha-default category_type='S' when admin hasn't picked any.
sub _staff_categorycodes {
    my ($self) = @_;
    my $stored = $self->retrieve_data('staff_categories') // q{};
    my @codes  = grep { length } split /,/smx, $stored;
    return @codes;
}

# Flatten library group tree into list of { id, title, indent } for select rendering.
# indent is a pre-built &nbsp; string so the template doesn't need to compute it.
sub _flatten_groups {
    my ( $groups, $depth ) = @_;
    my @flat;
    for my $g ( $groups->as_list ) {
        next if defined $g->branchcode;    # skip leaf nodes (libraries)
        push @flat,
            {
            id     => $g->id,
            title  => $g->title,
            depth  => $depth,
            indent => '&nbsp;&nbsp;' x $depth,
            };
        my $children = $g->children;
        if ($children) {
            push @flat, _flatten_groups( $children, $depth + 1 );
        }
    }
    return \@flat;
}

=head3 report

The existence of a C<report> subroutine means the plugin is capable of running a report.

This subroutine handles generating reports, with the option to display the output in 
various formats (such as HTML or CSV). It allows for flexibility in how reports are generated 
and presented to the user, but it is recommended to modularize the code for anything beyond 
simple reports.

The subroutine may delegate to other methods for more complex report generation,
such as C<report_step1> and C<report_step2>.

Context: Runs from the plugins home page; generates HTML/CSV or similar.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=item *

C<$args> - HashRef containing parameters related to the report

=back

=item *

B<Returns>

Void (HTML output via output_html)

=back

=cut

sub report {
    my ( $self, $args ) = @_;

    my $template = $self->get_template( { file => 'report.tt' } );

    return $self->output_html( $template->output );
}

=head3 tool

The existence of a C<tool> subroutine means the plugin is capable of running a tool. 

The difference between a tool and a report is primarily semantic, but in general, 
any plugin that modifies the Koha database should be considered a tool rather than a report. 
Tools typically allow users to interact with and manipulate data, performing tasks such as scheduling jobs 
or modifying database entries.

The tool's logic can be modularized into different steps, depending on the complexity of the process.

Context: Must be launched from plugins home page; typically modifies data.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=item *

C<$args> - HashRef containing the parameters for tool processing

=back

=item *

B<Returns>

Void (HTML output via output_html)

=back

=cut

my %TOOL_ACTIONS = (
    'cud-save_roster'   => { handler => \&_tool_save_roster,   next => 'list' },
    'cud-delete_roster' => { handler => \&_tool_delete_roster, next => 'list' },
    'cud-save_slot'     => { handler => \&_tool_save_slot,     next => 'manage_slots' },
    'cud-delete_slot'   => { handler => \&_tool_delete_slot,   next => 'manage_slots' },
);

my %TOOL_VIEWS = (
    list             => \&_tool_view_list,
    add_roster       => \&_tool_view_roster_form,
    edit_roster      => \&_tool_view_roster_form,
    delete_confirm   => \&_tool_view_delete_confirm,
    manage_slots     => \&_tool_view_manage_slots,
    view_assignments => \&_tool_view_assignments,
);

sub tool {
    my ( $self, $args ) = @_;

    my $cgi = $self->{'cgi'};
    my $dbh = C4::Context->dbh;
    my $op  = $cgi->param('op') // 'list';

    my $template = $self->get_template( { file => 'tool.tt' } );
    my @messages;

    my $roster_types
        = $dbh->selectall_arrayref( q{SELECT * FROM staff_roster_types WHERE is_active = 1 ORDER BY name}, { Slice => {} } );
    my $branches
        = $dbh->selectall_arrayref( q{SELECT branchcode, branchname FROM branches ORDER BY branchname}, { Slice => {} } );

    if ( my $entry = $TOOL_ACTIONS{$op} ) {
        $entry->{handler}->( $self, $dbh, $cgi, \@messages );
        $op = $entry->{next};
    }

    # Visibility gate for ops accessing a specific roster
    state $roster_scoped_ops = { map { $_ => 1 } qw(edit_roster manage_slots view_assignments delete_confirm) };
    if ( $roster_scoped_ops->{$op} && ( my $rid = $cgi->param('roster_id') ) ) {
        my $roster = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster WHERE id = ?}, undef, $rid );
        if ( !$self->_can_view_roster($roster) ) {
            push @messages, { type => 'danger', code => 'access_denied' };
            $op = 'list';
        }
    }

    if ( my $renderer = $TOOL_VIEWS{$op} ) {
        $renderer->( $self, $dbh, $cgi, $template );
    }

    $template->param( op => $op, messages => \@messages, roster_types => $roster_types, branches => $branches );

    return $self->output_html( $template->output );
}

sub _tool_save_roster {
    my ( $self, $dbh, $cgi, $messages ) = @_;

    my $target = $cgi->param('target') // 'all';
    my ( $branch_id, $group_id );
    if ( $target =~ /^branch:(.+)$/ ) {
        $branch_id = $1;
    }
    elsif ( $target =~ /^group:(\d+)$/ ) {
        $group_id = $1;
    }

    my @fields = (
        $cgi->param('roster_type_id'),
        $branch_id,
        $group_id,
        $cgi->param('name'),
        $cgi->param('description'),
        $cgi->param('effective_from'),
        $cgi->param('effective_to') || undef,
        $cgi->param('is_active') // 1,
    );

    my $roster_id = $cgi->param('roster_id');
    my ( $sql, @params, $verb );
    if ($roster_id) {
        $sql = q{
            UPDATE staff_roster
            SET roster_type_id = ?, branch_id = ?, library_group_id = ?, name = ?, description = ?,
                effective_from = ?, effective_to = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        };
        @params = ( @fields, $roster_id );
        $verb   = 'update';
    }
    else {
        $sql = q{
            INSERT INTO staff_roster
            (roster_type_id, branch_id, library_group_id, name, description,
             effective_from, effective_to, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        };
        @params = @fields;
        $verb   = 'insert';
    }

    my $ok = $dbh->do( $sql, undef, @params );
    if ($ok) {
        $roster_id ||= $dbh->last_insert_id( undef, undef, 'staff_roster', undef );
        _save_additional_fields( $dbh, 'staff_roster', $roster_id, $cgi );
    }
    push @{$messages}, $ok
        ? { type => 'success', code => "success_on_$verb" }
        : { type => 'danger',  code => "error_on_$verb" };

    return;
}

sub _tool_delete_roster {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    my $roster_id = $cgi->param('roster_id');
    _delete_additional_fields( $dbh, 'staff_roster', $roster_id );
    my $ok = $dbh->do( q{DELETE FROM staff_roster WHERE id = ?}, undef, $roster_id );
    push @{$messages}, $ok
        ? { type => 'success', code => 'success_on_delete' }
        : { type => 'danger',  code => 'error_on_delete' };
    return;
}

sub _tool_save_slot {
    my ( $self, $dbh, $cgi, $messages ) = @_;

    my @dows = sort { $a <=> $b } grep { /^[0-6]$/sm } $cgi->multi_param('day_of_week');

    my $freq       = $cgi->param('freq')       // 'WEEKLY';
    $freq = 'WEEKLY' if $freq ne 'MONTHLY';
    my $interval   = $cgi->param('interval')   // 1;
    $interval = ( $interval =~ /^\d+$/sm && $interval > 0 ) ? int $interval : 1;
    my $ordinal    = $cgi->param('ordinal');
    $ordinal = ( defined $ordinal && $ordinal =~ /^-?\d+$/sm ) ? int $ordinal : undef;
    my $until_date = $cgi->param('until_date');
    $until_date = undef if !$until_date || $until_date !~ /^\d{4}-\d{2}-\d{2}$/sm;

    my $rrule = _rrule_from_params(
        freq       => $freq,
        dows       => \@dows,
        ordinal    => $ordinal,
        interval   => $interval,
        until_date => $until_date,
    );

    if ( !$rrule ) {
        push @{$messages}, { type => 'danger', code => 'slot_no_days_selected' };
        return;
    }

    my $location = $cgi->param('location');
    if ( $self->retrieve_data('use_authorised_value_locations') && defined $location && length $location ) {
        my $cat = $self->retrieve_data('authorised_value_location_category')
            || 'STAFFROSTER_LOCATION';
        require Koha::AuthorisedValues;
        my $match = Koha::AuthorisedValues->search(
            { category => $cat, authorised_value => $location } )->count;
        if ( !$match ) {
            push @{$messages},
                { type => 'danger', code => 'slot_location_not_in_av', value => $location, category => $cat };
            return;
        }
    }

    my @fields = (
        $rrule,
        $cgi->param('start_time'),
        $cgi->param('end_time'),
        $cgi->param('min_staff') // 1,
        $cgi->param('max_staff') // 1,
        $location,
        $cgi->param('slot_notes'),
    );

    my $slot_id = $cgi->param('slot_id');
    if ($slot_id) {
        $dbh->do(
            q{
            UPDATE staff_roster_slots
            SET recurrence_rule = ?, start_time = ?, end_time = ?,
                min_staff = ?, max_staff = ?, location = ?, notes = ?, updated_at = NOW()
            WHERE id = ?
        }, undef, @fields, $slot_id
        );
    }
    else {
        $dbh->do(
            q{
            INSERT INTO staff_roster_slots
            (roster_id, recurrence_rule, start_time, end_time, min_staff, max_staff, location, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        }, undef, $cgi->param('roster_id'), @fields
        );
    }
    push @{$messages}, { type => 'success', code => 'slot_saved' };
    return;
}

sub _tool_delete_slot {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    $dbh->do( q{DELETE FROM staff_roster_slots WHERE id = ?}, undef, $cgi->param('slot_id') );
    push @{$messages}, { type => 'success', code => 'slot_deleted' };
    return;
}

sub _tool_view_list {
    my ( $self, $dbh, $cgi, $template ) = @_;

    my $filter_branch = $cgi->param('filter_branch');
    my $filter_type   = $cgi->param('filter_type');
    my $filter_status = $cgi->param('filter_status');

    my $sql = q{
        SELECT r.*,
               rt.name AS type_name, rt.color AS type_color,
               b.branchname AS branch_name,
               lg.title AS group_name,
               (SELECT COUNT(*) FROM staff_roster_slots WHERE roster_id = r.id) AS slot_count
        FROM staff_roster r
        JOIN staff_roster_types rt ON r.roster_type_id = rt.id
        LEFT JOIN branches b ON r.branch_id = b.branchcode
        LEFT JOIN library_groups lg ON r.library_group_id = lg.id
        WHERE 1=1
    };
    my @params;

    if ($filter_branch) {
        $sql .= q{ AND r.branch_id = ?};
        push @params, $filter_branch;
    }
    if ($filter_type) {
        $sql .= q{ AND r.roster_type_id = ?};
        push @params, $filter_type;
    }
    if ( defined $filter_status && $filter_status ne q{} ) {
        $sql .= q{ AND r.is_active = ?};
        push @params, $filter_status;
    }

    my ( $vis_clause, $vis_params ) = $self->_visibility_clause;
    if ($vis_clause) {
        $sql .= " $vis_clause";
        push @params, @{$vis_params};
    }
    $sql .= q{ ORDER BY r.name};

    my $rosters = $dbh->selectall_arrayref( $sql, { Slice => {} }, @params );

    # Decorate rosters with their additional-field summaries (one query for the page).
    my $af_defs = $dbh->selectall_arrayref(
        q{SELECT id, name FROM additional_fields WHERE tablename = ? ORDER BY id},
        { Slice => {} }, 'staff_roster'
    ) || [];
    if ( @{$af_defs} && @{$rosters} ) {
        my %name_for = map { $_->{id} => $_->{name} } @{$af_defs};
        my $bulk = _bulk_additional_field_values( $dbh, 'staff_roster', [ map { $_->{id} } @{$rosters} ] );
        for my $r ( @{$rosters} ) {
            my $vals = $bulk->{ $r->{id} } || {};
            my @summary;
            for my $fid ( sort { $a <=> $b } keys %{$vals} ) {
                push @summary, { name => $name_for{$fid}, value => join q{, }, @{ $vals->{$fid} } };
            }
            $r->{additional_field_summary} = \@summary;
        }
    }

    $template->param(
        rosters       => $rosters,
        filter_branch => $filter_branch,
        filter_type   => $filter_type,
        filter_status => $filter_status,
    );
    return;
}

sub _tool_view_roster_form {
    my ( $self, $dbh, $cgi, $template ) = @_;

    require Koha::Library::Groups;
    my $root_groups = Koha::Library::Groups->get_root_groups;
    $template->param( library_groups => _flatten_groups( $root_groups, 0 ) );

    my $roster_id = $cgi->param('roster_id');
    my $roster;
    if ($roster_id) {
        $roster = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster WHERE id = ?}, undef, $roster_id );
        $template->param( roster => $roster );
    }

    my $af = _load_additional_fields( $dbh, 'staff_roster', $roster_id );
    $template->param(
        additional_fields_table     => 'staff_roster',
        additional_fields_available => $af->{available},
        additional_fields_values    => $af->{values},
    );
    return;
}

sub _tool_view_delete_confirm {
    my ( $self, $dbh, $cgi, $template ) = @_;
    my $roster = $dbh->selectrow_hashref(
        q{
        SELECT r.*, rt.name AS type_name, b.branchname AS branch_name,
               (SELECT COUNT(*) FROM staff_roster_slots WHERE roster_id = r.id) AS slot_count
        FROM staff_roster r
        JOIN staff_roster_types rt ON r.roster_type_id = rt.id
        LEFT JOIN branches b ON r.branch_id = b.branchcode
        WHERE r.id = ?
    }, undef, $cgi->param('roster_id')
    );
    $template->param( roster => $roster );
    return;
}

sub _tool_view_manage_slots {
    my ( $self, $dbh, $cgi, $template ) = @_;
    my $roster_id = $cgi->param('roster_id');
    my $roster    = $dbh->selectrow_hashref(
        q{
        SELECT r.*, rt.name AS type_name, rt.color AS type_color, b.branchname AS branch_name
        FROM staff_roster r
        JOIN staff_roster_types rt ON r.roster_type_id = rt.id
        LEFT JOIN branches b ON r.branch_id = b.branchcode
        WHERE r.id = ?
    }, undef, $roster_id
    );

    my $slots = $dbh->selectall_arrayref(
        q{
        SELECT * FROM staff_roster_slots
        WHERE roster_id = ?
        ORDER BY start_time, recurrence_rule
    }, { Slice => {} }, $roster_id
    );

    # Decorate slots with derived recurrence info for the template
    for my $slot ( @{$slots} ) {
        my $parsed = _parsed_rrule( $slot->{recurrence_rule} );
        $slot->{days_of_week_set} = { map { $_ => 1 } @{ $parsed->{dows} } };
        $slot->{days_label}       = _rrule_label( $slot->{recurrence_rule} );
        $slot->{rrule_freq}       = $parsed->{freq};
        $slot->{rrule_interval}   = $parsed->{interval};
        $slot->{rrule_ordinal}    = $parsed->{ordinal};
        $slot->{rrule_until}      = $parsed->{until_date};
    }

    # Optional Koha desks for the location field, when enabled and the roster
    # targets a single branch.
    my @desks;
    if ( $self->retrieve_data('use_koha_desks') && $roster && $roster->{branch_id} ) {
        require Koha::Desks;
        @desks = Koha::Desks->search( { branchcode => $roster->{branch_id} }, { order_by => 'desk_name' } )->as_list;
    }

    # Optional authorised-value-backed location list. When enabled, this takes
    # precedence over the desks datalist in the slot form.
    my @av_locations;
    if ( $self->retrieve_data('use_authorised_value_locations') ) {
        my $cat = $self->retrieve_data('authorised_value_location_category')
            || 'STAFFROSTER_LOCATION';
        require Koha::AuthorisedValues;
        @av_locations = map { { value => $_->authorised_value, lib => $_->lib } }
            Koha::AuthorisedValues->search(
            { category => $cat },
            { order_by => [ 'lib', 'authorised_value' ] }
            )->as_list;
    }

    $template->param(
        roster       => $roster,
        slots        => $slots,
        desks        => \@desks,
        av_locations => \@av_locations,
    );
    return;
}

sub _tool_view_assignments {
    my ( $self, $dbh, $cgi, $template ) = @_;
    my $roster_id  = $cgi->param('roster_id');
    my $week_start = $cgi->param('week_start') // _get_current_week_start();

    my $roster = $dbh->selectrow_hashref(
        q{
        SELECT r.*, rt.name AS type_name, rt.color AS type_color, b.branchname AS branch_name
        FROM staff_roster r
        JOIN staff_roster_types rt ON r.roster_type_id = rt.id
        LEFT JOIN branches b ON r.branch_id = b.branchcode
        WHERE r.id = ?
    }, undef, $roster_id
    );

    my $slots = $dbh->selectall_arrayref(
        q{
        SELECT * FROM staff_roster_slots
        WHERE roster_id = ?
        ORDER BY start_time, recurrence_rule
    }, { Slice => {} }, $roster_id
    );

    $template->param( roster => $roster, slots => $slots, week_start => $week_start );
    return;
}

sub _user_branch {
    my $env = C4::Context->userenv;
    return $env->{branch} if $env && $env->{branch};
    if ( $env && $env->{number} ) {
        require Koha::Patrons;
        my $patron = Koha::Patrons->find( $env->{number} );
        return $patron->branchcode if $patron;
    }
    return;
}

sub _is_superlib {
    my $env = C4::Context->userenv or return 0;
    my $flags = $env->{flags} // 0;
    return ( $flags == 1 ) || ( $flags & 1 );
}

# Group ids whose subtree contains $branch (ancestors of the leaf node).
sub _user_group_ids {
    my ($branch) = @_;
    return () if !$branch;
    require Koha::Library::Groups;

    my $leaves = Koha::Library::Groups->search( { branchcode => $branch } );
    my %seen;
    while ( my $leaf = $leaves->next ) {
        my $node = $leaf;
        while ($node) {
            my $pid = $node->parent_id or last;
            $seen{$pid} = 1;
            $node = Koha::Library::Groups->find($pid);
        }
    }
    return keys %seen;
}

# Returns ($sql_fragment, \@bind_params) appended to a WHERE clause to scope roster rows
# to those visible to the current user. Empty fragment when filtering is off or user is superlib.
sub _visibility_clause {
    my ($self) = @_;
    my $mode = $self->retrieve_data('library_group_mode') // 'off';
    return ( q{}, [] ) if $mode eq 'off' || _is_superlib();

    my $branch = _user_branch();
    if ( !$branch ) {
        return ( 'AND 1=0', [] ) if $mode eq 'strict';
        return ( 'AND r.branch_id IS NULL AND r.library_group_id IS NULL', [] );
    }

    my @gids   = _user_group_ids($branch);
    my $gfrag  = @gids ? 'OR r.library_group_id IN (' . join( q{,}, ('?') x @gids ) . ')' : q{};
    my $clause = "AND ((r.branch_id IS NULL AND r.library_group_id IS NULL) OR r.branch_id = ? $gfrag)";
    return ( $clause, [ $branch, @gids ] );
}

# True if current user can see this roster row (or undef if not found / hidden).
sub _can_view_roster {
    my ( $self, $roster ) = @_;
    return 0 if !$roster;
    my $mode = $self->retrieve_data('library_group_mode') // 'off';
    return 1 if $mode eq 'off' || _is_superlib();

    my $branch = _user_branch();
    return 0 if !$branch;

    return 1 if !$roster->{branch_id} && !$roster->{library_group_id};
    return 1 if $roster->{branch_id} && $roster->{branch_id} eq $branch;
    if ( $roster->{library_group_id} ) {
        my %gids = map { $_ => 1 } _user_group_ids($branch);
        return 1 if $gids{ $roster->{library_group_id} };
    }
    return 0;
}

# Resolve the list of branchcodes that a roster covers for calendar lookup.
# Branch-bound roster -> [branch_id]
# Group-bound roster -> all leaf branchcodes within the group (recursive)
# All-branches roster -> [] (no calendar check)
sub _branchcodes_for_roster {
    my ( $self, $roster ) = @_;
    return () if !$roster;

    if ( $roster->{branch_id} ) {
        return ( $roster->{branch_id} );
    }

    if ( $roster->{library_group_id} ) {
        require Koha::Library::Groups;
        my $group = Koha::Library::Groups->find( $roster->{library_group_id} ) or return ();
        my $libs = $group->libraries;
        return $libs ? $libs->get_column('branchcode') : ();
    }

    # All-branches roster: optional override via config
    my $override = $self->retrieve_data('koha_calendar_branch');
    return $override ? ($override) : ();
}

# Check if a date is closed per Koha calendar semantics for this roster.
# - Branch-bound: closed iff that branch is closed.
# - Group-bound: closed iff ALL branches in the group are closed (defensive).
# - All-branches with config override: closed per the override branch.
# - All-branches without override: never closed.
# - Empty group (no branches resolved): never closed.
sub _is_closed_for_roster {
    my ( $self, $roster, $date ) = @_;
    return 0 if !$self->retrieve_data('use_koha_calendar');

    my @branches = $self->_branchcodes_for_roster($roster);
    return 0 if !@branches;

    require Koha::Calendar;
    require Koha::DateUtils;
    my $dt = eval { Koha::DateUtils::dt_from_string( $date, 'iso' ) };
    return 0 if !$dt;

    for my $b (@branches) {
        my $cal = Koha::Calendar->new( branchcode => $b );
        return 0 if !$cal->is_holiday($dt);    # at least one branch open -> not closed
    }
    return 1;
}

# RRule helpers -------------------------------------------------------------
# Subset of RFC 5545: FREQ=WEEKLY|MONTHLY, BYDAY (with optional ordinal
# prefix for monthly: 1MO, -1FR), INTERVAL, UNTIL. Backed by
# DateTime::Event::ICal for canonical apply-checks; the fast path below skips
# the heavy machinery for the common weekly INTERVAL=1 + no-UNTIL case.

# Map iCal weekday codes (BYDAY) <-> 0..6 with Sunday = 0 (Perl/JS convention).
my %ICAL_TO_DOW = ( SU => 0, MO => 1, TU => 2, WE => 3, TH => 4, FR => 5, SA => 6 );
my %DOW_TO_ICAL = reverse %ICAL_TO_DOW;

# RRule string from a structured params hash. Keys:
#   freq       'WEEKLY' (default) or 'MONTHLY'
#   dows       arrayref of 0..6 weekday ints (required)
#   ordinal    signed int -1..4; only meaningful when freq=MONTHLY (1MO, -1FR)
#   interval   positive int; omitted unless > 1
#   until_date 'YYYY-MM-DD'; encoded as UTC end-of-day
sub _rrule_from_params {
    my (%p)  = @_;
    my $freq = $p{freq} || 'WEEKLY';
    my @dows = @{ $p{dows} || [] };
    return q{} if !@dows;
    my @codes = grep { defined } map { $DOW_TO_ICAL{$_} } @dows;
    return q{} if !@codes;
    if ( $freq eq 'MONTHLY' && defined $p{ordinal} && $p{ordinal} != 0 ) {
        my $ord = int $p{ordinal};
        @codes = map { "$ord$_" } @codes;
    }
    my @parts = ("FREQ=$freq");
    push @parts, "INTERVAL=$p{interval}" if $p{interval} && $p{interval} > 1;
    push @parts, 'BYDAY=' . join q{,}, @codes;
    if ( $p{until_date} && $p{until_date} =~ /^(\d{4})-(\d{2})-(\d{2})$/ ) {
        push @parts, "UNTIL=$1$2${3}T235959Z";
    }
    return join q{;}, @parts;
}

# Parse RRULE into a structured hashref for UI prefill, validation, and
# label rendering. Always returns the same shape (with sane defaults).
sub _parsed_rrule {
    my ($rrule) = @_;
    my %out = (
        freq        => 'WEEKLY',
        interval    => 1,
        dows        => [],
        byday_codes => [],
        ordinal     => undef,
        until_date  => undef,
    );
    return \%out if !$rrule;
    if ( $rrule =~ /FREQ=([A-Z]+)/sm )                { $out{freq}     = $1; }
    if ( $rrule =~ /INTERVAL=(\d+)/sm )               { $out{interval} = $1 + 0; }
    if ( $rrule =~ /UNTIL=(\d{4})(\d{2})(\d{2})/sm )  { $out{until_date} = "$1-$2-$3"; }
    if ( $rrule =~ /BYDAY=([^;]+)/sm ) {
        my @dows;
        my @byday_codes;
        my %ord_seen;
        for my $tok ( split /,/sm, $1 ) {
            next if $tok !~ /^(-?\d+)?([A-Z]{2})$/sm;
            my ( $ord, $code ) = ( $1, $2 );
            next if !defined $ICAL_TO_DOW{$code};
            push @dows,        $ICAL_TO_DOW{$code};
            push @byday_codes, $code;
            $ord_seen{$ord} = 1 if defined $ord;
        }
        $out{dows}        = \@dows;
        $out{byday_codes} = \@byday_codes;
        my @ord_list = keys %ord_seen;
        $out{ordinal} = $ord_list[0] + 0 if @ord_list == 1;
    }
    return \%out;
}

# Thin shims kept for callers that only want one slice of the parse result.
sub _dows_from_rrule  { return _parsed_rrule( $_[0] )->{dows}; }
sub _byday_from_rrule { return _parsed_rrule( $_[0] )->{byday_codes}; }

# Human-readable summary of an RRule, e.g. "Mon, Wed", "Every 2 weeks: Mon",
# "1st Monday of month (until 2026-08-31)".
sub _rrule_label {
    my ($rrule) = @_;
    my $p       = _parsed_rrule($rrule);
    return q{} if !@{ $p->{dows} };
    my @day_names    = qw( Sunday Monday Tuesday Wednesday Thursday Friday Saturday );
    my $days         = join q{, }, map { substr $day_names[$_], 0, 3 } @{ $p->{dows} };
    my $until_suffix = $p->{until_date} ? " (until $p->{until_date})" : q{};
    if ( $p->{freq} eq 'MONTHLY' ) {
        my %ord_label = ( 1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th', -1 => 'Last' );
        my $ord       = $p->{ordinal} ? ( $ord_label{ $p->{ordinal} } || $p->{ordinal} ) : 'Each';
        my $every     = $p->{interval} > 1 ? "Every $p->{interval} months: " : q{};
        return "$every$ord $days of month$until_suffix";
    }
    my $every = $p->{interval} > 1 ? "Every $p->{interval} weeks: " : q{};
    return "$every$days$until_suffix";
}

# Does the slot's RRule apply on the given ISO date?
# $anchor_iso (optional, YYYY-MM-DD) is the recurrence dtstart; required for
# INTERVAL>1 to be deterministic. Falls back to $date if omitted, which keeps
# the old behavior for plain weekly rules.
sub _slot_applies_on {
    my ( $rrule, $date, $anchor_iso ) = @_;
    return 0 if !$rrule || !$date;
    require Koha::DateUtils;
    my $dt = eval { Koha::DateUtils::dt_from_string( $date, 'iso' ) };
    return 0 if !$dt;

    my $p = _parsed_rrule($rrule);
    return 0 if !@{ $p->{dows} };

    # Fast path: weekly + INTERVAL=1 + no UNTIL collapses to a weekday match,
    # which is what nearly every existing slot stores. Avoid loading the
    # DateTime::Event::ICal stack for it.
    if ( $p->{freq} eq 'WEEKLY' && $p->{interval} == 1 && !$p->{until_date} ) {
        my $wday = $dt->day_of_week % 7;    # 1=Mon..7=Sun -> 0..6 with Sunday=0
        return scalar grep { $_ == $wday } @{ $p->{dows} };
    }

    require DateTime::Event::ICal;
    require DateTime::Format::ICal;
    my $anchor = $anchor_iso
        ? eval { Koha::DateUtils::dt_from_string( $anchor_iso, 'iso' ) }
        : $dt->clone;
    $anchor ||= $dt->clone;
    $anchor->truncate( to => 'day' );

    my $set = eval {
        DateTime::Format::ICal->parse_recurrence(
            recurrence => $rrule,
            dtstart    => $anchor,
        );
    };
    return 0 if !$set;

    my $check = $dt->clone->truncate( to => 'day' );
    return $set->contains($check) ? 1 : 0;
}

# Lookup a slot's recurrence anchor (its parent roster's effective_from) for
# deterministic INTERVAL handling. Cheap single-row read.
sub _slot_anchor {
    my ( $dbh, $slot_id ) = @_;
    return if !$slot_id;
    my ($anchor) = $dbh->selectrow_array(
        q{SELECT r.effective_from FROM staff_roster_slots s
          JOIN staff_roster r ON s.roster_id = r.id WHERE s.id = ?},
        undef, $slot_id
    );
    return $anchor;
}

# Additional fields helpers --------------------------------------------------
# Plumbing on top of Koha's additional_fields / additional_field_values tables.
# The plugin uses raw DBI rather than Koha::Object, so we can't pull in the
# Koha::Object::Mixin::AdditionalFields mixin; we do the equivalent reads /
# writes ourselves. Admins manage field definitions via the standard
# admin/additional-fields.pl page (deep-link with tablename=...).

# Returns { available => [field_hash, ...], values => { field_id => [val,..] } }
# where 'available' is what the additional-fields-entry.inc include expects:
# field hashes carry the same keys (id, name, authorised_value_category,
# repeatable, marcfield, marcfield_mode) that the include reads.
sub _load_additional_fields {
    my ( $dbh, $tablename, $record_id ) = @_;
    my $available = $dbh->selectall_arrayref(
        q{SELECT id, name, authorised_value_category, marcfield, marcfield_mode, searchable, repeatable
          FROM additional_fields WHERE tablename = ? ORDER BY id},
        { Slice => {} }, $tablename
    ) || [];

    # The TT include calls $field->effective_authorised_value_category as a
    # method. Wrap each hash so the include works without changes.
    for my $f ( @{$available} ) {
        my $cat = $f->{authorised_value_category};
        $f->{effective_authorised_value_category} = $cat;
    }

    my %values;
    if ($record_id) {
        my $rows = $dbh->selectall_arrayref(
            q{SELECT field_id, value FROM additional_field_values
              WHERE record_table = ? AND record_id = ?},
            { Slice => {} }, $tablename, $record_id
        ) || [];
        for my $r ( @{$rows} ) {
            push @{ $values{ $r->{field_id} } }, $r->{value};
        }
    }
    return { available => $available, values => \%values };
}

# Replaces every additional_field_value row for ($tablename, $record_id) with
# the values posted as additional_field_<id>. Mirrors set_additional_fields in
# Koha::Object::Mixin::AdditionalFields. No-op when there are no fields
# defined for $tablename, so admins can opt in by creating fields and
# pre-existing rosters keep working.
sub _save_additional_fields {
    my ( $dbh, $tablename, $record_id, $cgi ) = @_;
    return if !$record_id;

    my $fields = $dbh->selectall_arrayref(
        q{SELECT id, repeatable FROM additional_fields WHERE tablename = ?},
        { Slice => {} }, $tablename
    ) || [];
    return if !@{$fields};

    $dbh->do(
        q{DELETE FROM additional_field_values WHERE record_table = ? AND record_id = ?},
        undef, $tablename, $record_id
    );

    for my $f ( @{$fields} ) {
        my @posted = $cgi->multi_param( 'additional_field_' . $f->{id} );
        for my $v (@posted) {
            next if !defined $v || $v eq q{};
            $dbh->do(
                q{INSERT INTO additional_field_values (field_id, record_table, record_id, value)
                  VALUES (?, ?, ?, ?)},
                undef, $f->{id}, $tablename, $record_id, $v
            );
        }
    }
    return;
}

# Removes all additional_field_value rows attached to ($tablename, $record_id).
sub _delete_additional_fields {
    my ( $dbh, $tablename, $record_id ) = @_;
    return if !$record_id;
    $dbh->do(
        q{DELETE FROM additional_field_values WHERE record_table = ? AND record_id = ?},
        undef, $tablename, $record_id
    );
    return;
}

# Convenience: { record_id => { field_id => [vals,...] } } for a list view that
# wants to render every roster's additional field summary in one query.
sub _bulk_additional_field_values {
    my ( $dbh, $tablename, $record_ids ) = @_;
    return {} if !$record_ids || !@{$record_ids};
    my $placeholders = join q{,}, ('?') x @{$record_ids};
    my $rows         = $dbh->selectall_arrayref(
        qq{SELECT record_id, field_id, value FROM additional_field_values
           WHERE record_table = ? AND record_id IN ($placeholders)},
        { Slice => {} }, $tablename, @{$record_ids}
    ) || [];
    my %out;
    for my $r ( @{$rows} ) {
        push @{ $out{ $r->{record_id} }{ $r->{field_id} } }, $r->{value};
    }
    return \%out;
}

sub _get_current_week_start {
    my @today             = localtime;
    my $wday              = $today[6];
    my $days_since_monday = ( $wday + 6 ) % 7;
    my $monday            = time - ( $days_since_monday * 86400 );
    my @mon               = localtime($monday);
    return sprintf '%04d-%02d-%02d', $mon[5] + 1900, $mon[4] + 1, $mon[3];
}

=head3 api_namespace

Context: Define the API namespace for the plugin (subdomain-like component).

=over 4

=item * Parameters

C<$self>

=item * Returns

String representing the subdomain, e.g., the project part of your plugin name.

=back

=cut

sub api_namespace {
    my $self = shift;

    return 'staffroster';
}

=head3 api_routes

This subroutine returns valid OpenAPI 2.0 paths serialized as a hash reference.

If your plugin implements API routes, the `api_routes` method should be implemented
to provide OpenAPI-compliant routes. It is a good practice to write the OpenAPI 2.0 path
specifications in JSON and store them in the plugin, then read the spec within this method.
This allows for the reuse of the OpenAPI spec in mainline Koha, making this a good
prototyping tool for developing API routes.

This subroutine depends on the C<JSON> module for decoding the JSON specification.

Context: Extend Koha REST API via plugin-defined OpenAPI 2.0 routes.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=item *

C<$args> - HashRef containing additional arguments for route processing (optional)

=back

=item *

B<Returns>

HashRef of deserialized OpenAPI 2.0 paths

=back

=cut

sub api_routes {
    my ( $self, $args ) = @_;

    my $spec_str = $self->mbf_read('openapi.json');
    my $spec     = decode_json($spec_str);

    return $spec;
}

=head3 static_routes

This subroutine returns static API routes from a predefined JSON specification file.

It reads the JSON file, parses it, and returns the resulting data structure as a hash reference.
This method is typically used to provide static API routes that do not change dynamically and
are predefined in the plugin.

This subroutine depends on the C<JSON> module for decoding the JSON specification.

Context: Serve static files through the API without Apache changes.

=over 4

=item * Parameters

=over 8

=item * C<$self> - Koha::Plugin object (plugin instance)

=item * C<$args> - HashRef containing parameters related to route handling

=back

=item * Returns

HashRef - The parsed JSON structure representing static API routes.

=back

=cut

sub static_routes {
    my ( $self, $args ) = @_;

    my $spec_str = $self->mbf_read('staticapi.json');
    my $spec     = decode_json($spec_str);

    return $spec;
}

=head3 intranet_head

This subroutine allows the plugin to add custom CSS to the staff intranet interface.

You can return a string of CSS here, wrapped in C<< <style> >> tags if needed, or include external CSS files by constructing the appropriate HTML. This flexibility allows plugins to style the intranet interface in various ways, including injecting inline styles or linking to external resources.

Context: Global CSS/HTML injection into intranet head.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=back

=item *

B<Returns>

String - HTML/CSS/JS to include in intranet head

=back

=cut

sub intranet_head {
    my $self = shift;

    return <<~'CSS';
    CSS
}

=head3 intranet_js

This subroutine allows the plugin to inject custom JavaScript into the staff intranet interface.

You can return a string of JavaScript wrapped in C<< <script> >> tags if necessary, or include external JavaScript files by constructing the appropriate HTML. This gives the plugin flexibility to include inline JavaScript or reference external JavaScript resources as needed.

Context: Global JS/HTML injection for the staff interface.

=over 4

=item *

B<Parameters>

=over 8

=item *

C<$self> - Koha::Plugin object (plugin instance)

=back

=item *

B<Returns>

String - HTML/JS to include in intranet

=back

=cut

sub intranet_js {
    my $self = shift;

    return <<~'JS';
    JS
}

1;
