# TODO

Open work items, grouped by priority. Items get crossed off as commits land.

## Now (small, cohesive)

_Empty — pick the next batch._

## Next (single-feature batches)

_Empty — pick the next batch._

## Phase 2 (planned features, each its own work block)

- [ ] **Self-service patron view**: borrower sees own shifts, can
      self-assign to open slots if `staff_can_self_assign`. Group-scoped.
      Read-only calendar view is a great kalendus fit.
- [ ] **Skills / competencies**: schema doesn't model "John can work CIRC
      but not REF". Add `staff_skills` table + per-roster-type required
      skills; filter `/staff/available` by competency.
- [ ] **i18n**: all strings hardcoded English. Either Koha's gettext or
      `@jpahd/lit-stack/i18n` for the Lit component.

## Hardening follow-ups (from cross-codebase review 2026-05-02)

- [ ] **Bulk assignment conflict check**: AssignmentController#bulk move
      runs one UPDATE on every id without `_conflict_check`; two
      simultaneous bulk moves can overfill `max_staff`. Decide on
      fail-on-first-conflict vs skip-and-report semantics, then wrap
      the move in a per-id loop or a transaction with a count guard.
- [ ] **Lit grid poll/drag race**: pause `pollTimer` while a mutation is
      in flight, or discard poll results that resolve while
      `this.dragging` is non-null. Today a fast drag during a poll can
      double-fire.
- [ ] **Edit modal first-focus**: `pendingFocusModal` lands on the
      Cancel button; for the edit modal it should target the first form
      control (status select). Delete modal current behaviour is fine.

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
