package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::AssignmentController;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::AssignmentController -
Mojolicious controller for staff_roster_assignments REST endpoints.

=head1 DESCRIPTION

Backs CREATE / MODIFY / DELETE on a single assignment, the bulk
move/clear endpoint, and the staff self-service claim/unclaim pair.
Every mutation gates on a sub-permission, runs through _conflict_check
(slot capacity + per-borrower overlap), and emits an action_logs entry
with the pre/post snapshot for diff support.

=head1 AUTHOR

Paul Derscheid <paulderscheid@gmail.com>

=cut

use Modern::Perl;

use Mojo::Base 'Mojolicious::Controller';

use C4::Context;
use Try::Tiny qw( catch try );

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility;

# JSON wire format uses Koha terminology: patron_id rather than the internal
# borrowernumber column name. _from_body / _to_response map between the two
# so handler bodies + response renderers don't have to think about it.
# Emit a CONFLICT_REJECTED action_logs row whenever a slot capacity /
# overlap / closure / visibility check rejects a 409. Lets admins
# reconstruct attempted-but-blocked assignments from tools/viewlog.pl
# without grepping warn lines. object_id stays undef because the
# rejected row never exists.
sub _audit_conflict {
    my ( $action, $slot_id, $borrowernumber, $date, $reason ) = @_;
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit(
        'CONFLICT_REJECTED',
        undef,
        {   entity          => 'assignment',
            action          => $action,
            slot_id         => $slot_id,
            borrowernumber  => $borrowernumber,
            assignment_date => $date,
            reason          => $reason,
        },
    );
    return;
}

sub _from_body {
    my ($body) = @_;
    return $body if !ref $body || ref $body ne 'HASH';
    my %out = %{$body};
    $out{borrowernumber} = delete $out{patron_id}
        if exists $out{patron_id} && !exists $out{borrowernumber};
    return \%out;
}

sub _to_response {
    my ($row) = @_;
    return $row if !ref $row || ref $row ne 'HASH';
    my %out = %{$row};
    $out{patron_id} = delete $out{borrowernumber}
        if exists $out{borrowernumber};
    return \%out;
}

=head1 API

=head2 Methods

=head3 create

Body: { slot_id, borrowernumber, assignment_date, status?, notes? }.
409 on slot full or staff overlap.

=cut

sub create {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_assign') ) {
            return $c->render( status => 403, openapi => { error => 'staffroster_assign permission required' } );
        }

        my $body = _from_body( $c->req->json // {} );
        my ( $slot_id, $borrowernumber, $date ) = @{$body}{qw( slot_id borrowernumber assignment_date )};

        if ( !$slot_id || !$borrowernumber || !$date ) {
            return $c->render(
                status  => 400,
                openapi => { error => 'slot_id, patron_id, assignment_date required' }
            );
        }

        my $dbh = C4::Context->dbh;

        my $gate = _gate_slot( $dbh, $slot_id, $date );
        return $c->render( status => $gate->{status}, openapi => { error => $gate->{error} } )
            if $gate->{error};

        my $conflict = _conflict_check( $dbh, $slot_id, $borrowernumber, $date );
        if ($conflict) {
            _audit_conflict( 'create', $slot_id, $borrowernumber, $date, $conflict );
            return $c->render( status => 409, openapi => { error => $conflict } );
        }

        my $assigned_by = $c->stash('koha.user') ? $c->stash('koha.user')->borrowernumber : undef;

        $dbh->do(
            q{
            INSERT INTO staff_roster_assignments
            (slot_id, borrowernumber, assignment_date, status, notes, assigned_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        },
            undef,
            $slot_id, $borrowernumber, $date,
            $body->{status} // 'scheduled',
            $body->{notes},
            $assigned_by,
        );

        my $id    = $dbh->last_insert_id( undef, undef, undef, undef );
        my $after = _load( $dbh, $id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'CREATE', $id, { entity => 'assignment', %{$after} },
            $after, );
        return $c->render( status => 201, openapi => _to_response($after) );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 update

Body: any of { slot_id, borrowernumber, assignment_date, status, notes }. Re-checks conflicts when key fields change.

=cut

sub update {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_assign') ) {
            return $c->render( status => 403, openapi => { error => 'staffroster_assign permission required' } );
        }

        my $id   = $c->validation->param('assignment_id');
        my $body = _from_body( $c->req->json // {} );
        my $dbh  = C4::Context->dbh;

        my $current = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_assignments WHERE id = ?}, undef, $id );
        if ( !$current ) {
            return $c->render( status => 404, openapi => { error => 'Assignment not found' } );
        }

        my %merged = ( %{$current}, %{$body} );

        my $changed_keys = grep { exists $body->{$_} && _changed( $body->{$_}, $current->{$_} ) }
            qw( slot_id borrowernumber assignment_date );

        if ($changed_keys) {
            my $gate = _gate_slot( $dbh, $merged{slot_id}, $merged{assignment_date} );
            return $c->render( status => $gate->{status}, openapi => { error => $gate->{error} } )
                if $gate->{error};

            my $conflict
                = _conflict_check( $dbh, $merged{slot_id}, $merged{borrowernumber}, $merged{assignment_date}, $id );
            if ($conflict) {
                _audit_conflict( 'update', $merged{slot_id}, $merged{borrowernumber}, $merged{assignment_date}, $conflict );
                return $c->render( status => 409, openapi => { error => $conflict } );
            }
        }

        $dbh->do(
            q{
            UPDATE staff_roster_assignments
            SET slot_id = ?, borrowernumber = ?, assignment_date = ?,
                status = ?, notes = ?, updated_at = NOW()
            WHERE id = ?
        },
            undef,
            @merged{qw( slot_id borrowernumber assignment_date status notes )},
            $id,
        );

        if ( exists $body->{additional_fields} ) {
            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields::save_from_map( $dbh,
                'staff_roster_assignments', $id, $body->{additional_fields} );
        }

        my $after = _load( $dbh, $id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit(
            'MODIFY', $id,
            {   entity  => 'assignment',
                changed => [ sort keys %{$body} ],
                %{$after},
            },
            $current,
        );

        return $c->render( status => 200, openapi => _to_response($after) );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 delete

=cut

sub delete {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_assign') ) {
            return $c->render( status => 403, openapi => { error => 'staffroster_assign permission required' } );
        }

        my $id  = $c->validation->param('assignment_id');
        my $dbh = C4::Context->dbh;

        my $original = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_assignments WHERE id = ?}, undef, $id );
        if ( !$original ) {
            return $c->render( status => 404, openapi => { error => 'Assignment not found' } );
        }

        $dbh->do( q{DELETE FROM staff_roster_assignments WHERE id = ?}, undef, $id );

        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'DELETE', $id, { entity => 'assignment' }, $original );

        return $c->render_resource_deleted;
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 bulk

Body: { op: 'move'|'clear', ids: [...], target?: { slot_id?, borrowernumber?, assignment_date? } }.

=cut

sub bulk {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_assign') ) {
            return $c->render( status => 403, openapi => { error => 'staffroster_assign permission required' } );
        }

        my $body = $c->req->json // {};
        my $op   = $body->{op}   // q{};
        my $ids  = $body->{ids}  // [];

        if ( !@{$ids} ) {
            return $c->render( status => 400, openapi => { error => 'ids must be a non-empty array' } );
        }

        my $dbh = C4::Context->dbh;

        my $env   = C4::Context->userenv;
        my $actor = $env ? $env->{number} : undef;

        if ( $op eq 'clear' ) {
            # One static prepared statement, executed per id, instead of
            # building an IN-list with interpolated placeholders.
            my $sth = $dbh->prepare(q{DELETE FROM staff_roster_assignments WHERE id = ?});
            $sth->execute($_) for @{$ids};
            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'DELETE', undef,
                { entity => 'assignment_bulk', op => 'clear', ids => $ids, actor => $actor } );
            return $c->render( status => 200, openapi => { deleted => scalar @{$ids} } );
        }

        if ( $op eq 'move' ) {
            my $target = _from_body( $body->{target} // {} );
            if ( !%{$target} ) {
                return $c->render( status => 400, openapi => { error => 'target required for move' } );
            }

            my @set_fields = grep { exists $target->{$_} } qw( slot_id borrowernumber assignment_date );
            if ( !@set_fields ) {
                return $c->render(
                    status  => 400,
                    openapi => { error => 'target must include slot_id, patron_id, or assignment_date' }
                );
            }

            # Pre-flight every id under one transaction. Fail on first
            # conflict to keep semantics consistent with the single-row
            # update endpoint — partial bulk moves were the original bug.
            $dbh->begin_work;
            my $error;
            # Always rewrite all three target columns from the merged row;
            # static SQL avoids composing a SET clause from variable column
            # names.
            my $update_sth = $dbh->prepare(
                q{UPDATE staff_roster_assignments
                    SET slot_id = ?, borrowernumber = ?, assignment_date = ?, updated_at = NOW()
                  WHERE id = ?}
            );
            for my $id ( @{$ids} ) {
                my $current = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_assignments WHERE id = ?}, undef, $id, );
                if ( !$current ) {
                    $error = { status => 404, body => { error => "assignment $id not found", id => $id + 0 } };
                    last;
                }

                my %merged = ( %{$current}, %{$target} );

                my $gate = _gate_slot( $dbh, $merged{slot_id}, $merged{assignment_date} );
                if ( $gate->{error} ) {
                    $error = { status => $gate->{status}, body => { error => $gate->{error}, id => $id + 0 } };
                    last;
                }

                my $conflict
                    = _conflict_check( $dbh, $merged{slot_id}, $merged{borrowernumber}, $merged{assignment_date}, $id, );
                if ($conflict) {
                    _audit_conflict( 'bulk_move', $merged{slot_id}, $merged{borrowernumber}, $merged{assignment_date}, $conflict );
                    $error = { status => 409, body => { error => $conflict, id => $id + 0 } };
                    last;
                }

                $update_sth->execute( $merged{slot_id}, $merged{borrowernumber}, $merged{assignment_date}, $id );
            }

            if ($error) {
                $dbh->rollback;
                return $c->render( status => $error->{status}, openapi => $error->{body} );
            }
            $dbh->commit;

            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'MODIFY', undef,
                { entity => 'assignment_bulk', op => 'move', ids => $ids, target => $target, actor => $actor } );
            return $c->render( status => 200, openapi => { updated => scalar @{$ids} } );
        }

        return $c->render( status => 400, openapi => { error => "unknown op: $op" } );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 self_create

Body: { slot_id, assignment_date }. Borrowernumber is taken from the session
and any value in the body is ignored — self-claim must always be self.
Refuses if `staff_can_self_assign` setting is off, the slot is closed for the
day, or the borrower already has an overlapping assignment.

=cut

sub self_create {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_self_assign') ) {
            return $c->render(
                status  => 403,
                openapi => { error => 'staffroster_self_assign permission required' }
            );
        }

        my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
        if ( !$plugin->retrieve_data('staff_can_self_assign') ) {
            return $c->render(
                status  => 403,
                openapi => { error => 'Self-service is disabled' }
            );
        }

        my $user = $c->stash('koha.user');
        if ( !$user ) {
            return $c->render( status => 401, openapi => { error => 'Authentication required' } );
        }
        my $borrowernumber = $user->borrowernumber;

        my $body    = $c->req->json // {};
        my $slot_id = $body->{slot_id};
        my $date    = $body->{assignment_date};
        if ( !$slot_id || !$date ) {
            return $c->render(
                status  => 400,
                openapi => { error => 'slot_id and assignment_date required' }
            );
        }

        my $dbh = C4::Context->dbh;

        my $gate = _gate_slot( $dbh, $slot_id, $date );
        return $c->render( status => $gate->{status}, openapi => { error => $gate->{error} } )
            if $gate->{error};

        # Self-claim never drops on a closure, regardless of strict mode. The
        # default _gate_slot only blocks on calendar when `koha_calendar_strict`
        # is set; for self-service we always block.
        my $roster_for_close = $dbh->selectrow_hashref(
            q{SELECT r.* FROM staff_roster r
              JOIN staff_roster_slots s ON s.roster_id = r.id
              WHERE s.id = ?}, undef, $slot_id
        );
        if (   $roster_for_close
            && Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility::is_closed_for_roster( $plugin, $roster_for_close, $date ) )
        {
            _audit_conflict( 'self_claim', $slot_id, $borrowernumber, $date, 'Date is closed' );
            return $c->render( status => 409, openapi => { error => 'Date is closed' } );
        }

        my $conflict = _conflict_check( $dbh, $slot_id, $borrowernumber, $date );
        if ($conflict) {
            _audit_conflict( 'self_claim', $slot_id, $borrowernumber, $date, $conflict );
            return $c->render( status => 409, openapi => { error => $conflict } );
        }

        $dbh->do(
            q{
            INSERT INTO staff_roster_assignments
            (slot_id, borrowernumber, assignment_date, status, notes, assigned_by, created_at, updated_at)
            VALUES (?, ?, ?, 'scheduled', NULL, ?, NOW(), NOW())
        },
            undef,
            $slot_id, $borrowernumber, $date,
            $borrowernumber,
        );

        my $id    = $dbh->last_insert_id( undef, undef, undef, undef );
        my $after = _load( $dbh, $id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'SELF_CLAIM', $id, { entity => 'assignment', %{$after} },
            $after, );
        return $c->render( status => 201, openapi => _to_response($after) );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

=head3 self_delete

Drop one of your own assignments. Rejects if the assignment isn't yours.
Audited as SELF_UNCLAIM so the action_logs distinguish from manager deletes.

=cut

sub self_delete {
    my $c = shift->openapi->valid_input or return;

    return try {
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_self_assign') ) {
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

        my $id  = $c->validation->param('assignment_id');
        my $dbh = C4::Context->dbh;

        my $original = $dbh->selectrow_hashref(
            q{SELECT a.*, s.start_time
              FROM staff_roster_assignments a
              JOIN staff_roster_slots s ON a.slot_id = s.id
              WHERE a.id = ?}, undef, $id
        );
        if ( !$original ) {
            return $c->render( status => 404, openapi => { error => 'Assignment not found' } );
        }
        if ( $original->{borrowernumber} != $borrowernumber ) {
            return $c->render( status => 403, openapi => { error => 'Not your assignment' } );
        }

        # Lockout window: refuse to drop a shift inside the configured
        # cooldown so managers aren't surprised by a no-show right before
        # the desk opens. 0 (default) disables the gate entirely.
        my $plugin  = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
        my $lockout = int( $plugin->retrieve_data('self_unclaim_lockout_hours') || 0 );
        if ( $lockout > 0 ) {
            my $shift_start
                = eval { Koha::DateUtils::dt_from_string( "$original->{assignment_date} $original->{start_time}", 'iso' ); };
            if ($shift_start) {
                my $hours_until = ( $shift_start->epoch - time ) / 3600;
                if ( $hours_until < $lockout ) {
                    return $c->render(
                        status  => 403,
                        openapi => {
                            error             => "Self-unclaim closed: must drop at least ${lockout}h before the shift",
                            hours_until_shift => sprintf( '%.2f', $hours_until ),
                            lockout_hours     => $lockout,
                        },
                    );
                }
            }
        }

        # Drop the joined slot column before passing the row through to
        # the audit diff so the snapshot mirrors the table schema.
        delete $original->{start_time};

        $dbh->do( q{DELETE FROM staff_roster_assignments WHERE id = ?}, undef, $id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'SELF_UNCLAIM', $id,
            { entity => 'assignment', borrowernumber => $borrowernumber }, $original, );
        return $c->render_resource_deleted;
    }
    catch {
        $c->unhandled_exception($_);
    };
}

# Gate a slot+date against visibility (parent roster) and Koha calendar hard mode.
# Returns { status => HTTP, error => message } on rejection, empty hash on pass.
sub _gate_slot {
    my ( $dbh, $slot_id, $date ) = @_;
    my $roster = $dbh->selectrow_hashref(
        q{
        SELECT r.* FROM staff_roster r
        JOIN staff_roster_slots s ON s.roster_id = r.id
        WHERE s.id = ?
    }, undef, $slot_id
    );
    return { status => 404, error => 'Slot or roster not found' } if !$roster;

    my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;

    if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility::can_view_roster( $plugin, $roster ) ) {
        return { status => 403, error => 'Not authorized for this roster' };
    }

    if (   $plugin->retrieve_data('use_koha_calendar')
        && $plugin->retrieve_data('koha_calendar_strict')
        && Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility::is_closed_for_roster( $plugin, $roster, $date ) )
    {
        return { status => 409, error => 'Date is closed per Koha calendar' };
    }

    return {};
}

sub _changed {
    my ( $a, $b ) = @_;
    return 1 if !defined $a && defined $b;
    return 1 if defined $a  && !defined $b;
    return 0 if !defined $a && !defined $b;
    return $a ne $b;
}

sub _conflict_check {
    my ( $dbh, $slot_id, $borrowernumber, $date, $exclude_id ) = @_;

    my ( $max_staff, $rrule, $anchor ) = $dbh->selectrow_array(
        q{SELECT s.max_staff, s.recurrence_rule, r.effective_from
          FROM staff_roster_slots s
          JOIN staff_roster r ON s.roster_id = r.id
          WHERE s.id = ?},
        undef, $slot_id
    );
    return 'Slot not found' if !defined $max_staff;

    if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule::slot_applies_on( $rrule, $date, $anchor ) ) {
        return 'Slot does not run on that day';
    }

    my $filled;
    if ($exclude_id) {
        ($filled) = $dbh->selectrow_array(
            q{SELECT COUNT(*) FROM staff_roster_assignments
              WHERE slot_id = ? AND assignment_date = ? AND id != ?},
            undef, $slot_id, $date, $exclude_id,
        );
    }
    else {
        ($filled) = $dbh->selectrow_array(
            q{SELECT COUNT(*) FROM staff_roster_assignments
              WHERE slot_id = ? AND assignment_date = ?},
            undef, $slot_id, $date,
        );
    }
    return "Slot full ($filled/$max_staff)" if $filled >= $max_staff;

    my $double;
    if ($exclude_id) {
        ($double) = $dbh->selectrow_array(
            q{SELECT COUNT(*) FROM staff_roster_assignments a
              JOIN staff_roster_slots s1 ON a.slot_id = s1.id
              JOIN staff_roster_slots s2 ON s2.id = ?
              WHERE a.borrowernumber = ?
                AND a.assignment_date = ?
                AND s1.start_time < s2.end_time
                AND s2.start_time < s1.end_time
                AND a.id != ?},
            undef, $slot_id, $borrowernumber, $date, $exclude_id,
        );
    }
    else {
        ($double) = $dbh->selectrow_array(
            q{SELECT COUNT(*) FROM staff_roster_assignments a
              JOIN staff_roster_slots s1 ON a.slot_id = s1.id
              JOIN staff_roster_slots s2 ON s2.id = ?
              WHERE a.borrowernumber = ?
                AND a.assignment_date = ?
                AND s1.start_time < s2.end_time
                AND s2.start_time < s1.end_time},
            undef, $slot_id, $borrowernumber, $date,
        );
    }
    return 'Staff already assigned to overlapping slot that day' if $double > 0;

    return;
}

sub _load {
    my ( $dbh, $id ) = @_;
    my $row = $dbh->selectrow_hashref(
        q{
        SELECT a.id, a.slot_id, a.borrowernumber, a.assignment_date, a.status,
               a.notes, a.assigned_by, a.updated_at,
               p.firstname, p.surname, p.cardnumber
        FROM staff_roster_assignments a
        JOIN borrowers p ON a.borrowernumber = p.borrowernumber
        WHERE a.id = ?
    }, undef, $id
    );
    return if !$row;

    my $af = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields::load( $dbh, 'staff_roster_assignments', $id );
    $row->{additional_fields} = $af->{values};
    return $row;
}

1;
