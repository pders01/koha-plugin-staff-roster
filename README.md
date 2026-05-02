# koha-plugin-staff-roster

Manage staff duty rosters and shifts inside Koha. Drag-and-drop schedule
grid, recurring time slots with iCal RRULE, library-group scoping,
calendar-aware closures, swap workflow, self-service claim/drop, and
nightly email reminders. German UI translation included.

> **Status:** active development. Backend tested against Koha kohadev
> (24.05+); 51 plugin tests cover the hot paths. The REST surface uses
> Koha terminology (`patron_id`) so it slots into the rest of the API
> without surprise.

## Features

- **Schedule grid** — drag staff onto time slots, drop assignments
  between cells, undo with Cmd-Z, optimistic UI with concurrent-edit
  highlighting.
- **Recurring slots** — `FREQ=WEEKLY` and `FREQ=MONTHLY` with
  `BYDAY` (incl. ordinals like `1MO`, `-1FR`), `INTERVAL`, and
  `UNTIL`.
- **Library scope** — branch-bound, group-bound, or all-branches
  rosters. Off / filter / strict modes for cross-branch visibility.
- **Calendar integration** — Koha holiday calendars merge into
  exception rows; hard mode blocks assignment on closed dates.
- **Self-service** — staff can claim open shifts and drop their own,
  gated by sub-permission, kill-switch setting, and a configurable
  hour-window lockout.
- **Swap workflow** — request a one-way handoff or a mutual swap;
  manager approval optional per setting.
- **Nightly email reminders** — N days before each shift, via a Koha
  notice template (`STAFFROSTER`/`REMINDER`) admins can edit.
- **Audit trail** — every mutation flows into Koha's `action_logs`
  with full pre/post diff support.
- **i18n** — English + German shipped; partial translations fall
  through to English so a missing key never breaks a page.

See **[docs/wiki/](docs/wiki/Home.md)** for the full user manual,
configuration guide, and architecture notes. The same files double as
the GitHub Wiki source.

## Install

1. Build the `.kpz` package:

   ```bash
   bun install && bun run build
   # then zip the Koha/ directory into a .kpz the way Koha expects
   ```

   Or grab a release from the project's GitHub Releases page.

2. Upload via Koha's plugin admin (Administration → Manage plugins →
   Upload plugin) and run the installer when prompted.

3. Grant the `staffroster_*` sub-permissions (under the `plugins`
   flag) to the staff who need them.

4. Open **Tools → Staff Roster** to start.

## Configure

Defaults are usable out of the box, but the **Configuration** page
(under the plugin's tool view) exposes:

- email reminder toggle + days-before
- library group enforcement mode (off / filter / strict)
- staff patron-categories filter
- Koha calendar integration + branch override
- Koha desks / authorised values for slot locations
- self-service kill-switch + lockout window
- swap-approval requirement

See **[docs/wiki/Configuration.md](docs/wiki/Configuration.md)** for the
field-by-field walkthrough.

## Project layout

```
Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm    Main module + CGI handlers
Koha/Plugin/Xyz/Paulderscheid/StaffRoster/      Controllers, templates, locales
  AssignmentController.pm                        REST: assignments + self-service
  RosterController.pm                            REST: per-roster week view
  StaffController.pm                             REST: staff lookup + my/open
  Lib/I18N.pm                                    Translation helper
  *.tt                                           Tool / admin / configure / report
  locales/de.json                                German UI translations
src/                                             Lit components (TypeScript)
t/                                               Plugin tests (live container DB)
cypress/                                         Cypress integration specs
docs/wiki/                                       User manual + wiki sources
```

## Testing

Inside the kohadev container:

```bash
docker cp t dev-koha-1:/var/lib/koha/kohadev/plugins/t
docker exec dev-koha-1 sh -c \
  "cd /var/lib/koha/kohadev/plugins && \
   KOHA_CONF=/etc/koha/sites/kohadev/koha-conf.xml \
   prove t/00-load.t t/rrule.t t/self_service.t t/swap_ownership.t \
         t/exceptions.t t/additional_fields.t t/conflict_check.t \
         t/visibility.t"
```

51 tests across 8 files cover RRule semantics, self-service flow,
swap ownership, exception CRUD, additional fields, the
`_conflict_check` capacity gate, and the recursive group walk.

For the live REST round-trip (calendar merge, exception precedence,
grid render):

```bash
just test-cypress
```

The script syncs the plugin into the kohadev container, restarts
Plack, and runs `cypress/integration/staffroster/*_spec.ts` through
ktd's bundled cypress install.

## License

GPL v3.
