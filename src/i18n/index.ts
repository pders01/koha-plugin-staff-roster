// Minimal i18n shim shared by every Lit component in the plugin.
// English source string is the lookup key; missing keys fall through to the
// original so partial translations stay legible.
//
// The German dictionary is baked into the bundle (no async fetch). Locale
// is read once from <html lang> at module load — Koha sets this from the
// staff intranet language preference, so the choice mirrors the TT side.

import { de } from "./de.js";

type Dict = Readonly<Record<string, string>>;

const DICTS: Readonly<Record<string, Dict>> = { de };

function detectLang(): string {
  const raw = (typeof document !== "undefined" && document.documentElement.lang) || "en";
  // 'de-DE' / 'de-AT' / etc. all use the de dict.
  return raw.toLowerCase().split(/[-_]/)[0] ?? "en";
}

const ACTIVE: Dict = DICTS[detectLang()] ?? {};

/** Translate `key` (English source) using the active locale dict. */
export function __(key: string): string {
  return ACTIVE[key] ?? key;
}
