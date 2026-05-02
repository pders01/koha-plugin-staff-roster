import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import {
  fetchMyWeek,
  selfUnclaim,
  type MyShift,
  type MyWeek,
  type MyWeekRoster,
} from "../api.js";
import { formatLongDate, getClass, isoMonday, shiftDate } from "../util.js";

const STATUS_LABELS: Record<MyShift["status"], string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

@customElement("my-shifts-list")
export class MyShiftsList extends LitElement {
  @property({ type: String, attribute: "week-start" }) weekStart = "";

  @state() private week: MyWeek | null = null;
  @state() private error = "";
  @state() private loading = false;
  @state() private dropping: number | null = null;
  @state() private successMsg = "";
  @state() private pendingDrop: MyShift | null = null;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.weekStart) this.weekStart = isoMonday(new Date());
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    try {
      this.week = await fetchMyWeek(this.weekStart);
      this.error = "";
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }

  private shiftWeek(days: number): void {
    this.weekStart = shiftDate(this.weekStart, days);
    void this.refresh();
  }

  private rosterById(id: number): MyWeekRoster | undefined {
    return this.week?.rosters.find((r) => r.id === id);
  }

  private requestDrop(s: MyShift): void {
    this.pendingDrop = s;
  }

  private cancelDrop(): void {
    this.pendingDrop = null;
  }

  private async confirmDrop(): Promise<void> {
    const s = this.pendingDrop;
    if (!s) return;
    this.pendingDrop = null;
    this.dropping = s.assignment_id;
    this.error = "";
    try {
      await selfUnclaim(s.assignment_id);
      this.successMsg = `Shift dropped.`;
      setTimeout(() => (this.successMsg = ""), 4000);
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.dropping = null;
    }
  }

  private groupByDate(): { date: string; shifts: MyShift[] }[] {
    const map = new Map<string, MyShift[]>();
    for (const s of this.week?.shifts ?? []) {
      const list = map.get(s.assignment_date);
      if (list) list.push(s);
      else map.set(s.assignment_date, [s]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, shifts]) => ({ date, shifts }));
  }

  override render() {
    if (this.loading && !this.week) {
      return html`<div class="text-center text-muted py-4">Loading…</div>`;
    }

    const groups = this.groupByDate();

    return html`
      ${this.successMsg
        ? html`
            <div class="srg-toast alert alert-success" role="status" aria-live="polite">
              <i class="fa fa-check" aria-hidden="true"></i>
              <span>${this.successMsg}</span>
            </div>
          `
        : nothing}
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
          <button class="btn btn-default btn-sm" @click=${() => void this.refresh()}>
            <i class="fa fa-refresh" aria-hidden="true"></i> Refresh
          </button>
        </div>
      </div>

      <section class="page-section">
        ${groups.length === 0
          ? html`<p class="text-muted">No shifts scheduled this week.</p>`
          : html`
              <ul class="list-group">
                ${repeat(
                  groups,
                  (g) => g.date,
                  (g) => html`
                    <li class="list-group-item">
                      <h4 class="srg-day-heading">${formatLongDate(g.date)}</h4>
                      <ul class="list-unstyled">
                        ${g.shifts.map((s) => this.renderShift(s))}
                      </ul>
                    </li>
                  `,
                )}
              </ul>
            `}
      </section>

      ${this.pendingDrop ? this.renderDropModal(this.pendingDrop) : nothing}
    `;
  }

  private renderShift(s: MyShift) {
    const r = this.rosterById(s.roster_id);
    const color = r?.type_color ?? "#666";
    return html`
      <li class="srg-my-shift">
        <span
          class="staff-roster-type-swatch"
          style="background-color: ${color};"
          aria-hidden="true"
        ></span>
        <span class="srg-my-shift-time">
          ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}
        </span>
        <span class="srg-my-shift-roster">
          <a
            href="?class=${getClass()}&method=tool&op=view_assignments&roster_id=${s.roster_id}&week_start=${this.weekStart}"
          >
            ${r?.name ?? "Roster #" + s.roster_id}
          </a>
          ${r?.branch_name ? html`<small class="text-muted"> · ${r.branch_name}</small>` : nothing}
        </span>
        ${s.location
          ? html`<span class="srg-my-shift-location text-muted">
              <i class="fa fa-map-marker" aria-hidden="true"></i> ${s.location}
            </span>`
          : nothing}
        <span class="srg-my-shift-status badge">${STATUS_LABELS[s.status] ?? s.status}</span>
        <a
          class="btn btn-default btn-xs"
          href="?class=${getClass()}&method=tool&op=manage_swaps&roster_id=${s.roster_id}"
          title="Request swap on this roster"
        >
          <i class="fa fa-exchange" aria-hidden="true"></i> Swap
        </a>
        <button
          type="button"
          class="btn btn-default btn-xs"
          ?disabled=${this.dropping === s.assignment_id}
          @click=${() => this.requestDrop(s)}
          title="Drop this shift"
        >
          <i class="fa fa-times" aria-hidden="true"></i>
          ${this.dropping === s.assignment_id ? "Dropping…" : "Drop"}
        </button>
      </li>
    `;
  }

  private renderDropModal(s: MyShift) {
    const r = this.rosterById(s.roster_id);
    return html`
      <div
        class="modal show staff-roster-modal-open"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        style="display: block;"
        @click=${(e: MouseEvent) => {
          if ((e.target as HTMLElement).classList.contains("modal")) this.cancelDrop();
        }}
      >
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h1 class="modal-title">Drop this shift?</h1>
              <button type="button" class="btn-close" aria-label="Close" @click=${() => this.cancelDrop()}></button>
            </div>
            <div class="modal-body">
              <p>
                Drop your shift on
                <strong>${formatLongDate(s.assignment_date)}</strong>,
                <strong>${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}</strong>
                (${r?.name ?? "Roster #" + s.roster_id})?
              </p>
              <p class="text-muted">
                The slot will be re-opened for someone else to claim. If you
                need a one-for-one trade instead, use Swap.
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-danger" @click=${() => void this.confirmDrop()}>
                <i class="fa fa-times"></i> Drop shift
              </button>
              <button type="button" class="btn btn-default" @click=${() => this.cancelDrop()}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show staff-roster-modal-backdrop"></div>
    `;
  }
}
