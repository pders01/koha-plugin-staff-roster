# Changelog

All notable changes to this project are documented here. The plugin
follows [Semantic Versioning](https://semver.org); pre-release suffixes
(`-alpha.N`, `-beta.N`, `-rc.N`) precede the stable bump.

## [0.1.0] — 2026-05-02 — pre-alpha (`v0.1.0-alpha.0` git tag)

First public preview. The plugin metadata reports `0.1.0` (the
scaffold's packager rejects pre-release suffixes); the GitHub release
itself is published as a pre-release and tagged `v0.1.0-alpha.0` so
the alpha signal stays visible on the Releases page.

The plugin has been built and exercised against Koha **main**
throughout development; no other Koha release line is verified yet.
The `minimum_version` field on the plugin metadata is permissive
(24.05+) on the assumption that the surfaces touched are
backward-compatible, but adventurous installs on older releases should
expect to file a bug.

### Added

- **Schedule grid** with HTML5 drag-and-drop, keyboard pickup
  (`Enter`/`Space`/arrow nav), touch fallback, optimistic UI, and
  Cmd-Z undo.
- **Recurring slots** parsed via iCal RRULE (`FREQ=WEEKLY` /
  `FREQ=MONTHLY`, `BYDAY` with ordinals, `INTERVAL`, `UNTIL`).
- **Library scope** with `off` / `filter` / `strict` group enforcement
  modes; rosters can be branch-bound, group-bound, or all-branches.
- **Calendar integration** — Koha holiday rows merge into per-roster
  exceptions; hard mode blocks assignment on closed dates.
- **Self-service** for staff: claim open shifts, drop own shifts;
  gated by `staffroster_self_assign` sub-permission, kill-switch
  setting, and a configurable hour-window lockout
  (`self_unclaim_lockout_hours`).
- **Swap workflow** — request a one-way handoff or a mutual
  two-assignment swap; manager approval optional per setting.
- **Nightly email reminders** via a Koha notice template
  (`STAFFROSTER`/`REMINDER`); cron entry self-bootstraps the plugins
  dir via `FindBin` so the schedule line stays a plain `perl` call.
  `just cron-nightly` fires the cron once in the dev container.
- **Audit trail** — every mutation flows into `action_logs` (module
  `STAFFROSTER`) with the post-25159 JSON Diff signature; 409
  conflict rejections also emit `CONFLICT_REJECTED` rows.
- **i18n** — English + complete German translation
  (`locales/de.json`, ~280 keys) shared between Perl + JS. Templated
  REST error strings (`Slot full ({filled}/{max})`,
  `Self-unclaim closed: must drop at least {hours}h before the shift`)
  re-render in the active locale.
- **Sub-permissions** — nine `staffroster_*` codes registered under
  Koha's `plugins` flag; both REST endpoints and CGI tool views gate
  on them. Superlibrarians always pass.
- **Custom fields** — Koha additional_fields support on rosters and
  on assignments; categories surface in the grid edit modal.
- **Cypress integration coverage** — 27 tests across 7 specs cover
  assignment CRUD, the get_week endpoint + calendar merge,
  manage_slots + delete-confirm workflows, the swap workflow, the
  self-service claim/drop loop, the grid column derivation, and the
  Koha desks / authorised-value integration knobs.

### Module layout

- `Lib/{I18N,DateUtils,Audit,Permissions,Visibility,Rrule,
  AdditionalFields,Schema}.pm` — extracted helper packages.
- `Controllers/Tool/{List,Form,Slots,Exceptions,Swaps,SelfService}.pm`
  — per-op handler + view bodies that the main module's `tool`
  dispatcher used to inline.
- Main module shrunk from ~2400 to ~1122 lines through the
  reorganization.

### Tests

- prove **67/67** across 9 files — RRule parse + apply, self-service
  flow, swap ownership + mutual approve, exception CRUD, additional
  fields, conflict-check capacity gate, recursive group walk, and a
  load-everything smoke test.
- cypress **27/27**.

### Known gaps

- French (or other non-German) UI translation is not shipped.
  `docs/wiki/Translation-Guide.md` walks through the steps.
- Volunteer / OPAC self-service deferred until concrete demand
  surfaces; the intranet self-service covers every staff /
  borrower-with-staff-perm use case.
- Skills / competencies modeling is out of scope for the alpha;
  filtering staff to "John can work CIRC but not REF" needs a design
  sign-off first.
