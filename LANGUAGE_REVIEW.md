# Language update — 20 September 2026

## Coverage

31 unique languages are available on the main site, AI, Security, Practice Mode,
Launchpad, TROIL, the simulator and the 13-wallet lab.

The original 15 languages and their translation dictionaries were preserved:
English, French, Spanish, Croatian, Filipino, Japanese, Simplified Chinese,
Traditional Chinese, Arabic, Norwegian, Swedish, Azerbaijani, Ukrainian, Dutch
and Persian.

16 languages were added: German (de), Romanian (ro), Polish (pl), Albanian (sq),
Finnish (fi), Icelandic (is), Portuguese (pt), Italian (it), Romansh (rm),
Swahili (sw), Hausa (ha), Yoruba (yo), Zulu (zu), Amharic (am), Somali (so)
and Lingala (ln). Arabic was already present and was not duplicated.

## Implementation

- All eight existing HTML pages load local translation assets. There is no
  translation-service call, credential or new network dependency at runtime.
- `assets/translations.js` contains the new dictionaries. Existing inline
  translations remain authoritative and are not replaced.
- `assets/i18n.js` supplies per-string English fallback, locale normalization,
  accessible selector labels, document language/direction, translated page
  titles and storage error handling. Regional codes such as de-DE resolve to de;
  unknown codes resolve to English. Arabic and Persian remain right-to-left.
- The simulator's off-by-one display lookups for wallet, BUY, SELL, HOLD and
  final-value labels were corrected. Its trade sequence and calculations remain
  unchanged. Rendering is separate from simulation execution.
- Changing languages in the lab repaints its current results, event log and
  revealed relationship clues without resetting or executing transactions.
- No changes were made to trading, wallet, security, SAFE/REAL configuration,
  deployment configuration or simulated market data.

## Validation

`tests/language-system.cjs` passed 6,472 assertions in headless Microsoft Edge.
It checks all 31 languages on all eight pages, unique selectors, translation
completeness, UTF-8, list structure, preservation of existing dictionary text,
navigation targets, actual main/practice/simulator/lab navigation, persistence,
regional/invalid locale handling, missing-string fallback, unavailable translation
data, disabled local storage, simulator tabs and absence of browser exceptions.

Both simulators' numeric state was compared against repository commit
`249fb3e29f70c6bfdf3231098ca10f2e97b1b45e`. Results matched. Full and partial lab
state remain unchanged during language switching. Protected calculation and
transaction functions are also compared against that baseline.

Arabic mobile and German desktop simulator screenshots were visually inspected.
`git diff --check` passed. This is a static HTML site; it has no existing package
build or test command. Inline JavaScript was syntax-checked, and the site was
served locally for browser tests.

To rerun, use Node.js with the `playwright` package available, Microsoft Edge
installed, and run `node tests/language-system.cjs`. Set `NODE_PATH` if Playwright
is provided by an external runtime. `CFS_BROWSER_CHANNEL` can select another
installed Playwright browser channel. The baseline commit must be available in
the clone. Optional `CFS_SCREENSHOTS` selects a screenshot output directory.

## Review still needed

The new text is draft translation, not professionally certified localization.
Fifteen new languages began with Google Translate drafts, with follow-up
corrections and explicit safety prohibitions. Romansh was drafted separately.
Fluent speakers should review every new language before publication, especially
Romansh, the African languages, technical terminology and all safety notices.
Automated completeness tests do not establish linguistic accuracy.

Product names/acronyms such as Crypto For Seniors, CFS, TROIL, Launchpad and NFT,
and wallet identifiers such as W1, may remain unchanged. Existing translations,
including their loanwords and abbreviated wording, are deliberately retained.
The original English TROIL slogan remains for existing languages that had no
translated slogan; new languages have a translated version. The repository's
strategy Markdown document is not part of the website UI and was not translated.

REAL-mode execution is not implemented in these static pages; no live trading,
wallet connection or funds were used in testing. The tests validate preservation
of the current code, not any external or future REAL-mode integration.

Changes are intended for review on the language branch before merging to main,
which triggers the site's existing GitHub Pages deployment.
