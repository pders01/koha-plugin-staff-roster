/**
 * Locks in the column-date derivation in src/components/staff-roster-grid.ts
 * (`cellDate(dayIdx)`).
 *
 * Loads view_assignments with a known weekStart (a Monday) and asserts each
 * `<th>` in the schedule grid header shows the correct MM-DD anchored to
 * Monday = column 0 ... Sunday = column 6.
 */

import {
    cleanupRosterFixture,
    createRosterFixture,
    type RosterFixture,
} from "./_fixtures";

const WEEK = "2026-05-04"; // Monday
const EXPECTED = [
    { day: "Mon", suffix: "05-04" },
    { day: "Tue", suffix: "05-05" },
    { day: "Wed", suffix: "05-06" },
    { day: "Thu", suffix: "05-07" },
    { day: "Fri", suffix: "05-08" },
    { day: "Sat", suffix: "05-09" },
    { day: "Sun", suffix: "05-10" },
];

describe("StaffRoster grid column dates", () => {
    let fixture: Partial<RosterFixture> = {};

    before(() => {
        cy.login();
    });

    beforeEach(() => {
        fixture = {};
        // All-day RRULE so the table actually paints headers + cells
        // beyond the empty-state row.
        createRosterFixture({
            slotRecurrence: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU",
        }).then(f => {
            fixture = f;
        });
    });

    afterEach(() => {
        cleanupRosterFixture(fixture);
    });

    it("renders weekday headers anchored to Monday with correct MM-DD suffixes", () => {
        cy.visit(
            `/cgi-bin/koha/plugins/run.pl?class=Koha::Plugin::Xyz::Paulderscheid::StaffRoster&method=tool&op=view_assignments&roster_id=${fixture.rosterId}&week_start=${WEEK}`,
        );

        cy.get("staff-roster-grid", { timeout: 10000 }).should("exist");
        cy.get(".srg-grid thead th", { timeout: 10000 }).should(
            "have.length",
            8,
        );

        cy.get(".srg-grid thead th").eq(0).should("contain.text", "Slot");

        EXPECTED.forEach(({ day, suffix }, idx) => {
            cy.get(".srg-grid thead th")
                .eq(idx + 1)
                .within(() => {
                    cy.get(".srg-day").should("have.text", day);
                    cy.get("small").should("have.text", suffix);
                });
        });
    });
});
