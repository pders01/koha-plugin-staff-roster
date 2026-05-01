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
        my $body = $c->req->json // {};
        my ( $slot_id, $borrowernumber, $date ) = @{$body}{qw( slot_id borrowernumber assignment_date )};

        if ( !$slot_id || !$borrowernumber || !$date ) {
            return $c->render( status => 400,
                openapi => { error => 'slot_id, borrowernumber, assignment_date required' } );
        }

        my $dbh      = C4::Context->dbh;
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

        my $id = $dbh->last_insert_id( undef, undef, undef, undef );
        return $c->render( status => 201, openapi => _load( $dbh, $id ) );
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

        return $c->render( status => 200, openapi => _load( $dbh, $id ) );
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
        my $id    = $c->validation->param('assignment_id');
        my $dbh   = C4::Context->dbh;
        my $count = $dbh->do( q{DELETE FROM staff_roster_assignments WHERE id = ?}, undef, $id );

        if ( !$count || $count eq '0E0' ) {
            return $c->render( status => 404, openapi => { error => 'Assignment not found' } );
        }

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
        my $body = $c->req->json // {};
        my $op   = $body->{op}   // q{};
        my $ids  = $body->{ids}  // [];

        if ( !@{$ids} ) {
            return $c->render( status => 400, openapi => { error => 'ids must be a non-empty array' } );
        }

        my $dbh          = C4::Context->dbh;
        my $placeholders = join q{,}, ('?') x @{$ids};

        if ( $op eq 'clear' ) {
            $dbh->do( "DELETE FROM staff_roster_assignments WHERE id IN ($placeholders)", undef, @{$ids} );
            return $c->render( status => 200, openapi => { deleted => scalar @{$ids} } );
        }

        if ( $op eq 'move' ) {
            my $target = $body->{target} // {};
            if ( !%{$target} ) {
                return $c->render( status => 400, openapi => { error => 'target required for move' } );
            }

            my @sets;
            my @params;
            for my $field (qw( slot_id borrowernumber assignment_date )) {
                next if !exists $target->{$field};
                push @sets,   "$field = ?";
                push @params, $target->{$field};
            }
            push @sets, 'updated_at = NOW()';

            my $sql
                = sprintf 'UPDATE staff_roster_assignments SET %s WHERE id IN (%s)',
                join( q{, }, @sets ), $placeholders;

            $dbh->do( $sql, undef, @params, @{$ids} );
            return $c->render( status => 200, openapi => { updated => scalar @{$ids} } );
        }

        return $c->render( status => 400, openapi => { error => "unknown op: $op" } );
    }
    catch {
        $c->unhandled_exception($_);
    };
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

    my ($max_staff) = $dbh->selectrow_array( q{SELECT max_staff FROM staff_roster_slots WHERE id = ?}, undef, $slot_id );
    return 'Slot not found' if !defined $max_staff;

    my $exclude_clause = $exclude_id ? 'AND id != ?' : q{};
    my @params         = ( $slot_id, $date );
    push @params, $exclude_id if $exclude_id;

    my ($filled) = $dbh->selectrow_array(
        "SELECT COUNT(*) FROM staff_roster_assignments
         WHERE slot_id = ? AND assignment_date = ? $exclude_clause",
        undef, @params,
    );
    return "Slot full ($filled/$max_staff)" if $filled >= $max_staff;

    @params = ( $slot_id, $borrowernumber, $date );
    push @params, $exclude_id if $exclude_id;

    my ($double) = $dbh->selectrow_array(
        "SELECT COUNT(*) FROM staff_roster_assignments a
         JOIN staff_roster_slots s1 ON a.slot_id = s1.id
         JOIN staff_roster_slots s2 ON s2.id = ?
         WHERE a.borrowernumber = ?
           AND a.assignment_date = ?
           $exclude_clause
           AND s1.start_time < s2.end_time
           AND s2.start_time < s1.end_time",
        undef, @params,
    );
    return 'Staff already assigned to overlapping slot that day' if $double > 0;

    return;
}

sub _load {
    my ( $dbh, $id ) = @_;
    return $dbh->selectrow_hashref(
        q{
        SELECT a.id, a.slot_id, a.borrowernumber, a.assignment_date, a.status,
               a.notes, a.assigned_by, a.updated_at,
               p.firstname, p.surname, p.cardnumber
        FROM staff_roster_assignments a
        JOIN borrowers p ON a.borrowernumber = p.borrowernumber
        WHERE a.id = ?
    }, undef, $id
    );
}

1;
