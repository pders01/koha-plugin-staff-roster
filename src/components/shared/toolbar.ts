import { html, nothing, type TemplateResult } from "lit";

export type WeekToolbarOpts = {
  weekStart: string;
  onShift: (days: number) => void;
  onRefresh: () => void;
  /** Extra control(s) rendered between the week label and the Refresh
   *  button — used by the schedule grid to mount its Undo button. */
  extras?: TemplateResult | typeof nothing;
};

export function renderWeekToolbar(opts: WeekToolbarOpts): TemplateResult {
  const { weekStart, onShift, onRefresh, extras } = opts;
  return html`
    <div class="btn-toolbar srg-toolbar" role="toolbar">
      <div class="btn-group" role="group">
        <button class="btn btn-default btn-sm" @click=${() => onShift(-7)}>
          <i class="fa fa-arrow-left" aria-hidden="true"></i> Previous
        </button>
        <button class="btn btn-default btn-sm" @click=${() => onShift(7)}>
          Next <i class="fa fa-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
      <span class="srg-week-label">Week of ${weekStart}</span>
      ${extras ?? nothing}
      <div class="btn-group" role="group">
        <button class="btn btn-default btn-sm" @click=${() => onRefresh()}>
          <i class="fa fa-refresh" aria-hidden="true"></i> Refresh
        </button>
      </div>
    </div>
  `;
}
