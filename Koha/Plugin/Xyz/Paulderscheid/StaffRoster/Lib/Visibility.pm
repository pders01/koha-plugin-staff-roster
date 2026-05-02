package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Visibility -
Library-group visibility + Koha-calendar closure helpers.

=head1 DESCRIPTION

Two related concerns lived next to each other on the main plugin
module: the library-group walk that decides which rosters a user can
see, and the calendar-closure check used by the assignment gates and
the week-aggregator. Both depend on per-borrower context
(C<C4::Context-E<gt>userenv>) and traverse the C<library_groups> tree.

=cut

use Modern::Perl;

use Exporter qw(import);

use C4::Context;
use Koha::Calendar;
use Koha::DateUtils;
use Koha::Library::Groups;
use Koha::Patrons;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;

our @EXPORT_OK = qw(
    user_branch user_group_ids clear_user_group_cache
    visibility_clause can_view_roster
    branchcodes_for_roster is_closed_for_roster
);

=head2 user_branch()

Returns the active branchcode for the current session, or undef when
no userenv (cron / test).

=cut

sub user_branch {
    my $env = C4::Context->userenv;
    return $env->{branch} if $env && $env->{branch};
    if ( $env && $env->{number} ) {
        my $patron = Koha::Patrons->find( $env->{number} );
        return $patron->branchcode if $patron;
    }
    return;
}

# Memoize per-process: each Koha::Library::Groups->find($pid) round-trip
# is one DB query per ancestor level, and the sidebar can call this
# once per visible roster on every page load. The cache key is the
# branchcode; a worker only sees one borrower's branch at a time, so
# collisions across users on the same Plack worker are fine. Tests that
# reshape the graph between subtests call clear_user_group_cache().
my %_USER_GROUP_CACHE;

=head2 clear_user_group_cache()

Wipe the per-process group-id memoization. Test fixtures rebuild the
group graph between subtests and call this so the second subtest does
not read the first subtest's cached answer.

=cut

sub clear_user_group_cache {
    %_USER_GROUP_CACHE = ();
    return;
}

=head2 user_group_ids($branch)

Returns the list of group ids whose subtree contains C<$branch>.

=cut

sub user_group_ids {
    my ($branch) = @_;
    return () if !$branch;
    return @{ $_USER_GROUP_CACHE{$branch} } if $_USER_GROUP_CACHE{$branch};

    my $leaves = Koha::Library::Groups->search( { branchcode => $branch } );
    my %seen;
    while ( my $leaf = $leaves->next ) {
        my $node = $leaf;
        while ($node) {
            my $pid = $node->parent_id or last;
            $seen{$pid} = 1;
            $node = Koha::Library::Groups->find($pid);
        }
    }
    my @ids = keys %seen;
    $_USER_GROUP_CACHE{$branch} = \@ids;
    return @ids;
}

=head2 visibility_clause($plugin)

Returns C<($sql_fragment, \@bind_params)> appended to a roster-list
WHERE clause. Empty fragment when filtering is off or user is super.

The fragment uses static SQL only — never an interpolated IN-list.
When the user belongs to library groups the caller must post-filter
via C<can_view_roster> to reject groups outside the user's allowed
set. C<$plugin> is the Koha::Plugin instance, used for
C<retrieve_data('library_group_mode')>.

=cut

sub visibility_clause {
    my ($plugin) = @_;
    my $mode = $plugin->retrieve_data('library_group_mode') // 'off';
    return ( q{}, [] )
        if $mode eq 'off'
        || Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::is_superlib();

    my $branch = user_branch();
    if ( !$branch ) {
        return ( 'AND 1=0',                                                [] ) if $mode eq 'strict';
        return ( 'AND r.branch_id IS NULL AND r.library_group_id IS NULL', [] );
    }

    my @gids = user_group_ids($branch);
    if ( !@gids ) {
        return ( 'AND ((r.branch_id IS NULL AND r.library_group_id IS NULL) OR r.branch_id = ?)', [$branch] );
    }
    my $clause = q{AND ((r.branch_id IS NULL AND r.library_group_id IS NULL) OR r.branch_id = ? OR r.library_group_id IS NOT NULL)};
    return ( $clause, [$branch] );
}

=head2 can_view_roster($plugin, $roster)

Returns 1 when the current session may see C<$roster> (a hashref with
C<branch_id> + C<library_group_id> keys), 0 otherwise.

=cut

sub can_view_roster {
    my ( $plugin, $roster ) = @_;
    return 0 if !$roster;
    my $mode = $plugin->retrieve_data('library_group_mode') // 'off';
    return 1
        if $mode eq 'off'
        || Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::is_superlib();

    my $branch = user_branch();
    return 0 if !$branch;

    return 1 if !$roster->{branch_id} && !$roster->{library_group_id};
    return 1 if $roster->{branch_id}  && $roster->{branch_id} eq $branch;
    if ( $roster->{library_group_id} ) {
        my %gids = map { $_ => 1 } user_group_ids($branch);
        return 1 if $gids{ $roster->{library_group_id} };
    }
    return 0;
}

=head2 branchcodes_for_roster($plugin, $roster)

Resolves the list of branchcodes a roster covers for calendar lookup.

  branch-bound        -> [branch_id]
  group-bound         -> all leaf branchcodes within the group (recursive)
  all-branches        -> [] (no calendar check), or the configured override

=cut

sub branchcodes_for_roster {
    my ( $plugin, $roster ) = @_;
    return () if !$roster;

    if ( $roster->{branch_id} ) {
        return ( $roster->{branch_id} );
    }

    if ( $roster->{library_group_id} ) {
        my $group = Koha::Library::Groups->find( $roster->{library_group_id} ) or return ();
        my $libs  = $group->libraries;
        return $libs ? $libs->get_column('branchcode') : ();
    }

    my $override = $plugin->retrieve_data('koha_calendar_branch');
    return $override ? ($override) : ();
}

=head2 is_closed_for_roster($plugin, $roster, $date)

Returns 1 when C<$date> (YYYY-MM-DD) is closed per the Koha calendar
for every branch the roster covers; 0 otherwise. Branch-bound rosters
need just that branch closed; group-bound rosters require ALL branches
in the group to be closed (defensive). Returns 0 immediately when
C<use_koha_calendar> is off, or when the roster covers zero branches.

=cut

sub is_closed_for_roster {
    my ( $plugin, $roster, $date ) = @_;
    return 0 if !$plugin->retrieve_data('use_koha_calendar');

    my @branches = branchcodes_for_roster( $plugin, $roster );
    return 0 if !@branches;

    my $dt = eval { Koha::DateUtils::dt_from_string( $date, 'iso' ) };
    return 0 if !$dt;

    for my $b (@branches) {
        my $cal = Koha::Calendar->new( branchcode => $b );
        return 0 if !$cal->is_holiday($dt);
    }
    return 1;
}

1;
