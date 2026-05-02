/**
 * Integration tests for the manager-driven assignment REST endpoints:
 * - POST   /api/v1/contrib/staffroster/assignments
 * - PUT    /api/v1/contrib/staffroster/assignments/:id
 * - DELETE /api/v1/contrib/staffroster/assignments/:id
 *
 * The grid component drives all of these; this locks in the
 * happy-path + the most common 4xx returns so a future change to the
 * conflict / validation gates fails fast.
 */

import {
    cleanupRosterFixture,
    createRosterFixture,
    SUPERLIBRARIAN_BORROWERNUMBER,
    type RosterFixture,
} from "./_fixtures";

const WEEK = "2026-05-04"; // Monday — slot's RRULE is BYDAY=MO

describe("StaffRoster assignment CRUD (REST)", () => {
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
        createRosterFixture().then(f => {
            fixture = f;
        });
    });

    afterEach(() => {
        cleanupRosterFixture(fixture);
    });

    it("creates an assignment with default scheduled status", () => {
        cy.task("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/assignments",
            body: {
                slot_id: fixture.slotId,
                patron_id: SUPERLIBRARIAN_BORROWERNUMBER,
                assignment_date: WEEK,
            },
        }).then((res: any) => {
            expect(res.id).to.be.a("number");
            expect(res.slot_id).to.eq(fixture.slotId);
            expect(res.patron_id).to.eq(SUPERLIBRARIAN_BORROWERNUMBER);
            expect(res.assignment_date).to.eq(WEEK);
            expect(res.status).to.eq("scheduled");
        });
    });

    it("updates status + notes via PUT", () => {
        cy.task<{ id: number }>("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/assignments",
            body: {
                slot_id: fixture.slotId,
                patron_id: SUPERLIBRARIAN_BORROWERNUMBER,
                assignment_date: WEEK,
            },
        }).then(created => {
            cy.task<{ status: string; notes: string }>("apiPut", {
                endpoint: `/api/v1/contrib/staffroster/assignments/${created.id}`,
                body: { status: "confirmed", notes: "covering for X" },
            }).then(updated => {
                expect(updated.status).to.eq("confirmed");
                expect(updated.notes).to.eq("covering for X");
            });
        });
    });

    it("deletes an assignment and a follow-up GET shows it gone", () => {
        let id = 0;
        cy.task<{ id: number }>("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/assignments",
            body: {
                slot_id: fixture.slotId,
                patron_id: SUPERLIBRARIAN_BORROWERNUMBER,
                assignment_date: WEEK,
            },
        }).then(created => {
            id = created.id;
            return cy.task("apiDelete", {
                endpoint: `/api/v1/contrib/staffroster/assignments/${id}`,
            });
        });

        cy.task<{ assignments: { id: number }[] }>("apiGet", {
            endpoint: `/api/v1/contrib/staffroster/rosters/${fixture.rosterId}/week?start=${WEEK}`,
        }).then(week => {
            expect(week.assignments.find(a => a.id === id)).to.eq(undefined);
        });
    });

    it("rejects POST missing slot_id with 400", () => {
        cy.request({
            method: "POST",
            url: "/api/v1/contrib/staffroster/assignments",
            headers: { Authorization: authHeader },
            body: {
                patron_id: SUPERLIBRARIAN_BORROWERNUMBER,
                assignment_date: WEEK,
            },
            failOnStatusCode: false,
        }).then(res => {
            expect(res.status).to.eq(400);
        });
    });

    it("rejects a self-overlapping POST with 409", () => {
        cy.task("apiPost", {
            endpoint: "/api/v1/contrib/staffroster/assignments",
            body: {
                slot_id: fixture.slotId,
                patron_id: SUPERLIBRARIAN_BORROWERNUMBER,
                assignment_date: WEEK,
            },
        });

        cy.request({
            method: "POST",
            url: "/api/v1/contrib/staffroster/assignments",
            headers: { Authorization: authHeader },
            body: {
                slot_id: fixture.slotId,
                patron_id: SUPERLIBRARIAN_BORROWERNUMBER,
                assignment_date: WEEK,
            },
            failOnStatusCode: false,
        }).then(res => {
            expect(res.status).to.eq(409);
            expect(res.body.error).to.match(/overlap|already/i);
        });
    });
});
