/**
 * TT-form integration tests for the swap workflow (cud-request_swap +
 * cud-respond_swap operations on the manage_swaps page).
 *
 * Swap requests aren't part of the REST surface; they live behind the
 * CGI form submit pipeline, so the test drives the form via real DOM
 * interactions and verifies state transitions through the table.
 *
 * Two borrowers are needed: koha (super, borrowernumber 51) plays the
 * requester / manager, and a stable Koha sample patron (borrower 1
 * "Admin Koha") plays the swap target.
 */

import {
    cleanupRosterFixture,
    createRosterFixture,
    SUPERLIBRARIAN_BORROWERNUMBER,
    type RosterFixture,
} from "./_fixtures";

const PLUGIN_CLASS = "Koha::Plugin::Xyz::Paulderscheid::StaffRoster";
const RUN_PL = "/cgi-bin/koha/plugins/run.pl";
const TARGET_BORROWERNUMBER = 1; // Admin Koha — present in every kohadev sample DB
const WEEK = "2026-05-04"; // Monday — slot's RRULE is BYDAY=MO

interface InsertResult {
    insertId: number;
}

function manageSwapsUrl(rosterId: number) {
    const params = new URLSearchParams({
        class: PLUGIN_CLASS,
        method: "tool",
        op: "manage_swaps",
        roster_id: String(rosterId),
    });
    return `${RUN_PL}?${params.toString()}`;
}

function seedAssignment(slotId: number, borrowernumber: number, date: string) {
    return cy.task<InsertResult>("query", {
        sql: `INSERT INTO staff_roster_assignments
                (slot_id, borrowernumber, assignment_date, status,
                 created_at, updated_at)
              VALUES (?, ?, ?, 'scheduled', NOW(), NOW())`,
        values: [slotId, borrowernumber, date],
    });
}

describe("StaffRoster swap workflow TT form", () => {
    let fixture: Partial<RosterFixture> = {};

    beforeEach(() => {
        cy.login();
        fixture = {};
        createRosterFixture().then(f => {
            fixture = f;
        });
    });

    afterEach(() => {
        cleanupRosterFixture(fixture);
    });

    it("creates a swap request via the request-swap form", () => {
        seedAssignment(fixture.slotId!, SUPERLIBRARIAN_BORROWERNUMBER, WEEK);

        cy.visit(manageSwapsUrl(fixture.rosterId!));

        cy.get("#add_swap_btn").click();
        cy.get("#swap_form_container").should("be.visible");

        cy.get("#from_assignment_id").select(1); // first non-placeholder option
        cy.get("#to_borrowernumber").select(String(TARGET_BORROWERNUMBER));
        cy.get("#request_message").type("covering for me, thanks!");

        cy.get('#swap_form_container button[type="submit"], #swap_form_container input[type="submit"]')
            .first()
            .click();

        cy.url().should("include", "op=manage_swaps");
        cy.contains(/Swap request sent|Tauschanfrage gesendet/i);

        // Pending row visible in the swaps table.
        cy.get("#swaps_table tbody tr").should("have.length.at.least", 1);
        cy.contains("#swaps_table", /Pending|Ausstehend/i);
    });

    it("approves a pending swap and reassigns the shift to the target", () => {
        let assignmentId = 0;
        let swapId = 0;

        seedAssignment(fixture.slotId!, SUPERLIBRARIAN_BORROWERNUMBER, WEEK)
            .then(res => {
                assignmentId = res.insertId;
                return cy.task<InsertResult>("query", {
                    sql: `INSERT INTO staff_roster_swap_requests
                            (from_assignment_id, to_borrowernumber, status,
                             requested_at, created_at, updated_at)
                          VALUES (?, ?, 'pending', NOW(), NOW(), NOW())`,
                    values: [assignmentId, TARGET_BORROWERNUMBER],
                });
            })
            .then(res => {
                swapId = res.insertId;
            });

        cy.visit(manageSwapsUrl(fixture.rosterId!));

        // Click the form's Approve submit (one per pending row).
        cy.get('form input[name="decision"][value="approve"]')
            .parent("form")
            .find('button[type="submit"], input[type="submit"]')
            .first()
            .click();

        cy.contains(/Swap approved|Tausch genehmigt/i);

        // cy.then() defers reading the captured ids until after all
        // queued commands have run; without it the values: array would
        // be built synchronously at test definition time when both
        // ids are still 0.
        cy.then(() =>
            cy.task<{ borrowernumber: number; status: string }[]>("query", {
                sql: `SELECT borrowernumber, status
                      FROM staff_roster_assignments
                      WHERE id = ?`,
                values: [assignmentId],
            }),
        ).then(rows => {
            expect(rows).to.have.length(1);
            expect(rows[0].borrowernumber).to.eq(TARGET_BORROWERNUMBER);
        });

        cy.then(() =>
            cy.task<{ status: string }[]>("query", {
                sql: "SELECT status FROM staff_roster_swap_requests WHERE id = ?",
                values: [swapId],
            }),
        ).then(rows => {
            expect(rows[0].status).to.eq("approved");
        });
    });
});
