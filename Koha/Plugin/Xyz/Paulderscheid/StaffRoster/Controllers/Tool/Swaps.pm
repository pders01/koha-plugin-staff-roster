package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Swaps -
Shift swap workflow handlers + the manage_swaps renderer.

=head1 DESCRIPTION

Lifecycle:
  pending -> approved : the from_assignment is reassigned to the target
                        staff member; if a to_assignment_id was given, the
                        two assignments swap borrowers
  pending -> rejected : no reassignment, status set, responded_at stamped
  pending -> cancelled : same shape but only the requester can cancel

Approval gate:
  When require_swap_approval='1', only superlibrarians can approve. The
  target can still reject. When the setting is '0', the target also gets
  the approve button (covers the small-team case where double approval is
  bureaucratic overhead).

=cut

use Modern::Perl;

use C4::Context;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;

sub request_swap {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_swap_request', $messages );

    my $roster_id          = $cgi->param('roster_id');
    my $from_assignment_id = $cgi->param('from_assignment_id');
    my $to_borrowernumber  = $cgi->param('to_borrowernumber');
    my $to_assignment_id   = $cgi->param('to_assignment_id') || undef;
    my $request_message    = $cgi->param('request_message');

    if ( !$from_assignment_id || !$to_borrowernumber ) {
        push @{$messages}, { type => 'danger', code => 'swap_missing_fields' };
        return;
    }

    # Sanity-check that from_assignment belongs to the roster being viewed so
    # a forged roster_id can't reach across rosters in the manage_swaps view.
    my ($belongs) = $dbh->selectrow_array(
        q{SELECT 1 FROM staff_roster_assignments a
            JOIN staff_roster_slots s ON a.slot_id = s.id
           WHERE a.id = ? AND s.roster_id = ?},
        undef, $from_assignment_id, $roster_id
    );
    if ( !$belongs ) {
        push @{$messages}, { type => 'danger', code => 'swap_assignment_mismatch' };
        return;
    }

    # Ownership check: requester can only surrender their own shift. The
    # dropdown is server-filtered to own_assignments, so this guards against a
    # forged from_assignment_id post.
    my $env          = C4::Context->userenv;
    my $current_bn   = $env ? $env->{number} : undef;
    my ($from_owner) = $dbh->selectrow_array( q{SELECT borrowernumber FROM staff_roster_assignments WHERE id = ?},
        undef, $from_assignment_id );
    if ( !defined $from_owner || !defined $current_bn || $from_owner != $current_bn ) {
        push @{$messages}, { type => 'danger', code => 'swap_not_your_shift' };
        return;
    }

    $dbh->do(
        q{INSERT INTO staff_roster_swap_requests
          (from_assignment_id, to_borrowernumber, to_assignment_id, status,
           request_message, requested_at, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', ?, NOW(), NOW(), NOW())},
        undef, $from_assignment_id, $to_borrowernumber, $to_assignment_id, $request_message
    );
    my $swap_id = $dbh->last_insert_id( undef, undef, 'staff_roster_swap_requests', undef );
    my $after   = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_swap_requests WHERE id = ?}, undef, $swap_id );
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'CREATE', $swap_id, { entity => 'swap_request', %{ $after // {} } }, $after, );
    push @{$messages}, { type => 'success', code => 'swap_requested' };
    return;
}

sub respond_swap {
    my ( $self, $dbh, $cgi, $messages ) = @_;

    my $swap_id  = $cgi->param('swap_id');
    my $decision = $cgi->param('decision') // q{};
    my $response = $cgi->param('response_message');

    if ( $decision !~ /^(approve|reject)$/sm ) {
        push @{$messages}, { type => 'danger', code => 'swap_bad_decision' };
        return;
    }

    my $swap = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_swap_requests WHERE id = ?}, undef, $swap_id );
    if ( !$swap || $swap->{status} ne 'pending' ) {
        push @{$messages}, { type => 'danger', code => 'swap_not_pending' };
        return;
    }

    # Approve gating: when require_swap_approval is on, only the manager perm
    # may approve. When off, the target staff member may also approve via
    # staffroster_swap_respond. Reject only requires the respond perm (or
    # manager). Superlibs always pass via has_perm.
    my $env            = C4::Context->userenv;
    my $is_target      = $env && $env->{number} && $swap->{to_borrowernumber} == $env->{number};
    my $approval_gated = ( $self->retrieve_data('require_swap_approval') // '1' ) eq '1';

    if ( $decision eq 'approve' ) {
        my $ok = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_swap_approve');
        $ok ||= ( !$approval_gated && $is_target && Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_swap_respond') );
        if ( !$ok ) {
            push @{$messages}, { type => 'danger', code => 'swap_needs_manager' };
            return;
        }
    }
    else {    # reject
        my $ok = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_swap_approve')
            || ( $is_target && Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_swap_respond') );
        if ( !$ok ) {
            push @{$messages}, { type => 'danger', code => 'swap_not_authorised' };
            return;
        }
    }

    my $new_status = $decision eq 'approve' ? 'approved' : 'rejected';

    # Wrap the approve path: a mutual swap touches three rows (from, to,
    # status). Without the txn, a deadlock between (1) and (2) would leave
    # one assignment already mutated while the swap still reads pending; the
    # next approver would re-read the wrong from_borrower and double-swap.
    # Re-check status under the lock to close the TOCTOU window between two
    # concurrent approves.
    my $ok = eval {
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::txn(
            $dbh,
            sub {
                my ($current_status)
                    = $dbh->selectrow_array( q{SELECT status FROM staff_roster_swap_requests WHERE id = ? FOR UPDATE},
                    undef, $swap_id );
                die "swap_no_longer_pending\n" if !$current_status || $current_status ne 'pending';

                if ( $decision eq 'approve' ) {

                    # Capture from_borrower before mutating the from_assignment so a
                    # later mutual update doesn't pick up the just-written value.
                    my $from_borrower;
                    if ( $swap->{to_assignment_id} ) {
                        ($from_borrower)
                            = $dbh->selectrow_array( q{SELECT borrowernumber FROM staff_roster_assignments WHERE id = ?},
                            undef, $swap->{from_assignment_id} );
                    }
                    $dbh->do(
                        q{UPDATE staff_roster_assignments SET borrowernumber = ?, updated_at = NOW() WHERE id = ?},
                        undef,
                        $swap->{to_borrowernumber},
                        $swap->{from_assignment_id}
                    );
                    if ( $swap->{to_assignment_id} && $from_borrower ) {
                        $dbh->do( q{UPDATE staff_roster_assignments SET borrowernumber = ?, updated_at = NOW() WHERE id = ?},
                            undef, $from_borrower, $swap->{to_assignment_id} );
                    }
                }

                $dbh->do(
                    q{UPDATE staff_roster_swap_requests
                    SET status = ?, response_message = ?, responded_at = NOW(), updated_at = NOW()
                  WHERE id = ?},
                    undef, $new_status, $response, $swap_id
                );
            }
        );
        1;
    };
    if ( !$ok ) {
        my $err = $@ // 'unknown';
        if ( $err =~ /swap_no_longer_pending/ ) {
            push @{$messages}, { type => 'danger', code => 'swap_not_pending' };
        }
        else {
            warn "StaffRoster: swap respond txn failed: $err";
            push @{$messages}, { type => 'danger', code => 'swap_txn_failed' };
        }
        return;
    }

    my $after = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_swap_requests WHERE id = ?}, undef, $swap_id );
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit(
        'MODIFY', $swap_id,
        {   entity   => 'swap_request',
            decision => $new_status,
            actor    => $env ? $env->{number} : undef,
            %{ $after // {} },
        },
        $swap,
    );

    push @{$messages}, { type => 'success', code => $decision eq 'approve' ? 'swap_approved' : 'swap_rejected' };
    return;
}

sub cancel_swap {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_swap_request', $messages );
    my $swap_id = $cgi->param('swap_id');
    my $env     = C4::Context->userenv;

    my $swap = $dbh->selectrow_hashref(
        q{SELECT s.*, a.borrowernumber AS from_borrowernumber
            FROM staff_roster_swap_requests s
            JOIN staff_roster_assignments  a ON s.from_assignment_id = a.id
           WHERE s.id = ?},
        undef, $swap_id
    );
    if ( !$swap || $swap->{status} ne 'pending' ) {
        push @{$messages}, { type => 'danger', code => 'swap_not_pending' };
        return;
    }

    # Requester can always cancel their own pending swap (provided they still
    # hold staffroster_swap_request); managers can cancel anyone's.
    my $is_owner = $env && $env->{number} && $swap->{from_borrowernumber} == $env->{number};
    my $ok       = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_swap_approve')
        || ( $is_owner && Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_swap_request') );
    if ( !$ok ) {
        push @{$messages}, { type => 'danger', code => 'swap_not_authorised' };
        return;
    }

    my $txn_ok = eval {
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::txn(
            $dbh,
            sub {
                $dbh->do(
                    q{UPDATE staff_roster_swap_requests
                        SET status = 'cancelled', responded_at = NOW(), updated_at = NOW()
                      WHERE id = ? AND status = 'pending'},
                    undef, $swap_id
                );
                my $after = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_swap_requests WHERE id = ?}, undef, $swap_id );
                Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'MODIFY', $swap_id, { entity => 'swap_request', decision => 'cancelled', %{ $after // {} } }, $swap, );
            }
        );
        1;
    };
    if ( !$txn_ok ) {
        warn "StaffRoster: swap cancel txn failed: " . ( $@ // 'unknown' );
        push @{$messages}, { type => 'danger', code => 'swap_txn_failed' };
        return;
    }
    push @{$messages}, { type => 'success', code => 'swap_cancelled' };
    return;
}

sub view_manage_swaps {
    my ( $self, $dbh, $cgi, $template ) = @_;
    my $roster_id = $cgi->param('roster_id');

    my $roster = $dbh->selectrow_hashref(
        q{SELECT r.*, rt.name AS type_name, rt.color AS type_color, b.branchname AS branch_name
            FROM staff_roster r
            JOIN staff_roster_types rt ON r.roster_type_id = rt.id
       LEFT JOIN branches b ON r.branch_id = b.branchcode
           WHERE r.id = ?},
        undef, $roster_id
    );

    my $swaps = $dbh->selectall_arrayref(
        q{SELECT sr.*, a.assignment_date AS from_date, a.borrowernumber AS from_borrowernumber,
                 sl.start_time AS from_start, sl.end_time AS from_end, sl.location AS from_location,
                 fp.firstname AS from_firstname, fp.surname AS from_surname,
                 tp.firstname AS to_firstname,   tp.surname AS to_surname
            FROM staff_roster_swap_requests sr
            JOIN staff_roster_assignments a  ON sr.from_assignment_id = a.id
            JOIN staff_roster_slots       sl ON a.slot_id = sl.id
            JOIN borrowers fp ON a.borrowernumber = fp.borrowernumber
            JOIN borrowers tp ON sr.to_borrowernumber = tp.borrowernumber
           WHERE sl.roster_id = ?
        ORDER BY (sr.status = 'pending') DESC, sr.requested_at DESC},
        { Slice => {} }, $roster_id
    );

    my $env_user   = C4::Context->userenv;
    my $current_bn = $env_user ? $env_user->{number} : undef;

    # Upcoming assignments on this roster, joined with borrower for the
    # "In exchange for" dropdown. Filtered client-side to the selected
    # to_borrowernumber so the requester only sees that staffer's shifts.
    my $assignments = $dbh->selectall_arrayref(
        q{SELECT a.id, a.borrowernumber, a.assignment_date,
                 p.firstname, p.surname,
                 sl.start_time, sl.end_time
            FROM staff_roster_assignments a
            JOIN staff_roster_slots       sl ON a.slot_id = sl.id
            JOIN borrowers                p  ON a.borrowernumber = p.borrowernumber
           WHERE sl.roster_id = ?
             AND a.assignment_date >= CURRENT_DATE()
             AND a.status IN ('scheduled', 'confirmed')
        ORDER BY a.assignment_date, sl.start_time},
        { Slice => {} }, $roster_id
    );

    # Own upcoming shifts populate the "Give up shift" dropdown. Server-side
    # filter so users can't surrender someone else's shift even with a forged
    # form post (handler also enforces the same invariant).
    my @own_assignments
        = defined $current_bn
        ? grep { $_->{borrowernumber} == $current_bn } @{ $assignments || [] }
        : ();

    my @categorycodes = $self->_staff_categorycodes;
    my $staff_sql     = q{SELECT borrowernumber, firstname, surname, cardnumber FROM borrowers};
    my @staff_params;
    if (@categorycodes) {
        $staff_sql .= ' WHERE categorycode IN (' . join( q{,}, ('?') x @categorycodes ) . ')';
        @staff_params = @categorycodes;
    }
    else {
        $staff_sql .= q{ JOIN categories c ON borrowers.categorycode = c.categorycode WHERE c.category_type = 'S'};
    }
    $staff_sql .= q{ ORDER BY surname, firstname LIMIT 500};
    my $staff = $dbh->selectall_arrayref( $staff_sql, { Slice => {} }, @staff_params );

    my $is_superlib    = $env_user && ( ( $env_user->{flags} // 0 ) == 1 || ( ( $env_user->{flags} // 0 ) & 1 ) );
    my $approval_gated = ( $self->retrieve_data('require_swap_approval') // '1' ) eq '1';

    $template->param(
        roster                 => $roster,
        swaps                  => $swaps,
        roster_assignments     => $assignments,
        own_assignments        => \@own_assignments,
        candidate_staff        => $staff,
        current_borrowernumber => $current_bn,
        is_superlib            => $is_superlib    ? 1 : 0,
        approval_gated         => $approval_gated ? 1 : 0,
    );
    return;
}

1;
