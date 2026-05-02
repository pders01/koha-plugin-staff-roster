# User Manual

This page walks through the manager / scheduler workflow end to end.
For the staff (claim/drop/swap) view, see
**[Self-Service](Self-Service.md)**.

## Concepts

- **Roster type** — a category of duty (Circulation Desk, Reference,
  Children's). Five default types ship with the plugin; you can add
  your own under **Roster types** in the sidebar.
- **Roster** — a schedule template scoped to a single branch, a
  library group, or all branches. Rosters carry a date range
  (`effective_from` / `effective_to`).
- **Slot** — a recurring time window inside a roster. Defined by an
  iCal RRULE (`FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=1`), a
  start/end time, capacity (min/max staff), and an optional
  location.
- **Assignment** — a specific staff member assigned to a specific
  slot on a specific date. The schedule grid is a view of these
  rows for one week.
- **Exception** — a one-off date override (closure, holiday,
  reduced-hours, special event). Koha calendar holidays merge in
  automatically when the corresponding setting is on.
- **Swap request** — a staff-initiated request to hand off one of
  their shifts (optionally in exchange for someone else's).

## Building a roster

1. **Tools → Staff Roster → New roster**
2. **Roster type** — pick from the catalogue.
3. **Name** — visible everywhere; keep it short.
4. **Target** — All branches, a single branch, or a library group.
   Group enforcement (configure-page setting) controls who else can
   see + edit it.
5. **Description** — optional notes for other managers.
6. **Effective from / to** — the schedule grid shows assignments
   only inside this window. Leave "to" blank for an open-ended
   roster.
7. **Active** — inactive rosters disappear from list filters and
   from `/me/open_slots` (so staff can't claim against them).
8. (Optional) **Additional fields** — anything you defined under
   Configuration → Custom fields.
9. **Save roster.**

The new roster lands in the list with **0 slots** — head to
**Slots** in the sidebar to add some.

## Time slots

From any roster's **Slots** tab:

1. Click **Add time slot**.
2. Pick the **Frequency**: `Weekly` (every picked weekday in the
   chosen interval) or `Monthly` (the nth picked weekday of the
   month).
3. **Repeat every** — interval. `1` = every week / month, `2` =
   biweekly / every other month, etc.
4. **Which occurrence** (monthly only) — `1st` Mon, `-1` (Last)
   Fri, etc. Applies to every picked weekday equally.
5. **Days of week** — multi-pick. Combined with frequency above.
6. **Until (optional)** — set to stop the slot on a date.
7. **Start time / End time** — `HH:MM` each.
8. **Minimum / Maximum staff** — capacity per occurrence.
   `_conflict_check` blocks assignment writes that would push
   filled count past max.
9. **Location** — free text by default. If
   *Use Koha desks* is on and the roster is single-branch, the
   field gets a desk autocomplete. If *Authorised values* is on,
   the field becomes a `<select>` from the configured AV category
   and submission is rejected for off-list values.
10. **Notes** — shown alongside the slot in the schedule grid.
11. **Save slot.**

The slot becomes a row in the slots table; you can edit or delete
it from the row actions. Deleting a slot removes its assignments
too (the FK cascades).

## Schedule grid (Schedule tab)

The drag-and-drop heart of the plugin.

- **Left panel** — available staff for the focused cell. Filtered
  by your patron-categories setting and (in strict group mode) the
  roster's branch scope. Type in the search box to narrow.
- **Right panel** — 8-column grid (slot × Mon..Sun). Each cell
  shows the assignments for that slot on that date.
- **Drag a staff pill** onto a cell to assign. Capacity-respected;
  conflict_check rejects with a 409 the chip can render.
- **Drag a chip** between cells to reassign.
- **Click a chip** to open the Edit modal — change status, notes,
  and any additional fields.
- **Press Delete / Backspace** on a focused chip to remove the
  assignment (with a confirm modal).
- **Cmd-Z / Ctrl-Z** undoes the last 10 mutations (create / delete
  / move).
- **Keyboard navigation** — Tab into the grid, arrow keys move
  cell focus, Enter picks up / drops the cargo, Esc cancels. The
  same flow works for staff pills.
- **Concurrent edits** — chips highlighted amber when another
  librarian's change shows up in the next 5-second poll.

The slot-day cell is **hatched** when the slot's RRULE doesn't
apply to that day. Drop attempts there are rejected.

Exception dates (manual + Koha calendar closures) render as
**closed** cells and reject assignment in hard-mode.

## Exceptions

From a roster's **Exceptions** tab:

1. Click **Add exception**.
2. **Date** — `YYYY-MM-DD`.
3. **Type** — `holiday`, `closed`, `reduced_hours`, `special`.
4. **Reason** — optional note shown alongside the closure in the
   schedule.
5. **Save exception.**

When **Use Koha calendar** is on, holidays from the configured
calendar source merge in automatically; you only need exception
rows for things the Koha calendar doesn't cover (one-off events,
roster-specific closures).

## Swaps

From a roster's **Swap requests** tab.

### Requesting

1. Click **Request swap**.
2. **Give up shift** — your own upcoming assignment on this
   roster. Filtered server-side; you can't surrender someone
   else's shift even by URL hacking.
3. **Hand off to** — pick a staff member.
4. **In exchange for (optional)** — for a mutual swap, pick one of
   the target's shifts. Filtered to that target's shifts only.
   Empty = one-way handoff.
5. **Message** — context for the recipient.
6. **Send request.**

### Approving / rejecting

The recipient (and managers, depending on the
`require_swap_approval` setting) sees pending swaps in the same
table. Action buttons render conditionally:

- **Approve** — only when the user has either `swap_approve` or
  `swap_respond` + targeted + manager-approval-off. The approve
  path runs in a single transaction with a `FOR UPDATE` lock; a
  mutual swap atomically swaps both borrowers.
- **Reject** — same gate as Approve minus the manager-approval
  consideration; targeted users can always reject.
- **Cancel** — the requester (or any manager) can cancel a
  pending swap.

Status pill colours: pending = warning, approved = success,
rejected = danger, cancelled = default.

## Email reminders

When **Enable email reminders** is on (and the cron is wired —
see [Installation](Installation.md#cronjob-setup-optional-but-recommended)),
the nightly job mails every staff member with a shift `N` days out
(configurable, default `1`).

The template lives at **Tools → Notices & Slips →
STAFFROSTER → REMINDER**:

- **Title** seed: `Reminder: roster shift on <<assignment_date>>`
- **Body** seed: short greeting + roster name, date, time,
  location.

Substitution tokens you can use in your custom version:
`<<patron_firstname>>`, `<<roster_name>>`,
`<<assignment_date>>`, `<<start_time>>`, `<<end_time>>`,
`<<location>>`.

Idempotency: each (assignment, calendar day) pair only sends
once even if the cron fires twice. The check uses
`action_logs` rows with `action = 'NOTICE'`.

Failures land in `action_logs` as `NOTICE_FAILED` with the error
text. The cron runner exits non-zero on any failure so your
scheduler can alert.

## Audit log

Every mutation flows into Koha's `action_logs` under
`module = 'STAFFROSTER'`. View under **Tools → Log viewer**:

- Module: **Staff Roster**
- Action: filter by `CREATE`, `MODIFY`, `DELETE`, `SELF_CLAIM`,
  `SELF_UNCLAIM`, `NOTICE`, `NOTICE_FAILED`.

Each row carries a JSON `info` blob describing the entity (roster,
slot, assignment, exception, swap_request, reminder, etc.) and a
**Diff** column showing pre/post values for MODIFY actions.

## Tips

- **Skip the "all branches + group" combo for now.** A roster is
  either branch-bound XOR group-bound XOR all-branches. The form
  enforces it; trying to set both via API returns 400.
- **Use additional fields for free-form metadata.** Don't create
  one-off roster types for "Saturday morning" or "training week" —
  add an additional field instead.
- **Keep slot capacities tight.** `min_staff` is informational
  today; `max_staff` is the hard ceiling enforced by
  `_conflict_check`.
- **Don't delete inactive rosters.** Mark them inactive instead —
  delete cascades through the slots and assignments. Inactive
  rosters disappear from filters and self-service but retain
  history for the audit log.
