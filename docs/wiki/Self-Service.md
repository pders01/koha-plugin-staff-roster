# Self-Service

Self-service lets staff manage their own shifts without going
through a manager: claim open ones, see the week ahead, drop a
shift they can no longer make, and request a swap.

## Prerequisites

Three gates have to be lined up:

1. **Setting on**: an admin has flipped *Staff can self-assign to
   open slots* on the configuration page.
2. **Sub-permission granted**: your patron record carries
   `staffroster_self_assign`.
3. **Roster visibility**: the roster the slot belongs to has to be
   one you can see (your branch, your library group, or all-branches).

If any of those is missing, the My / Open shifts views render an
explanatory banner and the underlying API returns a 403 with a
clear message.

## My shifts

**Tools → Staff Roster → My shifts** (sidebar entry).

Shows your scheduled shifts across every roster you can see for
the current week. Each row carries:

- **Time** — `HH:MM–HH:MM`
- **Roster** — link back to that roster's schedule view
- **Branch** — when the roster is single-branch
- **Location** — slot location (desk / area)
- **Status** — Scheduled / Confirmed / Completed / Cancelled / No-show
- **Swap** — opens the roster's swap form pre-filled with this shift
- **Drop** — initiates self-unclaim (see below)

Use the **Previous / Next** week buttons to navigate. The page
auto-defaults to this week's Monday.

## Open shifts

**Tools → Staff Roster → Open shifts**.

Lists every slot in the visible week with capacity remaining,
filtered to:

- the rosters you can see
- dates the slot's RRULE applies to
- dates not closed by the Koha calendar
- shifts that don't overlap one of your existing assignments

Each row has a **Claim** button. Click it, confirm in the modal,
and you're added to the slot immediately. The list refreshes; the
shift moves to **My shifts**.

If a slot fills up between page load and click, the API returns
409 with a "Slot full" message — the toast will show it.

## Dropping a shift (self-unclaim)

From **My shifts**, click **Drop** on the shift you can't make.
A confirmation modal explains the slot will be re-opened for
someone else.

**Lockout window.** When the admin sets
*Self-unclaim lockout (hours before shift)* to a non-zero value,
drops within that window are rejected with a 403 carrying the
exact wait info:

> Self-unclaim closed: must drop at least 24h before the shift

The toast surfaces this so you know whether to ask a manager to
intervene or wait. Drops outside the window go through silently.

The dropped shift's audit row is `SELF_UNCLAIM`, distinct from a
manager-initiated `DELETE`, so post-mortem trails stay clear.

## Requesting a swap

If you can't drop and can't be there, a swap is the next best
thing. From your shift in **My shifts**, click **Swap** — it
opens the roster's *Request swap* form pre-filtered to your shifts
on that roster.

Fill in:

- **Give up shift** — your assignment.
- **Hand off to** — the staffer you've already lined up (out of
  band; this isn't a marketplace).
- **In exchange for (optional)** — pick one of their shifts for a
  mutual swap, or leave empty for a one-way handoff.
- **Message** — short context for the recipient.

The recipient (and a manager, depending on the
*Require manager approval for swaps* setting) sees the request in
**Swap requests** with **Approve** / **Reject** buttons.

On approve:

- one-way handoff: your borrower id is replaced on the
  `from_assignment_id`
- mutual swap: borrower ids swap on both assignments inside one
  database transaction with row locks, so a deadlock can't leave
  one side mutated

You'll see the resolution next time you load **My shifts** (and
in the audit log immediately).

## Notifications

- Reminder emails for upcoming shifts ship via the
  `STAFFROSTER`/`REMINDER` notice template — see
  **[User Manual: Email reminders](User-Manual.md#email-reminders)**.
- Swap-request notifications are reserved for a future flow; the
  *Enable swap request notifications* setting is parked there to
  avoid form churn when it lands.

## Frequently asked

**Why isn't my shift in *My shifts*?** The view filters to
rosters you can currently see. If you've been removed from a
library group since the assignment was made, the chip is hidden
to avoid linking to a roster you can't open. The audit log still
has it.

**Why does *Claim* sometimes 409?** Either the slot just filled
up (someone else claimed faster), or the slot's RRULE doesn't
actually apply to that date (data race after a slot edit), or
the date is closed per the Koha calendar in hard mode.

**Why can't I drop my shift starting tomorrow?** The admin set a
lockout window. Talk to a manager — they can still
`DELETE /assignments/{id}` directly without the window.

**Why does *Open shifts* skip a shift I think I should see?** It
filters out anything that overlaps one of your existing
assignments — a desk shift that runs against a reference slot
you've already taken won't be claimable from the open view.
