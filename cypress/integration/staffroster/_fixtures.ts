/**
 * Shared fixtures for the StaffRoster cypress specs.
 *
 * The plugin has no admin REST surface for rosters/slots, so fixtures
 * are seeded with raw INSERTs through cy.task("query", ...). Each spec
 * gets a unique namespace (timestamp-suffixed) so parallel runs and
 * partially-failed runs don't collide on the type code.
 *
 * Cypress specs ship into Koha's t/cypress tree at runtime — the
 * plugin source isn't on the rspack resolve path, so types are
 * declared here as a minimal local shape rather than imported from
 * src/api.ts.
 */

export const TEST_BRANCH = "CPL";
export const SUPERLIBRARIAN_BORROWERNUMBER = 51;

interface InsertResult {
    insertId: number;
}

export interface RosterFixture {
    ns: string;
    typeId: number;
    rosterId: number;
    slotId: number;
}

export interface RosterWeekResponse {
    week_start: string;
    roster: { id: number; name: string };
    slots: { id: number; applies_on_dates: string[] }[];
    assignments: { id: number; assignment_date: string }[];
    exceptions: {
        exception_date: string;
        exception_type: string;
        reason: string | null;
        source?: string;
    }[];
}

export interface CreateRosterOpts {
    /** RRULE string seeded on the slot. Defaults to a Mon-only weekly rule. */
    slotRecurrence?: string;
    /** Slot start time HH:MM:SS. */
    slotStart?: string;
    /** Slot end time HH:MM:SS. */
    slotEnd?: string;
}

/**
 * Seed a roster_type → roster → slot trio with a unique namespace.
 * Returns a chainable Cypress promise of the IDs needed for cleanup.
 */
export function createRosterFixture(
    opts: CreateRosterOpts = {},
): Cypress.Chainable<RosterFixture> {
    const recurrence = opts.slotRecurrence ?? "FREQ=WEEKLY;BYDAY=MO";
    const start = opts.slotStart ?? "09:00:00";
    const end = opts.slotEnd ?? "12:00:00";
    const ns = `cytest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const fixture: Partial<RosterFixture> = { ns };

    return cy
        .task<InsertResult>("query", {
            sql: `INSERT INTO staff_roster_types
                    (code, name, color, is_active, created_at, updated_at)
                  VALUES (?, ?, "#418940", 1, NOW(), NOW())`,
            values: [`${ns}_T`.slice(0, 50), `${ns} type`],
        })
        .then(res => {
            fixture.typeId = res.insertId;
            return cy.task<InsertResult>("query", {
                sql: `INSERT INTO staff_roster
                        (roster_type_id, branch_id, name,
                         effective_from, is_active,
                         created_at, updated_at)
                      VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
                values: [
                    fixture.typeId!,
                    TEST_BRANCH,
                    `${ns} roster`,
                    "2026-01-01",
                ],
            });
        })
        .then(res => {
            fixture.rosterId = res.insertId;
            return cy.task<InsertResult>("query", {
                sql: `INSERT INTO staff_roster_slots
                        (roster_id, recurrence_rule, start_time, end_time,
                         min_staff, max_staff, created_at, updated_at)
                      VALUES (?, ?, ?, ?, 1, 2, NOW(), NOW())`,
                values: [fixture.rosterId!, recurrence, start, end],
            });
        })
        .then(res => {
            fixture.slotId = res.insertId;
            return fixture as RosterFixture;
        });
}

/**
 * Tear down everything seeded by createRosterFixture, plus any per-test
 * rows that the spec attached to the same namespace. Survives partial
 * setup failures by skipping DELETEs whose parent ID never got assigned.
 */
export function cleanupRosterFixture(
    fixture: Partial<RosterFixture>,
): void {
    if (fixture.slotId !== undefined) {
        cy.task("query", {
            sql: "DELETE FROM staff_roster_assignments WHERE slot_id = ?",
            values: [fixture.slotId],
        });
        cy.task("query", {
            sql: "DELETE FROM staff_roster_slots WHERE id = ?",
            values: [fixture.slotId],
        });
    }
    if (fixture.rosterId !== undefined) {
        cy.task("query", {
            sql: "DELETE FROM staff_roster_exceptions WHERE roster_id = ?",
            values: [fixture.rosterId],
        });
        cy.task("query", {
            sql: "DELETE FROM staff_roster WHERE id = ?",
            values: [fixture.rosterId],
        });
    }
    if (fixture.typeId !== undefined) {
        cy.task("query", {
            sql: "DELETE FROM staff_roster_types WHERE id = ?",
            values: [fixture.typeId],
        });
    }
    if (fixture.ns !== undefined) {
        cy.task("query", {
            sql: "DELETE FROM special_holidays WHERE title = ?",
            values: [`${fixture.ns} holiday`],
        });
    }
}
