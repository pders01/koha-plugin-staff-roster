# Permissions

The plugin registers nine sub-permissions under Koha's `plugins`
flag (bit 19). Grant them per role under
**Patrons → Set permissions → Plugins**.

| Sub-permission | Lets the holder… |
|---|---|
| `staffroster_view` | Read rosters and their week views; see "My shifts" |
| `staffroster_assign` | Drag staff onto slots, edit assignments, run bulk move/clear |
| `staffroster_manage_rosters` | Create / edit / delete rosters, slots, exceptions |
| `staffroster_manage_types` | Create / edit / delete roster types (CIRC, REF, etc.) |
| `staffroster_swap_request` | Open a swap request from one of your own shifts |
| `staffroster_swap_respond` | Approve or reject a swap targeted at you (subject to the manager-approval setting) |
| `staffroster_swap_approve` | Approve any swap as a manager — bypasses the manager-approval setting |
| `staffroster_self_assign` | Use "Open shifts" + "My shifts" to claim or drop your own shifts (also requires the kill-switch on) |
| `staffroster_configure` | Edit plugin configuration |

## Role recipes

These are starting points. Adjust to taste.

### Manager / scheduler

```
staffroster_view
staffroster_assign
staffroster_manage_rosters
staffroster_manage_types
staffroster_swap_approve
staffroster_configure
```

Can build rosters, drag staff, approve swaps, change settings. Add
`staffroster_self_assign` if managers also work shifts.

### Lead librarian (no admin)

```
staffroster_view
staffroster_assign
staffroster_swap_approve
staffroster_self_assign
```

Can assign staff and approve swaps without touching the roster
template or plugin settings. Useful for shift-floor leads.

### Staff member (self-service)

```
staffroster_view
staffroster_swap_request
staffroster_swap_respond
staffroster_self_assign
```

Sees their own week, claims open shifts, requests + responds to
swaps. Cannot edit anyone else's assignments.

### Read-only

```
staffroster_view
```

Sees rosters and their own shifts. Useful for managers in adjacent
departments who need visibility but no write access.

### Superlibrarian

The flag itself bypasses every check via `_has_perm`'s superlib
short-circuit. No need to grant individual sub-permissions.

## Where each check fires

| Action | Endpoint / handler | Sub-permission |
|---|---|---|
| Read roster week (REST) | `RosterController::get_week` | `staffroster_view` (via `_can_view_roster`) |
| Read own week (REST) | `StaffController::me_week` | `staffroster_view` |
| Read available staff | `StaffController::available` | `staffroster_assign` |
| Read open shifts | `StaffController::me_open_slots` | `staffroster_self_assign` |
| Create assignment | `AssignmentController::create` | `staffroster_assign` |
| Update assignment | `AssignmentController::update` | `staffroster_assign` |
| Delete assignment | `AssignmentController::delete` | `staffroster_assign` |
| Bulk move/clear | `AssignmentController::bulk` | `staffroster_assign` |
| Self-claim | `AssignmentController::self_create` | `staffroster_self_assign` + `staff_can_self_assign` setting + roster visibility + capacity |
| Self-drop | `AssignmentController::self_delete` | `staffroster_self_assign` + (optional) `self_unclaim_lockout_hours` window |
| Save roster type | `_admin_save_type` | `staffroster_manage_types` |
| Save roster | `_tool_save_roster` | `staffroster_manage_rosters` |
| Save slot | `_tool_save_slot` | `staffroster_manage_rosters` |
| Save exception | `_tool_save_exception` | `staffroster_manage_rosters` |
| Request swap | `_tool_request_swap` | `staffroster_swap_request` (+ caller must own the from-shift) |
| Respond to swap | `_tool_respond_swap` | `staffroster_swap_approve` OR (target + `staffroster_swap_respond` + manager-approval setting off) |
| Cancel swap | `_tool_cancel_swap` | `staffroster_swap_approve` OR (requester + `staffroster_swap_request`) |
| Save plugin config | `configure` | `staffroster_configure` |

## Notes

- Sub-permission descriptions render correctly on the Set
  Permissions page via a small JS shim in `intranet_js` — Koha
  core's `permissions.inc` only knows core flags, so the plugin
  fills in its own labels client-side.
- Granting/revoking a sub-permission takes effect on the next
  request (no cache).
- Re-installing or upgrading the plugin **preserves** existing
  user grants — registration uses
  `INSERT … ON DUPLICATE KEY UPDATE` instead of REPLACE.
