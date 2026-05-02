package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::List;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::List -
List view for the tool dispatcher (op=list).

=head1 DESCRIPTION

Renders the roster list with branch/type/status filters, applies the
visibility clause + post-filter, and decorates each row with its
additional-field summary.

=cut

use Modern::Perl;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility;

sub view_list {
    my ( $self, $dbh, $cgi, $template ) = @_;

    my $filter_branch = $cgi->param('filter_branch');
    my $filter_type   = $cgi->param('filter_type');
    my $filter_status = $cgi->param('filter_status');

    my $sql = q{
        SELECT r.*,
               rt.name AS type_name, rt.color AS type_color,
               b.branchname AS branch_name,
               lg.title AS group_name,
               (SELECT COUNT(*) FROM staff_roster_slots WHERE roster_id = r.id) AS slot_count
        FROM staff_roster r
        JOIN staff_roster_types rt ON r.roster_type_id = rt.id
        LEFT JOIN branches b ON r.branch_id = b.branchcode
        LEFT JOIN library_groups lg ON r.library_group_id = lg.id
        WHERE 1=1
    };
    my @params;

    if ($filter_branch) {
        $sql .= q{ AND r.branch_id = ?};
        push @params, $filter_branch;
    }
    if ($filter_type) {
        $sql .= q{ AND r.roster_type_id = ?};
        push @params, $filter_type;
    }
    if ( defined $filter_status && $filter_status ne q{} ) {
        $sql .= q{ AND r.is_active = ?};
        push @params, $filter_status;
    }

    my ( $vis_clause, $vis_params )
        = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility::visibility_clause($self);
    if ($vis_clause) {
        $sql .= " $vis_clause";
        push @params, @{$vis_params};
    }
    $sql .= q{ ORDER BY r.name};

    my $rosters = $dbh->selectall_arrayref( $sql, { Slice => {} }, @params );

    # visibility_clause returns a superset (any group_id rather than
    # IN(?,?,?)) to keep variable-length IN lists out of the SQL. Reject
    # rows whose group is outside the user's allowed set.
    $rosters = [ grep { Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility::can_view_roster( $self, $_ ) } @{$rosters} ];

    my $af_defs = $dbh->selectall_arrayref(
        q{SELECT id, name FROM additional_fields WHERE tablename = ? ORDER BY id},
        { Slice => {} },
        'staff_roster'
    ) || [];
    if ( @{$af_defs} && @{$rosters} ) {
        my %name_for = map { $_->{id} => $_->{name} } @{$af_defs};
        my $bulk     = Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields::bulk_values(
            $dbh, 'staff_roster', [ map { $_->{id} } @{$rosters} ] );
        for my $r ( @{$rosters} ) {
            my $vals = $bulk->{ $r->{id} } || {};
            my @summary;
            for my $fid ( sort { $a <=> $b } keys %{$vals} ) {
                push @summary, { name => $name_for{$fid}, value => join q{, }, @{ $vals->{$fid} } };
            }
            $r->{additional_field_summary} = \@summary;
        }
    }

    $template->param(
        rosters       => $rosters,
        filter_branch => $filter_branch,
        filter_type   => $filter_type,
        filter_status => $filter_status,
    );
    return;
}

1;
