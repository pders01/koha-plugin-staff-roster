# Installation

## Requirements

- **Koha 24.05** or newer (the plugin uses
  `Koha::DateUtils::dt_from_string`, `Koha::Library::Groups`,
  `Koha::Calendar`, the post-25159 `C4::Log::logaction` signature,
  and the standard plugins-table sub-permission machinery).
- The Koha plugin system enabled (`enable_plugins` in
  `koha-conf.xml`).
- A staff user with the `superlibrarian` flag for the initial
  install (you can demote afterwards).
- Optional: outbound mail configured if you want the nightly
  reminder cronjob to actually send.

## Build a `.kpz`

If you're working from a clone:

```bash
bun install
bun run build
```

That populates the bundled JS/CSS at
`Koha/Plugin/Xyz/Paulderscheid/StaffRoster/staff-roster.{js,css}`.
Then zip the entire `Koha/` directory plus `koha-plugin.yml` into a
file named `koha-plugin-staff-roster-<version>.kpz`.

If you're consuming a pre-built release, skip straight to upload.

## Upload + install

1. Sign in to the Koha staff intranet as a superlibrarian.
2. **Administration → Manage plugins → Upload plugin** — select your
   `.kpz`.
3. Click **Run installer** when the row appears in the list. This:
   - creates six tables (`staff_roster_types`, `staff_roster`,
     `staff_roster_slots`, `staff_roster_assignments`,
     `staff_roster_exceptions`, `staff_roster_swap_requests`)
   - seeds five default roster types (CIRC, REF, CHILD, INFO, TECH)
   - registers nine `staffroster_*` sub-permissions under the
     `plugins` flag
   - registers a `STAFFROSTER`/`REMINDER` notice template
4. **Administration → Patrons and circulation → Patron categories**
   (optional) — confirm which categories your staff sit under;
   you'll point the plugin at them later.

## Cronjob setup (optional, but recommended)

Reminder emails ship from a Koha-style cronjob runner. Inside the
container or on the Koha host, schedule:

```cron
# every night at 02:00 — pulls reminder_days_before from settings
0 2 * * *  /usr/share/koha/bin/cronjobs/cronjob_wrapper.sh \
            koha-shell <instance> -- \
            perl /var/lib/koha/<instance>/plugins/cron/staff_roster_nightly.pl
```

Without this, the `enable_email_reminders` setting and the
`STAFFROSTER`/`REMINDER` letter template are inert.

### Dev (kohadev container)

`just cron-nightly` syncs the plugin source into the
`dev-koha-1` container and fires the cron once via `koha-shell`.
Output line is `staff_roster_nightly: enqueued N reminder(s).`
Override container/instance with positional args:

```bash
just cron-nightly my-koha-1 myinstance
```

Use this to verify the three knobs end to end (the setting toggle,
the letter template, the reminder window) without waiting for a real
crontab to fire.

## Verify

- Open **Tools → Staff Roster** — you should land on an empty
  "Staff rosters" list with a **New roster** button.
- Open **Administration → Manage plugins** and click the
  **Configuration** action — every form field should render.
- Check **Tools → Log viewer** filtered by module `STAFFROSTER` —
  the install adds nothing here, but the first roster you create
  should appear immediately.

## Upgrade

Upload a newer `.kpz` and run the installer; it idempotently
re-registers permissions and the notice template. Schema migrations
(if any) live behind version-compare gates inside `upgrade()`.

## Uninstall

From the plugin admin, click **Uninstall**. This drops the six
tables, removes the `staffroster_*` permissions (existing user
grants are cascaded), and deletes every `letter` row with
`module = 'STAFFROSTER'`.

> **Heads-up:** uninstall is destructive. The plugin doesn't
> back up rosters or assignments. Export anything you want to
> keep first.

## Next steps

- Hand out access via the **[Permissions](Permissions.md)** matrix.
- Walk through the
  **[Configuration](Configuration.md)** page.
- Build your first roster following the
  **[User Manual](User-Manual.md)**.
