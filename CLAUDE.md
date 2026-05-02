# CLAUDE.md

## Commit Message Format

Use conventional commits with concise bullet-point bodies:

```
<type>: <subject>

- Bullet point 1
- Bullet point 2
- Bullet point 3
```

Types: feat, fix, docs, style, refactor, test, chore

## Project Structure

- `Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm` - Main plugin module
- `Koha/Plugin/Xyz/Paulderscheid/StaffRoster/*.pm` - Mojolicious REST controllers
- `Koha/Plugin/Xyz/Paulderscheid/StaffRoster/*.tt` - Template files
- `Koha/Plugin/Xyz/Paulderscheid/StaffRoster/Lib/I18N.pm` - Translation helper
- `Koha/Plugin/Xyz/Paulderscheid/StaffRoster/locales/*.json` - Translation dictionaries
- `src/` - Lit components (TypeScript)
- `t/` - Plugin tests (run inside the kohadev container)
- `cypress/integration/staffroster/` - Cypress integration specs run via ktd's bundled cypress
- `docs/wiki/` - User manual + GitHub Wiki source

## Entry Points

- `tool` - Main roster management interface
- `admin` - Roster type management (privileged)
- `configure` - Plugin configuration settings
- `report` - Reports (placeholder)

## Database Tables

- `staff_roster_types` - Categories of duties
- `staff_roster` - Schedule definitions
- `staff_roster_slots` - Time slots within rosters (RRule recurrence)
- `staff_roster_assignments` - Staff assigned to slots
- `staff_roster_exceptions` - Holidays, closures
- `staff_roster_swap_requests` - Shift swap workflow

See `docs/wiki/Database-Schema.md` for column-level detail.

## Testing

Sync + run inside the kohadev container:
```bash
docker exec dev-koha-1 rm -rf /var/lib/koha/kohadev/plugins/Koha
docker cp Koha dev-koha-1:/var/lib/koha/kohadev/plugins/Koha
docker cp t   dev-koha-1:/var/lib/koha/kohadev/plugins/t
docker exec dev-koha-1 sh -c \
  "cd /var/lib/koha/kohadev/plugins && \
   KOHA_CONF=/etc/koha/sites/kohadev/koha-conf.xml \
   prove t/00-load.t t/rrule.t t/self_service.t t/swap_ownership.t \
         t/exceptions.t t/additional_fields.t t/conflict_check.t \
         t/visibility.t"
```

`docker cp` to an existing target nests the source inside it — always
remove the target first or the new files won't reach the controllers.

`perl -c` against the main `.pm` reports a false-positive C3 merge
error outside the Plack process; trust the test suite instead.

### Cypress integration tests

Specs in `cypress/integration/staffroster/` exercise live REST routes
through ktd's bundled cypress install. Wrapped in `just test-cypress`:

```bash
just test-cypress
```

The script syncs the plugin into the container, reinstalls + restarts
Plack, drops the specs into Koha's `t/cypress/integration/staffroster/`,
then invokes `npx cypress run` against just those files. Specs seed
their own roster/slot/assignment fixtures via `cy.task("query", …)` and
use unique namespaces so parallel runs don't collide. Calendar-merge
tests must call the `flushHolidayCache` helper after writing to
`special_holidays` — Koha::Calendar memoizes per-branch holiday sets
in memcached for ~21h.
