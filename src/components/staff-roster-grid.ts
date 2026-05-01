import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import {
  fetchWeek,
  fetchAvailableStaff,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  type Assignment,
  type RosterWeek,
  type Slot,
  type Staff,
} from "../api.js";

const POLL_MS = 5000;
const UNDO_LIMIT = 10;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// iCal BYDAY codes per Monday-anchored column index.
const ICAL_FOR_COLUMN = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

type UndoOp =
  | { kind: "create"; id: number }
  | { kind: "delete"; payload: { slot_id: number; borrowernumber: number; assignment_date: string; status: string; notes?: string } }
  | { kind: "update"; id: number; before: Pick<Assignment, "slot_id" | "borrowernumber" | "assignment_date"> };

@customElement("staff-roster-grid")
export class StaffRosterGrid extends LitElement {
  @property({ type: Number, attribute: "roster-id" }) rosterId = 0;
  @property({ type: String, attribute: "week-start" }) weekStart = "";

  @state() private week: RosterWeek | null = null;
  @state() private available: Staff[] = [];
  @state() private staffQuery = "";
  @state() private error = "";
  @state() private dragging: { kind: "staff"; staff: Staff } | { kind: "assignment"; assignment: Assignment } | null = null;
  @state() private pendingDelete: Assignment | null = null;

  private undoStack: UndoOp[] = [];
  private pollTimer?: ReturnType<typeof setInterval>;
  private staffDebounce?: ReturnType<typeof setTimeout>;
  private errorDismissTimer?: ReturnType<typeof setTimeout>;

  private setError(message: string): void {
    this.error = message;
    if (this.errorDismissTimer) clearTimeout(this.errorDismissTimer);
    if (message) {
      this.errorDismissTimer = setTimeout(() => (this.error = ""), 5000);
    }
  }

  // Render in light DOM so Koha's Bootstrap and intranet styles apply.
  override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.weekStart) this.weekStart = isoMonday(new Date());
    void this.refresh();
    this.pollTimer = setInterval(() => void this.refresh(), POLL_MS);
    document.addEventListener("keydown", this.onKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.pollTimer) clearInterval(this.pollTimer);
    document.removeEventListener("keydown", this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      void this.undo();
    }
  };

  private async refresh(): Promise<void> {
    if (!this.rosterId) return;
    try {
      this.week = await fetchWeek(this.rosterId, this.weekStart);
      this.error = "";
    } catch (err) {
      this.setError((err as Error).message);
    }
  }

  private async loadAvailable(): Promise<void> {
    if (!this.week) return;
    try {
      this.available = await fetchAvailableStaff({ date: this.weekStart, q: this.staffQuery || undefined });
    } catch (err) {
      this.setError((err as Error).message);
    }
  }

  private shiftWeek(days: number): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + days);
    this.weekStart = d.toISOString().slice(0, 10);
    void this.refresh();
    void this.loadAvailable();
  }

  private cellDate(dayOfWeek: number): string {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + dayOfWeek);
    return d.toISOString().slice(0, 10);
  }

  private assignmentsFor(slotId: number, date: string): Assignment[] {
    return (this.week?.assignments ?? []).filter(
      (a) => a.slot_id === slotId && a.assignment_date === date,
    );
  }

  private exceptionFor(date: string): boolean {
    return (this.week?.exceptions ?? []).some((e) => e.exception_date === date);
  }

  private async pushUndo(op: UndoOp): Promise<void> {
    this.undoStack.push(op);
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
  }

  private async undo(): Promise<void> {
    const op = this.undoStack.pop();
    if (!op) return;

    try {
      if (op.kind === "create") {
        await deleteAssignment(op.id);
      } else if (op.kind === "delete") {
        await createAssignment(op.payload);
      } else {
        await updateAssignment(op.id, op.before);
      }
      await this.refresh();
    } catch (err) {
      this.setError(`Undo failed: ${(err as Error).message}`);
    }
  }

  private async dropOnCell(slot: Slot, date: string): Promise<void> {
    if (!this.dragging) return;

    if (this.dragging.kind === "staff") {
      const staff = this.dragging.staff;
      try {
        const created = await createAssignment({
          slot_id: slot.id,
          borrowernumber: staff.borrowernumber,
          assignment_date: date,
        });
        await this.pushUndo({ kind: "create", id: created.id });
        await this.refresh();
      } catch (err) {
        this.setError((err as Error).message);
      }
    } else {
      const a = this.dragging.assignment;
      if (a.slot_id === slot.id && a.assignment_date === date) return;
      try {
        await updateAssignment(a.id, { slot_id: slot.id, assignment_date: date });
        await this.pushUndo({
          kind: "update",
          id: a.id,
          before: { slot_id: a.slot_id, borrowernumber: a.borrowernumber, assignment_date: a.assignment_date },
        });
        await this.refresh();
      } catch (err) {
        this.setError((err as Error).message);
      }
    }
    this.dragging = null;
  }

  private requestDelete(a: Assignment): void {
    this.pendingDelete = a;
  }

  private cancelDelete(): void {
    this.pendingDelete = null;
  }

  private async confirmDelete(): Promise<void> {
    const a = this.pendingDelete;
    if (!a) return;
    this.pendingDelete = null;
    try {
      await deleteAssignment(a.id);
      await this.pushUndo({
        kind: "delete",
        payload: {
          slot_id: a.slot_id,
          borrowernumber: a.borrowernumber,
          assignment_date: a.assignment_date,
          status: a.status,
          notes: a.notes ?? undefined,
        },
      });
      await this.refresh();
    } catch (err) {
      this.setError((err as Error).message);
    }
  }

  private onStaffSearch(e: Event): void {
    this.staffQuery = (e.target as HTMLInputElement).value;
    if (this.staffDebounce) clearTimeout(this.staffDebounce);
    this.staffDebounce = setTimeout(() => void this.loadAvailable(), 300);
  }

  override render() {
    if (!this.week) return html`<div class="text-center text-muted py-4">Loading…</div>`;

    const color = this.week.roster.type_color;
    // One row per slot (no time-based dedup needed now that a single slot
    // covers multiple days via its RRule).
    const slotsByTime = [...this.week.slots].sort((a, b) =>
      a.start_time.localeCompare(b.start_time) || a.id - b.id,
    );

    return html`
      ${this.error
        ? html`
            <div class="srg-toast alert alert-danger" role="alert" aria-live="assertive">
              <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
              <span>${this.error}</span>
              <button
                type="button"
                class="btn-close"
                aria-label="Dismiss"
                @click=${() => (this.error = "")}
              ></button>
            </div>
          `
        : nothing}

      <div class="btn-toolbar srg-toolbar" role="toolbar">
        <div class="btn-group" role="group">
          <button class="btn btn-default btn-sm" @click=${() => this.shiftWeek(-7)}>
            <i class="fa fa-arrow-left" aria-hidden="true"></i> Previous
          </button>
          <button class="btn btn-default btn-sm" @click=${() => this.shiftWeek(7)}>
            Next <i class="fa fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
        <span class="srg-week-label">Week of ${this.weekStart}</span>
        <div class="btn-group" role="group">
          <button
            class="btn btn-default btn-sm"
            @click=${() => void this.undo()}
            ?disabled=${this.undoStack.length === 0}
          >
            <i class="fa fa-undo" aria-hidden="true"></i> Undo (${this.undoStack.length})
          </button>
          <button class="btn btn-default btn-sm" @click=${() => void this.refresh()}>
            <i class="fa fa-refresh" aria-hidden="true"></i> Refresh
          </button>
        </div>
      </div>

      <div class="srg-layout" style=${`--srg-type-color: ${color}`}>
        <section class="page-section srg-staff-panel">
          <h3 class="srg-panel-title">Available staff</h3>
          <input
            type="search"
            class="form-control input-sm"
            placeholder="Search staff…"
            .value=${this.staffQuery}
            @input=${this.onStaffSearch}
            @focus=${() => void this.loadAvailable()}
          />
          <ul class="list-group srg-staff-list" role="list">
            ${repeat(
              this.available,
              (s) => s.borrowernumber,
              (s) => html`
                <li
                  class="list-group-item srg-staff-pill"
                  draggable="true"
                  @dragstart=${(e: DragEvent) => {
                    this.dragging = { kind: "staff", staff: s };
                    e.dataTransfer?.setData("text/plain", String(s.borrowernumber));
                  }}
                >
                  <i class="fa fa-user text-muted" aria-hidden="true"></i>
                  <span>${s.surname}, ${s.firstname}</span>
                  <i class="fa fa-grip-vertical text-muted srg-grip" aria-hidden="true"></i>
                </li>
              `,
            )}
            ${this.available.length === 0 && this.staffQuery
              ? html`<li class="list-group-item text-muted">No matches</li>`
              : nothing}
          </ul>
        </section>

        <section class="page-section srg-grid-wrap">
          <table class="table srg-grid">
            <thead>
              <tr>
                <th class="srg-slot-col">Slot</th>
                ${DAYS.map(
                  (d, i) => html`
                    <th>
                      <span class="srg-day">${d}</span>
                      <small class="text-muted">${this.cellDate(i).slice(5)}</small>
                    </th>
                  `,
                )}
              </tr>
            </thead>
            <tbody>
              ${slotsByTime.length === 0
                ? html`
                    <tr>
                      <td colspan="8" class="srg-empty">
                        <p>No time slots defined for this roster yet.</p>
                        <a class="btn btn-default btn-sm" href="?class=${getClass()}&method=tool&op=manage_slots&roster_id=${this.rosterId}">
                          <i class="fa fa-clock" aria-hidden="true"></i> Manage slots
                        </a>
                      </td>
                    </tr>
                  `
                : nothing}
              ${slotsByTime.map((slot) => {
                return html`
                  <tr>
                    <th scope="row" class="srg-slot-cell">
                      <span class="srg-slot-time">${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}</span>
                      ${slot.location
                        ? html`<small class="text-muted d-block">${slot.location}</small>`
                        : nothing}
                    </th>
                    ${DAYS.map((_, day) => {
                      const ical = ICAL_FOR_COLUMN[day];
                      const applies = slot.days_of_week.includes(ical);
                      const date = this.cellDate(day);
                      const isException = this.exceptionFor(date);
                      if (!applies) return html`<td class="srg-cell-empty"></td>`;
                      if (isException)
                        return html`<td class="srg-cell-exception"><small>closed</small></td>`;
                      const assignments = this.assignmentsFor(slot.id, date);
                      const filled = assignments.length;
                      return html`
                        <td
                          class="srg-cell"
                          @dragover=${(e: DragEvent) => {
                            e.preventDefault();
                            (e.currentTarget as HTMLElement).classList.add("srg-dropping");
                          }}
                          @dragleave=${(e: DragEvent) => {
                            (e.currentTarget as HTMLElement).classList.remove("srg-dropping");
                          }}
                          @drop=${async (e: DragEvent) => {
                            e.preventDefault();
                            (e.currentTarget as HTMLElement).classList.remove("srg-dropping");
                            await this.dropOnCell(slot, date);
                          }}
                        >
                          ${repeat(
                            assignments,
                            (a) => a.id,
                            (a) => html`
                              <div
                                class="srg-assignment srg-status-${a.status}"
                                draggable="true"
                                title="${a.firstname} ${a.surname} (${a.status}). Click to remove."
                                @dragstart=${(e: DragEvent) => {
                                  this.dragging = { kind: "assignment", assignment: a };
                                  e.dataTransfer?.setData("text/plain", String(a.id));
                                }}
                                @click=${() => this.requestDelete(a)}
                              >
                                ${a.surname}, ${a.firstname}
                              </div>
                            `,
                          )}
                          <small class="srg-capacity">${filled}/${slot.max_staff}</small>
                        </td>
                      `;
                    })}
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </section>
      </div>

      ${this.pendingDelete ? this.renderDeleteModal(this.pendingDelete) : nothing}
    `;
  }

  private renderDeleteModal(a: Assignment) {
    return html`
      <div
        class="modal show staff-roster-modal-open"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        style="display: block;"
        @click=${(e: MouseEvent) => {
          if ((e.target as HTMLElement).classList.contains("modal")) this.cancelDelete();
        }}
      >
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h1 class="modal-title">Remove assignment?</h1>
              <button type="button" class="btn-close" aria-label="Close" @click=${() => this.cancelDelete()}></button>
            </div>
            <div class="modal-body">
              <p>Remove <strong>${a.surname}, ${a.firstname}</strong> from this slot on ${a.assignment_date}?</p>
              <p class="text-muted">You can undo with Cmd-Z (or the Undo button) if this was a mistake.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-danger" @click=${() => void this.confirmDelete()}>
                <i class="fa fa-trash"></i> Remove
              </button>
              <button type="button" class="btn btn-default" @click=${() => this.cancelDelete()}>
                <i class="fa fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show staff-roster-modal-backdrop"></div>
    `;
  }
}

function isoMonday(d: Date): string {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  return m.toISOString().slice(0, 10);
}

function getClass(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("class") ?? "";
}
