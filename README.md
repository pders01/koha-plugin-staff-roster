# koha-plugin-staff-roster

Manage staff duty rosters and shifts inside Koha. Drag-and-drop schedule
grid, recurring time slots with iCal RRULE, library-group scoping,
calendar-aware closures, swap workflow, self-service claim/drop, and
nightly email reminders. German UI translation included.

> **Status:** pre-alpha (plugin metadata `0.1.0`; GitHub release tag
> `v0.1.0-alpha.0`, marked as a GitHub pre-release). Built and exercised against
> Koha **main** throughout development; no other release line has been
> verified yet. The `minimum_version` metadata field is permissive
> (24.05+) on the assumption that the touched surfaces are
> backward-compatible, but installs on older releases should expect to
> file a bug. The REST surface uses Koha terminology (`patron_id`) so
> it slots into the rest of the API without surprise.

## Background

This plugin started as a dual-use exercise: build a real, useful
Koha extension and, along the way, exercise the plugin system to
see what patterns emerge. The roster problem is genuine — desk
shift management is a recurring need across single-branch and
multi-branch libraries — and the result is meant to stand on its
own as a serious plugin. Adoption will tell us whether it stays
standalone or grows beyond that.

Two side outputs fall out of the work:

- **Templates and patterns for [`pders01/koha-plugin`](https://github.com/pders01/koha-plugin)**,
  the scaffold CLI that bootstrapped this repo. Recurring shape
  decisions made here (cpanfile boundaries, package layout, RRule
  handling, sub-permission registry, additional-fields glue,
  `_audit` plumbing, the static asset surface, the i18n shim, the
  Lit + TT bridge, nightly cron entrypoint, `.kpz` packaging, CI
  shape) are good candidates to fold back into the scaffold so the
  next plugin that hits the same shape gets a head start.
- **Possible upstream contributions to Koha itself.** Some helpers
  here exist as plugin-side workarounds where a small core hook
  could serve every plugin that needs the same thing — granular
  sub-permissions under `plugins`, library-group visibility
  walking, calendar closure merging into per-instance exception
  rows, the post-25159 `_audit` wrapper. Time permitting, a few
  of these may become Bugzilla proposals down the line; the plugin
  is happy to keep carrying them in the meantime.

## Features

- **Schedule grid** — drag staff onto time slots, drop assignments
  between cells, undo with Cmd-Z, optimistic UI with concurrent-edit
  highlighting. Keyboard pickup (`Enter` / `Space`, arrow nav, `Esc`
  cancel) covers HTML5 DnD, keyboard-only, and touch alike.
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
- **Swap workflow** — request a one-way handoff or a mutual two-
  assignment swap; manager approval optional per setting.
- **Nightly email reminders** — N days before each shift, via a Koha
  notice template (`STAFFROSTER`/`REMINDER`) admins can edit.
- **Audit trail** — every mutation flows into Koha's `action_logs`
  with full pre/post diff support; 409 conflict rejections also emit
  `CONFLICT_REJECTED` rows so blocked attempts stay reconstructable.
- **i18n** — English + German shipped (~280 keys); partial
  translations fall through to English so a missing key never breaks
  a page. Templated REST errors (`Slot full ({filled}/{max})`,
  `Self-unclaim closed: must drop at least {hours}h before the shift`)
  re-render in the active locale.

See **[docs/wiki/](docs/wiki/Home.md)** for the full user manual,
configuration guide, and architecture notes. The same files double as
the GitHub Wiki source. The release log lives in
**[CHANGELOG.md](CHANGELOG.md)**.

## Install

1. Grab the latest `.kpz` from the project's
   [GitHub Releases](https://github.com/pders01/koha-plugin-staff-roster/releases)
   page, or build one yourself:

   ```bash
   bun install
   bun run build           # bundles the Lit components into Koha/Plugin/.../staff-roster.js
   just package            # produces koha-plugin-staff-roster-<version>.kpz at repo root
   ```

2. Upload via Koha's plugin admin (Administration → Manage plugins →
   Upload plugin) and run the installer when prompted.

3. Grant the `staffroster_*` sub-permissions (under the `plugins`
   flag) to the staff who need them. Superlibrarians always pass.

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
Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm     Main module (lifecycle + tool / admin / configure / report dispatchers)
Koha/Plugin/Xyz/Paulderscheid/StaffRoster/
  AssignmentController.pm                         REST: assignments + self-service
  RosterController.pm                             REST: per-roster week view
  StaffController.pm                              REST: staff lookup + /me endpoints
  Lib/                                            Helper packages: I18N, DateUtils, Audit, Permissions, Visibility, Rrule, AdditionalFields, Schema
  Controllers/Tool/                               Per-op handler + view bodies (List, Form, Slots, Exceptions, Swaps, SelfService)
  *.tt                                            Tool / admin / configure / report templates
  locales/de.json                                 German UI translations (shared with the JS bundle via src/i18n/de.ts)
cron/staff_roster_nightly.pl                     Nightly reminder cron entry (FindBin-bootstrapped)
src/                                             Lit components (TypeScript)
t/                                               Plugin prove tests (live container DB)
cypress/                                         Cypress integration specs
docs/wiki/                                       User manual + GitHub Wiki source
```

## Testing

Inside the kohadev container:

```bash
docker cp t dev-koha-1:/var/lib/koha/kohadev/plugins/t
docker exec dev-koha-1 sh -c \
  "cd /var/lib/koha/kohadev/plugins && \
   KOHA_CONF=/etc/koha/sites/kohadev/koha-conf.xml \
   prove t/00-load.t t/rrule.t t/self_service.t t/swap_ownership.t \
         t/swap_respond.t t/exceptions.t t/additional_fields.t \
         t/conflict_check.t t/visibility.t"
```

**67 tests across 9 files** cover RRule semantics, self-service flow,
swap ownership + mutual approve, exception CRUD, additional fields,
the `_conflict_check` capacity gate, the recursive group walk, and
the load-everything smoke test.

For the live REST round-trip (calendar merge, exception precedence,
grid render, drag-and-drop):

```bash
just test-cypress
```

The script syncs the plugin into the kohadev container, restarts
Plack, and runs `cypress/integration/staffroster/*_spec.ts` through
ktd's bundled cypress install. **27 tests across 7 specs.**

To fire the nightly reminder cron once in dev:

```bash
just cron-nightly
```

## License

GPL v3.
