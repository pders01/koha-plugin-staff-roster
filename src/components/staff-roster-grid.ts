import { LitElement, html, css, nothing } from "lit";
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

type UndoOp =
  | { kind: "create"; id: number }
  | { kind: "delete"; payload: { slot_id: number; borrowernumber: number; assignment_date: string; status: string; notes: string | null } }
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

  private undoStack: UndoOp[] = [];
  private pollTimer?: ReturnType<typeof setInterval>;
  private staffDebounce?: ReturnType<typeof setTimeout>;

  static override styles = css`
    :host {
      display: block;
      font-family: inherit;
      color: #222;
    }

    .layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 1rem;
    }

    .sidebar {
      background: #f7f7f9;
      border-radius: 6px;
      padding: 0.75rem;
      max-height: 80vh;
      overflow-y: auto;
    }

    .sidebar h4 {
      margin: 0 0 0.5rem;
      font-size: 0.9rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #555;
    }

    .sidebar input[type="search"] {
      width: 100%;
      padding: 0.4rem;
      box-sizing: border-box;
      margin-bottom: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 3px;
    }

    .staff-pill {
      display: block;
      padding: 0.4rem 0.5rem;
      margin-bottom: 0.25rem;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: grab;
      font-size: 0.85rem;
      user-select: none;
    }

    .staff-pill:hover {
      border-color: #4caf50;
      background: #f0fdf4;
    }

    .staff-pill[draggable="true"]:active {
      cursor: grabbing;
    }

    .grid {
      display: grid;
      grid-template-columns: 140px repeat(7, 1fr);
      gap: 1px;
      background: #ddd;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }

    .header,
    .slot-label,
    .cell {
      background: white;
      padding: 0.5rem;
      min-height: 60px;
    }

    .header {
      font-weight: 600;
      text-align: center;
      background: #f0f0f0;
      font-size: 0.85rem;
    }

    .slot-label {
      font-size: 0.85rem;
      color: #444;
    }

    .slot-label .time {
      font-weight: 600;
      color: #222;
    }

    .cell {
      cursor: pointer;
      transition: background 0.1s;
    }

    .cell.dropping {
      background: #e8f5e9;
      box-shadow: inset 0 0 0 2px #4caf50;
    }

    .cell.exception {
      background: #fff8e1;
      color: #6d4c00;
      cursor: not-allowed;
    }

    .assignment {
      display: block;
      background: var(--type-color, #3498db);
      color: white;
      padding: 0.25rem 0.4rem;
      border-radius: 3px;
      margin-bottom: 0.2rem;
      font-size: 0.8rem;
      cursor: grab;
    }

    .assignment.cancelled,
    .assignment.no_show {
      opacity: 0.5;
      text-decoration: line-through;
    }

    .toolbar {
      margin-bottom: 0.5rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    button {
      padding: 0.35rem 0.75rem;
      border: 1px solid #999;
      background: white;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    button:hover {
      background: #f0f0f0;
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .error {
      background: #ffebee;
      color: #b71c1c;
      padding: 0.5rem;
      border-radius: 3px;
      margin-bottom: 0.5rem;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #888;
    }
  `;

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
      this.error = (err as Error).message;
    }
  }

  private async loadAvailable(): Promise<void> {
    if (!this.week) return;
    try {
      this.available = await fetchAvailableStaff({ date: this.weekStart, q: this.staffQuery || undefined });
    } catch (err) {
      this.error = (err as Error).message;
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
      this.error = `Undo failed: ${(err as Error).message}`;
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
        this.error = (err as Error).message;
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
        this.error = (err as Error).message;
      }
    }
    this.dragging = null;
  }

  private async deleteAssignment(a: Assignment): Promise<void> {
    if (!confirm(`Remove ${a.firstname} ${a.surname}?`)) return;
    try {
      await deleteAssignment(a.id);
      await this.pushUndo({
        kind: "delete",
        payload: {
          slot_id: a.slot_id,
          borrowernumber: a.borrowernumber,
          assignment_date: a.assignment_date,
          status: a.status,
          notes: a.notes,
        },
      });
      await this.refresh();
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private onStaffSearch(e: Event): void {
    this.staffQuery = (e.target as HTMLInputElement).value;
    if (this.staffDebounce) clearTimeout(this.staffDebounce);
    this.staffDebounce = setTimeout(() => void this.loadAvailable(), 300);
  }

  override render() {
    if (!this.week) return html`<div class="loading">Loading…</div>`;

    const color = this.week.roster.type_color;
    const slotsByTime = [...this.week.slots].sort(
      (a, b) => a.start_time.localeCompare(b.start_time) || a.day_of_week - b.day_of_week,
    );
    const slotIds = [...new Set(slotsByTime.map((s) => `${s.start_time}-${s.end_time}-${s.location ?? ""}`))];

    return html`
      ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
      <div class="toolbar">
        <button @click=${() => this.shiftWeek(-7)}>← Previous</button>
        <strong>${this.week.roster.name} — week of ${this.weekStart}</strong>
        <button @click=${() => this.shiftWeek(7)}>Next →</button>
        <button @click=${() => void this.undo()} ?disabled=${this.undoStack.length === 0}>
          Undo (${this.undoStack.length})
        </button>
        <button @click=${() => void this.refresh()}>Refresh</button>
      </div>

      <div class="layout">
        <div class="sidebar">
          <h4>Available staff</h4>
          <input
            type="search"
            placeholder="Search…"
            .value=${this.staffQuery}
            @input=${this.onStaffSearch}
            @focus=${() => void this.loadAvailable()}
          />
          ${repeat(
            this.available,
            (s) => s.borrowernumber,
            (s) => html`
              <div
                class="staff-pill"
                draggable="true"
                @dragstart=${(e: DragEvent) => {
                  this.dragging = { kind: "staff", staff: s };
                  e.dataTransfer?.setData("text/plain", String(s.borrowernumber));
                }}
              >
                ${s.surname}, ${s.firstname}
              </div>
            `,
          )}
        </div>

        <div class="grid" style=${`--type-color: ${color}`}>
          <div class="header">Slot</div>
          ${DAYS.map(
            (d, i) => html`<div class="header">${d}<br /><small>${this.cellDate(i).slice(5)}</small></div>`,
          )}
          ${slotIds.map((key) => {
            const sample = slotsByTime.find(
              (s) => `${s.start_time}-${s.end_time}-${s.location ?? ""}` === key,
            )!;
            return html`
              <div class="slot-label">
                <span class="time">${sample.start_time.slice(0, 5)}–${sample.end_time.slice(0, 5)}</span>
                ${sample.location ? html`<br /><small>${sample.location}</small>` : nothing}
              </div>
              ${DAYS.map((_, day) => {
                const slot = slotsByTime.find(
                  (s) => `${s.start_time}-${s.end_time}-${s.location ?? ""}` === key && s.day_of_week === day,
                );
                const date = this.cellDate(day);
                const isException = this.exceptionFor(date);
                if (!slot) return html`<div class="cell"></div>`;
                if (isException) return html`<div class="cell exception">closed</div>`;
                const assignments = this.assignmentsFor(slot.id, date);
                return html`
                  <div
                    class="cell"
                    @dragover=${(e: DragEvent) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).classList.add("dropping");
                    }}
                    @dragleave=${(e: DragEvent) => {
                      (e.currentTarget as HTMLElement).classList.remove("dropping");
                    }}
                    @drop=${async (e: DragEvent) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).classList.remove("dropping");
                      await this.dropOnCell(slot, date);
                    }}
                  >
                    ${repeat(
                      assignments,
                      (a) => a.id,
                      (a) => html`
                        <div
                          class="assignment ${a.status}"
                          draggable="true"
                          title="${a.firstname} ${a.surname} (${a.status}). Click to remove."
                          @dragstart=${(e: DragEvent) => {
                            this.dragging = { kind: "assignment", assignment: a };
                            e.dataTransfer?.setData("text/plain", String(a.id));
                          }}
                          @click=${() => void this.deleteAssignment(a)}
                        >
                          ${a.surname}, ${a.firstname}
                        </div>
                      `,
                    )}
                    ${assignments.length < slot.max_staff
                      ? html`<small style="color:#888">${assignments.length}/${slot.max_staff}</small>`
                      : nothing}
                  </div>
                `;
              })}
            `;
          })}
        </div>
      </div>
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
