#!/usr/bin/perl

# Nightly cron entry for the Staff Roster plugin.
#
# Adds one reminder email per upcoming assignment (date = today + N, where N is
# the plugin's reminder_days_before setting). Skips quietly if email reminders
# are disabled in the plugin configuration.
#
# Run via koha-shell so the Koha library path + DB credentials are in scope:
#
#   docker exec dev-koha-1 koha-shell kohadev -c \
#     "perl /var/lib/koha/kohadev/plugins/cron/staff_roster_nightly.pl"
#
# Production crontab:
#
#   30 1 * * * koha-shell kohadev -c "perl /path/to/cron/staff_roster_nightly.pl"

use Modern::Perl;

# koha-shell sets PERL5LIB to the Koha tree but not to the plugins dir.
# Bootstrap from the script's own location so the cron entry above can
# stay a simple `perl /…/cron/staff_roster_nightly.pl` instead of
# carrying a -I flag for every invocation.
use FindBin qw( $Bin );
use lib "$Bin/..";

use Koha::Plugin::Xyz::Paulderscheid::StaffRoster;

my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
my ( $sent, $failed ) = $plugin->cronjob_nightly;
$sent   //= 0;
$failed //= 0;
print "staff_roster_nightly: enqueued $sent reminder(s)";
print ", $failed failure(s)" if $failed;
print ".\n";
exit( $failed ? 1 : 0 );
