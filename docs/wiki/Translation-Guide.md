# Translation Guide

The plugin ships English (the source) and German. Adding a new
locale is a one-file commit on each side (Perl + JS).

## How translation works

- Every user-facing string is wrapped at the call site with
  `tr('English source')` (TT / Perl) or `__("English source")`
  (Lit / TypeScript).
- The English string is the lookup key. Missing keys fall through
  to English, so a partial translation is always usable.
- The dictionary lives at
  `Koha/Plugin/Xyz/Paulderscheid/StaffRoster/locales/<lang>.json`
  as a flat `{ "English": "Translated" }` map.
- `Lib/I18N.pm` reads it from disk on first use of the language
  and caches per worker.
- `src/i18n/<lang>.ts` re-exports the same JSON; vite inlines it
  into the bundle.
- The active language comes from
  `C4::Languages::getlanguage` (Perl) and
  `document.documentElement.lang` (browser). Both are normalised to
  the two-letter prefix, so `de-DE` and `de-AT` both load `de.json`.

## Add a new locale

Pretend we're adding French.

### 1. Create the dictionary

```bash
cp Koha/Plugin/Xyz/Paulderscheid/StaffRoster/locales/de.json \
   Koha/Plugin/Xyz/Paulderscheid/StaffRoster/locales/fr.json
```

Translate every value in `fr.json`. Keep keys exactly as they are
— they're the English source strings the code looks up. Don't
reorder; diff readability matters when the dict grows.

A few translation patterns worth imitating from `de.json`:

- Punctuation belongs in the **value**. The English key
  `"Cancel:"` translates to `"Annuler :"` (French uses a space
  before the colon). Don't strip the colon out of the call site.
- Placeholder tokens like `NAME` in
  `"Delete roster type 'NAME'?"` stay in the value verbatim:
  `"Supprimer le type de planning 'NAME' ?"`. The TT
  `[% ... | replace('NAME', x) %]` filter handles the
  substitution.
- Markers like `<<token>>` inside notice templates aren't part of
  the i18n dictionary — they're substituted by `C4::Letters`. Edit
  the notice under **Tools → Notices & Slips** instead.

### 2. Re-export it on the JS side

Create `src/i18n/fr.ts`:

```ts
import dict from "../../Koha/Plugin/Xyz/Paulderscheid/StaffRoster/locales/fr.json";

export const fr: Readonly<Record<string, string>> = dict;
```

Then register it in `src/i18n/index.ts`:

```ts
import { de } from "./de.js";
import { fr } from "./fr.js";

const DICTS: Readonly<Record<string, Dict>> = { de, fr };
```

### 3. Rebuild + test

```bash
bun run build
```

Set the staff intranet language to French (under your patron
preferences) and visit any plugin page. Every wrapped string
flips to French; anything still in English is a missing key.

### 4. Audit coverage

To find untranslated strings, grep for the English source and
diff against your locale's keys:

```bash
# Pull English keys actually used in TT
grep -rhoE "tr\('[^']+'\)" Koha/Plugin/Xyz/Paulderscheid/StaffRoster/*.tt | sort -u

# Compare to your fr.json keys
jq -r 'keys[]' Koha/Plugin/Xyz/Paulderscheid/StaffRoster/locales/fr.json | sort -u
```

Anything in the first list but not the second falls back to
English.

## Extending the dictionary

When you add a new user-facing string in code, add the matching
entry to **every** locale file. Missing keys silently fall through
to English — that's friendly to ship, but it means a partial
translation will mix languages on screen if you forget.

Convention: alphabetise within each thematic block of the JSON
(common, configure, admin, tool, lit-grid, self-service). Reduces
merge churn.

## Translating the email reminder

The `STAFFROSTER`/`REMINDER` letter template ships in English. To
provide a translated version, create a per-language row in the
`letter` table via Koha's normal localisation flow:

**Tools → Notices & Slips → STAFFROSTER → REMINDER → New for…**

Pick the language code, fill in the localised title and content
(use the same `<<token>>` substitution markers), save. The cron
runner picks the right row at send time via Koha's standard
language matching.

## Style notes

- Stay terse where the English is terse. Don't expand `Save` to
  `Sauvegarder les modifications` if the English is one word.
- Match Koha's own translation choices when in doubt — patrons
  see Koha's vocabulary already, the plugin shouldn't reinvent it.
- Test the long phrasings on narrow screens. Some German
  compound words push table headers wider than the English; pick
  shorter synonyms there or add CSS later.
