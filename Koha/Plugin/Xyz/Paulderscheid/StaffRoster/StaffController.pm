package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::StaffController;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::StaffController -
Mojolicious controller for staff/patron lookup endpoints.

=head1 DESCRIPTION

Hosts /staff/available (filtered staff pool for the assignment picker),
/me/week (the session borrower's own shifts), and /me/open_slots (slots
the session borrower could self-claim). Self-service mutations live in
the AssignmentController under self_create / self_delete; see there for
the four-layer claim gate.

=head1 AUTHOR

Paul Derscheid <paulderscheid@gmail.com>

=cut

use Modern::Perl;

use Mojo::Base 'Mojolicious::Controller';

use C4::Context;
use Try::Tiny qw( catch try );

use Koha::DateUtils;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster;

=head1 API

=head2 Methods

=head3 available

Query: { date: YYYY-MM-DD, slot_id?, branch?, q? }.
Returns staff members not yet assigned to overlapping slots that day.
Filtered to category_type='S' (staff) by default — adjust if needed.

=cut

sub available {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_assign') ) {
            return $c->render(
                status  => 403,
                openapi => { error => 'staffroster_assign permission required' }
            );
        }

        my $date    = $c->req->param('date');
        my $slot_id = $c->req->param('slot_id');
        my $branch  = $c->req->param('branch');
        my $q       = $c->req->param('q');

        if ( !$date ) {
            return $c->render( status => 400, openapi => { error => 'date is required' } );
        }

        my $dbh = C4::Context->dbh;

        my $plugin           = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
        my @staff_categories = $plugin->_staff_categorycodes;

        my %slot_context;

        # If slot_id given, scope staff to the parent roster's branches in strict group mode.
        my @group_branches;
        my $group_label;
        if ($slot_id) {
            my $roster = $dbh->selectrow_hashref(
                q{
                SELECT r.*, lg.title AS group_title
                FROM staff_roster r
                JOIN staff_roster_slots s ON s.roster_id = r.id
                LEFT JOIN library_groups lg ON r.library_group_id = lg.id
                WHERE s.id = ?
            }, undef, $slot_id
            );
            if ($roster) {
                if ( !$plugin->_can_view_roster($roster) ) {
                    return $c->render( status => 403, openapi => { error => 'Not authorized for this roster' } );
                }
                if ( ( $plugin->retrieve_data('library_group_mode') // 'off' ) eq 'strict'
                    && $roster->{library_group_id} )
                {
                    @group_branches = $plugin->_branchcodes_for_roster($roster);
                    $group_label    = $roster->{group_title};
                }
            }
            my ( $s_start, $s_end )
                = $dbh->selectrow_array( q{SELECT start_time, end_time FROM staff_roster_slots WHERE id = ?},
                undef, $slot_id, );
            %slot_context = (
                slot_id    => $slot_id + 0,
                date       => $date,
                start_time => $s_start,
                end_time   => $s_end,
            ) if $s_start;
        }

        my $sql = q{
            SELECT p.borrowernumber AS patron_id,
                   p.firstname, p.surname, p.cardnumber, p.branchcode
            FROM borrowers p
            JOIN categories c ON p.categorycode = c.categorycode
            WHERE 1=1
        };
        my @params;

        if (@staff_categories) {
            $sql .= ' AND p.categorycode IN (' . join( q{,}, ('?') x @staff_categories ) . ')';
            push @params, @staff_categories;
        }
        else {
            $sql .= q{ AND c.category_type = 'S'};
        }

        if (@group_branches) {
            $sql .= ' AND p.branchcode IN (' . join( q{,}, ('?') x @group_branches ) . ')';
            push @params, @group_branches;
        }

        if ($branch) {
            $sql .= q{ AND p.branchcode = ?};
            push @params, $branch;
        }

        if ($q) {
            $sql .= q{ AND (p.firstname LIKE ? OR p.surname LIKE ? OR p.cardnumber LIKE ?)};
            my $like = "%$q%";
            push @params, $like, $like, $like;
        }

        if ($slot_id) {
            $sql .= q{
                AND p.borrowernumber NOT IN (
                    SELECT a.borrowernumber
                    FROM staff_roster_assignments a
                    JOIN staff_roster_slots s1 ON a.slot_id = s1.id
                    JOIN staff_roster_slots s2 ON s2.id = ?
                    WHERE a.assignment_date = ?
                      AND s1.start_time < s2.end_time
                      AND s2.start_time < s1.end_time
                )
            };
            push @params, $slot_id, $date;
        }
        else {
            $sql .= q{
                AND p.borrowernumber NOT IN (
                    SELECT borrowernumber FROM staff_roster_assignments WHERE assignment_date = ?
                )
            };
            push @params, $date;
        }

        my $limit = 200;
        $sql .= q{ ORDER BY p.surname, p.firstname LIMIT } . $limit;

        my $rows = $dbh->selectall_arrayref( $sql, { Slice => {} }, @params );

        # Build a "matches at all" baseline (no busy-on-this-date exclusion) so
        # the UI can show "free N of M staff". Run a parallel COUNT(*) with the
        # same category/branch filters but without the NOT IN exclusion.
        my $base_sql = q{
            SELECT COUNT(*)
            FROM borrowers p
            JOIN categories c ON p.categorycode = c.categorycode
            WHERE 1=1
        };
        my @base_params;
        if (@staff_categories) {
            $base_sql .= ' AND p.categorycode IN (' . join( q{,}, ('?') x @staff_categories ) . ')';
            push @base_params, @staff_categories;
        }
        else {
            $base_sql .= q{ AND c.category_type = 'S'};
        }
        if (@group_branches) {
            $base_sql .= ' AND p.branchcode IN (' . join( q{,}, ('?') x @group_branches ) . ')';
            push @base_params, @group_branches;
        }
        if ($branch) {
            $base_sql .= q{ AND p.branchcode = ?};
            push @base_params, $branch;
        }
        if ($q) {
            $base_sql .= q{ AND (p.firstname LIKE ? OR p.surname LIKE ? OR p.cardnumber LIKE ?)};
            my $like = "%$q%";
            push @base_params, $like, $like, $like;
        }
        my ($pool_size) = $dbh->selectrow_array( $base_sql, undef, @base_params );

        my $branch_scope
            = @group_branches ? { mode => 'group', label => $group_label, branches => \@group_branches }
            : $branch         ? { mode => 'branch', label => $branch, branches => [$branch] }
            :                   { mode => 'all', label => undef, branches => [] };

        return $c->render(
            status  => 200,
            openapi => {
                staff  => $rows,
                count  => scalar @{$rows},
                pool   => $pool_size + 0,
                limit  => $limit,
                filter => {
                    mode         => @staff_categories ? 'codes' : 'category_type_s',
                    codes        => \@staff_categories,
                    branch_scope => $branch_scope,
                    slot         => %slot_context ? \%slot_context : undef,
                    date         => $date,
                },
            },
        );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 me_week

Query: { start: YYYY-MM-DD }.
Returns the session borrower's own assignments across all rosters they can
view, grouped by date for the requested week. Used by the "My shifts" panel.

=cut

sub me_week {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_view') ) {
            return $c->render(
                status  => 403,
                openapi => { error => 'staffroster_view permission required' }
            );
        }

        my $user = $c->stash('koha.user');
        if ( !$user ) {
            return $c->render( status => 401, openapi => { error => 'Authentication required' } );
        }
        my $borrowernumber = $user->borrowernumber;

        my $week_start = _validated_week_start( $c->req->param('start') );

        my $dbh    = C4::Context->dbh;
        my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;

        my $rows = $dbh->selectall_arrayref(
            q{
            SELECT a.id AS assignment_id, a.slot_id, a.assignment_date, a.status,
                   a.notes, a.updated_at,
                   s.start_time, s.end_time, s.location,
                   r.id AS roster_id, r.name AS roster_name,
                   r.branch_id, r.library_group_id, r.roster_type_id,
                   rt.name AS type_name, rt.code AS type_code, rt.color AS type_color,
                   b.branchname AS branch_name,
                   lg.title AS group_name
            FROM staff_roster_assignments a
            JOIN staff_roster_slots s  ON a.slot_id = s.id
            JOIN staff_roster r        ON s.roster_id = r.id
            JOIN staff_roster_types rt ON r.roster_type_id = rt.id
            LEFT JOIN branches b       ON r.branch_id = b.branchcode
            LEFT JOIN library_groups lg ON r.library_group_id = lg.id
            WHERE a.borrowernumber = ?
              AND a.assignment_date BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
            ORDER BY a.assignment_date, s.start_time
        }, { Slice => {} }, $borrowernumber, $week_start, $week_start
        );

        # Defensive visibility filter: a borrower can have an old assignment on
        # a roster they no longer have access to (e.g. dropped from a group).
        # Don't surface those — the chip would link nowhere useful and the
        # action_logs already record the historical assignment.
        my %roster_seen;
        my %roster_ok;
        my @shifts;
        my @rosters;
        for my $row ( @{$rows} ) {
            my $rid = $row->{roster_id};
            if ( !exists $roster_ok{$rid} ) {
                $roster_ok{$rid} = $plugin->_can_view_roster(
                    {   id               => $rid,
                        branch_id        => $row->{branch_id},
                        library_group_id => $row->{library_group_id},
                    }
                ) ? 1 : 0;
            }
            next if !$roster_ok{$rid};

            if ( !$roster_seen{$rid}++ ) {
                push @rosters,
                    {
                    id          => $rid,
                    name        => $row->{roster_name},
                    type_name   => $row->{type_name},
                    type_code   => $row->{type_code},
                    type_color  => $row->{type_color},
                    branch_name => $row->{branch_name},
                    group_name  => $row->{group_name},
                    };
            }

            push @shifts,
                {
                assignment_id   => $row->{assignment_id},
                roster_id       => $rid,
                slot_id         => $row->{slot_id},
                assignment_date => $row->{assignment_date},
                start_time      => $row->{start_time},
                end_time        => $row->{end_time},
                location        => $row->{location},
                status          => $row->{status},
                notes           => $row->{notes},
                updated_at      => $row->{updated_at},
                };
        }

        return $c->render(
            status  => 200,
            openapi => {
                week_start => $week_start,
                rosters    => \@rosters,
                shifts     => \@shifts,
            },
        );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 me_open_slots

Query: { start: YYYY-MM-DD }.
Returns slot openings in the week the session borrower could self-claim:
visible roster, capacity remaining, not closed, no own overlap. Backs the
"Open shifts" panel. Self-assign feature must be enabled and borrower must
hold the staffroster_self_assign sub-perm.

=cut

sub me_open_slots {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_self_assign') ) {
            return $c->render(
                status  => 403,
                openapi => { error => 'staffroster_self_assign permission required' }
            );
        }

        my $user = $c->stash('koha.user');
        if ( !$user ) {
            return $c->render( status => 401, openapi => { error => 'Authentication required' } );
        }
        my $borrowernumber = $user->borrowernumber;

        my $week_start = _validated_week_start( $c->req->param('start') );

        my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
        if ( !$plugin->retrieve_data('staff_can_self_assign') ) {
            return $c->render(
                status  => 200,
                openapi => { week_start => $week_start, openings => [] }
            );
        }

        my $dbh = C4::Context->dbh;

        my $rosters = $dbh->selectall_arrayref(
            q{
            SELECT r.id, r.name, r.branch_id, r.library_group_id, r.effective_from,
                   rt.color AS type_color, rt.name AS type_name,
                   b.branchname AS branch_name
            FROM staff_roster r
            JOIN staff_roster_types rt ON r.roster_type_id = rt.id
            LEFT JOIN branches b ON r.branch_id = b.branchcode
            WHERE r.is_active = 1
        }, { Slice => {} }
        );

        my @visible = grep { $plugin->_can_view_roster($_) } @{ $rosters || [] };
        if ( !@visible ) {
            return $c->render(
                status  => 200,
                openapi => { week_start => $week_start, openings => [] }
            );
        }

        my @rids        = map { $_->{id} } @visible;
        my $rid_holders = join q{,}, ('?') x @rids;

        my $slots = $dbh->selectall_arrayref(
            q{
            SELECT id, roster_id, recurrence_rule, start_time, end_time,
                   min_staff, max_staff, location
            FROM staff_roster_slots
            WHERE roster_id IN (} . $rid_holders . q{)},
            { Slice => {} }, @rids,
        );

        if ( !$slots || !@{$slots} ) {
            return $c->render(
                status  => 200,
                openapi => { week_start => $week_start, openings => [] }
            );
        }

        my $start_dt = Koha::DateUtils::dt_from_string( $week_start, 'iso' );
        my $end_iso  = $start_dt->clone->add( days => 6 )->ymd;

        my @slot_ids     = map { $_->{id} } @{$slots};
        my $slot_holders = join q{,}, ('?') x @slot_ids;

        my $count_rows = $dbh->selectall_arrayref(
            q{
            SELECT slot_id, assignment_date, COUNT(*) AS n
            FROM staff_roster_assignments
            WHERE assignment_date BETWEEN ? AND ?
              AND slot_id IN (} . $slot_holders . q{)
            GROUP BY slot_id, assignment_date},
            { Slice => {} }, $week_start, $end_iso, @slot_ids,
        );
        my %count_for;
        for my $r ( @{$count_rows} ) {
            $count_for{ $r->{slot_id} }{ $r->{assignment_date} } = $r->{n};
        }

        # Borrower's own assignments in the window, used to suppress openings
        # that would conflict on submit. Saves a 409 round-trip per click.
        my $own = $dbh->selectall_arrayref(
            q{
            SELECT a.assignment_date, s.start_time, s.end_time
            FROM staff_roster_assignments a
            JOIN staff_roster_slots s ON a.slot_id = s.id
            WHERE a.borrowernumber = ?
              AND a.assignment_date BETWEEN ? AND ?
        }, { Slice => {} }, $borrowernumber, $week_start, $end_iso
        );
        my %own_by_date;
        for my $a ( @{$own} ) {
            push @{ $own_by_date{ $a->{assignment_date} } }, $a;
        }

        my %roster_by_id = map { $_->{id} => $_ } @visible;
        my @openings;

        for my $slot ( @{$slots} ) {
            my $roster = $roster_by_id{ $slot->{roster_id} } or next;
            my $cap    = $slot->{max_staff} // 1;
            for my $i ( 0 .. 6 ) {
                my $date = $start_dt->clone->add( days => $i )->ymd;
                next
                    if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_slot_applies_on( $slot->{recurrence_rule},
                    $date, $roster->{effective_from} );
                next if $plugin->_is_closed_for_roster( $roster, $date );

                my $taken     = $count_for{ $slot->{id} }{$date} // 0;
                my $remaining = $cap - $taken;
                next if $remaining <= 0;

                my $clash = 0;
                for my $a ( @{ $own_by_date{$date} || [] } ) {
                    if (   $a->{start_time} lt $slot->{end_time}
                        && $slot->{start_time} lt $a->{end_time} )
                    {
                        $clash = 1;
                        last;
                    }
                }
                next if $clash;

                push @openings,
                    {
                    roster_id          => $roster->{id},
                    roster_name        => $roster->{name},
                    type_name          => $roster->{type_name},
                    type_color         => $roster->{type_color},
                    branch_name        => $roster->{branch_name},
                    slot_id            => $slot->{id},
                    assignment_date    => $date,
                    start_time         => $slot->{start_time},
                    end_time           => $slot->{end_time},
                    location           => $slot->{location},
                    capacity_remaining => $remaining,
                    };
            }
        }

        @openings = sort {
                   $a->{assignment_date} cmp $b->{assignment_date}
                || $a->{start_time} cmp $b->{start_time}
                || $a->{roster_name} cmp $b->{roster_name}
        } @openings;

        return $c->render(
            status  => 200,
            openapi => {
                week_start => $week_start,
                openings   => \@openings,
            },
        );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 _current_week_start

Returns the YYYY-MM-DD of the most recent Monday in the Koha-configured
timezone, used as the fallback when the C<start> query param is absent
or malformed.

=cut

sub _current_week_start {
    return Koha::DateUtils::dt_from_string()->truncate( to => 'week' )->ymd;
}

=head3 _validated_week_start

Returns C<$input> when it parses as YYYY-MM-DD, otherwise falls back to
C<_current_week_start>. Keeps malformed input from flowing into
DATE_ADD bind values where it would silently coerce to NULL.

=cut

sub _validated_week_start {
    my ($input) = @_;
    return _current_week_start()
        unless defined $input && $input =~ /\A\d{4}-\d{2}-\d{2}\z/;
    return $input;
}

1;
