/**
 * TT-form integration tests for the manage_slots page (cud-save_slot
 * + cud-delete_slot operations).
 *
 * Slots aren't created via REST; the TT form is the only path. Drives
 * the form through real DOM interactions so the day-of-week ↔ RRULE
 * composition, validation rejections, and slide-down toggle stay
 * locked in.
 */

import {
    cleanupRosterFixture,
    createRosterFixture,
    type RosterFixture,
} from "./_fixtures";

const PLUGIN_CLASS = "Koha::Plugin::Xyz::Paulderscheid::StaffRoster";
const RUN_PL = "/cgi-bin/koha/plugins/run.pl";

function manageSlotsUrl(rosterId: number) {
    const params = new URLSearchParams({
        class: PLUGIN_CLASS,
        method: "tool",
        op: "manage_slots",
        roster_id: String(rosterId),
    });
    return `${RUN_PL}?${params.toString()}`;
}

describe("StaffRoster manage_slots TT form", () => {
    let fixture: Partial<RosterFixture> = {};

    beforeEach(() => {
        cy.login();
        fixture = {};
        // No slot in the fixture — the spec creates them via the form.
        // Pass slotRecurrence='' so createRosterFixture seeds something
        // disposable; we'll add the real slot via the UI.
        createRosterFixture({
            slotRecurrence: "FREQ=WEEKLY;BYDAY=SU",
        }).then(f => {
            fixture = f;
        });
    });

    afterEach(() => {
        cleanupRosterFixture(fixture);
    });

    it("creates a new slot via the add-slot form", () => {
        cy.visit(manageSlotsUrl(fixture.rosterId!));

        cy.get("#add_slot_btn").click();
        cy.get("#slot_form_container").should("be.visible");

        // Pick Tuesday + Thursday so the controller composes
        // FREQ=WEEKLY;BYDAY=TU,TH on the slot.
        cy.get('input.day-of-week-input[value="2"]').check({ force: true });
        cy.get('input.day-of-week-input[value="4"]').check({ force: true });

        cy.get("#start_time").type("09:00");
        cy.get("#end_time").type("13:00");
        cy.get("#min_staff").clear().type("1");
        cy.get("#max_staff").clear().type("3");

        cy.get('#slot_form button[type="submit"], #slot_form input[type="submit"]')
            .first()
            .click();

        // Server redirects back to manage_slots with a success flash.
        cy.url().should("include", "op=manage_slots");
        cy.contains(/Time slot saved successfully|erfolgreich gespeichert/i);

        // The new slot shows up in the slots table.
        cy.get("table#slots_table tbody tr").should("have.length.at.least", 2);
        cy.get("table#slots_table").contains("09:00–13:00");
    });

    it("rejects a save with no day-of-week selected", () => {
        cy.visit(manageSlotsUrl(fixture.rosterId!));

        cy.get("#add_slot_btn").click();
        cy.get("#slot_form_container").should("be.visible");

        // Deliberately leave every day-of-week checkbox unchecked.
        cy.get("input.day-of-week-input").uncheck({ force: true });

        cy.get("#start_time").type("10:00");
        cy.get("#end_time").type("12:00");

        cy.get('#slot_form button[type="submit"], #slot_form input[type="submit"]')
            .first()
            .click();

        cy.contains(/Pick at least one day of the week|mindestens einen Wochentag/i);
    });

    it("deletes a slot via the inline confirm modal", () => {
        cy.visit(manageSlotsUrl(fixture.rosterId!));

        // Pre-existing fixture slot — kick off delete on the first row.
        cy.get(".slot-delete-trigger").first().click();
        cy.get("#delete-slot-modal").should("be.visible");
        cy.get('#delete-slot-modal button[type="submit"]').click();

        cy.contains(/Time slot deleted successfully|erfolgreich gelöscht/i);
    });
});
