# African Language Expansion

These requested languages are included in the language expansion, preserving all existing languages and avoiding duplicates. Arabic was already present; the final selector contains 31 unique languages. See [LANGUAGE_REVIEW.md](LANGUAGE_REVIEW.md) for implementation, validation and remaining translation review.

- Arabic (`ar`)
- Swahili (`sw`)
- Hausa (`ha`)
- Yoruba (`yo`)
- Zulu (`zu`)
- Amharic (`am`)
- Somali (`so`)
- Lingala (`ln`)

Requirements:
- Add each to the language selector and existing translation architecture across supported pages.
- Preserve UTF-8 and existing translations.
- Arabic must support RTL layout correctly.
- Do not alter SAFE/REAL, trading, wallet, simulator, or security logic.
- Verify navigation, fallback, and language switching.
- Check for untranslated interface strings before merge.
