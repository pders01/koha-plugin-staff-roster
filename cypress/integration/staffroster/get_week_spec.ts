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

import {
    cleanupRosterFixture,
    createRosterFixture,
    SUPERLIBRARIAN_BORROWERNUMBER,
    TEST_BRANCH,
    type RosterFixture,
    type RosterWeekResponse,
} from "./_fixtures";

const WEEK = "2026-05-04"; // Monday
const TUE = "2026-05-05";
const OUT_OF_WEEK = "2026-05-18";

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
    let fixture: Partial<RosterFixture> = {};

    before(() => {
        cy.login();
    });

    beforeEach(() => {
        fixture = {};
        createRosterFixture().then(f => {
            fixture = f;
        });
    });

    afterEach(() => {
        cleanupRosterFixture(fixture);
    });

    it("returns roster header + week_start + applies_on_dates on Monday only", () => {
        cy.task<RosterWeekResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${fixture.rosterId}/week?start=${WEEK}`,
        }).then(res => {
            expect(res.week_start).to.eq(WEEK);
            expect(res.roster.id).to.eq(fixture.rosterId);
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
            values: [fixture.slotId, SUPERLIBRARIAN_BORROWERNUMBER, WEEK],
        });
        cy.task("query", {
            sql: `INSERT INTO staff_roster_assignments
                    (slot_id, borrowernumber, assignment_date, status,
                     created_at, updated_at)
                  VALUES (?, ?, ?, "scheduled", NOW(), NOW())`,
            values: [
                fixture.slotId,
                SUPERLIBRARIAN_BORROWERNUMBER,
                OUT_OF_WEEK,
            ],
        });

        cy.task<RosterWeekResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${fixture.rosterId}/week?start=${WEEK}`,
        }).then(res => {
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
            values: [fixture.rosterId, TUE],
        });

        cy.task<RosterWeekResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${fixture.rosterId}/week?start=${WEEK}`,
        }).then(res => {
            const tue = res.exceptions.filter(e => e.exception_date === TUE);
            expect(tue).to.have.length(1);
            expect(tue[0].reason).to.eq("manual");
            expect(tue[0].source).to.eq(undefined);
        });
    });

    it("merges Koha calendar closures when use_koha_calendar = 1", () => {
        cy.task("query", {
            sql: `INSERT INTO special_holidays
                    (branchcode, day, month, year, isexception,
                     title, description)
                  VALUES (?, 5, 5, 2026, 0, ?, "")`,
            values: [TEST_BRANCH, `${fixture.ns} holiday`],
        });
        flushHolidayCache(TEST_BRANCH);

        cy.task<RosterWeekResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${fixture.rosterId}/week?start=${WEEK}`,
        }).then(res => {
            const cal = res.exceptions.find(e => e.exception_date === TUE);
            expect(cal, "calendar closure surfaced").to.not.eq(undefined);
            expect(cal!.source).to.eq("calendar");
        });
    });

    it("DB exception takes precedence over the calendar-derived duplicate", () => {
        cy.task("query", {
            sql: `INSERT INTO special_holidays
                    (branchcode, day, month, year, isexception,
                     title, description)
                  VALUES (?, 5, 5, 2026, 0, ?, "")`,
            values: [TEST_BRANCH, `${fixture.ns} holiday`],
        });
        cy.task("query", {
            sql: `INSERT INTO staff_roster_exceptions
                    (roster_id, exception_date, exception_type, reason,
                     created_at, updated_at)
                  VALUES (?, ?, "closed", "manual", NOW(), NOW())`,
            values: [fixture.rosterId, TUE],
        });
        flushHolidayCache(TEST_BRANCH);

        cy.task<RosterWeekResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${fixture.rosterId}/week?start=${WEEK}`,
        }).then(res => {
            const tue = res.exceptions.filter(e => e.exception_date === TUE);
            expect(tue).to.have.length(1);
            expect(tue[0].reason).to.eq("manual");
            expect(tue[0].source).to.eq(undefined);
        });
    });
});
