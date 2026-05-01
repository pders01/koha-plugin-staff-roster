# TODO

Open work items, grouped by priority. Items get crossed off as commits land.

## Now (small, cohesive)

_Empty — pick the next batch._

## Next (single-feature batches)

- [ ] **Additional fields on assignments**: same plumbing as the roster
      version, but assignments only have a Lit-grid drag/drop UI today.
      Needs an "edit assignment" modal (open on chip click) before the
      fields surface anywhere useful. Helpers in StaffRoster.pm are
      table-agnostic — pass `staff_roster_assignments` once the modal lands.

## Phase 2 (planned features, each its own work block)

- [ ] **Swap workflow UI**: schema exists (`staff_roster_swap_requests`)
      but no UI. Request → approve/reject → swap. Manager approval gated
      by `require_swap_approval` config.
- [ ] **Email reminders via cronjob_nightly hook**: send "you're scheduled
      tomorrow" email N days before assignment, gated by
      `enable_email_reminders` + `reminder_days_before`.
- [ ] **Self-service patron view**: borrower sees own shifts, can
      self-assign to open slots if `staff_can_self_assign`. Group-scoped.
      Read-only calendar view is a great kalendus fit.
- [ ] **Exception/closure management UI**: today only the API merges
      Koha calendar closures. Add a small admin page to create
      `staff_roster_exceptions` rows for non-calendar closures (training
      days, special events, reduced hours).
- [ ] **Skills / competencies**: schema doesn't model "John can work CIRC
      but not REF". Add `staff_skills` table + per-roster-type required
      skills; filter `/staff/available` by competency.
- [ ] **Activity audit**: track who reassigned/cancelled/created what.
      Useful for "who moved Sara off Tuesday?". Schema TBD.
- [ ] **i18n**: all strings hardcoded English. Either Koha's gettext or
      `@jpahd/lit-stack/i18n` for the Lit component.
- [ ] **Concurrent-edit indicator**: polling refreshes the grid, but
      changes from other librarians appear silently. Highlight cells
      whose `updated_at` advanced since last fetch.

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
