#!/bin/sh
# Run the plugin's Cypress integration specs inside the kohadev container.
#
# Workflow:
#   1. Sync the plugin source (Koha/) into the container's plugin dir.
#   2. Make sure the plugin is installed (so REST routes are mounted).
#   3. Restart Plack to pick up route + module changes.
#   4. Drop the cypress/integration/staffroster/ specs alongside Koha's.
#   5. Run cypress against just those specs, headless, using the
#      pre-installed binary at /kohadevbox/Cypress/12.17.4/Cypress/Cypress.

set -eu

CONTAINER=${KOHA_CONTAINER:-dev-koha-1}
PLUGIN_DIR=/var/lib/koha/kohadev/plugins
KOHA_DIR=/kohadevbox/koha
SPEC_GLOB='t/cypress/integration/staffroster/*_spec.ts'

ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "[run-cypress] syncing plugin source -> ${CONTAINER}:${PLUGIN_DIR}"
docker exec "$CONTAINER" rm -rf "$PLUGIN_DIR/Koha"
docker cp "$ROOT/Koha" "$CONTAINER:$PLUGIN_DIR/Koha"

echo "[run-cypress] installing plugin (idempotent)"
docker exec "$CONTAINER" sh -c "
  KOHA_CONF=/etc/koha/sites/kohadev/koha-conf.xml \
  perl -e 'use Koha::Plugins; my (\$p) = grep { ref(\$_) =~ /StaffRoster/ } Koha::Plugins->new->GetPlugins; \$p->install if \$p && \$p->can(q{install}); 1'
"

echo "[run-cypress] restarting Plack so new routes mount"
docker exec "$CONTAINER" koha-plack --restart kohadev >/dev/null
sleep 3

echo "[run-cypress] copying specs into ${CONTAINER}:${KOHA_DIR}/t/cypress/integration/staffroster"
docker exec "$CONTAINER" rm -rf "$KOHA_DIR/t/cypress/integration/staffroster"
docker cp "$ROOT/cypress/integration/staffroster" \
    "$CONTAINER:$KOHA_DIR/t/cypress/integration/staffroster"

echo "[run-cypress] launching cypress"
docker exec "$CONTAINER" sh -c "
  cd $KOHA_DIR && \
  CYPRESS_RUN_BINARY=/kohadevbox/Cypress/12.17.4/Cypress/Cypress \
  npx cypress run --spec '$SPEC_GLOB'
"
