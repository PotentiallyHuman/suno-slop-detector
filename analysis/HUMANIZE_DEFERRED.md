# Humanize — status (v0.4.1, 2026-06-04)

WIRED IN (shipped): the data-vetted **word/phrase** swap catalogs are now used by one-click
Humanize (`src/humanize.js` + `app/humanize.js`):
- `adjstack_swaps.js`  → swap a flagged stock adjective (fading/empty/burning/midnight…)
- `ingverb_swaps.js`   → swap a flagged `-ing` emotional verb (chasing/holding/dancing…)
- `prepphrase_swaps.js`→ meter-matched swap of "in the dark/rain/cold/morning/silence"
- `rhyme_index.js`     → rhyme-PRESERVING concrete end-word for feeling-word line endings
Plus the prior structural fixes (dedup, filler-line cut, throwaway-opener strip).
Load order: catalogs load after `perspectives.browser.js` (which defines `Prosody`) and before
`humanize.js`, in `src/popup.html`, `app/index.html`, and `mobile/build_www.py` JS_ORDER.

DECISION (user, 2026-06-04): **word/phrase swaps only.** One-click Humanize must NOT replace a
whole line (that changes the writer's meaning) — honors the survey's final RULE OF THUMB. So:
- `replacement_catalog.js` (whole-line replacement) is **intentionally NOT shipped/wired**; it
  stays in `analysis/` for a possible future OPT-IN "suggestion mode" (show "try this line", never auto-apply).
- Vague / personification / cliché-LINE / simile features (survey items 1-4) and wall-to-wall
  imagery (item 12) are **transparent-only**: flagged in the panel, never auto-edited.
- Transparent-only words honored in code: heart, soul, forever, neon, shadow (item 6/10), plus
  data-neutral adjectives shattered/broken/endless and "in the night".

STILL DEFERRED (needs full focus / future): the whole-line **suggestion mode** above, and the
v5 LLM rewriter for Part B (add a place / a turn / dialogue — content the on-device pass can't invent).
Tests: `node build/_test_humanize.js` (27 assertions) + `node build/_redteam.js` (11/11).
