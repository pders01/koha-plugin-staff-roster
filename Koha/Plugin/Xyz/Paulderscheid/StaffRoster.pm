package Koha::Plugin::Xyz::Paulderscheid::StaffRoster v0.0.3;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster - Manage staff duty rosters
across library branches and library groups.

=head1 SYNOPSIS

  Installed via the Koha plugins admin page; surfaces tool / admin /
  configure / report entry points plus a REST API under
  /api/v1/contrib/paulderscheid_staff_roster.

=head1 DESCRIPTION

Models roster types, rosters (scoped to a single branch or a library
group), recurring slots, per-date assignments, exceptions, and shift
swap requests. Mutations flow into Koha's action_logs (module
'STAFFROSTER') so admins can audit changes from tools/viewlog.pl.

The plugin module owns the install / upgrade / uninstall lifecycle,
template rendering for the tool views, and the per-CGI-op handlers
referenced from C<tool>, C<admin>, and C<configure>. The REST surface
lives under StaffRoster::*Controller (Mojolicious controllers).

=head1 AUTHOR

Paul Derscheid <paulderscheid@gmail.com>

=cut

use Modern::Perl;

use base qw(Koha::Plugins::Base);

use C4::Context;
use Mojo::JSON qw( decode_json );

# Koha framework deps. C4::Log stays loaded lazily inside _audit (see comment
# there) because action_logs is the one place we still want to soft-fail on
# very old Koha installs that predate the diff-aware signature.
use C4::Auth;
use C4::Letters;
use Koha::AuthorisedValues;
use Koha::Calendar;
use Koha::DateUtils;
use Koha::Desks;
use Koha::Libraries;
use Koha::Library::Groups;
use Koha::Patron::Categories;
use Koha::Patrons;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::I18N;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::DateUtils;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Schema;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::List;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Form;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Slots;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Exceptions;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::SelfService;

# Recurrence helpers; pulled in early so the slot save path doesn't pay the
# require cost on first request.
use DateTime::Event::ICal;
use DateTime::Format::ICal;

our $metadata = {
    'author'           => 'Paul Derscheid',
    'date_authored'    => '2025-12-24',
    'date_updated'     => '2026-05-02',
    'description'      => 'Manage staff duty rosters and schedules across library branches',
    'maximum_version'  => '',
    'minimum_version'  => '24.05.00.000',
    'name'             => 'StaffRoster',
    'release_filename' => 'koha-plugin-staff-roster',
    'static_dir_name'  => 'static',
    'version'          => '0.0.3',
};

sub new {
    my ( $class, $args ) = @_;

    return $class->SUPER::new( { ( $args // {} )->%*, metadata => { $metadata->%*, class => $class } } );
}

# Wrap Koha::Plugins::Base::get_template so every template the plugin
# renders gets a `tr` filter pre-bound to the current locale. Templates
# look up English source via [% tr('Save configuration') | html %], with
# the dictionary at locales/<lang>.json. Missing keys fall through to
# English so partial translations don't break pages.
sub get_template {
    my ( $self, $args ) = @_;
    my $template = $self->SUPER::get_template($args);
    $template->param(
        tr          => Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::I18N::translator(),
        plugin_lang => Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::I18N::_current_lang(),
    );
    return $template;
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

sub install {
    my ( $self, $args ) = @_;
    return Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Schema::install($self);
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
    return Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Schema::upgrade($self);
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
    return Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Schema::uninstall($self);
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

    my $post_redirect_op;
    if ( my $handler = $ADMIN_ACTIONS{$op} ) {
        $handler->( $dbh, $cgi, $id, \@messages );
        $op               = 'list';
        $post_redirect_op = $op;
    }

    if ( my $renderer = $ADMIN_VIEWS{$op} ) {
        $renderer->( $dbh, $id, $template );
    }

    $template->param(
        op               => $op,
        messages         => \@messages,
        post_redirect_op => $post_redirect_op,
        aside            => $self->_aside_context( $dbh, op => 'admin' ),
    );

    return $self->output_html( $template->output );
}

sub _admin_save_type {
    my ( $dbh, $cgi, $id, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_manage_types', $messages );

    my @fields = (
        uc( $cgi->param('code') // q{} ),
        $cgi->param('name'),
        $cgi->param('description'),
        $cgi->param('color')     // '#3498db',
        $cgi->param('is_active') // 1,
    );

    my ( $sql, @params, $verb, $original );
    if ($id) {
        $original = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_types WHERE id = ?}, undef, $id );
        $sql      = q{
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
    if ($ok) {
        $id ||= $dbh->last_insert_id( undef, undef, 'staff_roster_types', undef );
        my $after = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_types WHERE id = ?}, undef, $id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit(
            $verb eq 'insert' ? 'CREATE' : 'MODIFY',
            $id,
            { entity => 'roster_type', %{ $after // {} } },
            $verb eq 'insert' ? $after : $original,
        );
    }
    push @{$messages}, $ok
        ? { type => 'success', code => "success_on_$verb" }
        : { type => 'danger',  code => "error_on_$verb" };

    return;
}

sub _admin_delete_type {
    my ( $dbh, $cgi, $id, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_manage_types', $messages );

    my ($count) = $dbh->selectrow_array( q{SELECT COUNT(*) FROM staff_roster WHERE roster_type_id = ?}, undef, $id );

    if ( $count > 0 ) {
        push @{$messages}, { type => 'danger', code => 'cannot_delete_in_use', count => $count };
        return;
    }

    my $original = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_types WHERE id = ?}, undef, $id );
    my $ok       = $dbh->do( q{DELETE FROM staff_roster_types WHERE id = ?}, undef, $id );
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'DELETE', $id, { entity => 'roster_type' }, $original ) if $ok;
    push @{$messages}, $ok
        ? { type => 'success', code => 'success_on_delete' }
        : { type => 'danger',  code => 'error_on_delete' };

    return;
}

=head3 _aside_context

Common sidebar payload shared by every method (tool / admin / configure /
report). Returns a hashref keyed for the unified _aside.inc:

  rosters           - active rosters the current user can view, decorated
                      with a short location label, sorted by name. Used by
                      the sidebar's "Rosters" expanding section.
  active_roster_id  - currently focused roster (for highlight + per-roster
                      sub-nav rendering).
  current_op        - current tool op string when in tool method, else
                      'admin' / 'configure' / 'report'.

=cut

sub _aside_context {
    my ( $self, $dbh, %args ) = @_;

    my $rows = $dbh->selectall_arrayref(
        q{
        SELECT r.id, r.name, r.branch_id, r.library_group_id,
               b.branchname AS branch_name, lg.title AS group_name
        FROM staff_roster r
        LEFT JOIN branches b ON r.branch_id = b.branchcode
        LEFT JOIN library_groups lg ON r.library_group_id = lg.id
        WHERE r.is_active = 1
        ORDER BY r.name
    }, { Slice => {} }
    ) || [];

    my @visible;
    for my $r ( @{$rows} ) {
        next if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility::can_view_roster( $self, $r );
        my $location = $r->{branch_name} // $r->{group_name} // q{};
        push @visible,
            {
            id       => $r->{id},
            name     => $r->{name},
            location => $location,
            };
    }

    return {
        rosters          => \@visible,
        active_roster_id => $args{roster_id},
        current_op       => $args{op},
    };
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
    my $dbh = C4::Context->dbh;
    my $op  = $cgi->param('op') // q{};

    my @config_keys = qw(
        enable_email_reminders reminder_days_before enable_swap_notifications
        staff_can_self_assign self_unclaim_lockout_hours require_swap_approval
        library_group_mode default_library_group_id
        use_koha_calendar koha_calendar_branch koha_calendar_strict
        staff_categories use_koha_desks
        use_authorised_value_locations authorised_value_location_category
    );

    my $template = $self->get_template( { file => 'configure.tt' } );

    if ( $op eq 'cud-save' ) {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_configure') ) {
            $template->param( denied => 1 );
            return $self->output_html( $template->output );
        }
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
        $template->param( saved => 1, post_redirect_op => 'configure' );
    }

    for my $key (@config_keys) {
        $template->param( $key => $self->retrieve_data($key) );
    }

    my $root_groups = Koha::Library::Groups->get_root_groups;

    my $selected_cats    = $self->retrieve_data('staff_categories') // q{};
    my %selected_cat_map = map { $_ => 1 } split /,/smx, $selected_cats;

    # When admin hasn't picked any explicit categories, the plugin falls
    # back to every category_type='S' patron. Pre-select those rows in
    # the multi-select so the active default is visible at a glance.
    # The TT also wires `data-default-fallback` on each pre-selected
    # option so the save handler can distinguish a user-confirmed
    # explicit choice from the visual default — see configure.tt JS.
    my $is_default_fallback = !%selected_cat_map;

    my @categories = map {
        my $code  = $_->categorycode;
        my $is_s  = ( $_->category_type // q{} ) eq 'S';
        my $is_on = $selected_cat_map{$code} ? 1 : ( $is_default_fallback && $is_s ? 1 : 0 );
        {   code               => $code,
            description        => $_->description,
            selected           => $is_on,
            default_fallback   => ( $is_default_fallback && $is_s ) ? 1 : 0,
        };
    } Koha::Patron::Categories->search( {}, { order_by => 'description' } )->as_list;

    $template->param(
        enable_email_reminders             => $self->retrieve_data('enable_email_reminders')         // '0',
        reminder_days_before               => $self->retrieve_data('reminder_days_before')           // '1',
        enable_swap_notifications          => $self->retrieve_data('enable_swap_notifications')      // '1',
        staff_can_self_assign              => $self->retrieve_data('staff_can_self_assign')          // '0',
        self_unclaim_lockout_hours         => $self->retrieve_data('self_unclaim_lockout_hours')     // '0',
        require_swap_approval              => $self->retrieve_data('require_swap_approval')          // '1',
        library_group_mode                 => $self->retrieve_data('library_group_mode')             // 'off',
        default_library_group_id           => $self->retrieve_data('default_library_group_id')       // q{},
        use_koha_calendar                  => $self->retrieve_data('use_koha_calendar')              // '1',
        koha_calendar_branch               => $self->retrieve_data('koha_calendar_branch')           // q{},
        koha_calendar_strict               => $self->retrieve_data('koha_calendar_strict')           // '1',
        use_koha_desks                     => $self->retrieve_data('use_koha_desks')                 // '0',
        use_authorised_value_locations     => $self->retrieve_data('use_authorised_value_locations') // '0',
        authorised_value_location_category => $self->retrieve_data('authorised_value_location_category')
            // 'STAFFROSTER_LOCATION',
        library_groups               => _flatten_groups( $root_groups, 0 ),
        all_libraries                => [ Koha::Libraries->search( {}, { order_by => 'branchname' } )->as_list ],
        patron_categories            => \@categories,
        staff_categories_is_default  => $is_default_fallback ? 1 : 0,
        aside                        => $self->_aside_context( $dbh, op => 'configure' ),
    );

    return $self->output_html( $template->output );
}

# Returns a list of categorycodes considered "staff" for assignment lookup.
# Falls back to the Koha-default category_type='S' when admin hasn't picked any.
sub _staff_categorycodes {
    my ($self) = @_;
    my $stored = $self->retrieve_data('staff_categories') // q{};
    my @codes  = grep {length} split /,/smx, $stored;
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
    my $dbh      = C4::Context->dbh;
    $template->param( aside => $self->_aside_context( $dbh, op => 'report' ) );

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
    'cud-save_roster'      => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Form::save_roster,           next => 'list' },
    'cud-delete_roster'    => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Form::delete_roster,         next => 'list' },
    'cud-save_slot'        => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Slots::save_slot,            next => 'manage_slots' },
    'cud-delete_slot'      => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Slots::delete_slot,          next => 'manage_slots' },
    'cud-save_exception'   => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Exceptions::save_exception,  next => 'manage_exceptions' },
    'cud-delete_exception' => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Exceptions::delete_exception,next => 'manage_exceptions' },
    'cud-request_swap'     => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps::request_swap,         next => 'manage_swaps' },
    'cud-respond_swap'     => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps::respond_swap,         next => 'manage_swaps' },
    'cud-cancel_swap'      => { handler => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps::cancel_swap,          next => 'manage_swaps' },
);

my %TOOL_VIEWS = (
    list              => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::List::view_list,
    add_roster        => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Form::view_roster_form,
    edit_roster       => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Form::view_roster_form,
    delete_confirm    => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Form::view_delete_confirm,
    manage_slots      => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Slots::view_manage_slots,
    view_assignments  => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Slots::view_assignments,
    manage_exceptions => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Exceptions::view_manage_exceptions,
    manage_swaps      => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps::view_manage_swaps,
    my_shifts         => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::SelfService::view_my_shifts,
    open_shifts       => \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::SelfService::view_open_shifts,
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

    my $post_redirect_op;
    if ( my $entry = $TOOL_ACTIONS{$op} ) {
        $entry->{handler}->( $self, $dbh, $cgi, \@messages );
        $op               = $entry->{next};
        $post_redirect_op = $op;
    }

    # Visibility gate for ops accessing a specific roster
    state $roster_scoped_ops
        = { map { $_ => 1 } qw(edit_roster manage_slots manage_exceptions manage_swaps view_assignments delete_confirm) };
    if ( $roster_scoped_ops->{$op} && ( my $rid = $cgi->param('roster_id') ) ) {
        my $roster = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster WHERE id = ?}, undef, $rid );
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility::can_view_roster( $self, $roster ) ) {
            push @messages, { type => 'danger', code => 'access_denied' };
            $op = 'list';
        }
    }

    if ( my $renderer = $TOOL_VIEWS{$op} ) {
        $renderer->( $self, $dbh, $cgi, $template );
    }

    $template->param(
        op                      => $op,
        messages                => \@messages,
        roster_types            => $roster_types,
        branches                => $branches,
        post_redirect_op        => $post_redirect_op,
        post_redirect_roster_id => $post_redirect_op ? $cgi->param('roster_id') : undef,
        aside                   => $self->_aside_context(
            $dbh,
            op        => $op,
            roster_id => $cgi->param('roster_id'),
        ),
    );

    return $self->output_html( $template->output );
}


=head3 cronjob_nightly

Nightly cron entry point. Invoke from cron/staff_roster_nightly.pl (or any
scheduler that can call into the plugin). Enqueues a reminder email per
upcoming assignment N days out, where N = reminder_days_before. Idempotent
within the calendar day via NOT EXISTS against action_logs. In list context
returns C<($sent, $failed)>; in scalar context returns C<$sent>.

=cut

sub cronjob_nightly {
    my ($self) = @_;

    return 0 if !$self->retrieve_data('enable_email_reminders');
    my $days = $self->retrieve_data('reminder_days_before') // 1;
    $days = ( $days =~ /^\d+$/sm ) ? int $days : 1;

    my $dbh = C4::Context->dbh;

    # Idempotency: skip assignments where we already have a reminder row in
    # action_logs for STAFFROSTER NOTICE today. Re-running the cron same day
    # (after a scheduler restart, manual invocation, or partial failure) no
    # longer enqueues duplicate emails.
    my $rows = $dbh->selectall_arrayref(
        q{SELECT a.id, a.borrowernumber, a.assignment_date,
                 s.start_time, s.end_time, s.location,
                 r.name AS roster_name,
                 b.email, b.firstname
            FROM staff_roster_assignments a
            JOIN staff_roster_slots s ON a.slot_id = s.id
            JOIN staff_roster        r ON s.roster_id = r.id
            JOIN borrowers           b ON a.borrowernumber = b.borrowernumber
           WHERE a.assignment_date = DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
             AND a.status IN ('scheduled', 'confirmed')
             AND NOT EXISTS (
                 SELECT 1 FROM action_logs al
                  WHERE al.module = 'STAFFROSTER'
                    AND al.action = 'NOTICE'
                    AND al.object = a.id
                    AND DATE(al.timestamp) = CURRENT_DATE()
             )},
        { Slice => {} }, $days
    ) || [];

    my $sent   = 0;
    my $failed = 0;
    for my $a ( @{$rows} ) {
        if ( !$a->{email} ) {
            warn "StaffRoster: skipping reminder for borrower $a->{borrowernumber} (no email on file)";
            next;
        }

        my $letter = C4::Letters::GetPreparedLetter(
            module                 => 'STAFFROSTER',
            letter_code            => 'REMINDER',
            message_transport_type => 'email',
            substitute             => {
                patron_firstname => $a->{firstname} // q{},
                roster_name      => $a->{roster_name},
                assignment_date  => $a->{assignment_date},
                start_time       => substr( $a->{start_time}, 0, 5 ),
                end_time         => substr( $a->{end_time},   0, 5 ),
                location         => $a->{location} // '(unspecified)',
            },
        );

        if ( !$letter ) {
            $failed++;
            warn "StaffRoster: REMINDER letter not found in notice templates (assignment $a->{id})";
            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit(
                'NOTICE_FAILED',
                $a->{id},
                {   entity         => 'reminder',
                    borrowernumber => $a->{borrowernumber},
                    error          => 'letter template missing',
                }
            );
            next;
        }

        my $message_id = eval {
            C4::Letters::EnqueueLetter(
                {   letter                 => $letter,
                    borrowernumber         => $a->{borrowernumber},
                    message_transport_type => 'email',
                }
            );
        };
        if ($message_id) {
            $sent++;
            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit(
                'NOTICE',
                $a->{id},
                {   entity         => 'reminder',
                    borrowernumber => $a->{borrowernumber},
                    message_id     => $message_id,
                    days_ahead     => $days,
                }
            );
        }
        else {
            $failed++;
            my $err = $@ || 'EnqueueLetter returned undef';
            warn "StaffRoster: reminder enqueue failed for assignment $a->{id} (borrower $a->{borrowernumber}): $err";
            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit(
                'NOTICE_FAILED',
                $a->{id},
                {   entity         => 'reminder',
                    borrowernumber => $a->{borrowernumber},
                    error          => "$err",
                }
            );
        }
    }
    return wantarray ? ( $sent, $failed ) : $sent;
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

    # Koha's includes/permissions.inc renders sub-permission labels through a
    # hardcoded SWITCH/CASE map. Plugin codes the core map doesn't know about
    # render an empty <label>. Inject labels client-side so admins can see
    # what each staffroster_* checkbox actually grants.
    return <<~'JS';
    <script>
    (function () {
      var page = document.body && document.body.id;
      if (page !== 'patrons_member-flags' && page !== 'pat_member-flags') return;
      var labels = {
        staffroster_view: 'Staff Roster: view rosters and own schedule',
        staffroster_assign: 'Staff Roster: drag staff onto slots and edit assignments',
        staffroster_manage_rosters: 'Staff Roster: create or edit rosters, slots, exceptions',
        staffroster_manage_types: 'Staff Roster: manage roster types catalogue',
        staffroster_swap_request: 'Staff Roster: request a shift swap',
        staffroster_swap_respond: 'Staff Roster: accept or reject a swap directed at you',
        staffroster_swap_approve: 'Staff Roster: approve swaps as a manager',
        staffroster_self_assign: 'Staff Roster: self-claim open shifts and drop own shifts',
        staffroster_configure: 'Staff Roster: change plugin configuration'
      };
      // Sub-permission checkboxes carry value="<flag>:<code>" (e.g.
      // "plugins:staffroster_view") and id "<flag>_<code>". Strip the prefix
      // before looking up our label map.
      document.querySelectorAll('input.flag[type="checkbox"][name="flag"]').forEach(function (cb) {
        var raw  = cb.value || '';
        var code = raw.indexOf(':') >= 0 ? raw.split(':')[1] : raw;
        if (!Object.prototype.hasOwnProperty.call(labels, code)) return;
        var label = document.querySelector('label[for="' + cb.id + '"]')
                 || (cb.closest('li, tr, div') || document).querySelector('label.permissiondesc');
        if (label && !label.textContent.trim()) {
          label.innerHTML = '<span class="sub_permission">' + labels[code] +
            '</span> <span class="permissioncode">(' + code + ')</span>';
        }
      });
    })();
    </script>
    JS
}

1;
