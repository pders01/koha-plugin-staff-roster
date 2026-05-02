import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import {
  fetchMyOpenSlots,
  selfClaim,
  type OpenSlots,
  type Opening,
} from "../api.js";
import { formatLongDate, isoMonday, shiftDate } from "../util.js";

@customElement("open-shifts-list")
export class OpenShiftsList extends LitElement {
  @property({ type: String, attribute: "week-start" }) weekStart = "";

  @state() private data: OpenSlots | null = null;
  @state() private error = "";
  @state() private loading = false;
  @state() private claiming: number | null = null; // openingKey of in-flight claim
  @state() private successMsg = "";
  @state() private pendingClaim: Opening | null = null;

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

  private groupByDate(): { date: string; openings: Opening[] }[] {
    const map = new Map<string, Opening[]>();
    for (const o of this.data?.openings ?? []) {
      const list = map.get(o.assignment_date);
      if (list) list.push(o);
      else map.set(o.assignment_date, [o]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, openings]) => ({ date, openings }));
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
      this.successMsg = `Claimed ${o.roster_name} on ${o.assignment_date}.`;
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

  override render() {
    if (this.loading && !this.data) {
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
          ? html`<p class="text-muted">No open shifts available this week.</p>`
          : html`
              <ul class="list-group">
                ${repeat(
                  groups,
                  (g) => g.date,
                  (g) => html`
                    <li class="list-group-item">
                      <h4 class="srg-day-heading">${formatLongDate(g.date)}</h4>
                      <ul class="list-unstyled">
                        ${g.openings.map((o) => this.renderOpening(o))}
                      </ul>
                    </li>
                  `,
                )}
              </ul>
            `}
      </section>

      ${this.pendingClaim ? this.renderClaimModal(this.pendingClaim) : nothing}
    `;
  }

  private renderClaimModal(o: Opening) {
    return html`
      <div
        class="modal show staff-roster-modal-open"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        style="display: block;"
        @click=${(e: MouseEvent) => {
          if ((e.target as HTMLElement).classList.contains("modal")) this.cancelClaim();
        }}
      >
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h1 class="modal-title">Claim this shift?</h1>
              <button type="button" class="btn-close" aria-label="Close" @click=${() => this.cancelClaim()}></button>
            </div>
            <div class="modal-body">
              <p>
                Claim
                <strong>${formatLongDate(o.assignment_date)}</strong>,
                <strong>${o.start_time.slice(0, 5)}–${o.end_time.slice(0, 5)}</strong>
                on <strong>${o.roster_name}</strong>?
              </p>
              ${o.location
                ? html`<p class="text-muted"><i class="fa fa-map-marker" aria-hidden="true"></i> ${o.location}</p>`
                : nothing}
              <p class="text-muted">
                You'll be added to the roster immediately. Drop the shift later
                from "My shifts" if plans change.
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" @click=${() => void this.confirmClaim()}>
                <i class="fa fa-hand-paper-o"></i> Claim shift
              </button>
              <button type="button" class="btn btn-default" @click=${() => this.cancelClaim()}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show staff-roster-modal-backdrop"></div>
    `;
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
        <span class="srg-my-shift-status badge">${o.capacity_remaining} open</span>
        <button
          type="button"
          class="btn btn-primary btn-xs"
          ?disabled=${busy}
          @click=${() => this.requestClaim(o)}
        >
          <i class="fa fa-hand-paper-o" aria-hidden="true"></i>
          ${busy ? "Claiming…" : "Claim"}
        </button>
      </li>
    `;
  }

  private dateHash(iso: string): number {
    return Number(iso.replaceAll("-", ""));
  }
}
