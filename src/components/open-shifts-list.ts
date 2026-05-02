import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  fetchMyOpenSlots,
  selfClaim,
  type OpenSlots,
  type Opening,
} from "../api.js";
import { formatLongDate, isoMonday, shiftDate } from "../util.js";
import { renderWeekToolbar } from "./shared/toolbar.js";
import { renderToasts } from "./shared/toasts.js";
import { renderModalShell } from "./shared/modal.js";
import { groupByDate, renderDayGroups } from "./shared/day-groups.js";
import { EscapeController } from "./shared/escape-controller.js";
import { __ } from "../i18n/index.js";

@customElement("open-shifts-list")
export class OpenShiftsList extends LitElement {
  @property({ type: String, attribute: "week-start" }) weekStart = "";

  @state() private data: OpenSlots | null = null;
  @state() private error = "";
  @state() private loading = false;
  @state() private claiming: number | null = null;
  @state() private successMsg = "";
  @state() private pendingClaim: Opening | null = null;

  constructor() {
    super();
    new EscapeController(
      this,
      () => this.pendingClaim !== null,
      () => this.cancelClaim(),
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
      this.data = await fetchMyOpenSlots(this.weekStart);
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

  private requestClaim(o: Opening): void {
    this.pendingClaim = o;
  }

  private cancelClaim(): void {
    this.pendingClaim = null;
  }

  private async confirmClaim(): Promise<void> {
    const o = this.pendingClaim;
    if (!o) return;
    this.pendingClaim = null;
    const key = this.openingKey(o);
    this.claiming = key;
    this.error = "";
    try {
      await selfClaim({ slot_id: o.slot_id, assignment_date: o.assignment_date });
      this.successMsg = `${__("Claimed")} ${o.roster_name} ${__("on")} ${o.assignment_date}.`;
      setTimeout(() => (this.successMsg = ""), 4000);
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.claiming = null;
    }
  }

  private openingKey(o: Opening): number {
    return o.slot_id * 1_000_000_00 + this.dateHash(o.assignment_date);
  }

  private dateHash(iso: string): number {
    return Number(iso.replaceAll("-", ""));
  }

  override render() {
    if (this.loading && !this.data) {
      return html`<div class="text-center text-muted py-4">${__("Loading…")}</div>`;
    }

    const groups = groupByDate(
      this.data?.openings ?? [],
      (o) => o.assignment_date,
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
        emptyText: __("No open shifts available this week."),
        renderItem: (o) => this.renderOpening(o),
      })}

      ${this.pendingClaim ? this.renderClaimModal(this.pendingClaim) : nothing}
    `;
  }

  private renderClaimModal(o: Opening) {
    return renderModalShell({
      title: __("Claim this shift?"),
      onCancel: () => this.cancelClaim(),
      body: html`
        <p>
          ${__("Claim")}
          <strong>${formatLongDate(o.assignment_date)}</strong>,
          <strong>${o.start_time.slice(0, 5)}–${o.end_time.slice(0, 5)}</strong>
          ${__("on")} <strong>${o.roster_name}</strong>?
        </p>
        ${o.location
          ? html`<p class="text-muted"><i class="fa fa-map-marker" aria-hidden="true"></i> ${o.location}</p>`
          : nothing}
        <p class="text-muted">
          ${__("You'll be added to the roster immediately. Drop the shift later from My shifts if plans change.")}
        </p>
      `,
      footer: html`
        <button type="button" class="btn btn-primary" @click=${() => void this.confirmClaim()}>
          <i class="fa fa-hand-paper-o"></i> ${__("Claim shift")}
        </button>
        <button type="button" class="btn btn-default" @click=${() => this.cancelClaim()}>
          ${__("Cancel")}
        </button>
      `,
    });
  }

  private renderOpening(o: Opening) {
    const key = this.openingKey(o);
    const busy = this.claiming === key;
    return html`
      <li class="srg-my-shift">
        <span
          class="staff-roster-type-swatch"
          style="background-color: ${o.type_color};"
          aria-hidden="true"
        ></span>
        <span class="srg-my-shift-time">
          ${o.start_time.slice(0, 5)}–${o.end_time.slice(0, 5)}
        </span>
        <span class="srg-my-shift-roster">
          ${o.roster_name}
          ${o.branch_name ? html`<small class="text-muted"> · ${o.branch_name}</small>` : nothing}
        </span>
        ${o.location
          ? html`<span class="srg-my-shift-location text-muted">
              <i class="fa fa-map-marker" aria-hidden="true"></i> ${o.location}
            </span>`
          : nothing}
        <span class="srg-my-shift-status badge">${o.capacity_remaining} ${__("open")}</span>
        <button
          type="button"
          class="btn btn-primary btn-xs"
          ?disabled=${busy}
          @click=${() => this.requestClaim(o)}
        >
          <i class="fa fa-hand-paper-o" aria-hidden="true"></i>
          ${busy ? __("Claiming…") : __("Claim")}
        </button>
      </li>
    `;
  }
}
