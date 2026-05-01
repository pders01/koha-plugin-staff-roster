# TODO

Open work items, grouped by priority. Items get crossed off as commits land.

## Now (small, cohesive)

- [ ] Trim dead POC settings from `configure.tt` (default_view, week_start_day,
      slot_duration, show_staff_photos, day_start_hour, day_end_hour). Keep
      the workflow ones (reminders × 2, swap notifications, self-assign,
      swap approval) since they map onto planned features.
- [ ] DRY the inline `<style>` blocks duplicated across admin/configure/
      tool/report — body padding rule, swatch rule, etc. Move to a single
      stylesheet served as a static asset and linked from each template.
- [ ] Add `class="validated"` to the configure form so client-side
      validation behaves consistently with the other forms.

## Next (single-feature batches)

- [ ] **Authorized values** opt-in for `staff_roster_slots.location`
      (config: "Use authorized values for slot locations" + AV category,
      default `STAFFROSTER_LOCATION`). Free-text fallback when off.
- [ ] **Additional fields** support on `staff_roster_assignments` first,
      then on `staff_roster`. Register the table in install hook; render
      dynamic fields in edit form; persist via `additional_field_values`.
- [ ] **Lit grid a11y**: drag-drop has no keyboard equivalent today.
      Add cell focus, Enter/Space pickup-and-drop, ARIA roles for the
      grid, and a screen-reader summary of cell content.

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

- [ ] **Tests**. Highest-risk areas: `_user_group_ids` (recursive group
      walk), `_conflict_check` (overlap SQL), Lit `dayOfWeekForColumn`
      mapping, calendar merge in `get_week`.
- [ ] **Mobile schedule grid**: 8 columns × tall slot column means
      horizontal scroll on phones. Acceptable for v1, not polished.
- [ ] **Slot delete confirm**: uses inline modal on the manage_slots
      page; roster delete uses a separate `delete_confirm` op + page.
      Two patterns for destructive actions. Trade-off: per-slot
      full-page round-trips would feel heavy. Revisit only on feedback.

## Done (recent — prune periodically)

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
