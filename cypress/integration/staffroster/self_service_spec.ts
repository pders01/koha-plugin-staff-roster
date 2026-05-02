/**
 * Integration tests for the self-service flow:
 * - POST   /api/v1/contrib/staffroster/me/claim
 * - GET    /api/v1/contrib/staffroster/me/week
 * - GET    /api/v1/contrib/staffroster/me/open_slots
 * - DELETE /api/v1/contrib/staffroster/me/claim/:assignment_id
 *
 * Exercises the borrower-facing claim/drop loop end to end through
 * the live Plack-served endpoints. Reuses createRosterFixture so each
 * test gets a clean roster + slot.
 *
 * The koha cypress apiPost task throws on non-2xx, so the negative
 * paths use cy.request with failOnStatusCode:false. Basic auth header
 * comes from the existing getBasicAuthHeader cy.task helper.
 */

import {
    cleanupRosterFixture,
    createRosterFixture,
    SUPERLIBRARIAN_BORROWERNUMBER,
    TEST_BRANCH,
    type RosterFixture,
} from "./_fixtures";

// Same memcached caveat as get_week_spec: Koha::Calendar memoizes the
// per-branch holiday set, so a fresh special_holidays insert is invisible
// to live Plack workers until we drop the cached key.
function flushHolidayCache(branchcode: string) {
    cy.exec(
        `KOHA_CONF=/etc/koha/sites/kohadev/koha-conf.xml perl -MKoha::Caches -e ` +
            `'Koha::Caches->get_instance->clear_from_cache("${branchcode}_holidays")'`,
    );
}

function setLockoutHours(hours: number) {
    cy.task("query", {
        sql: `INSERT INTO plugin_data (plugin_class, plugin_key, plugin_value)
              VALUES (?, 'self_unclaim_lockout_hours', ?)
              ON DUPLICATE KEY UPDATE plugin_value = VALUES(plugin_value)`,
        values: [PLUGIN_CLASS, String(hours)],
    });
}

const WEEK = "2026-05-04"; // Monday — slot's RRULE is BYDAY=MO

interface MyWeekShift {
    assignment_id: number;
    slot_id: number;
    assignment_date: string;
}

interface MyWeekResponse {
    week_start: string;
    shifts: MyWeekShift[];
}

interface OpenSlotEntry {
    slot_id: number;
    assignment_date: string;
}

interface OpenSlotsResponse {
    week_start: string;
    openings: OpenSlotEntry[];
}

const PLUGIN_CLASS = "Koha::Plugin::Xyz::Paulderscheid::StaffRoster";

function setStaffCanSelfAssign(value: 0 | 1) {
    cy.task("query", {
        sql: `UPDATE plugin_data
              SET plugin_value = ?
              WHERE plugin_class = ? AND plugin_key = 'staff_can_self_assign'`,
        values: [String(value), PLUGIN_CLASS],
    });
}

describe("StaffRoster self-service", () => {
    let fixture: Partial<RosterFixture> = {};
    let authHeader = "";

    before(() => {
        cy.login();
        cy.task<string>("getBasicAuthHeader").then(h => {
            authHeader = h;
        });
    });

    beforeEach(() => {
        fixture = {};
        // One of the tests below toggles the feature flag off; restore
        // here in case a previous run aborted before the afterEach.
        setStaffCanSelfAssign(1);
        createRosterFixture().then(f => {
            fixture = f;
        });
    });

    afterEach(() => {
        setStaffCanSelfAssign(1);
        cleanupRosterFixture(fixture);
        // The closure-block test seeds a special_holiday and the Koha::
        // Calendar cache still remembers it after cleanupRosterFixture
        // deletes the row; flush so the next test's claim doesn't trip
        // on the stale "date is closed" verdict.
        flushHolidayCache(TEST_BRANCH);
        setLockoutHours(0);
    });

    it("claims an open slot, surfaces it in /me/week", () => {
        cy.task("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/me/claim",
            body: { slot_id: fixture.slotId, assignment_date: WEEK },
        }).then((res: any) => {
            expect(res.id, "claim returns assignment id").to.be.a("number");
            expect(res.slot_id).to.eq(fixture.slotId);
            expect(res.patron_id).to.eq(SUPERLIBRARIAN_BORROWERNUMBER);
        });

        cy.task<MyWeekResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/me/week?start=${WEEK}`,
        }).then(res => {
            const mine = res.shifts.find(
                s => s.slot_id === fixture.slotId && s.assignment_date === WEEK,
            );
            expect(mine, "shift surfaces in /me/week").to.not.eq(undefined);
        });
    });

    it("lists the slot in /me/open_slots before claim and hides it after", () => {
        cy.task<OpenSlotsResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/me/open_slots?start=${WEEK}`,
        }).then(res => {
            const before = res.openings.find(
                s => s.slot_id === fixture.slotId && s.assignment_date === WEEK,
            );
            expect(before, "slot is open before claim").to.not.eq(undefined);
        });

        cy.task("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/me/claim",
            body: { slot_id: fixture.slotId, assignment_date: WEEK },
        });

        cy.task<OpenSlotsResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/me/open_slots?start=${WEEK}`,
        }).then(res => {
            const after = res.openings.find(
                s => s.slot_id === fixture.slotId && s.assignment_date === WEEK,
            );
            expect(after, "slot disappears once user is on it (own-overlap suppression)")
                .to.eq(undefined);
        });
    });

    it("rejects with 403 when self-service is disabled", () => {
        setStaffCanSelfAssign(0);

        cy.request({
            method: "POST",
            url: "/api/v1/contrib/staffroster/me/claim",
            headers: { Authorization: authHeader },
            body: { slot_id: fixture.slotId, assignment_date: WEEK },
            failOnStatusCode: false,
        }).then(res => {
            expect(res.status).to.eq(403);
        });
    });

    it("self-unclaims a previously claimed shift", () => {
        let assignmentId = 0;
        cy.task<{ id: number }>("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/me/claim",
            body: { slot_id: fixture.slotId, assignment_date: WEEK },
        }).then(res => {
            assignmentId = res.id;
            return cy.task("apiDelete", {
                endpoint: `/api/v1/contrib/staffroster/me/claim/${assignmentId}`,
            });
        });

        cy.task<MyWeekResponse>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/me/week?start=${WEEK}`,
        }).then(res => {
            const still = res.shifts.find(s => s.assignment_id === assignmentId);
            expect(still, "unclaim removes the shift from /me/week")
                .to.eq(undefined);
        });
    });

    it("rejects a duplicate claim on the same slot + date with 409", () => {
        cy.task("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/me/claim",
            body: { slot_id: fixture.slotId, assignment_date: WEEK },
        });

        cy.request({
            method: "POST",
            url: "/api/v1/contrib/staffroster/me/claim",
            headers: { Authorization: authHeader },
            body: { slot_id: fixture.slotId, assignment_date: WEEK },
            failOnStatusCode: false,
        }).then(res => {
            expect(res.status).to.eq(409);
        });
    });

    it("blocks a claim on a Koha-calendar closure date", () => {
        // 2026-05-04 is a Monday; close it for CPL.
        cy.task("query", {
            sql: `INSERT INTO special_holidays
                    (branchcode, day, month, year, isexception,
                     title, description)
                  VALUES (?, 4, 5, 2026, 0, ?, "")`,
            values: [TEST_BRANCH, `${fixture.ns} holiday`],
        });
        flushHolidayCache(TEST_BRANCH);

        cy.request({
            method: "POST",
            url: "/api/v1/contrib/staffroster/me/claim",
            headers: { Authorization: authHeader },
            body: { slot_id: fixture.slotId, assignment_date: WEEK },
            failOnStatusCode: false,
        }).then(res => {
            expect(res.status).to.eq(409);
            expect(res.body.error).to.match(/closed/i);
        });
    });

    it("rejects self-unclaim when the lockout window has not passed", () => {
        let assignmentId = 0;
        cy.task<{ id: number }>("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/me/claim",
            body: { slot_id: fixture.slotId, assignment_date: WEEK },
        }).then(res => {
            assignmentId = res.id;
            // Slot starts at 09:00 on 2026-05-04. 99999h ahead is well
            // past any plausible "now", so the lockout always trips.
            setLockoutHours(99999);

            cy.request({
                method: "DELETE",
                url: `/api/v1/contrib/staffroster/me/claim/${assignmentId}`,
                headers: { Authorization: authHeader },
                failOnStatusCode: false,
            }).then(unclaim => {
                expect(unclaim.status).to.eq(403);
                expect(unclaim.body.error).to.match(/Self-unclaim closed|must drop at least/i);
            });
        });

        // restore so afterEach cleanup can DELETE the row
        cy.then(() => setLockoutHours(0));
    });
});
