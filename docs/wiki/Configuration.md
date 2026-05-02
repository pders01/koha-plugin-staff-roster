# Configuration

Reach the configuration page via **Administration → Manage plugins →
Staff Roster → Actions → Configure** (also linked from the plugin's
sidebar). Every setting persists in Koha's `plugin_data` table and
applies immediately on save.

Saving requires the **`staffroster_configure`** sub-permission;
non-superlibrarians without it see a 403-style banner and the form
becomes a no-op.

## Notification Settings

| Field | Default | Effect |
|---|---|---|
| Enable email reminders | `No` | Master switch for the nightly cronjob. Off = `cronjob_nightly` returns 0 immediately. |
| Send reminders (days before) | `1` | Look-ahead window. `1` mails today for tomorrow; `7` mails today for next week. |
| Enable swap request notifications | `Yes` | Reserved for a future swap-notification flow; currently affects nothing in code, kept so we don't churn the form when it lands. |

Reminders go through the `STAFFROSTER`/`REMINDER` notice template
(see the **[User Manual](User-Manual.md#email-reminders)**) — admins
edit content/branding under **Tools → Notices & Slips**, not here.

## Library scope & staff selection

| Field | Effect |
|---|---|
| Group enforcement | `Off` ignores library groups entirely. `Filter` hides group-bound rosters from non-members but still allows direct-link reads. `Strict` returns 403 on read and write for non-members. Superlibrarians always pass. |
| Default group | Pre-selects this group on the roster create form. Cosmetic only. |
| Staff patron categories | Multi-select. Empty = fall back to "any patron flagged staff" (`category_type = 'S'`), which usually pulls in service accounts and is rarely what you want. Configure this on day one. |

The Group enforcement choice ripples through:

- **/staff/available** filtering when a slot is focused (strict mode
  scopes to the parent roster's branches).
- The roster list visibility (`_visibility_clause`) and
  `_can_view_roster()`.
- The four-layer self-service claim gate.

## Calendar integration

| Field | Effect |
|---|---|
| Use Koha calendar | Off = exception rows are the only source of closures. On = Koha holiday calendars merge in for the visible week. |
| Calendar source | Empty = each roster uses its own branch (or all branches in its group, AND-joined). Pick a specific branch to override. |
| Closure handling | `Hard` rejects assignment + self-claim writes on closed dates with a 409. `Soft` shows the closure but lets writes through. |

Group-bound rosters use the **all-closed** semantic: a date is closed
only if every branch in the group is closed that day. Empty group =
never closed.

## Slot location source

| Field | Effect |
|---|---|
| Koha desks | When on, single-branch roster slot forms suggest the branch's Koha desks via a `<datalist>`. |
| Authorised values | When on, the slot location field becomes a `<select>` from a Koha AV category and submission-time validation rejects values outside the category. Takes precedence over Koha desks. |
| AV category | The category code to read from. Default `STAFFROSTER_LOCATION` — create it under **Administration → Authorised values** before enabling. |

## Custom fields

A link to **Administration → Additional fields** for the
`staff_roster` table. Define optional per-roster fields (text or
authorised-value). They show up on the roster edit form and on the
list view's secondary line. Empty values aren't stored.

## Permission Settings

| Field | Default | Effect |
|---|---|---|
| Staff can self-assign to open slots | `No` | Master switch for the **My shifts** + **Open shifts** views and the `/me/claim` endpoint. Off = the views show an explanatory banner and the API returns 403. |
| Self-unclaim lockout (hours before shift) | `0` | When > 0, `self_delete` rejects with 403 when the shift is closer than this many hours away. Use `24` to enforce a one-day cooldown. The response carries `hours_until_shift` + `lockout_hours` so the UI can render a precise message. |
| Require manager approval for swaps | `Yes` | Off = the swap target may approve themselves provided they hold `staffroster_swap_respond`. On = approval requires `staffroster_swap_approve` (managers only). Reject is always allowed for the target / managers. |

## Saving

The **Save configuration** button writes every field at once via
`store_data`. The page then redirects through a no-data GET so a
browser refresh doesn't re-POST.
