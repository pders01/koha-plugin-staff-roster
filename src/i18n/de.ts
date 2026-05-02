// Direct re-export of the Perl-side dictionary so Lit components share
// one source of truth with the TT pages. Vite resolves the JSON import
// at build time, so the bundle always reflects whatever de.json holds.
//
// What this does NOT cover: a TT string that was added through tr(...)
// without a matching de.json key falls through to English silently.
// A future build-time check should grep tr('...') / __('...') call
// sites and assert every key is present in the dictionary.

import dict from "../../Koha/Plugin/Xyz/Paulderscheid/StaffRoster/locales/de.json";

export const de: Readonly<Record<string, string>> = dict;
