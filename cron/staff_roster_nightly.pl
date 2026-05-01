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
use Koha::Plugin::Xyz::Paulderscheid::StaffRoster;

my $plugin = Koha::Plugin::Xyz::Paulderscheid::StaffRoster->new;
my $sent   = $plugin->cronjob_nightly // 0;
print "staff_roster_nightly: enqueued $sent reminder(s).\n";
