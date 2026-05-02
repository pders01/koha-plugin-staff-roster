package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::AssignmentController;

use Modern::Perl;

use Mojo::Base 'Mojolicious::Controller';

use C4::Context;
use Try::Tiny qw( catch try );

=head1 API

=head2 Methods

=head3 create

Body: { slot_id, borrowernumber, assignment_date, status?, notes? }.
409 on slot full or staff overlap.

=cut

sub create {
    my $c = shift->openapi->valid_input or return;

    return try {
        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_assign') ) {
            return $c->render( status => 403, openapi => { error => 'staffroster_assign permission required' } );
        }

        my $body = $c->req->json // {};
        my ( $slot_id, $borrowernumber, $date ) = @{$body}{qw( slot_id borrowernumber assignment_date )};

        if ( !$slot_id || !$borrowernumber || !$date ) {
            return $c->render( status => 400,
                openapi => { error => 'slot_id, borrowernumber, assignment_date required' } );
        }

        my $dbh = C4::Context->dbh;

        my $gate = _gate_slot( $dbh, $slot_id, $date );
        return $c->render( status => $gate->{status}, openapi => { error => $gate->{error} } )
            if $gate->{error};

        my $conflict = _conflict_check( $dbh, $slot_id, $borrowernumber, $date );
        if ($conflict) {
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
        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_audit(
            'CREATE', $id,
            { entity => 'assignment', %{$after} },
            $after,
        );
        return $c->render( status => 201, openapi => $after );
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
        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_assign') ) {
            return $c->render( status => 403, openapi => { error => 'staffroster_assign permission required' } );
        }

        my $id   = $c->validation->param('assignment_id');
        my $body = $c->req->json // {};
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
            require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_save_additional_fields_from_map(
                $dbh, 'staff_roster_assignments', $id, $body->{additional_fields}
            );
        }

        my $after = _load( $dbh, $id );
        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_audit(
            'MODIFY', $id,
            {   entity  => 'assignment',
                changed => [ sort keys %{$body} ],
                %{$after},
            },
            $current,
        );

        return $c->render( status => 200, openapi => $after );
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
        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_assign') ) {
            return $c->render( status => 403, openapi => { error => 'staffroster_assign permission required' } );
        }

        my $id  = $c->validation->param('assignment_id');
        my $dbh = C4::Context->dbh;

        my $original = $dbh->selectrow_hashref(
            q{SELECT * FROM staff_roster_assignments WHERE id = ?}, undef, $id );
        if ( !$original ) {
            return $c->render( status => 404, openapi => { error => 'Assignment not found' } );
        }

        $dbh->do( q{DELETE FROM staff_roster_assignments WHERE id = ?}, undef, $id );

        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_audit(
            'DELETE', $id, { entity => 'assignment' }, $original );

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
        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_assign') ) {
            return $c->render( status => 403, openapi => { error => 'staffroster_assign permission required' } );
        }

        my $body = $c->req->json // {};
        my $op   = $body->{op}   // q{};
        my $ids  = $body->{ids}  // [];

        if ( !@{$ids} ) {
            return $c->render( status => 400, openapi => { error => 'ids must be a non-empty array' } );
        }

        my $dbh          = C4::Context->dbh;
        my $placeholders = join q{,}, ('?') x @{$ids};

        if ( $op eq 'clear' ) {
            $dbh->do(
                q{DELETE FROM staff_roster_assignments WHERE id IN (} . $placeholders . q{)},
                undef, @{$ids},
            );
            require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_audit(
                'DELETE', undef, { entity => 'assignment_bulk', op => 'clear', ids => $ids } );
            return $c->render( status => 200, openapi => { deleted => scalar @{$ids} } );
        }

        if ( $op eq 'move' ) {
            my $target = $body->{target} // {};
            if ( !%{$target} ) {
                return $c->render( status => 400, openapi => { error => 'target required for move' } );
            }

            my @set_fields = grep { exists $target->{$_} }
                qw( slot_id borrowernumber assignment_date );
            if ( !@set_fields ) {
                return $c->render( status => 400,
                    openapi => { error => 'target must include slot_id, borrowernumber, or assignment_date' } );
            }
            my $set_sql    = join q{, }, ( map { "$_ = ?" } @set_fields ), 'updated_at = NOW()';
            my @set_params = map { $target->{$_} } @set_fields;

            # Pre-flight every id under one transaction. Fail on first
            # conflict to keep semantics consistent with the single-row
            # update endpoint — partial bulk moves were the original bug.
            $dbh->begin_work;
            my $error;
            for my $id ( @{$ids} ) {
                my $current = $dbh->selectrow_hashref(
                    q{SELECT * FROM staff_roster_assignments WHERE id = ?},
                    undef, $id,
                );
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

                my $conflict = _conflict_check(
                    $dbh, $merged{slot_id}, $merged{borrowernumber}, $merged{assignment_date}, $id,
                );
                if ($conflict) {
                    $error = { status => 409, body => { error => $conflict, id => $id + 0 } };
                    last;
                }

                $dbh->do(
                    "UPDATE staff_roster_assignments SET $set_sql WHERE id = ?",
                    undef, @set_params, $id,
                );
            }

            if ($error) {
                $dbh->rollback;
                return $c->render( status => $error->{status}, openapi => $error->{body} );
            }
            $dbh->commit;

            require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
            Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_audit(
                'MODIFY', undef,
                { entity => 'assignment_bulk', op => 'move', ids => $ids, target => $target } );
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
        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_self_assign') ) {
            return $c->render( status => 403,
                openapi => { error => 'staffroster_self_assign permission required' } );
        }

        my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
        if ( !$plugin->retrieve_data('staff_can_self_assign') ) {
            return $c->render( status => 403,
                openapi => { error => 'Self-service is disabled' } );
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
            return $c->render( status => 400,
                openapi => { error => 'slot_id and assignment_date required' } );
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
        if ( $roster_for_close
            && $plugin->_is_closed_for_roster( $roster_for_close, $date ) )
        {
            return $c->render( status => 409, openapi => { error => 'Date is closed' } );
        }

        my $conflict = _conflict_check( $dbh, $slot_id, $borrowernumber, $date );
        if ($conflict) {
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
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_audit(
            'SELF_CLAIM', $id,
            { entity => 'assignment', %{$after} },
            $after,
        );
        return $c->render( status => 201, openapi => $after );
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
        require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
        if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_has_perm('staffroster_self_assign') ) {
            return $c->render( status => 403,
                openapi => { error => 'staffroster_self_assign permission required' } );
        }

        my $user = $c->stash('koha.user');
        if ( !$user ) {
            return $c->render( status => 401, openapi => { error => 'Authentication required' } );
        }
        my $borrowernumber = $user->borrowernumber;

        my $id  = $c->validation->param('assignment_id');
        my $dbh = C4::Context->dbh;

        my $original = $dbh->selectrow_hashref(
            q{SELECT * FROM staff_roster_assignments WHERE id = ?}, undef, $id );
        if ( !$original ) {
            return $c->render( status => 404, openapi => { error => 'Assignment not found' } );
        }
        if ( $original->{borrowernumber} != $borrowernumber ) {
            return $c->render( status => 403, openapi => { error => 'Not your assignment' } );
        }

        $dbh->do( q{DELETE FROM staff_roster_assignments WHERE id = ?}, undef, $id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_audit(
            'SELF_UNCLAIM', $id,
            { entity => 'assignment', borrowernumber => $borrowernumber },
            $original,
        );
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

    require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
    my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;

    if ( !$plugin->_can_view_roster($roster) ) {
        return { status => 403, error => 'Not authorized for this roster' };
    }

    if (   $plugin->retrieve_data('use_koha_calendar')
        && $plugin->retrieve_data('koha_calendar_strict')
        && $plugin->_is_closed_for_roster( $roster, $date ) )
    {
        return { status => 409, error => 'Date is closed per Koha calendar' };
    }

    return {};
}

sub _changed {
    my ( $a, $b ) = @_;
    return 1 if !defined $a && defined $b;
    return 1 if defined $a && !defined $b;
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

    require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
    if ( !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_slot_applies_on( $rrule, $date, $anchor ) ) {
        return 'Slot does not run on that day';
    }

    my @fill_clauses = ( q{slot_id = ?}, q{assignment_date = ?} );
    my @fill_params  = ( $slot_id, $date );
    if ($exclude_id) {
        push @fill_clauses, q{id != ?};
        push @fill_params, $exclude_id;
    }

    my ($filled) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM staff_roster_assignments WHERE }
            . join( q{ AND }, @fill_clauses ),
        undef, @fill_params,
    );
    return "Slot full ($filled/$max_staff)" if $filled >= $max_staff;

    my @dup_clauses = (
        q{a.borrowernumber = ?},
        q{a.assignment_date = ?},
        q{s1.start_time < s2.end_time},
        q{s2.start_time < s1.end_time},
    );
    my @dup_params = ( $slot_id, $borrowernumber, $date );
    if ($exclude_id) {
        push @dup_clauses, q{a.id != ?};
        push @dup_params, $exclude_id;
    }

    my ($double) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM staff_roster_assignments a
          JOIN staff_roster_slots s1 ON a.slot_id = s1.id
          JOIN staff_roster_slots s2 ON s2.id = ?
          WHERE }
            . join( q{ AND }, @dup_clauses ),
        undef, @dup_params,
    );
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

    require Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
    my $af = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_load_additional_fields(
        $dbh, 'staff_roster_assignments', $id );
    $row->{additional_fields} = $af->{values};
    return $row;
}

1;
