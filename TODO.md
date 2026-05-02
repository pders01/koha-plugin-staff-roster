# TODO

Open work items, grouped by priority. Items get crossed off as commits land.

## Now (small, cohesive)

_Empty — pick the next batch._

## Next (single-feature batches)

_Empty — pick the next batch._

## Phase 2 (planned features, each its own work block)

- [ ] **Skills / competencies**: schema doesn't model "John can work CIRC
      but not REF". Add `staff_skills` table + per-roster-type required
      skills; filter `/staff/available` by competency.
- [ ] **i18n**: all strings hardcoded English. Either Koha's gettext or
      `@jpahd/lit-stack/i18n` for the Lit component.
- [ ] **Volunteer / non-staff self-service (OPAC)**: only build if real
      demand surfaces. The intranet self-service shipped (see Done) covers
      every staff/borrower-with-staff-perm case; OPAC pulls in a separate
      auth surface and `@jpahd/kalendus` distribution. Skip until asked.
- [ ] **Self-unclaim lockout**: setting hook `self_unclaim_lockout_hours`
      not yet implemented. Decide whether to enforce a window
      (e.g. ≥24h before shift) before letting staff drop their own shift.

## Hardening follow-ups (from cross-codebase review 2026-05-02)

- [ ] **Lit grid poll/drag race**: pause `pollTimer` while a mutation is
      in flight, or discard poll results that resolve while
      `this.dragging` is non-null. Today a fast drag during a poll can
      double-fire.
- [ ] **Edit modal first-focus**: `pendingFocusModal` lands on the
      Cancel button; for the edit modal it should target the first form
      control (status select). Delete modal current behaviour is fine.
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

- [ ] Solve `@jpahd/lit-stack` distribution. Currently `file:..` path —
      works locally only. Pick: publish to npm, vendor `dist/` into the
      plugin, or git submodule. Same question applies to `@jpahd/kalendus`
      whenever the patron view lands.
- [ ] Force-push origin once we're ready to publish. Origin is still at
      the original POC commit; main now has 100+ commits including the
      scaffold reset.
- [ ] Decide on `templates/env` and `templates/hooks/after_password_action.pl`
      (untracked, predate the scaffold reset). Either delete or upstream
      them to the koha-plugin scaffold repo.
- [ ] Pin Lit / vite versions compatible with the Koha versions we
      support. Currently `^3.3.2` etc — minor bumps could break.

## Backlog

- [ ] **Tests** for remaining hot paths: `_user_group_ids` (recursive
      group walk), `_conflict_check` (overlap SQL), Lit
      `dayOfWeekForColumn` mapping, calendar merge in `get_week`. RRule
      helpers covered in `t/rrule.t`.
- [ ] **Mobile schedule grid**: 8 columns × tall slot column means
      horizontal scroll on phones. Acceptable for v1, not polished.
- [ ] **Slot delete confirm**: uses inline modal on the manage_slots
      page; roster delete uses a separate `delete_confirm` op + page.
      Two patterns for destructive actions. Trade-off: per-slot
      full-page round-trips would feel heavy. Revisit only on feedback.

## Done (recent — prune periodically)

- [x] **TERM1 rename: JSON `borrowernumber` → `patron_id`**. Boundary
      mappers (`_from_body`, `_to_response`) in AssignmentController;
      `borrowernumber AS patron_id` aliases in StaffController +
      RosterController SELECTs; openapi.json + Lit types + grid
      consumers + bundle all updated. DB columns + Perl variables
      keep their internal names. Swap-workflow TT untouched (CGI form
      params, not JSON). Self-service test renamed accordingly.
- [x] **HTML2: cron reminder via Koha letter template**.
      `_register_notice_templates` seeds module='STAFFROSTER',
      code='REMINDER' on install + upgrade (INSERT IGNORE keeps
      admin edits). `cronjob_nightly` fetches via
      `C4::Letters::GetPreparedLetter` with a substitute hash;
      missing template logs `NOTICE_FAILED`. Uninstall drops the
      letter rows alongside permissions. Substitution verified
      end-to-end against kohadev.
- [x] **Backend Perl review against KOHA_CODING_GUIDELINES**:
      6 commits landed on 2026-05-02 covering the high-priority
      findings from the four parallel reviewer agents.
      - `fix(backend)`: bulk-move `_conflict_check` (was completely
        skipped, worse than the race the TODO had flagged), DST/TZ
        bug in `_current_week_start` (3 copies — Roster + Staff
        controllers + plugin .pm `_get_current_week_start`),
        `start` query-param regex validation.
      - `fix(audit)` ×2: ACTN1 / Bug 25159 JSON Diff wired through
        `_audit` (now takes `$original`); every assignment + roster
        + slot + exception + swap mutation snapshots pre-state and
        passes it. Cron NOTICE entries stay flat (no mutated object).
      - `refactor(sql)`: SQL10 — drop `qq{... ($placeholders)}` /
        `$exclude_*_clause` interpolation; switch IN-list builders
        to `q{...} . $placeholders . q{}` and `_conflict_check` to
        `@clauses` arrays joined by AND.
      - `refactor(perl)`: PERL31 — hoist 16 in-sub `require` calls to
        `use` at file top across the four modules. C4::Log stays in
        the `_audit` eval per the existing very-old-Koha rationale.
      - `docs(pod)`: PERL13 — module-level NAME / DESCRIPTION /
        AUTHOR for the four files plus POD on `cronjob_nightly` and
        the `_current_week_start` helpers.
      Deferred to Next: HTML2 cron email letter template, TERM1
      `borrowernumber` → `patron_id` rename.
- [x] **Frontend dedup pass (Lit + TT)**:
      - `src/components/shared/`: `toolbar.ts` (`renderWeekToolbar` —
        Previous/Next/Refresh, schedule grid passes Undo via `extras`),
        `toasts.ts` (success + error, `staff-roster-grid` was
        error-only before), `modal.ts` (Bootstrap shell — delete in
        grid, drop in my-shifts, claim in open-shifts),
        `day-groups.ts` (`groupByDate<T>` + `renderDayGroups`),
        `escape-controller.ts` (`ReactiveController` registers
        doc-level keydown; first registered with truthy predicate
        wins — grid uses three controllers in priority order
        editing > pendingDelete > pickedUp).
      - TT: `_aside.inc` (sidebar shared by admin/configure/report,
        `aside_active` selects active class) and `_prg_guard.inc`
        (Post-Redirect-Get script for tool/admin/configure, takes
        `prg_method`). Resolved via `[% INCLUDE "$PLUGIN_DIR/_x.inc"
        ... %]` because Koha sets `PLUGIN_DIR` to absolute and
        `C4::Templates` runs with `ABSOLUTE => 1`.
      - Bundle slimmed; ESC now cancels every modal in the plugin
        (the edit modal had no ESC before).
- [x] **Page-reload guard (Post-Redirect-Get)**: tool/admin/configure
      handlers set `post_redirect_op` after a `cud-*` op; each TT
      injects `history.replaceState` to swap the URL to the GET
      landing op so F5 doesn't re-POST. No server-side redirect, no
      session state.
- [x] **Filter visibility on Available staff**: `/staff/available`
      returns `{ staff, count, pool, limit, filter }`; filter exposes
      mode (codes vs `category_type_s` fallback), configured codes,
      `branch_scope` (all/branch/group with label), and slot context
      (slot_id + date + start/end_time) when scoped to a focused cell.
      Lit grid renders header chip + "N free of M eligible" + cell
      focus refetches with `slot_id`.
- [x] **Swap-request ownership fix**: `_tool_request_swap` rejects
      with `swap_not_your_shift` when `from_assignment.borrowernumber`
      != session borrower (was only checking roster membership).
      Dropdown filtered to own_assignments; "In exchange for" filtered
      to selected to_borrowernumber via small jQuery filter, with
      stale-pick reset. Coverage in `t/swap_ownership.t`.
- [x] **Staff self-service (intranet)**: "My shifts" + "Open shifts" tools
      under the existing staff intranet. Backed by GET /me/week,
      GET /me/open_slots, POST /me/claim, DELETE /me/claim/{id}. Four-layer
      gate on claim (kill-switch setting + sub-perm + group visibility +
      capacity). Body `borrowernumber` ignored: session always wins.
      Audited as SELF_CLAIM / SELF_UNCLAIM. New sub-perm
      `staffroster_self_assign`. Two new Lit components (`my-shifts-list`,
      `open-shifts-list`) reuse the existing intranet asset bundle.
      Coverage in `t/self_service.t`. OPAC variant deferred to Phase 2.
- [x] **Granular sub-permissions**: 8 staffroster_* sub-perms registered
      under Koha plugins flag (bit 19) via INSERT...ON DUPLICATE KEY
      UPDATE so existing user_permissions grants survive upgrades.
      _has_perm + _gate wired into every CUD handler + assignment +
      staff API. intranet_js injects labels client-side since core
      permissions.inc has a hardcoded CASE map. Sub-perm descriptions
      shown on the Set Permissions page.
- [x] **Swap workflow UI**: per-roster manage_swaps op with request
      form, status table, approve/reject/cancel actions. Approval
      respects require_swap_approval. Mutual swap supported.
      Swap-respond approve runs in a single transaction with FOR UPDATE
      to close the TOCTOU window between concurrent approvers.
- [x] **Email reminders cronjob**: cronjob_nightly enqueues reminder
      emails N days ahead via C4::Letters::EnqueueLetter; idempotent
      within the calendar day via NOT EXISTS against action_logs.
      Failures warn + record NOTICE_FAILED. cron/staff_roster_nightly.pl
      runner exits non-zero on any failure.
- [x] **Audit log**: every plugin mutation flows into Koha's
      action_logs (module='STAFFROSTER') with an entity tag + ids in
      the JSON info blob. Visible from tools/viewlog.pl alongside
      borrower/catalogue audit trail.
- [x] **Concurrent-edit indicator**: snapshot per-assignment updated_at
      across polls; chips that advance pulse an amber outline for ~4s.
      Initial load skipped so first paint isn't fireworks.
- [x] **Exception/closure management UI**: per-roster manage_exceptions
      op with toolbar, inline add/edit form, schema-validated
      type/date, scoped delete. Sidebar nav + view_assignments toolbar
      shortcut. t/exceptions.t covers add/edit/delete/bad-input/cross-roster.
- [x] **Assignment edit modal**: chip click opens a Lit modal with
      status, notes, and additional fields (text or AV-backed). Save
      PUTs through the existing /assignments/:id endpoint; Remove
      hands off to the delete-confirm modal. Keyboard Delete still
      removes directly, preserving the old shortcut.
- [x] **Additional fields on assignments**: helper refactor split CGI
      vs JSON-map paths; RosterController embeds per-assignment values
      and field defs in the week response; AssignmentController.update
      persists them.
- [x] **Additional fields on rosters**: helpers
      (`_load_additional_fields` / `_save_additional_fields` /
      `_delete_additional_fields` / `_bulk_additional_field_values`)
      backed by Koha's `additional_field_values` table. Roster edit
      form INCLUDEs `additional-fields-entry.inc`; list view summarises
      per-roster values; configure page links to admin/additional-fields.pl.
      Assignment-level fields deferred (no edit UI for assignments yet).
- [x] **RRule phase 2**: FREQ=MONTHLY (BYDAY=1MO/-1FR), INTERVAL,
      UNTIL via DateTime::Event::ICal. Server emits per-date
      applies_on_dates for the visible week; Lit grid filters on it.
      Slot form gets Frequency/Interval/Ordinal/Until inputs.
      Hot paths covered in `t/rrule.t` (9 subtests).
- [x] **Authorized values** opt-in for `staff_roster_slots.location`:
      `use_authorised_value_locations` + `authorised_value_location_category`
      settings. Slot form renders <select> from AV category when on;
      submit-side validation rejects values outside the category.
      Free-text + desks fallback unchanged when off.
- [x] **Lit grid a11y**: cell + chip + pill keyboard pickup-drop with
      Esc cancel, ARIA grid/listbox roles, sr-only live region, focus
      ring matching Koha accent. Mouse drag-drop preserved.
- [x] **Fix conflict overlap query**: ambiguous `id` column when
      joining slots twice — qualified to `a.id`.
- [x] **RRule recurrence** for slots (FREQ=WEEKLY;BYDAY=...) — single
      slot row covers multiple days; assignment endpoint rejects drops
      on days the slot doesn't run.
- [x] **Patron categories** integration: configurable list of
      categorycodes drives /staff/available.
- [x] **Koha desks**: location field gets a desk datalist when
      use_koha_desks is enabled and the roster targets a single branch.
- [x] Toast error rendering (no layout shift), bottom-right danger
      styling.
- [x] Spec declares 400/409 responses on assignment endpoints (no
      more spurious HTTP 501 on conflicts).
- [x] Sidebar consistent across admin/configure/tool/report views.
- [x] Each panel (staff list, schedule grid) gets its own .page-section
      so the card sizes to its own content.
- [x] Hatch pattern on day cells where the slot doesn't apply.
- [x] Trim six dead POC settings (default_view, week_start_day,
      slot_duration, show_staff_photos, day_start_hour, day_end_hour).
- [x] DRY shared TT styles into `staff-roster-plugin.css` static asset.
- [x] `class="validated"` on the configure form.
- [x] Replace native `confirm()` dialogs with Bootstrap modals.
- [x] Replace `alert alert-warning` wrappers on delete-confirm pages with
      the Koha standard `<h1>` + `.page-section` + `<fieldset class="action">`
      pattern.
- [x] Unify cross-view markup (toolbar position, status indicators,
      type-color swatch class, FA prefix, submit button label).
- [x] Fix slot day_of_week mapping in the schedule grid (Sunday slot was
      rendering on the Monday column).
- [x] Align `report.tt` skeleton with the other plugin views.
- [x] Move list filters into the sidebar with proper padding.
- [x] Light-DOM Lit component using Koha's Bootstrap styles.
- [x] Library groups + Koha calendar integration with off/filter/strict
      modes and ALL-branches-closed semantics for groups.
