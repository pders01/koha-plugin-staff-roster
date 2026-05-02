# Staff Roster — Wiki

The Staff Roster Koha plugin manages duty rosters for circulation,
reference, children's, and information desks across one or many
library branches. This wiki is the user-facing manual; technical
internals live alongside it.

## Pages

### For administrators

- **[Installation](Installation.md)** — package, upload, install,
  initial permissions
- **[Configuration](Configuration.md)** — every field on the
  configure page, what it does, and which downstream behaviour it
  changes
- **[Permissions](Permissions.md)** — sub-permission catalogue and
  who needs what
- **[User Manual](User-Manual.md)** — manager + scheduler workflow:
  build a roster, define slots, assign staff, manage exceptions,
  approve swaps

### For staff (self-service)

- **[Self-Service](Self-Service.md)** — claim open shifts, see your
  own week, drop a shift, request a swap
- **[Email reminders](User-Manual.md#email-reminders)** — what they
  look like, how to opt out (admins) or customise the template

### For developers

- **[Architecture](Architecture.md)** — how the pieces fit together
  (module + controllers + Lit grid + locale flow)
- **[Database Schema](Database-Schema.md)** — table-by-table layout,
  foreign keys, RRule storage
- **[Translation guide](Translation-Guide.md)** — add a new locale,
  extend the dictionary

## Quick reference

| Need to… | Page |
|---|---|
| Bring up a fresh install | [Installation](Installation.md) |
| Change defaults / behaviour flags | [Configuration](Configuration.md) |
| Grant the right access to a staff role | [Permissions](Permissions.md) |
| Build the first roster | [User Manual: Building a roster](User-Manual.md#building-a-roster) |
| Schedule recurring shifts | [User Manual: Time slots](User-Manual.md#time-slots) |
| Mark a holiday or one-off closure | [User Manual: Exceptions](User-Manual.md#exceptions) |
| Let staff drop / claim shifts themselves | [Self-Service](Self-Service.md) |
| Approve / reject a swap | [User Manual: Swaps](User-Manual.md#swaps) |
| Customise the reminder email | [User Manual: Email reminders](User-Manual.md#email-reminders) |
| Translate the UI to a new language | [Translation Guide](Translation-Guide.md) |

## What this plugin does not do

- Track time worked or generate payroll reports
- Calculate overtime, breaks, or labour-law constraints
- Replace Koha's holiday calendar (it integrates with it)
- Replace Koha's notice template system (it ships one)
- Provide an OPAC/patron-self-service surface — intranet only

These are intentional non-goals. If your workflow needs them, treat
this plugin as the scheduling layer and pair it with whatever payroll
/ HR system you already run.
