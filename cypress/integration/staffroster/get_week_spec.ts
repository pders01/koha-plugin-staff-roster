/**
 * Integration tests for the plugin's REST endpoint
 * GET /api/v1/contrib/staffroster/rosters/:roster_id/week
 *
 * Drops to the database via cy.task("query") to seed roster
 * fixtures (no admin REST surface for rosters/slots), then
 * exercises the real Plack-served endpoint via cy.task("apiGet").
 *
 * Requires the kohadev container with the plugin installed and
 * `use_koha_calendar=1` in plugin_data (the install hook seeds 1).
 */

const WEEK = "2026-05-04"; // Monday
const TUE = "2026-05-05";
const OUT_OF_WEEK = "2026-05-18";
const SUPERLIBRARIAN_BORROWERNUMBER = 51;

interface InsertResult {
    insertId: number;
}

// Koha::Calendar memoizes the per-branch holiday set in memcached for ~21h
// (Koha/Calendar.pm _holidays). Inserts to special_holidays are invisible
// to the live Plack workers until the cache is invalidated. Run a Perl
// one-liner inside the kohadev container to drop the relevant key so the
// next get_week call rebuilds from the DB.
function flushHolidayCache(branchcode: string) {
    cy.exec(
        `KOHA_CONF=/etc/koha/sites/kohadev/koha-conf.xml perl -MKoha::Caches -e ` +
            `'Koha::Caches->get_instance->clear_from_cache("${branchcode}_holidays")'`,
    );
}

describe("StaffRoster get_week", () => {
    let ns: string;
    let typeId: number;
    let rosterId: number;
    let slotMonId: number;

    before(() => {
        cy.login();
    });

    beforeEach(() => {
        ns = `cytest_${Date.now()}`;
        cy.task<InsertResult>("query", {
            sql: `INSERT INTO staff_roster_types
                    (code, name, color, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, 1, NOW(), NOW())`,
            values: [`${ns}_T`.slice(0, 50), `${ns} type`, "#abcdef"],
        })
            .then(res => {
                typeId = res.insertId;
                return cy.task<InsertResult>("query", {
                    sql: `INSERT INTO staff_roster
                            (roster_type_id, branch_id, name,
                             effective_from, is_active,
                             created_at, updated_at)
                          VALUES (?, "CPL", ?, ?, 1, NOW(), NOW())`,
                    values: [typeId, `${ns} roster`, "2026-01-01"],
                });
            })
            .then(res => {
                rosterId = res.insertId;
                return cy.task<InsertResult>("query", {
                    sql: `INSERT INTO staff_roster_slots
                            (roster_id, recurrence_rule, start_time, end_time,
                             min_staff, max_staff, created_at, updated_at)
                          VALUES (?, "FREQ=WEEKLY;BYDAY=MO",
                                  "09:00:00", "12:00:00", 1, 2,
                                  NOW(), NOW())`,
                    values: [rosterId],
                });
            })
            .then(res => {
                slotMonId = res.insertId;
            });
    });

    afterEach(() => {
        cy.task("query", {
            sql: "DELETE FROM staff_roster_assignments WHERE slot_id = ?",
            values: [slotMonId],
        });
        cy.task("query", {
            sql: "DELETE FROM staff_roster_exceptions WHERE roster_id = ?",
            values: [rosterId],
        });
        cy.task("query", {
            sql: "DELETE FROM staff_roster_slots WHERE id = ?",
            values: [slotMonId],
        });
        cy.task("query", {
            sql: "DELETE FROM staff_roster WHERE id = ?",
            values: [rosterId],
        });
        cy.task("query", {
            sql: "DELETE FROM staff_roster_types WHERE id = ?",
            values: [typeId],
        });
        cy.task("query", {
            sql: "DELETE FROM special_holidays WHERE title = ?",
            values: [`${ns} holiday`],
        });
    });

    it("returns roster header + week_start + applies_on_dates on Monday only", () => {
        cy.task("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${rosterId}/week?start=${WEEK}`,
        }).then((res: any) => {
            expect(res.week_start).to.eq(WEEK);
            expect(res.roster.id).to.eq(rosterId);
            expect(res.slots).to.have.length(1);
            expect(res.slots[0].applies_on_dates).to.deep.eq([WEEK]);
        });
    });

    it("scopes assignments to the requested 7-day window", () => {
        cy.task("query", {
            sql: `INSERT INTO staff_roster_assignments
                    (slot_id, borrowernumber, assignment_date, status,
                     created_at, updated_at)
                  VALUES (?, ?, ?, "scheduled", NOW(), NOW())`,
            values: [slotMonId, SUPERLIBRARIAN_BORROWERNUMBER, WEEK],
        });
        cy.task("query", {
            sql: `INSERT INTO staff_roster_assignments
                    (slot_id, borrowernumber, assignment_date, status,
                     created_at, updated_at)
                  VALUES (?, ?, ?, "scheduled", NOW(), NOW())`,
            values: [
                slotMonId,
                SUPERLIBRARIAN_BORROWERNUMBER,
                OUT_OF_WEEK,
            ],
        });

        cy.task("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${rosterId}/week?start=${WEEK}`,
        }).then((res: any) => {
            expect(res.assignments).to.have.length(1);
            expect(res.assignments[0].assignment_date).to.eq(WEEK);
        });
    });

    it("returns roster-level exceptions in the requested week", () => {
        cy.task("query", {
            sql: `INSERT INTO staff_roster_exceptions
                    (roster_id, exception_date, exception_type, reason,
                     created_at, updated_at)
                  VALUES (?, ?, "closed", "manual", NOW(), NOW())`,
            values: [rosterId, TUE],
        });

        cy.task("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${rosterId}/week?start=${WEEK}`,
        }).then((res: any) => {
            const tue = res.exceptions.filter(
                (e: any) => e.exception_date === TUE,
            );
            expect(tue).to.have.length(1);
            expect(tue[0].reason).to.eq("manual");
            expect(tue[0].source).to.be.undefined;
        });
    });

    it("merges Koha calendar closures when use_koha_calendar = 1", () => {
        cy.task("query", {
            sql: `INSERT INTO special_holidays
                    (branchcode, day, month, year, isexception,
                     title, description)
                  VALUES ("CPL", 5, 5, 2026, 0, ?, "")`,
            values: [`${ns} holiday`],
        });
        flushHolidayCache("CPL");

        cy.task("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${rosterId}/week?start=${WEEK}`,
        }).then((res: any) => {
            const cal = res.exceptions.find(
                (e: any) => e.exception_date === TUE,
            );
            expect(cal, "calendar closure surfaced").to.exist;
            expect(cal.source).to.eq("calendar");
        });
    });

    it("DB exception takes precedence over the calendar-derived duplicate", () => {
        cy.task("query", {
            sql: `INSERT INTO special_holidays
                    (branchcode, day, month, year, isexception,
                     title, description)
                  VALUES ("CPL", 5, 5, 2026, 0, ?, "")`,
            values: [`${ns} holiday`],
        });
        flushHolidayCache("CPL");
        cy.task("query", {
            sql: `INSERT INTO staff_roster_exceptions
                    (roster_id, exception_date, exception_type, reason,
                     created_at, updated_at)
                  VALUES (?, ?, "closed", "manual", NOW(), NOW())`,
            values: [rosterId, TUE],
        });

        cy.task("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${rosterId}/week?start=${WEEK}`,
        }).then((res: any) => {
            const tue = res.exceptions.filter(
                (e: any) => e.exception_date === TUE,
            );
            expect(tue).to.have.length(1);
            expect(tue[0].reason).to.eq("manual");
            expect(tue[0].source).to.be.undefined;
        });
    });
});
