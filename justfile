#!/usr/bin/env just --justfile

# Wrapper for running the CLI with the right lib paths.
# Uses carton if available, otherwise relies on PERL5LIB / system modules.
cli := if path_exists("local/lib/perl5") == "true" { "carton exec -- perl bin/koha-plugin.pl" } else { "perl bin/koha-plugin.pl" }
perl_exec := if path_exists("local/lib/perl5") == "true" { "carton exec -- perl" } else { "perl" }

# Lists available commands.
default:
  @just --list

# Careful! This removes Koha/ and package.json
clean:
  {{cli}} clean

# Initialises a new koha plugin based on your input.
init:
  {{cli}} init

# Adds a component to your initialised koha plugin based on your input.
add component:
  {{cli}} add {{component}}

# Increments the version in your local config, base module and package.json if present. This also updates date_updated!
increment type='patch' times='1':
  {{cli}} increment --type {{type}} --times {{times}}

# Creates a kpz file by zipping the current state of the `Koha` directory.
package:
  {{cli}} package

# Updates the staticapi.json file within the plugin to expose all files within the `static` directory.
staticapi:
  {{cli}} staticapi

ktd container="kohadev-koha-1" binary="docker":
  {{cli}} ktd {{container}} {{binary}}

# Attempts to update the koha-plugin repository itself. If you've updated core components, you'll have to resolve the conflicts yourself, though.
update-meta:
  {{cli}} update-meta

# Migrate legacy .env to config file
migrate format='yml':
  {{cli}} migrate {{format}}

# Validate plugin for common issues
check:
  {{cli}} check

# Build standalone binary
binary:
  {{perl_exec}} scripts/build-binary.pl

# Run the plugin's Cypress integration specs inside the kohadev container.
# Reuses ktd's bundled cypress install, syncs the plugin source, restarts
# Plack so REST routes pick up changes, then drops the specs into
# t/cypress/integration/staffroster/ alongside Koha's own.
test-cypress:
  scripts/run-cypress.sh

# Sync plugin source into the kohadev container and fire the nightly
# reminder cron once. Use this in dev to verify enable_email_reminders +
# the REMINDER letter template + reminder_days_before all line up;
# production schedules the same script via koha-common's cronjob_wrapper
# (see docs/wiki/Installation.md).
cron-nightly container="dev-koha-1" instance="kohadev":
  docker exec {{container}} rm -rf /var/lib/koha/{{instance}}/plugins/Koha /var/lib/koha/{{instance}}/plugins/cron
  docker cp Koha {{container}}:/var/lib/koha/{{instance}}/plugins/Koha
  docker cp cron {{container}}:/var/lib/koha/{{instance}}/plugins/cron
  docker exec {{container}} koha-shell {{instance}} -c \
    "perl /var/lib/koha/{{instance}}/plugins/cron/staff_roster_nightly.pl"
