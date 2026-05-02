# TODO

Open work items, grouped by priority. Items get crossed off as commits land.

## Now (small, cohesive)

_Empty — pick the next batch._

Candidates worth picking up first (any of them is a clean ~1-day commit):

- **Add a French (or other) translation**. Infrastructure is in place;
  `docs/wiki/Translation-Guide.md` walks through the steps end-to-end.
  Bumps real i18n coverage above the German baseline. Pure additive
  work — no risk to existing surfaces.
- **Wire the cron runner into the kohadev container** so reminder
  emails actually fire in dev, not just unit-test in isolation. Lets
  the next person eyeball the email template + verify the
  `STAFFROSTER`/`REMINDER` letter substitution against real Koha
  notice-rendering quirks. Touches `cron/staff_roster_nightly.pl`,
  `docs/wiki/Installation.md`, possibly a Makefile target.

Avoid the Distribution items (need external decisions) and the
Phase 2 features (need design sign-off) for a quick win.

## Next (single-feature batches)

_Empty — pick the next batch._

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

- [ ] **`@jpahd/lit-stack` distribution.** Currently `file:..` path —
      works locally only. Pick: publish to npm, vendor `dist/` into
      the plugin, or git submodule. Same question applies to
      `@jpahd/kalendus` whenever the patron view lands.
- [ ] **Force-push origin** once we're ready to publish. Origin is
      still at the original POC commit; main now has 200+ commits
      including the scaffold reset + this entire feature buildout.
      Coordinate with whoever holds the upstream key.

## Backlog

- [ ] **Remaining hot-path tests**: Lit `dayOfWeekForColumn` (needs
      JS test infra; not in tree) and the `get_week` calendar merge
      (integration-shaped — real HTTP path, not a unit helper).
      `_user_group_ids` + `_conflict_check` covered in `t/visibility.t`
      and `t/conflict_check.t`.
- [ ] **Mobile schedule grid**: 8 columns × tall slot column means
      horizontal scroll on phones. Acceptable for v1, not polished.
- [ ] **Slot delete confirm**: uses inline modal on the manage_slots
      page; roster delete uses a separate `delete_confirm` op + page.
      Two patterns for destructive actions. Trade-off: per-slot
      full-page round-trips would feel heavy. Revisit only on feedback.

## Pointers for the next agent

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
