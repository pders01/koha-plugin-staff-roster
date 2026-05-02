# CLAUDE.md

## Commit Message Format

Use conventional commits with concise bullet-point bodies:

```
<type>: <subject>

- Bullet point 1
- Bullet point 2
- Bullet point 3
```

Types: feat, fix, docs, style, refactor, test, chore

## Project Structure

- `Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm` - Main plugin module
- `Koha/Plugin/Xyz/Paulderscheid/StaffRoster/*.tt` - Template files
- `docs/schema-design.md` - Database schema documentation

## Entry Points

- `tool` - Main roster management interface
- `admin` - Roster type management (privileged)
- `configure` - Plugin configuration settings

## Database Tables

- `staff_roster_types` - Categories of duties
- `staff_roster` - Schedule definitions
- `staff_roster_slots` - Time slots within rosters
- `staff_roster_assignments` - Staff assigned to slots
- `staff_roster_exceptions` - Holidays, closures
- `staff_roster_swap_requests` - Shift swap workflow

## Testing

Verify Perl syntax in container:
```bash
docker exec dev-koha-1 perl -c /var/lib/koha/kohadev/plugins/Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm
```
