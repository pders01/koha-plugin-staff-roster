package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::SelfService;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Controllers::Tool::SelfService -
my_shifts + open_shifts renderers (the borrower-facing tool views).

=cut

use Modern::Perl;

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::DateUtils;
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;

sub view_my_shifts {
    my ( $self, $dbh, $cgi, $template ) = @_;
    my $week_start = $cgi->param('week_start')
        // Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::DateUtils::current_week_start();
    $template->param( week_start => $week_start );
    return;
}

sub view_open_shifts {
    my ( $self, $dbh, $cgi, $template ) = @_;
    my $week_start = $cgi->param('week_start')
        // Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::DateUtils::current_week_start();
    $template->param(
        week_start            => $week_start,
        staff_can_self_assign => $self->retrieve_data('staff_can_self_assign') ? 1 : 0,
        has_self_assign_perm  => Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions::has_perm('staffroster_self_assign') ? 1 : 0,
    );
    return;
}

1;
