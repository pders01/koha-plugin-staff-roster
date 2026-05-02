package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Form;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::Form -
Roster create/edit form + delete-confirm view + their CUD handlers.

=cut

use Modern::Perl;

use C4::Context;

use Koha::Library::Groups;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;

sub save_roster {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_manage_rosters', $messages );

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
        $branch_id, $group_id, $cgi->param('name'),
        $cgi->param('description'),
        $cgi->param('effective_from'),
        $cgi->param('effective_to') || undef,
        $cgi->param('is_active') // 1,
    );

    my $roster_id = $cgi->param('roster_id');
    my ( $sql, @params, $verb, $original );
    if ($roster_id) {
        $original = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster WHERE id = ?}, undef, $roster_id );
        $sql      = q{
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

    my $ok = eval {
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::txn(
            $dbh,
            sub {
                $dbh->do( $sql, undef, @params ) or die "roster save failed\n";
                $roster_id ||= $dbh->last_insert_id( undef, undef, 'staff_roster', undef );
                Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields::save( $dbh, 'staff_roster', $roster_id, $cgi );
            }
        );
        my $after = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster WHERE id = ?}, undef, $roster_id );
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit(
            $verb eq 'insert' ? 'CREATE' : 'MODIFY',
            $roster_id,
            { entity => 'roster', %{ $after // {} } },
            $verb eq 'insert' ? $after : $original,
        );
        1;
    };
    if ( !$ok ) {
        warn "StaffRoster: $verb roster failed: $@";
    }
    push @{$messages}, $ok
        ? { type => 'success', code => "success_on_$verb" }
        : { type => 'danger',  code => "error_on_$verb" };

    return;
}

sub delete_roster {
    my ( $self, $dbh, $cgi, $messages ) = @_;
    return if !Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::gate( 'staffroster_manage_rosters', $messages );
    my $roster_id = $cgi->param('roster_id');
    my $original  = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster WHERE id = ?}, undef, $roster_id );
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields::remove( $dbh, 'staff_roster', $roster_id );
    my $ok = $dbh->do( q{DELETE FROM staff_roster WHERE id = ?}, undef, $roster_id );
    if ($ok) {
        Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit::audit( 'DELETE', $roster_id, { entity => 'roster' }, $original );
    }
    push @{$messages}, $ok
        ? { type => 'success', code => 'success_on_delete' }
        : { type => 'danger',  code => 'error_on_delete' };
    return;
}

sub view_roster_form {
    my ( $self, $dbh, $cgi, $template ) = @_;

    my $root_groups = Koha::Library::Groups->get_root_groups;
    $template->param( library_groups => Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_flatten_groups( $root_groups, 0 ) );

    my $roster_id = $cgi->param('roster_id');
    my $roster;
    if ($roster_id) {
        $roster = $dbh->selectrow_hashref( q{SELECT * FROM staff_roster WHERE id = ?}, undef, $roster_id );
        $template->param( roster => $roster );
    }

    my $af = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields::load( $dbh, 'staff_roster', $roster_id );
    $template->param(
        additional_fields_table     => 'staff_roster',
        additional_fields_available => $af->{available},
        additional_fields_values    => $af->{values},
    );
    return;
}

sub view_delete_confirm {
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

1;
