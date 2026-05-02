import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  fetchMyWeek,
  selfUnclaim,
  type MyShift,
  type MyWeek,
  type MyWeekRoster,
} from "../api.js";
import { formatLongDate, getClass, isoMonday, shiftDate } from "../util.js";
import { renderWeekToolbar } from "./shared/toolbar.js";
import { renderToasts } from "./shared/toasts.js";
import { renderModalShell } from "./shared/modal.js";
import { groupByDate, renderDayGroups } from "./shared/day-groups.js";
import { EscapeController } from "./shared/escape-controller.js";
import { __ } from "../i18n/index.js";
import { STATUS_LABELS } from "../labels.js";

@customElement("my-shifts-list")
export class MyShiftsList extends LitElement {
  @property({ type: String, attribute: "week-start" }) weekStart = "";

  @state() private week: MyWeek | null = null;
  @state() private error = "";
  @state() private loading = false;
  @state() private dropping: number | null = null;
  @state() private successMsg = "";
  @state() private pendingDrop: MyShift | null = null;

  constructor() {
    super();
    new EscapeController(
      this,
      () => this.pendingDrop !== null,
      () => this.cancelDrop(),
    );
  }

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
      this.successMsg = __("Shift dropped.");
      setTimeout(() => (this.successMsg = ""), 4000);
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.dropping = null;
    }
  }

  override render() {
    if (this.loading && !this.week) {
      return html`<div class="text-center text-muted py-4">${__("Loading…")}</div>`;
    }

    const groups = groupByDate(
      this.week?.shifts ?? [],
      (s) => s.assignment_date,
    );

    return html`
      ${renderToasts({
        successMsg: this.successMsg,
        error: this.error,
        onDismissError: () => (this.error = ""),
      })}

      ${renderWeekToolbar({
        weekStart: this.weekStart,
        onShift: (d) => this.shiftWeek(d),
        onRefresh: () => void this.refresh(),
      })}

      ${renderDayGroups({
        groups,
        emptyText: __("No shifts scheduled this week."),
        renderItem: (s) => this.renderShift(s),
      })}

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
            ${r?.name ?? __("Roster #") + s.roster_id}
          </a>
          ${r?.branch_name ? html`<small class="text-muted"> · ${r.branch_name}</small>` : nothing}
        </span>
        ${s.location
          ? html`<span class="srg-my-shift-location text-muted">
              <i class="fa fa-map-marker" aria-hidden="true"></i> ${s.location}
            </span>`
          : nothing}
        <span class="srg-my-shift-status badge">${STATUS_LABELS()[s.status] ?? s.status}</span>
        <span class="srg-my-shift-actions">
          <a
            class="btn btn-default btn-xs"
            href="?class=${getClass()}&method=tool&op=manage_swaps&roster_id=${s.roster_id}"
            title="${__("Request swap on this roster")}"
          >
            <i class="fa fa-exchange" aria-hidden="true"></i> ${__("Swap")}
          </a>
          <button
            type="button"
            class="btn btn-default btn-xs"
            ?disabled=${this.dropping === s.assignment_id}
            @click=${() => this.requestDrop(s)}
            title="${__("Drop this shift")}"
          >
            <i class="fa fa-times" aria-hidden="true"></i>
            ${this.dropping === s.assignment_id ? __("Dropping…") : __("Drop")}
          </button>
        </span>
      </li>
    `;
  }

  private renderDropModal(s: MyShift) {
    const r = this.rosterById(s.roster_id);
    return renderModalShell({
      title: __("Drop this shift?"),
      onCancel: () => this.cancelDrop(),
      body: html`
        <p>
          ${__("Drop your shift on")}
          <strong>${formatLongDate(s.assignment_date)}</strong>,
          <strong>${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}</strong>
          (${r?.name ?? __("Roster #") + s.roster_id})?
        </p>
        <p class="text-muted">
          ${__("The slot will be re-opened for someone else to claim. If you need a one-for-one trade instead, use Swap.")}
        </p>
      `,
      footer: html`
        <button type="button" class="btn btn-danger" @click=${() => void this.confirmDrop()}>
          <i class="fa fa-times"></i> ${__("Drop shift")}
        </button>
        <button type="button" class="btn btn-default" @click=${() => this.cancelDrop()}>
          ${__("Cancel")}
        </button>
      `,
    });
  }
}
