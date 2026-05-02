# TODO

Open work items, grouped by priority. Items get crossed off as commits land.

## Now (small, cohesive)

The architectural-review punch list landed (2026-05-02). The
follow-up sweep below cleared every original Now-candidate except
the French translation:

- **Add a French (or other) translation**. Infrastructure is in
  place; `docs/wiki/Translation-Guide.md` walks through the steps
  end-to-end. Pure additive work — no risk to existing surfaces.
  Needs a native speaker; the templated error strings (Now follow-up
  below) shipped with German keys only.
- [x] **Wire the cron runner into the kohadev container** —
  `just cron-nightly` syncs + fires `staff_roster_nightly.pl` via
  `koha-shell` so reminder emails verify in dev. Cron script now
  self-bootstraps the plugins dir via `FindBin`.
- [x] **Templated REST error strings** — `_conflict_check` and
  `self_delete`'s lockout 403 emit `{ error, template, template_args }`
  envelopes; `src/api.ts` `asJson` substitutes `{filled}/{max}` /
  `{hours}` against the localized template from `de.json`.
- **Per-page bundle entry points** — see Next bucket.

## Next (single-feature batches)

- [x] **Module reorganization — phase 2 + finish line.** Three commits
      land the rest of the split (2026-05-02):
      - `refactor(perl): migrate REST controllers off Lib::* shims`
        (AssignmentController, RosterController, StaffController now
        call public `Lib::*` names directly).
      - `refactor(perl): extract Lib::Schema with numbered migration
        registry` (install/upgrade/uninstall collapse to thin wrappers;
        `@MIGRATIONS` walks against `__SCHEMA_VERSION__`).
      - `refactor(perl): split tool dispatcher into Controllers/Tool/*
        packages` (List, Form, Slots, Exceptions, Swaps, SelfService).
      Every `_*` shim on the main module is gone. Main module shrunk
      from ~2240 to ~1122 lines. prove 64/64.
- [ ] **Per-component bundle entry points**: `src/grid.ts`,
      `src/my-shifts.ts`, `src/open-shifts.ts` so each TT op only
      ships the component it actually mounts (currently every op
      pulls all three plus the embedded German dict). Vite already
      supports multiple entries; the TT changes are
      `<script src="staff-roster-grid.js">` etc.
- [x] **`dragging` / `pickedUp` unification in
      `staff-roster-grid.ts`** (`2d3fcee`). Single `activeCargo`
      + `activeMode` pair owned by `setActiveCargo` /
      `clearActiveCargo`; `dragging` and `pickedUp` survive as
      derived getters so render reads stay one-to-one. New
      EscapeController for `activeMode === 'drag'` and `@dragend`
      handlers on the pill + chip clean up after aborted drags.
      Cypress 27/27.

## Phase 2 (planned features, each its own work block)

- [ ] **Skills / competencies** _(needs design sign-off before code)_:
      schema doesn't model "John can work CIRC but not REF". Add
      `staff_skills` table + per-roster-type required skills; filter
      `/staff/available` by competency. Open questions: per-skill
      proficiency levels (binary vs scale)? Self-declared vs
      manager-set? UI for skill assignment — separate page or
      inline on the patron record?
- [ ] **Volunteer / non-staff self-service (OPAC)** _(deferred until
      demand surfaces)_: only build if real demand surfaces. The
      intranet self-service shipped (see Done) covers every
      staff/borrower-with-staff-perm case; OPAC pulls in a separate
      auth surface and `@jpahd/kalendus` distribution. Skip until
      asked.

## Hardening follow-ups

- [ ] **Breadcrumbs include re-take**: `_breadcrumbs.inc` extraction
      reverted — Koha core's `breadcrumbs` / `breadcrumb_item` BLOCKs
      (in `html_helpers.inc`) didn't resolve from inside an INCLUDE'd
      plugin TT, and PROCESS didn't help either. Anchors rendered as
      plaintext. Re-attempt would need to either (a) PROCESS
      `html_helpers.inc` at the top of the include (verify it doesn't
      double-emit), or (b) drop the WRAPPER chain and emit the
      `<nav><ol><li class="breadcrumb-item">` markup directly.
      Duplication is small enough that doing nothing is fine.

## Distribution (blocks release, not dev)

Both items below need an external decision before any code lands.

- [ ] **`@jpahd/kalendus` distribution.** Same question whenever the
      OPAC patron view lands; pick npm publish (matching lit-stack)
      or vendor `dist/` into the plugin.
- [ ] **Force-push origin** once we're ready to publish. Origin is
      still at the original POC commit; main now has 200+ commits
      including the scaffold reset + this entire feature buildout.
      Coordinate with whoever holds the upstream key.

## Backlog

- [ ] **Slot delete confirm**: uses inline modal on the manage_slots
      page; roster delete uses a separate `delete_confirm` op + page.
      Two patterns for destructive actions. Trade-off: per-slot
      full-page round-trips would feel heavy. Revisit only on feedback.
- [x] **CGI tool views gated by sub-permissions** (`b37240c`).
      `tool()` now applies a per-op required-perm gate
      (`staffroster_view` / `staffroster_manage_rosters` /
      `staffroster_self_assign`) before the view renderer; failures
      drop back to list with `access_denied`. Superlibs bypass.
- [x] **Mutual-swap prove coverage** (`1dd4a8e`). `t/swap_respond.t`
      runs three subtests: mutual approve swaps borrowers, second
      approve loses the FOR UPDATE race → `swap_not_pending`, reject
      leaves both assignments untouched. Prove rose to 67/67.
- [x] **409 conflict rejections audit** (`f965c38`). Each
      `_conflict_check` call site (create / update / bulk_move /
      self_claim, plus the closure 409) emits a `CONFLICT_REJECTED`
      action_logs row before rendering 409, with slot_id, borrower,
      date, reason.
- [x] **`uninstall` preserves admin-edited letter** (`425e41e`).
      Schema::uninstall no longer wipes the STAFFROSTER letter rows;
      this matches `_register_notice_templates`'s INSERT IGNORE
      contract on the install path. POD documents the explicit
      DELETE for sites that do want a wipe.

## Pointers for the next agent

- **Current state (2026-05-02)**: prove suite **67/67** (added
  `t/swap_respond.t` + new Lib/Schema + Controllers/Tool/* swept by
  `t/00-load.t`), cypress **27/27** across 7 specs
  (`assignment_crud`, `get_week`,
  `grid_columns`, `integrations`, `manage_slots`, `self_service`,
  `swap_workflow`). Bundle ≈ 110 KB / 30 KB gzip.
- **Lib::* layout**: I18N, DateUtils, Audit, Permissions,
  Visibility, Rrule, AdditionalFields, Schema are split out under
  `Koha/Plugin/Xyz/Paulderscheid/StaffRoster/Lib/`. Tool dispatcher
  bodies live under `Controllers/Tool/{List,Form,Slots,Exceptions,
  Swaps,SelfService}.pm`. The main module no longer ships `_*`
  shims — every caller goes through the public `Lib::*` /
  `Controllers::Tool::*` API. Main module is ~1122 lines.
- **No SQL string interpolation**: every `$dbh->{do,select*}` site
  uses fully static SQL with bind params; variable IN-lists run as
  `prepare` + `execute` loops. Don't reintroduce concat patterns.
- **Backup branches**: `backup/pre-squash-2026-05-02`,
  `backup/post-squash-pre-reword`, `backup/pre-fix-squash`,
  `backup/pre-sidebar-squash`. Tag `pre-squash-2026-05-02` is the
  214-commit pre-squash tip. Origin is still at the POC commit;
  force-push when ready to publish (Distribution bucket).
- **Manual + wiki source**: `docs/wiki/` ships eight pages
  (Home, Installation, Configuration, Permissions, User-Manual,
  Self-Service, Architecture, Translation-Guide, Database-Schema).
  Mirror them into the GitHub Wiki repo before release. **Don't
  reinvent the manual** — extend these pages instead.
- **Test invocation gotcha**: `docker cp Koha
  dev-koha-1:/var/lib/koha/kohadev/plugins/Koha` nests the source
  inside the existing target on a second copy. Always
  `rm -rf /var/lib/koha/kohadev/plugins/Koha` first. Same for `t/`.
- **`perl -c` against the main `.pm`** raises a false-positive C3
  merge error outside the Plack process. Trust `prove t/00-load.t`
  instead — that walks every `.pm` via `use_ok`.
- **i18n style**: English source string is the lookup key. Missing
  keys fall through to English so partial translations stay legible.
  Don't introduce code keys; the dictionary is a flat
  `{ "English": "Translated" }` map shared by Perl + JS via
  `locales/<lang>.json` + `src/i18n/<lang>.ts`.
- **Audit log invariants**: every mutation goes through
  `_audit($action, $object_id, $infos, $original)`. The 6th arg
  drives the post-25159 JSON Diff. Don't emit raw `logaction` calls
  that bypass the wrapper.
- **TERM1 boundary**: REST JSON uses `patron_id`. DB columns and
  Perl variables stay `borrowernumber`. Translate at the boundary
  via `_from_body` / `_to_response` in
  `AssignmentController.pm`, or via `borrowernumber AS patron_id`
  aliases on response-shaped SELECTs.

## Done (recent — older entries pruned 2026-05-02)

- [x] **Architectural sweep**: 9 commits land the review punch list.
      Real bugs: `Lib::I18N::tr` no longer pins the locale to the
      first request on a Plack worker; `_tool_delete_slot` /
      `_tool_delete_exception` now branch on the `$dbh->do` return;
      `_tool_respond_swap` distinguishes a real DB failure from a
      stale-state race (new `swap_txn_failed` code); `_tool_cancel_swap`
      is `_txn`-wrapped; `renderModalShell`'s aria-label runs through
      `__()`. SQL: every `$dbh` query is now static — `_conflict_check`
      branches on `exclude_id`, `bulk` clear/move use prepare+execute
      loops, `_visibility_clause` returns a static superset that the
      caller post-filters via `_can_view_roster`. `_user_group_ids`
      memoizes per-process (kills the sidebar's N+1 ancestor walk).
      i18n: `exception_types` German keys, REST 4xx error toasts run
      through `__()` in `asJson` with seeded keys for the static
      strings, `swap_txn_failed` translated. Cleanup: dead
      `#prev_week` / `#next_week` / `#go_to_week` jQuery removed,
      unused `bulk` POST endpoint dropped from `api.ts`, stray
      sidebar rule moved out of `src/styles.css`, `de.ts` comment
      fixed. Plus the seven `Lib::*` extractions:
      DateUtils, Audit, Permissions, Visibility, Rrule,
      AdditionalFields (I18N pre-existed). Main module shrunk from
      ~2400 to ~2240 lines; prove rose 51 → 57 because `00-load.t`
      walks every new `.pm` via `use_ok`.
- [x] **Cypress coverage for the TT-form workflows**:
      - `manage_slots_spec.ts` (3): create slot via add-slot form,
        no-day-of-week validation, delete slot via inline confirm
        modal — exercises cud-save_slot + cud-delete_slot through the
        DOM.
      - `swap_workflow_spec.ts` (2): create swap request via the
        request-swap form, approve a pending swap via the per-row form
        and verify the assignment now belongs to the target borrower.
      Cypress count: 27.
- [x] **Cypress coverage for assignment CRUD + Koha integrations**:
      - `assignment_crud_spec.ts` (5): create with default status,
        PUT updates status + notes, DELETE drops from week,
        POST without slot_id → 400, self-overlapping POST → 409.
      - `integrations_spec.ts` (4): Koha Desks datalist on
        manage_slots when `use_koha_desks=1`, AV-backed location
        select when `use_authorised_value_locations=1`, additional
        fields render on edit_roster, additional_fields metadata
        surfaces in `get_week` payload for staff_roster_assignments.
      Cypress count: 22.
- [x] **Cypress coverage for the self-service flow**:
      `cypress/integration/staffroster/self_service_spec.ts` walks the
      borrower-facing claim/drop loop end to end (7 subtests): claim
      surfaces in `/me/week`, slot drops out of `/me/open_slots`,
      feature-flag 403, self-unclaim removal, duplicate 409, calendar
      closure 409, self-unclaim lockout 403. The lockout subtest
      hits `plugin_data` directly to set `self_unclaim_lockout_hours`,
      and the closure subtest reuses the `flushHolidayCache` helper
      from get_week. Cypress count: 13.
- [x] **`@jpahd/lit-stack` published to npm**: `0.1.0-alpha.0`.
      package.json now references the registry version instead of
      the `file:..` path. Plugin is now installable from a fresh
      checkout without the personal lit-stack workspace.
- [x] **Cypress regression for `cellDate` column derivation**:
      `cypress/integration/staffroster/grid_columns_spec.ts` loads
      `view_assignments` with `week_start=2026-05-04` (Monday) and
      asserts the seven day-column headers render the right
      `Mon..Sun` label + `MM-DD` suffix in column order. Locks in
      the Monday-anchored mapping in `staff-roster-grid.ts` so a
      future regression in `cellDate(dayIdx)` or the `weekStart`
      attribute wiring fails fast. Cypress count: 6.
- [x] **Mobile grid polish**: slot column is now `position: sticky;
      left: 0` so the time anchor stays visible while day cells scroll
      horizontally. The table also picks up `min-width: 720px` so
      sub-720 viewports trigger horizontal scroll inside the
      `.srg-grid-wrap` overflow box instead of squishing weekday
      cells unreadable. New `<575px` breakpoint slims the slot
      column to 88px, drops cell padding + assignment chip font
      size, and shortens cell height to 56px. Pure CSS — no JS or
      template churn. Bundle CSS grew by ~150B.
- [x] **Cypress integration coverage for `get_week` + calendar merge**:
      added `cypress/integration/staffroster/get_week_spec.ts` (5
      subtests: roster header + applies_on_dates, 7-day assignment
      window, manual exception in window, Koha calendar merge,
      DB-exception precedence over the calendar duplicate). Specs
      seed via `cy.task("query", …)` with per-test namespaces +
      teardown; calendar tests call a `flushHolidayCache` helper
      because `Koha::Calendar` memoizes the per-branch holiday set
      in memcached for ~21h. Runner is `scripts/run-cypress.sh`,
      wired to `just test-cypress`; uses ktd's pre-installed
      `/kohadevbox/Cypress/12.17.4/Cypress/Cypress` binary, no new
      dev deps in the plugin tree.
- [x] **Backfill remaining tool.tt + Lit grid i18n strings**: wrapped
      raw English in tool.tt (exception-row Delete button + 5 jQuery
      `.text(...)` legend strings) and in `staff-roster-grid.ts`
      (Loading placeholder + assignment chip aria-label / title that
      previously leaked the raw `a.status` value and English action
      hint). Hoisted `STATUS_LABELS` to module scope so the chip and
      the edit-modal `<select>` share one translation map. Added 3
      new keys to `locales/de.json` (`Delete exception for DATE?`,
      `Press Enter to move, …`, `Click to edit.`); JSON now ships
      ~273 entries. Bundle unchanged at 107.81 KB / 29.65 KB gzip.
- [x] **Documentation overhaul** (1cfb5ba): scaffold-leftover
      `README.md` + 6 stray docs replaced with a plugin-specific
      README, a refreshed `CLAUDE.md`, and `docs/wiki/` (8 pages
      ready for GitHub Wiki). `docs/schema-design.md` moved to
      `docs/wiki/Database-Schema.md`.
- [x] **i18n + complete German translation**: `Lib/I18N.pm` loads
      `locales/<lang>.json` keyed by `C4::Languages::getlanguage`;
      `get_template` wrapper exposes a `tr` coderef so every TT can
      use `[% tr('English source') | html %]`. `src/i18n/index.ts`
      mirrors the design for the Lit side; `de.ts` re-exports the same
      JSON so Perl + JS share one source of truth. Wrapped surfaces:
      every config/admin/report/aside string + tool.tt list / forms /
      messages / sidebar / modals + the three Lit components +
      shared toolbar/toasts. `locales/de.json` ships ~270 entries.
      Missing keys fall through to English. Bundle grew from 84 KB
      to 107 KB (gzip 22 → 30 KB) for the embedded dictionary.
- [x] **Self-unclaim lockout** (`self_unclaim_lockout_hours`):
      `self_delete` now joins `staff_roster_slots` to compute the
      shift's start datetime, then rejects with structured 403
      (`hours_until_shift`, `lockout_hours`) when the configured
      window hasn't passed. 0 (default) disables the gate. Configure
      page exposes a number input under Permission Settings;
      t/self_service.t adds a 'self-unclaim lockout window' subtest.
- [x] **Pin frontend deps**: `lit` + `@lit/context` + `vite` switched
      from `^` to `~` (patch-only); `typescript` pinned exact to
      `6.0.3` since betas carry no semver guarantee. `@jpahd/lit-stack`
      stays on its `file:` link — distribution is its own open item,
      not addressed by version pinning.
- [x] **Hot-path test coverage**: `t/conflict_check.t` (8 subtests
      against AssignmentController::_conflict_check — capacity,
      self-overlap, exclude_id branch, slot-not-found, RRule
      applies-on-date) and `t/visibility.t` (5 subtests against
      _user_group_ids using a mocked `Koha::Library::Groups` so the
      test stays self-contained against the dev container's empty
      library_groups table). Plugin test count is now 51.
- [x] **Lit grid hardening duo**: `refresh()` now drops the response
      when `this.dragging` is set so a mid-flight poll can't replace
      the chip the user is holding; `pendingFocusModal` selector
      forks on `this.editing` so the edit modal lands on
      `#srg-edit-status` (delete modal stays on Cancel).
- [x] **TERM1 rename: JSON `borrowernumber` → `patron_id`**. Boundary
      mappers (`_from_body`, `_to_response`) in AssignmentController;
      `borrowernumber AS patron_id` aliases in StaffController +
      RosterController SELECTs; openapi.json + Lit types + grid
      consumers + bundle all updated. DB columns + Perl variables
      keep their internal names. Swap-workflow TT untouched (CGI form
      params, not JSON).
- [x] **HTML2: cron reminder via Koha letter template**.
      `_register_notice_templates` seeds module='STAFFROSTER',
      code='REMINDER' on install + upgrade (INSERT IGNORE keeps
      admin edits). `cronjob_nightly` fetches via
      `C4::Letters::GetPreparedLetter` with a substitute hash;
      missing template logs `NOTICE_FAILED`. Uninstall drops the
      letter rows alongside permissions.
- [x] **Backend Perl review against KOHA_CODING_GUIDELINES**
      (six commits in one pass): bulk-move `_conflict_check` (was
      completely skipped), DST/TZ bug in three copies of
      `_current_week_start`, `start` query-param regex validation;
      ACTN1 / Bug 25159 JSON Diff wired through `_audit`; SQL10
      drop interpolation from IN-list builders; PERL31 hoist 16
      in-sub `require` calls to top-of-file `use`; PERL13
      module-level POD for the four `.pm` files.
- [x] **Frontend dedup pass (Lit + TT)**: `src/components/shared/`
      modules (toolbar, toasts, modal, day-groups, escape-controller)
      + TT `_aside.inc` + `_prg_guard.inc`. ESC now cancels every
      modal in the plugin. Bundle slimmed.
- [x] **Stale scaffold templates**: `templates/env` and
      `templates/hooks/after_password_action.pl` deleted (untracked,
      predated the scaffold reset).

_(Earlier Done entries pruned. Original list lived through commits
up to and including `81e80a6 refactor(frontend)` — see git log if
you need the historical record.)_
