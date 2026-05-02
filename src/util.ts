export function isoMonday(d: Date): string {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  return m.toISOString().slice(0, 10);
}

export function getClass(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("class") ?? "";
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const FULL_DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export function formatLongDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${FULL_DAY_NAMES[d.getDay()]}, ${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}
