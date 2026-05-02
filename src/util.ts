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

// Locale comes from the <html lang> attribute Koha sets per user
// preference; falls back to "en" so server-rendered tests stay stable.
function activeLocale(): string {
  return (typeof document !== "undefined" && document.documentElement.lang) || "en";
}

export function formatLongDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat(activeLocale(), {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
}
