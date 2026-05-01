import { LitElement, html, nothing, type PropertyValues } from "lit";
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
const FULL_DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

// iCal BYDAY codes per Monday-anchored column index.
const ICAL_FOR_COLUMN = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

type Cargo =
  | { kind: "staff"; staff: Staff }
  | { kind: "assignment"; assignment: Assignment };

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
  @state() private dragging: Cargo | null = null;
  @state() private pickedUp: Cargo | null = null;
  @state() private pendingDelete: Assignment | null = null;
  @state() private editing: Assignment | null = null;
  @state() private editForm: { status: string; notes: string; fields: Record<string, string[]> } = {
    status: "scheduled",
    notes: "",
    fields: {},
  };
  private editOriginEl: HTMLElement | null = null;
  @state() private liveMessage = "";
  @state() private focusedCellKey = "";
  @state() private focusedPillIdx = 0;

  private undoStack: UndoOp[] = [];
  private pollTimer?: ReturnType<typeof setInterval>;
  private staffDebounce?: ReturnType<typeof setTimeout>;
  private errorDismissTimer?: ReturnType<typeof setTimeout>;
  private pickupOriginEl: HTMLElement | null = null;
  private deleteOriginEl: HTMLElement | null = null;
  private pendingFocusCellKey: string | null = null;
  private pendingFocusPillIdx: number | null = null;
  private pendingFocusModal = false;

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
    void this.loadAvailable();
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
      return;
    }
    if (e.key === "Escape") {
      if (this.pendingDelete) {
        e.preventDefault();
        this.cancelDelete();
        return;
      }
      if (this.pickedUp) {
        e.preventDefault();
        this.cancelPickup();
      }
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
    this.pendingFocusModal = true;
  }

  private requestEdit(a: Assignment, origin: HTMLElement | null = null): void {
    this.editing = a;
    this.editOriginEl = origin;
    this.editForm = {
      status: a.status,
      notes: a.notes ?? "",
      fields: { ...(a.additional_fields ?? {}) },
    };
    this.pendingFocusModal = true;
  }

  private cancelEdit(): void {
    this.editing = null;
    const origin = this.editOriginEl;
    this.editOriginEl = null;
    if (origin) requestAnimationFrame(() => origin.focus());
  }

  private async saveEdit(): Promise<void> {
    const a = this.editing;
    if (!a) return;
    const payload: Parameters<typeof updateAssignment>[1] = {
      status: this.editForm.status,
      notes: this.editForm.notes === "" ? null : this.editForm.notes,
    };
    const fieldDefs = this.week?.assignment_fields ?? [];
    if (fieldDefs.length) payload.additional_fields = this.editForm.fields;
    const dayIdx = this.dayIdxForDate(a.assignment_date);
    const cellKey = `${a.slot_id}-${dayIdx}`;
    try {
      await updateAssignment(a.id, payload);
      this.liveMessage = `Updated assignment for ${a.firstname} ${a.surname}.`;
      this.editing = null;
      this.editOriginEl = null;
      await this.refresh();
      // The chip's DOM node was replaced by the refresh, so origin.focus()
      // would no-op against a detached element. Route focus through the
      // cell-key pipeline instead, same as confirmDelete.
      this.focusedCellKey = cellKey;
      this.pendingFocusCellKey = cellKey;
    } catch (err) {
      this.setError((err as Error).message);
    }
  }

  private deleteFromEdit(): void {
    const a = this.editing;
    if (!a) return;
    this.editing = null;
    const origin = this.editOriginEl;
    this.editOriginEl = null;
    this.deleteOriginEl = origin;
    this.requestDelete(a);
  }

  private cancelDelete(): void {
    this.pendingDelete = null;
    const origin = this.deleteOriginEl;
    this.deleteOriginEl = null;
    if (origin) requestAnimationFrame(() => origin.focus());
  }

  private async confirmDelete(): Promise<void> {
    const a = this.pendingDelete;
    if (!a) return;
    this.pendingDelete = null;
    const dayIdx = this.dayIdxForDate(a.assignment_date);
    const cellKey = `${a.slot_id}-${dayIdx}`;
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
      this.liveMessage = `Removed ${a.firstname} ${a.surname} from ${FULL_DAYS[dayIdx]} ${a.assignment_date}.`;
      await this.refresh();
    } catch (err) {
      this.setError((err as Error).message);
    }
    this.deleteOriginEl = null;
    this.focusedCellKey = cellKey;
    this.pendingFocusCellKey = cellKey;
  }

  private onStaffSearch(e: Event): void {
    this.staffQuery = (e.target as HTMLInputElement).value;
    if (this.staffDebounce) clearTimeout(this.staffDebounce);
    this.staffDebounce = setTimeout(() => void this.loadAvailable(), 300);
  }

  private sortedSlots(): Slot[] {
    return [...(this.week?.slots ?? [])].sort(
      (a, b) => a.start_time.localeCompare(b.start_time) || a.id - b.id,
    );
  }

  private cellApplies(slot: Slot, dayIdx: number): boolean {
    if (slot.applies_on_dates) {
      return slot.applies_on_dates.includes(this.cellDate(dayIdx));
    }
    return slot.days_of_week.includes(ICAL_FOR_COLUMN[dayIdx]);
  }

  private firstApplicableCellKey(): string {
    const slots = this.sortedSlots();
    for (let s = 0; s < slots.length; s++) {
      for (let d = 0; d < 7; d++) {
        if (this.cellApplies(slots[s], d)) return `${slots[s].id}-${d}`;
      }
    }
    return "";
  }

  private cargoName(c: Cargo): string {
    return c.kind === "staff"
      ? `${c.staff.firstname} ${c.staff.surname}`
      : `${c.assignment.firstname} ${c.assignment.surname}`;
  }

  private cellAriaLabel(
    slot: Slot,
    date: string,
    dayIdx: number,
    isException: boolean,
    assignments: Assignment[],
  ): string {
    const day = FULL_DAYS[dayIdx];
    const time = `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`;
    if (isException) return `${day} ${date}, ${time} slot, closed.`;
    const filled = assignments.length;
    const base = `${day} ${date}, ${time} slot, ${filled} of ${slot.max_staff} staff assigned`;
    if (filled === 0) return `${base}.`;
    const names = assignments.map((a) => `${a.firstname} ${a.surname}`).join(", ");
    return `${base}: ${names}.`;
  }

  private pickUpStaff(staff: Staff, origin: HTMLElement): void {
    this.pickedUp = { kind: "staff", staff };
    this.pickupOriginEl = origin;
    this.liveMessage = `Picked up ${staff.firstname} ${staff.surname}. Use arrow keys to choose a target cell. Press Enter to drop, Esc to cancel.`;
    const target = this.firstApplicableCellKey();
    if (target) {
      this.focusedCellKey = target;
      this.pendingFocusCellKey = target;
    }
  }

  private pickUpAssignment(a: Assignment, origin: HTMLElement): void {
    this.pickedUp = { kind: "assignment", assignment: a };
    this.pickupOriginEl = origin;
    this.liveMessage = `Picked up ${a.firstname} ${a.surname}. Use arrow keys to move. Press Enter to drop, Esc to cancel.`;
    const target = this.firstApplicableCellKey();
    if (target) {
      this.focusedCellKey = target;
      this.pendingFocusCellKey = target;
    }
  }

  private cancelPickup(): void {
    this.pickedUp = null;
    this.liveMessage = "Cancelled.";
    const origin = this.pickupOriginEl;
    this.pickupOriginEl = null;
    if (origin) requestAnimationFrame(() => origin.focus());
  }

  private async dropFromKeyboard(slot: Slot, date: string): Promise<void> {
    if (!this.pickedUp) return;
    const cargo = this.pickedUp;
    const name = this.cargoName(cargo);
    const time = slot.start_time.slice(0, 5);
    this.dragging = cargo;
    this.pickedUp = null;
    this.pickupOriginEl = null;
    const errBefore = this.error;
    await this.dropOnCell(slot, date);
    if (this.error && this.error !== errBefore) {
      this.liveMessage = `Cannot drop here. ${this.error}`;
    } else {
      this.liveMessage = `Moved ${name} to ${FULL_DAYS[this.dayIdxForDate(date)]} ${date}, ${time} slot.`;
    }
    const cellKey = `${slot.id}-${this.dayIdxForDate(date)}`;
    this.focusedCellKey = cellKey;
    this.pendingFocusCellKey = cellKey;
  }

  private dayIdxForDate(date: string): number {
    const start = new Date(this.weekStart);
    const d = new Date(date);
    const ms = d.getTime() - start.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  private moveCellFocus(key: string, slotIdx: number, dayIdx: number): void {
    const slots = this.sortedSlots();
    const step = (
      ds: number,
      dd: number,
    ): [number, number] | null => {
      let ns = slotIdx + ds;
      let nd = dayIdx + dd;
      while (ns >= 0 && ns < slots.length && nd >= 0 && nd < 7) {
        if (this.cellApplies(slots[ns], nd)) return [ns, nd];
        ns += ds;
        nd += dd;
      }
      return null;
    };
    let target: [number, number] | null = null;
    switch (key) {
      case "ArrowUp": target = step(-1, 0); break;
      case "ArrowDown": target = step(1, 0); break;
      case "ArrowLeft": target = step(0, -1); break;
      case "ArrowRight": target = step(0, 1); break;
      case "Home":
        for (let d = 0; d < 7; d++) {
          if (this.cellApplies(slots[slotIdx], d)) { target = [slotIdx, d]; break; }
        }
        break;
      case "End":
        for (let d = 6; d >= 0; d--) {
          if (this.cellApplies(slots[slotIdx], d)) { target = [slotIdx, d]; break; }
        }
        break;
      case "PageUp":
        this.shiftWeek(-7);
        this.pendingFocusCellKey = this.focusedCellKey;
        return;
      case "PageDown":
        this.shiftWeek(7);
        this.pendingFocusCellKey = this.focusedCellKey;
        return;
    }
    if (target) {
      const [ns, nd] = target;
      const newKey = `${slots[ns].id}-${nd}`;
      this.focusedCellKey = newKey;
      this.pendingFocusCellKey = newKey;
    }
  }

  private onCellKeyDown(
    e: KeyboardEvent,
    slot: Slot,
    date: string,
    slotIdx: number,
    dayIdx: number,
  ): void {
    if (e.target !== e.currentTarget) return;
    const navKeys = [
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Home", "End", "PageUp", "PageDown",
    ];
    if (navKeys.includes(e.key)) {
      e.preventDefault();
      this.moveCellFocus(e.key, slotIdx, dayIdx);
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && this.pickedUp) {
      e.preventDefault();
      void this.dropFromKeyboard(slot, date);
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && !this.pickedUp) {
      const assignments = this.assignmentsFor(slot.id, date);
      if (assignments.length > 0) {
        e.preventDefault();
        this.deleteOriginEl = e.currentTarget as HTMLElement;
        this.requestDelete(assignments[0]);
      }
    }
  }

  private onPillKeyDown(e: KeyboardEvent, staff: Staff, idx: number): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      this.pickUpStaff(staff, e.currentTarget as HTMLElement);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const next = e.key === "ArrowDown"
        ? Math.min(this.available.length - 1, idx + 1)
        : Math.max(0, idx - 1);
      this.focusedPillIdx = next;
      this.pendingFocusPillIdx = next;
    }
  }

  private onAssignmentKeyDown(e: KeyboardEvent, a: Assignment): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      this.pickUpAssignment(a, e.currentTarget as HTMLElement);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      this.deleteOriginEl = e.currentTarget as HTMLElement;
      this.requestDelete(a);
    }
  }

  override updated(_changed: PropertyValues): void {
    if (this.week && !this.focusedCellKey) {
      this.focusedCellKey = this.firstApplicableCellKey();
    }
    if (this.pendingFocusCellKey) {
      const sel = `[data-cell-key="${this.pendingFocusCellKey}"]`;
      const el = this.querySelector(sel) as HTMLElement | null;
      if (el) el.focus();
      this.pendingFocusCellKey = null;
    }
    if (this.pendingFocusPillIdx !== null) {
      const idx = this.pendingFocusPillIdx;
      const el = this.querySelector(
        `[data-pill-idx="${idx}"]`,
      ) as HTMLElement | null;
      if (el) el.focus();
      this.pendingFocusPillIdx = null;
    }
    if (this.pendingFocusModal) {
      const el = this.querySelector(
        ".staff-roster-modal-open .modal-footer .btn-default",
      ) as HTMLElement | null;
      if (el) el.focus();
      this.pendingFocusModal = false;
    }
  }

  override render() {
    if (!this.week) return html`<div class="text-center text-muted py-4">Loading…</div>`;

    const color = this.week.roster.type_color;
    const slotsByTime = this.sortedSlots();
    const pickupActive = this.pickedUp !== null;

    return html`
      <div class="srg-sr-only" aria-live="polite" aria-atomic="true">${this.liveMessage}</div>

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
          <h3 class="srg-panel-title" id="srg-staff-list-label">Available staff</h3>
          <input
            type="search"
            class="form-control input-sm"
            placeholder="Search staff…"
            .value=${this.staffQuery}
            @input=${this.onStaffSearch}
            @focus=${() => void this.loadAvailable()}
          />
          <ul
            class="list-group srg-staff-list"
            role="listbox"
            aria-labelledby="srg-staff-list-label"
          >
            ${repeat(
              this.available,
              (s) => s.borrowernumber,
              (s, i) => {
                const isPicked =
                  this.pickedUp?.kind === "staff" &&
                  this.pickedUp.staff.borrowernumber === s.borrowernumber;
                return html`
                  <li
                    class="list-group-item srg-staff-pill ${isPicked ? "srg-picked-up" : ""}"
                    role="option"
                    tabindex="0"
                    data-pill-idx=${i}
                    aria-selected=${isPicked ? "true" : "false"}
                    aria-label="${s.surname}, ${s.firstname}. Press Enter to pick up."
                    draggable="true"
                    @dragstart=${(e: DragEvent) => {
                      this.dragging = { kind: "staff", staff: s };
                      e.dataTransfer?.setData("text/plain", String(s.borrowernumber));
                    }}
                    @keydown=${(e: KeyboardEvent) => this.onPillKeyDown(e, s, i)}
                    @focus=${() => (this.focusedPillIdx = i)}
                  >
                    <i class="fa fa-user text-muted" aria-hidden="true"></i>
                    <span>${s.surname}, ${s.firstname}</span>
                    <i class="fa fa-grip-vertical text-muted srg-grip" aria-hidden="true"></i>
                  </li>
                `;
              },
            )}
            ${this.available.length === 0 && this.staffQuery
              ? html`<li class="list-group-item text-muted">No matches</li>`
              : nothing}
          </ul>
        </section>

        <section class="page-section srg-grid-wrap">
          <table
            class="table srg-grid ${pickupActive ? "srg-pickup-active" : ""}"
            role="grid"
            aria-label="Staff roster schedule"
            aria-rowcount=${slotsByTime.length + 1}
            aria-colcount="8"
          >
            <thead>
              <tr role="row" aria-rowindex="1">
                <th class="srg-slot-col" role="columnheader" aria-colindex="1">Slot</th>
                ${DAYS.map(
                  (d, i) => html`
                    <th role="columnheader" aria-colindex=${i + 2}>
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
                    <tr role="row">
                      <td colspan="8" class="srg-empty" role="gridcell">
                        <p>No time slots defined for this roster yet.</p>
                        <a class="btn btn-default btn-sm" href="?class=${getClass()}&method=tool&op=manage_slots&roster_id=${this.rosterId}">
                          <i class="fa fa-clock" aria-hidden="true"></i> Manage slots
                        </a>
                      </td>
                    </tr>
                  `
                : nothing}
              ${slotsByTime.map((slot, slotIdx) => {
                return html`
                  <tr role="row" aria-rowindex=${slotIdx + 2}>
                    <th
                      scope="row"
                      role="rowheader"
                      class="srg-slot-cell"
                      aria-colindex="1"
                    >
                      <span class="srg-slot-time">${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}</span>
                      ${slot.location
                        ? html`<small class="text-muted d-block">${slot.location}</small>`
                        : nothing}
                    </th>
                    ${DAYS.map((_, day) => {
                      const date = this.cellDate(day);
                      const applies = this.cellApplies(slot, day);
                      const isException = this.exceptionFor(date);
                      const colIdx = day + 2;
                      if (!applies) {
                        return html`<td
                          class="srg-cell-empty"
                          role="gridcell"
                          aria-colindex=${colIdx}
                          aria-disabled="true"
                        ></td>`;
                      }
                      const cellKey = `${slot.id}-${day}`;
                      if (isException) {
                        return html`<td
                          class="srg-cell-exception"
                          role="gridcell"
                          aria-colindex=${colIdx}
                          tabindex="0"
                          data-cell-key=${cellKey}
                          aria-label=${this.cellAriaLabel(slot, date, day, true, [])}
                          @keydown=${(e: KeyboardEvent) => this.onCellKeyDown(e, slot, date, slotIdx, day)}
                          @focus=${() => (this.focusedCellKey = cellKey)}
                        >
                          <small>closed</small>
                        </td>`;
                      }
                      const assignments = this.assignmentsFor(slot.id, date);
                      const filled = assignments.length;
                      const isDropTarget = pickupActive;
                      return html`
                        <td
                          class="srg-cell ${isDropTarget ? "srg-drop-target" : ""}"
                          role="gridcell"
                          aria-colindex=${colIdx}
                          tabindex="0"
                          data-cell-key=${cellKey}
                          aria-label=${this.cellAriaLabel(slot, date, day, false, assignments)}
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
                          @keydown=${(e: KeyboardEvent) => this.onCellKeyDown(e, slot, date, slotIdx, day)}
                          @focus=${() => (this.focusedCellKey = cellKey)}
                        >
                          ${repeat(
                            assignments,
                            (a) => a.id,
                            (a) => {
                              const isAsgPicked =
                                this.pickedUp?.kind === "assignment" &&
                                this.pickedUp.assignment.id === a.id;
                              return html`
                                <div
                                  class="srg-assignment srg-status-${a.status} ${isAsgPicked ? "srg-picked-up" : ""}"
                                  role="button"
                                  tabindex="0"
                                  draggable="true"
                                  aria-label="${a.firstname} ${a.surname}, ${a.status}. Press Enter to move, Delete to remove. Click to edit."
                                  title="${a.firstname} ${a.surname} (${a.status}). Click to edit."
                                  @dragstart=${(e: DragEvent) => {
                                    this.dragging = { kind: "assignment", assignment: a };
                                    e.dataTransfer?.setData("text/plain", String(a.id));
                                  }}
                                  @click=${(e: MouseEvent) => this.requestEdit(a, e.currentTarget as HTMLElement)}
                                  @keydown=${(e: KeyboardEvent) => this.onAssignmentKeyDown(e, a)}
                                >
                                  ${a.surname}, ${a.firstname}
                                </div>
                              `;
                            },
                          )}
                          <small class="srg-capacity" aria-hidden="true">${filled}/${slot.max_staff}</small>
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

      ${this.editing ? this.renderEditModal(this.editing) : nothing}
      ${this.pendingDelete ? this.renderDeleteModal(this.pendingDelete) : nothing}
    `;
  }

  private renderEditModal(a: Assignment) {
    const fields = this.week?.assignment_fields ?? [];
    const STATUSES: Assignment["status"][] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];
    const STATUS_LABELS: Record<Assignment["status"], string> = {
      scheduled: "Scheduled",
      confirmed: "Confirmed",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No-show",
    };
    return html`
      <div
        class="modal show staff-roster-modal-open"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        style="display: block;"
        @click=${(e: MouseEvent) => {
          if ((e.target as HTMLElement).classList.contains("modal")) this.cancelEdit();
        }}
      >
        <div class="modal-dialog modal-lg srg-edit-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h1 class="modal-title">Edit assignment</h1>
              <button type="button" class="btn-close" aria-label="Close" @click=${() => this.cancelEdit()}></button>
            </div>
            <div class="modal-body srg-edit-body">
              <p class="srg-edit-subject">
                <strong>${a.surname}, ${a.firstname}</strong>
                <span class="text-muted"> · ${FULL_DAYS[this.dayIdxForDate(a.assignment_date)]} ${a.assignment_date}</span>
              </p>
              <div class="srg-edit-grid">
                <div class="srg-edit-row">
                  <label for="srg-edit-status">Status</label>
                  <select
                    id="srg-edit-status"
                    class="form-select"
                    .value=${this.editForm.status}
                    @change=${(e: Event) => (this.editForm = { ...this.editForm, status: (e.target as HTMLSelectElement).value })}
                  >
                    ${STATUSES.map((s) => html`<option value=${s} ?selected=${s === this.editForm.status}>${STATUS_LABELS[s]}</option>`)}
                  </select>
                </div>
                <div class="srg-edit-row">
                  <label for="srg-edit-notes">Notes</label>
                  <textarea
                    id="srg-edit-notes"
                    class="form-control"
                    rows="3"
                    placeholder="Optional notes shown on the chip and in handoffs"
                    .value=${this.editForm.notes}
                    @input=${(e: Event) => (this.editForm = { ...this.editForm, notes: (e.target as HTMLTextAreaElement).value })}
                  ></textarea>
                </div>
                ${fields.map((f) => this.renderEditField(f))}
              </div>
            </div>
            <div class="modal-footer srg-edit-footer">
              <button type="button" class="btn btn-danger me-auto" @click=${() => this.deleteFromEdit()}>
                <i class="fa fa-trash"></i> Remove
              </button>
              <button type="button" class="btn btn-default" @click=${() => this.cancelEdit()}>Cancel</button>
              <button type="button" class="btn btn-primary" @click=${() => void this.saveEdit()}>
                <i class="fa fa-save"></i> Save
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show staff-roster-modal-backdrop"></div>
    `;
  }

  private renderEditField(f: NonNullable<RosterWeek["assignment_fields"]>[number]) {
    const id = `srg-edit-af-${f.id}`;
    const current = this.editForm.fields[f.id] ?? [];
    const setValues = (vals: string[]) => {
      this.editForm = { ...this.editForm, fields: { ...this.editForm.fields, [f.id]: vals } };
    };
    if (f.av_options && f.av_options.length) {
      const value = current[0] ?? "";
      return html`
        <div class="srg-edit-row">
          <label for=${id}>${f.name}</label>
          <select
            id=${id}
            class="form-select"
            .value=${value}
            @change=${(e: Event) => {
              const v = (e.target as HTMLSelectElement).value;
              setValues(v === "" ? [] : [v]);
            }}
          >
            <option value="">— None —</option>
            ${f.av_options.map((opt) => html`<option value=${opt.value} ?selected=${opt.value === value}>${opt.lib || opt.value}</option>`)}
          </select>
        </div>
      `;
    }
    const text = current.join(", ");
    return html`
      <div class="srg-edit-row">
        <label for=${id}>${f.name}</label>
        <input
          id=${id}
          type="text"
          class="form-control"
          placeholder=${f.repeatable ? "comma-separated values" : ""}
          .value=${text}
          @input=${(e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            const vals = f.repeatable
              ? raw.split(",").map((s) => s.trim()).filter(Boolean)
              : raw === ""
                ? []
                : [raw];
            setValues(vals);
          }}
        />
      </div>
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
