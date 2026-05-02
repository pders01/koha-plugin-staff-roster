/**
 * Page-level integration tests for the three Koha-side touch points
 * the plugin opts into:
 *
 *   - Koha Desks      (use_koha_desks)
 *   - Authorised Values (use_authorised_value_locations)
 *   - Additional Fields (table = staff_roster, staff_roster_assignments)
 *
 * Each one renders into the manage_slots / edit_roster TT pages, so the
 * tests configure the relevant plugin setting, seed the Koha-side data
 * (desks row / AV rows / additional_fields row), then visit the page
 * and assert the integration shows up in the DOM.
 */

import {
    cleanupRosterFixture,
    createRosterFixture,
    TEST_BRANCH,
    type RosterFixture,
} from "./_fixtures";

const PLUGIN_CLASS = "Koha::Plugin::Xyz::Paulderscheid::StaffRoster";
const RUN_PL = "/cgi-bin/koha/plugins/run.pl";

function setPluginData(key: string, value: string) {
    cy.task("query", {
        sql: `INSERT INTO plugin_data (plugin_class, plugin_key, plugin_value)
              VALUES (?, ?, ?)
              ON DUPLICATE KEY UPDATE plugin_value = VALUES(plugin_value)`,
        values: [PLUGIN_CLASS, key, value],
    });
}

function pageUrl(method: string, op: string | undefined, extra: Record<string, string>) {
    const params = new URLSearchParams({
        class: PLUGIN_CLASS,
        method,
        ...(op ? { op } : {}),
        ...extra,
    });
    return `${RUN_PL}?${params.toString()}`;
}

describe("StaffRoster Koha integrations — page-level", () => {
    let fixture: Partial<RosterFixture> = {};

    beforeEach(() => {
        cy.login();
        fixture = {};
    });

    afterEach(() => {
        cleanupRosterFixture(fixture);
    });

    context("Koha Desks", () => {
        const DESK_NAME = "cy-desk";

        beforeEach(() => {
            setPluginData("use_koha_desks", "1");
            setPluginData("use_authorised_value_locations", "0");
            cy.task("query", {
                sql: "DELETE FROM desks WHERE desk_name = ?",
                values: [DESK_NAME],
            });
            cy.task("query", {
                sql: "INSERT INTO desks (desk_name, branchcode) VALUES (?, ?)",
                values: [DESK_NAME, TEST_BRANCH],
            });
            createRosterFixture().then(f => {
                fixture = f;
            });
        });

        afterEach(() => {
            cy.task("query", {
                sql: "DELETE FROM desks WHERE desk_name = ?",
                values: [DESK_NAME],
            });
        });

        it("renders the branch's desks as datalist options on manage_slots", () => {
            cy.visit(pageUrl("tool", "manage_slots", {
                roster_id: String(fixture.rosterId),
            }));
            cy.get("#add_slot_btn").click();
            cy.get("datalist#koha-desks-list option")
                .should("contain.attr", "value", DESK_NAME);
            cy.get('input[name="location"]')
                .should("have.attr", "list", "koha-desks-list");
        });
    });

    context("Authorised Values", () => {
        const AV_CATEGORY = "STAFFROSTER_LOC_CYT";
        const AV_VALUE = "CIRC_DESK";
        const AV_LIB = "Circulation desk";

        beforeEach(() => {
            setPluginData("use_authorised_value_locations", "1");
            setPluginData("authorised_value_location_category", AV_CATEGORY);
            setPluginData("use_koha_desks", "0");
            // The category row has to exist before authorised_values
            // can FK against it.
            cy.task("query", {
                sql: `INSERT IGNORE INTO authorised_value_categories
                        (category_name) VALUES (?)`,
                values: [AV_CATEGORY],
            });
            cy.task("query", {
                sql: `INSERT INTO authorised_values
                        (category, authorised_value, lib)
                      VALUES (?, ?, ?)
                      ON DUPLICATE KEY UPDATE lib = VALUES(lib)`,
                values: [AV_CATEGORY, AV_VALUE, AV_LIB],
            });
            createRosterFixture().then(f => {
                fixture = f;
            });
        });

        afterEach(() => {
            cy.task("query", {
                sql: "DELETE FROM authorised_values WHERE category = ?",
                values: [AV_CATEGORY],
            });
            cy.task("query", {
                sql: "DELETE FROM authorised_value_categories WHERE category_name = ?",
                values: [AV_CATEGORY],
            });
        });

        it("swaps the location text input for an AV-backed select on manage_slots", () => {
            cy.visit(pageUrl("tool", "manage_slots", {
                roster_id: String(fixture.rosterId),
            }));
            cy.get("#add_slot_btn").click();
            cy.get('select[name="location"]').should("exist");
            cy.get('select[name="location"] option')
                .should("contain.text", AV_LIB);
            // The free-text input variant is gone when AV is on.
            cy.get('input[name="location"]').should("not.exist");
        });
    });

    context("Additional Fields", () => {
        let afId = 0;
        const AF_NAME = "cy-cost-center";

        beforeEach(() => {
            cy.task<{ insertId: number }>("query", {
                sql: `INSERT INTO additional_fields
                        (tablename, name, authorised_value_category,
                         marcfield, marcfield_mode, searchable, repeatable)
                      VALUES ('staff_roster', ?, NULL, '', 'get', 0, 0)`,
                values: [AF_NAME],
            }).then(res => {
                afId = res.insertId;
            });
            createRosterFixture().then(f => {
                fixture = f;
            });
        });

        afterEach(() => {
            if (afId) {
                cy.task("query", {
                    sql: "DELETE FROM additional_field_values WHERE field_id = ?",
                    values: [afId],
                });
                cy.task("query", {
                    sql: "DELETE FROM additional_fields WHERE id = ?",
                    values: [afId],
                });
            }
            afId = 0;
        });

        it("renders the configured additional field on the edit_roster form", () => {
            cy.visit(pageUrl("tool", "edit_roster", {
                roster_id: String(fixture.rosterId),
            }));
            cy.contains("legend", /Additional fields|Zusätzliche Felder/);
            cy.get(`input[name="additional_field_${afId}"]`).should("exist");
        });

        it("returns assignment_fields metadata in the get_week response", () => {
            // Add an additional_field on staff_roster_assignments too so
            // the week view's assignment_fields array is non-empty.
            cy.task<{ insertId: number }>("query", {
                sql: `INSERT INTO additional_fields
                        (tablename, name, authorised_value_category,
                         marcfield, marcfield_mode, searchable, repeatable)
                      VALUES ('staff_roster_assignments', 'cy-shift-tag',
                              NULL, '', 'get', 0, 1)`,
            }).then(res => {
                const aId = res.insertId;
                cy.task<{ assignment_fields: { id: number; name: string }[] }>("apiGet", {
                    endpoint: `/api/v1/contrib/staffroster/rosters/${fixture.rosterId}/week?start=2026-05-04`,
                }).then(week => {
                    const found = week.assignment_fields.find(f => f.id === aId);
                    expect(found, "additional field surfaces in week payload")
                        .to.not.eq(undefined);
                    expect(found!.name).to.eq("cy-shift-tag");
                });
                cy.task("query", {
                    sql: "DELETE FROM additional_fields WHERE id = ?",
                    values: [aId],
                });
            });
        });
    });
});
