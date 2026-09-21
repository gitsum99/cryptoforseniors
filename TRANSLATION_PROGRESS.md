# Translation expansion — work in progress

This branch is NOT ready for deployment. Do not describe this as a completed site-wide expansion.

## Implemented

- Homepage and Practice Mode: 17 additional draft translations, integrated with existing selectors.
- 13-wallet lab: all 40 text fields translated into the 17 additional languages and integrated. Buttons, results, safety notices and forensic explanations covered.
- Existing 15 translations preserved exactly. Total on these three pages: 32.
- Added de, ro, pl, sq, fi, is, pt, it, rm, tr, sw, ha, yo, zu, am, so, ln. Arabic already exists; Turkish was requested previously.
- Extra pack failure leaves the original 15 languages available.
- No trading, wallet, security, or simulation logic changed.

## Verified

Run `node tests/translations.cjs` from repository root. Tests use a lightweight DOM stub, not a browser.

- All 32 locales have nonempty entries and render on the two integrated pages.
- Language switching, localStorage persistence, Arabic/Persian direction, invalid-language fallback.
- Original translations unchanged against commit 97a880c.
- Local navigation and script paths resolve. No replacement characters in translated strings.
- `git diff --check` passes.
- `node tests/wallet-translations.cjs` passes: all 32 locales, 40 fields, controls, step-by-step numerical-state comparison with the original, full run, reset, reveal, switching, RTL and fallback. Simulation source is unchanged (ignoring final file newline). These are DOM-stub tests, not browser tests.

## Remaining before merge

- Translate and integrate simulator, AI, Security, Launchpad and TROIL.
- Test cross-page language retention: pages not expanded currently fall back to English and overwrite the saved preference.
- Review translations with fluent speakers, particularly Romansh, Hausa, Yoruba, Zulu, Amharic, Somali and Lingala. Draft wording must not be treated as professionally verified.
- Browser/mobile/RTL visual testing, complete simulator interaction tests and safety regression tests.
- The existing simulator appears to use off-by-one label/status translation indices; confirm and repair presentation-only mappings without changing calculations.
- Recheck current main before merging; this checkpoint is based on 97a880cd8128b908da226a9aa8513503f25a0f7b.
- Verify deployment after completed changes are merged.
