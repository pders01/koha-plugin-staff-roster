package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::DateUtils;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::DateUtils -
Date helpers shared by the main plugin module and the REST controllers.

=head1 DESCRIPTION

Until this module landed each consumer carried its own copy of
`_current_week_start`. Centralizing the helpers means a future fix to
the timezone or week-anchor logic only edits one file.

=cut

use Modern::Perl;

use Exporter qw(import);
use Koha::DateUtils;

our @EXPORT_OK = qw( current_week_start validated_week_start );

=head2 current_week_start

Returns the YYYY-MM-DD of the most recent Monday in the Koha-configured
timezone. DateTime's truncate(week) anchors to Monday.

=cut

sub current_week_start {
    return Koha::DateUtils::dt_from_string()->truncate( to => 'week' )->ymd;
}

=head2 validated_week_start($candidate)

Accepts a YYYY-MM-DD string and returns it untouched when valid; otherwise
falls back to current_week_start(). Used by REST controllers that take an
optional `start` query parameter.

=cut

sub validated_week_start {
    my ($candidate) = @_;
    return $candidate
        if defined $candidate
        && $candidate =~ /\A\d{4}-\d{2}-\d{2}\z/;
    return current_week_start();
}

1;
