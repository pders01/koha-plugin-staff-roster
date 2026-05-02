package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Slots;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Slots -
Slot CUD handlers + the manage_slots / view_assignments renderers.

=cut

use Modern::Perl;

use Koha::AuthorisedValues;
use Koha::Desks;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::DateUtils;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule;

sub save_slot {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_manage_rosters', $messages );

    my @dows = sort { $a <=> $b } grep {/^[0-6]$/sm} $cgi->multi_param('day_of_week');

    my $freq = $cgi->param('freq') // 'WEEKLY';
    $freq = 'WEEKLY' if $freq ne 'MONTHLY';
    my $interval = $cgi->param('interval') // 1;
    $interval = ( $interval =~ /^\d+$/sm && $interval > 0 ) ? int $interval : 1;
    my $ordinal = $cgi->param('ordinal');
    $ordinal = ( defined $ordinal && $ordinal =~ /^-?\d+$/sm ) ? int $ordinal : undef;
    my $until_date = $cgi->param('until_date');
    $until_date = undef if !$until_date || $until_date !~ /^\d{4}-\d{2}-\d{2}$/sm;

    my $rrule = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule::rrule_from_params(
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
        my $match = Koha::AuthorisedValues->search( { category => $cat, authorised_value => $location } )->count;
        if ( !$match ) {
            push @{$messages}, { type => 'danger', code => 'slot_location_not_in_av', value => $location, category => $cat };
            return;
        }
    }

    my @fields = (
        $rrule,
        $cgi->param('start_time'),
        $cgi->param('end_time'),
        $cgi->param('min_staff') // 1,
        $cgi->param('max_staff') // 1,
        $location, $cgi->param('slot_notes'),
    );

    my $slot_id = $cgi->param('slot_id');
    if ($slot_id) {
        my $original = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_slots WHERE id = ?}, undef, $slot_id );
        $dbh->do(
            q{
            UPDATE staff_roster_slots
            SET recurrence_rule = ?, start_time = ?, end_time = ?,
                min_staff = ?, max_staff = ?, location = ?, notes = ?, updated_at = NOW()
            WHERE id = ?
        }, undef, @fields, $slot_id
        );
        my $after = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_slots WHERE id = ?}, undef, $slot_id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'MODIFY', $slot_id, { entity => 'slot', %{ $after // {} } }, $original );
    }
    else {
        $dbh->do(
            q{
            INSERT INTO staff_roster_slots
            (roster_id, recurrence_rule, start_time, end_time, min_staff, max_staff, location, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        }, undef, $cgi->param('roster_id'), @fields
        );
        my $new_id = $dbh->last_insert_id( undef, undef, 'staff_roster_slots', undef );
        my $after  = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_slots WHERE id = ?}, undef, $new_id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'CREATE', $new_id, { entity => 'slot', %{ $after // {} } }, $after );
    }
    push @{$messages}, { type => 'success', code => 'slot_saved' };
    return;
}

sub delete_slot {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_manage_rosters', $messages );
    my $slot_id  = $cgi->param('slot_id');
    my $original = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_slots WHERE id = ?}, undef, $slot_id );
    my $ok       = $dbh->do( q{DELETE FROM staff_roster_slots WHERE id = ?}, undef, $slot_id );
    if ( $ok && $ok ne '0E0' ) {
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'DELETE', $slot_id, { entity => 'slot' }, $original );
        push @{$messages}, { type => 'success', code => 'slot_deleted' };
    }
    else {
        push @{$messages}, { type => 'danger', code => 'error_on_delete' };
    }
    return;
}

sub view_manage_slots {
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

    for my $slot ( @{$slots} ) {
        my $parsed = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule::parsed_rrule( $slot->{recurrence_rule} );
        $slot->{days_of_week_set} = { map { $_ => 1 } @{ $parsed->{dows} } };
        $slot->{days_label}       = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule::rrule_label( $slot->{recurrence_rule} );
        $slot->{rrule_freq}       = $parsed->{freq};
        $slot->{rrule_interval}   = $parsed->{interval};
        $slot->{rrule_ordinal}    = $parsed->{ordinal};
        $slot->{rrule_until}      = $parsed->{until_date};
    }

    my @desks;
    if ( $self->retrieve_data('use_koha_desks') && $roster && $roster->{branch_id} ) {
        @desks = Koha::Desks->search( { branchcode => $roster->{branch_id} }, { order_by => 'desk_name' } )->as_list;
    }

    my @av_locations;
    if ( $self->retrieve_data('use_authorised_value_locations') ) {
        my $cat = $self->retrieve_data('authorised_value_location_category')
            || 'STAFFROSTER_LOCATION';
        @av_locations = map { { value => $_->authorised_value, lib => $_->lib } }
            Koha::AuthorisedValues->search( { category => $cat }, { order_by => [ 'lib', 'authorised_value' ] } )->as_list;
    }

    $template->param(
        roster       => $roster,
        slots        => $slots,
        desks        => \@desks,
        av_locations => \@av_locations,
    );
    return;
}

sub view_assignments {
    my ( $self, $dbh, $cgi, $template ) = @_;
    my $roster_id  = $cgi->param('roster_id');
    my $week_start = $cgi->param('week_start')
        // Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::DateUtils::current_week_start();

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

1;
