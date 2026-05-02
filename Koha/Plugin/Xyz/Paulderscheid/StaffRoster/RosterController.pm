package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::RosterController;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::RosterController -
Mojolicious controller exposing a roster's week view via REST.

=head1 DESCRIPTION

Returns the assembled week JSON for the schedule grid: roster header,
slots (decorated with applies_on_dates per the recurrence rule),
assignments in the window, additional fields, and exceptions merged
with Koha calendar closures when use_koha_calendar is on.

=head1 AUTHOR

Paul Derscheid <paulderscheid@gmail.com>

=cut

use Modern::Perl;

use Mojo::Base 'Mojolicious::Controller';

use C4::Context;
use Try::Tiny qw( catch try );

use Koha::AuthorisedValues;
use Koha::DateUtils;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster;

=head1 API

=head2 Methods

=head3 get_week

Returns roster slots, assignments, and exceptions for a 7-day window.

Query params: start (YYYY-MM-DD; defaults to current week's Monday).
Response: { roster, slots, assignments, exceptions, week_start }.

=cut

sub get_week {
    my $c = shift->openapi->valid_input or return;

    return try {
        my $roster_id     = $c->validation->param('roster_id');
        my $start_param   = $c->req->param('start');
        my $week_start
            = ( defined $start_param && $start_param =~ /\A\d{4}-\d{2}-\d{2}\z/ )
            ? $start_param
            : _current_week_start();

        my $dbh = C4::Context->dbh;

        my $roster = $dbh->selectrow_hashref(
            q{
            SELECT r.id, r.name, r.description, r.branch_id, r.library_group_id, r.roster_type_id,
                   r.effective_from, r.effective_to, r.is_active,
                   rt.name AS type_name, rt.code AS type_code, rt.color AS type_color,
                   b.branchname AS branch_name,
                   lg.title AS group_name
            FROM staff_roster r
            JOIN staff_roster_types rt ON r.roster_type_id = rt.id
            LEFT JOIN branches b ON r.branch_id = b.branchcode
            LEFT JOIN library_groups lg ON r.library_group_id = lg.id
            WHERE r.id = ?
        }, undef, $roster_id
        );

        if ( !$roster ) {
            return $c->render( status => 404, openapi => { error => 'Roster not found' } );
        }

        my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
        if ( !$plugin->_can_view_roster($roster) ) {
            return $c->render( status => 403, openapi => { error => 'Not authorized for this roster' } );
        }

        my $slots = $dbh->selectall_arrayref(
            q{
            SELECT id, recurrence_rule, start_time, end_time,
                   min_staff, max_staff, location, notes
            FROM staff_roster_slots
            WHERE roster_id = ?
            ORDER BY start_time, recurrence_rule
        }, { Slice => {} }, $roster_id
        );

        # Decorate slots with iCal BYDAY codes (legacy weekday filter) plus the
        # canonical per-date applies list for the visible week. The dates list
        # honors INTERVAL/UNTIL/MONTHLY ordinals; the client should prefer it.
        my $week_anchor = Koha::DateUtils::dt_from_string( $week_start, 'iso' );
        my $rec_anchor  = $roster->{effective_from};
        for my $slot ( @{$slots} ) {
            $slot->{days_of_week} =
                Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_byday_from_rrule( $slot->{recurrence_rule} );
            my @applies;
            for my $i ( 0 .. 6 ) {
                my $date = $week_anchor->clone->add( days => $i )->ymd;
                push @applies, $date
                    if Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_slot_applies_on(
                    $slot->{recurrence_rule}, $date, $rec_anchor );
            }
            $slot->{applies_on_dates} = \@applies;
        }

        my $assignments = $dbh->selectall_arrayref(
            q{
            SELECT a.id, a.slot_id, a.borrowernumber AS patron_id, a.assignment_date,
                   a.status, a.notes, a.assigned_by, a.updated_at,
                   p.firstname, p.surname, p.cardnumber
            FROM staff_roster_assignments a
            JOIN staff_roster_slots s ON a.slot_id = s.id
            JOIN borrowers p ON a.borrowernumber = p.borrowernumber
            WHERE s.roster_id = ?
              AND a.assignment_date BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
            ORDER BY a.assignment_date, s.start_time
        }, { Slice => {} }, $roster_id, $week_start, $week_start
        );

        # Bulk-load per-assignment additional field values for the week.
        my $assignment_fields = $dbh->selectall_arrayref(
            q{SELECT id, name, authorised_value_category, repeatable
              FROM additional_fields WHERE tablename = ? ORDER BY id},
            { Slice => {} }, 'staff_roster_assignments'
        ) || [];
        if ( @{$assignment_fields} ) {
            # Dedupe by category before hitting AuthorisedValues so two fields
            # sharing a category (or the same field across many polls) only
            # cost one query instead of one per field per poll.
            my %by_cat;
            for my $f ( @{$assignment_fields} ) {
                $by_cat{ $f->{authorised_value_category} } = 1
                    if $f->{authorised_value_category};
            }
            for my $cat ( keys %by_cat ) {
                $by_cat{$cat} = [
                    map { { value => $_->authorised_value, lib => $_->lib } }
                        Koha::AuthorisedValues->search(
                        { category => $cat },
                        { order_by => [ 'lib', 'authorised_value' ] }
                        )->as_list
                ];
            }
            for my $f ( @{$assignment_fields} ) {
                next if !$f->{authorised_value_category};
                $f->{av_options} = $by_cat{ $f->{authorised_value_category} };
            }
        }
        if ( @{$assignments} && @{$assignment_fields} ) {
            my $af_values = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_bulk_additional_field_values(
                $dbh, 'staff_roster_assignments', [ map { $_->{id} } @{$assignments} ] );
            for my $a ( @{$assignments} ) {
                $a->{additional_fields} = $af_values->{ $a->{id} } || {};
            }
        }

        my $exceptions = $dbh->selectall_arrayref(
            q{
            SELECT id, exception_date, exception_type, reason
            FROM staff_roster_exceptions
            WHERE roster_id = ?
              AND exception_date BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
            ORDER BY exception_date
        }, { Slice => {} }, $roster_id, $week_start, $week_start
        );

        # Merge Koha calendar closures (if enabled) into exceptions for the week.
        if ( $plugin->retrieve_data('use_koha_calendar') ) {
            my %seen = map { $_->{exception_date} => 1 } @{$exceptions};
            my $start_dt = Koha::DateUtils::dt_from_string( $week_start, 'iso' );
            for my $i ( 0 .. 6 ) {
                my $date = $start_dt->clone->add( days => $i )->ymd;
                next if $seen{$date};
                if ( $plugin->_is_closed_for_roster( $roster, $date ) ) {
                    push @{$exceptions},
                        {
                        id             => undef,
                        exception_date => $date,
                        exception_type => 'closed',
                        reason         => 'Koha calendar',
                        source         => 'calendar',
                        };
                }
            }
        }

        return $c->render(
            status  => 200,
            openapi => {
                roster            => $roster,
                slots             => $slots,
                assignments       => $assignments,
                assignment_fields => $assignment_fields,
                exceptions        => $exceptions,
                week_start        => $week_start,
            },
        );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 _current_week_start

Default fallback for the C<start> query param. Returns the YYYY-MM-DD of
the most recent Monday in the Koha-configured timezone (DateTime's
truncate(week) anchors to Monday).

=cut

sub _current_week_start {
    return Koha::DateUtils::dt_from_string()->truncate( to => 'week' )->ymd;
}

1;
