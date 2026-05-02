/**
 * Locks in the column-date derivation in src/components/staff-roster-grid.ts
 * (`cellDate(dayIdx)`).
 *
 * Loads view_assignments with a known weekStart (a Monday) and asserts each
 * `<th>` in the schedule grid header shows the correct MM-DD anchored to
 * Monday = column 0 ... Sunday = column 6.
 */

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

interface InsertResult {
    insertId: number;
}

describe("StaffRoster grid column dates", () => {
    let ns: string;
    let typeId: number;
    let rosterId: number;
    let slotId: number;

    before(() => {
        cy.login();
    });

    beforeEach(() => {
        ns = `cytest_${Date.now()}`;
        cy.task<InsertResult>("query", {
            sql: `INSERT INTO staff_roster_types
                    (code, name, color, is_active, created_at, updated_at)
                  VALUES (?, ?, "#418940", 1, NOW(), NOW())`,
            values: [`${ns}_T`.slice(0, 50), `${ns} type`],
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
                          VALUES (?, "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU",
                                  "09:00:00", "12:00:00", 1, 1,
                                  NOW(), NOW())`,
                    values: [rosterId],
                });
            })
            .then(res => {
                slotId = res.insertId;
            });
    });

    afterEach(() => {
        cy.task("query", {
            sql: "DELETE FROM staff_roster_slots WHERE id = ?",
            values: [slotId],
        });
        cy.task("query", {
            sql: "DELETE FROM staff_roster WHERE id = ?",
            values: [rosterId],
        });
        cy.task("query", {
            sql: "DELETE FROM staff_roster_types WHERE id = ?",
            values: [typeId],
        });
    });

    it("renders weekday headers anchored to Monday with correct MM-DD suffixes", () => {
        cy.visit(
            `/cgi-bin/koha/plugins/run.pl?class=Koha::Plugin::Xyz::Paulderscheid::StaffRoster&method=tool&op=view_assignments&roster_id=${rosterId}&week_start=${WEEK}`,
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
