import { html, nothing, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { formatLongDate } from "../../util.js";

export type DayGroup<T> = { date: string; items: T[] };

export function groupByDate<T>(
  rows: T[],
  dateOf: (item: T) => string,
): DayGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const d = dateOf(r);
    const list = map.get(d);
    if (list) list.push(r);
    else map.set(d, [r]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));
}

export type DayGroupsRenderOpts<T> = {
  groups: DayGroup<T>[];
  emptyText: string;
  renderItem: (item: T) => TemplateResult;
};

export function renderDayGroups<T>(opts: DayGroupsRenderOpts<T>): TemplateResult {
  const { groups, emptyText, renderItem } = opts;
  return html`
    <section class="page-section">
      ${groups.length === 0
        ? html`<p class="text-muted">${emptyText}</p>`
        : html`
            <ul class="list-group">
              ${repeat(
                groups,
                (g) => g.date,
                (g) => html`
                  <li class="list-group-item">
                    <h4 class="srg-day-heading">${formatLongDate(g.date)}</h4>
                    <ul class="list-unstyled">
                      ${g.items.map((it) => renderItem(it))}
                    </ul>
                  </li>
                `,
              )}
            </ul>
          `}
    </section>
  `;
}

export { nothing };
