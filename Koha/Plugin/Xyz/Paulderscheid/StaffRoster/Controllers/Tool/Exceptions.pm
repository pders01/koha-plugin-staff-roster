package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Exceptions;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Exceptions -
Per-roster exception (closure / holiday / special / reduced_hours) CUD
handlers + the manage_exceptions renderer.

=cut

use Modern::Perl;

use C4::Context;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;

# Allowed exception_type ENUM values from the schema. Anything else is
# rejected rather than silently coerced to keep the column tight.
my %EXCEPTION_TYPES = map { $_ => 1 } qw( closed holiday special reduced_hours );

sub save_exception {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_manage_rosters', $messages );

    my $roster_id      = $cgi->param('roster_id');
    my $exception_date = $cgi->param('exception_date') // q{};
    my $exception_type = $cgi->param('exception_type') // q{};
    my $reason         = $cgi->param('reason');

    if ( $exception_date !~ /^\d{4}-\d{2}-\d{2}$/sm ) {
        push @{$messages}, { type => 'danger', code => 'exception_bad_date' };
        return;
    }
    if ( !$EXCEPTION_TYPES{$exception_type} ) {
        push @{$messages}, { type => 'danger', code => 'exception_bad_type' };
        return;
    }

    my $env          = C4::Context->userenv;
    my $created_by   = $env ? $env->{number} : undef;
    my $exception_id = $cgi->param('exception_id');

    if ($exception_id) {
        my $original = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_exceptions WHERE id = ? AND roster_id = ?},
            undef, $exception_id, $roster_id );
        $dbh->do(
            q{UPDATE staff_roster_exceptions
              SET exception_date = ?, exception_type = ?, reason = ?, updated_at = NOW()
              WHERE id = ? AND roster_id = ?},
            undef, $exception_date, $exception_type, $reason, $exception_id, $roster_id
        );
        my $after = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_exceptions WHERE id = ?}, undef, $exception_id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'MODIFY', $exception_id, { entity => 'exception', %{ $after // {} } }, $original );
    }
    else {
        $dbh->do(
            q{INSERT INTO staff_roster_exceptions
              (roster_id, exception_date, exception_type, reason, created_by, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, NOW(), NOW())},
            undef, $roster_id, $exception_date, $exception_type, $reason, $created_by
        );
        my $new_id = $dbh->last_insert_id( undef, undef, 'staff_roster_exceptions', undef );
        my $after  = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_exceptions WHERE id = ?}, undef, $new_id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'CREATE', $new_id, { entity => 'exception', %{ $after // {} } }, $after );
    }
    push @{$messages}, { type => 'success', code => 'exception_saved' };
    return;
}

sub delete_exception {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_manage_rosters', $messages );
    my $roster_id    = $cgi->param('roster_id');
    my $exception_id = $cgi->param('exception_id');
    my $original     = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster_exceptions WHERE id = ? AND roster_id = ?},
        undef, $exception_id, $roster_id );
    my $count = $dbh->do( q{DELETE FROM staff_roster_exceptions WHERE id = ? AND roster_id = ?},
        undef, $exception_id, $roster_id );
    if ( $count && $count ne '0E0' ) {
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'DELETE', $exception_id, { entity => 'exception', roster_id => $roster_id }, $original );
        push @{$messages}, { type => 'success', code => 'exception_deleted' };
    }
    else {
        push @{$messages}, { type => 'danger', code => 'error_on_delete' };
    }
    return;
}

sub view_manage_exceptions {
    my ( $self, $dbh, $cgi, $template ) = @_;
    my $roster_id = $cgi->param('roster_id');
    my $roster    = $dbh->selectrow_hashref(
        q{SELECT r.*, rt.name AS type_name, rt.color AS type_color, b.branchname AS branch_name
          FROM staff_roster r
          JOIN staff_roster_types rt ON r.roster_type_id = rt.id
          LEFT JOIN branches b ON r.branch_id = b.branchcode
          WHERE r.id = ?},
        undef, $roster_id
    );
    my $exceptions = $dbh->selectall_arrayref(
        q{SELECT id, exception_date, exception_type, reason, created_by, created_at, updated_at
          FROM staff_roster_exceptions
          WHERE roster_id = ?
          ORDER BY exception_date DESC},
        { Slice => {} }, $roster_id
    );
    $template->param(
        roster          => $roster,
        exceptions      => $exceptions,
        exception_types => [
            { code => 'closed',        label => 'Closed' },
            { code => 'holiday',       label => 'Holiday' },
            { code => 'special',       label => 'Special event' },
            { code => 'reduced_hours', label => 'Reduced hours' },
        ],
    );
    return;
}

1;
