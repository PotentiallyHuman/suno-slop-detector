# Handoff prompt — build the "Humanize" magic-editor (paste into a fresh Claude)

> Copy everything below the line into a new Claude Code conversation. It is self-contained — it does
> not rely on any prior chat context.

---

You are picking up a shipped, working project and adding one feature. Work only from what's written
here plus what you find in the repo. Do NOT retrain the model or touch the scoring logic.

## Project
`~/projects/28_suno_slop_detector` — a local git repo (MIT, framework-free plain JS, no build step).
It contains a browser extension AND a standalone PWA. You're working on the **PWA** in `app/`:
"Lyric Humanizer" — a phone/desktop web app where the user pastes lyrics, presses **"How AI?"**, and
gets a 0–100% "how AI does this read" score plus a craft-feedback panel (5 ✅ keep · 1 🃏 try · 5 ⚠️
work-on). Everything runs **100% on-device, text-only, offline — no LLM, no network**. Serve it with
`app/serve.sh` (python http.server on :8088).

## The feature to build: a "Humanize" button
Add a **Humanize** button next to the existing **Clear** button in the app. Behaviour:
- Each click **edits the pasted lyrics in the textarea** to apply ONE feedback suggestion, making the
  text read **more human / less AI**, then re-scores and shows the drop (e.g. "Applied: removed a
  repeated line · 82% → 76% AI"). Clicking again applies the next fix. Repeat until the score is low.
- Keep an **Undo** (the button should be reversible — stash the previous text each click).
- It must NEVER turn the lyric into nonsense. Edits are conservative and reversible.

This is the consumer-facing version of using the detector as its own critic: the panel's localized
suggestions become deterministic edits.

## How the engine works (already built — just call it)
The app loads these globals (see `app/index.html` <script> order, mirrored from the extension):
- `SlopV2.score(text)` → `{ score, pAI, instrumental, dense, denseNames, contributions, ... }`.
  `score` = 0–100 (round of P(AI)). `contributions` = array of `{name, kind:'dense'|'word', value,
  std, weight, contrib}` sorted by |contrib| — positive contrib = pushing toward AI.
- `SlopPanel.build(text, scoreResult)` → `{ good:[{label,quote}], joker:{text}, bad:[{feature,
  label, quote, fix, weight, contrib}] }`. **`bad[i].feature`** is the dense-feature id that fired
  (e.g. `s_dupLinesTotal`, `lex_cliche`, `t4_poet_stockImagery`) — dispatch your edits on this.
- `SlopScore.stripSectionLabels(text)`, `SlopScore.verdict(score)`.
- `Prosody` (rhyme/syllable primitives) and `SlopPerspectives.analyze(text)` (the 6 craft lenses)
  are available too — useful for rhyme-aware edits.

## ⚠️ PREREQUISITE (do this first — the app is currently scoring wrong)
v0.3 added the perspective engine. `app/sync_engine.sh` copies 9 files but is **missing
`perspectives.browser.js`**, so in the app `SlopPerspectives` is undefined and the model's 55 `t4_*`
features are computed as 0 → wrong scores. Fix:
1. In `app/sync_engine.sh`, also `cp "$SRC/ext/perspectives.browser.js" "$DST/ext/perspectives.browser.js"`.
2. Run `bash ../build/build_perspectives.js`? No — run `node build/build_perspectives.js` from repo
   root first (rebuilds `src/ext/perspectives.browser.js`), then `bash app/sync_engine.sh`.
3. In `app/index.html`, add `<script src="engine/ext/perspectives.browser.js"></script>` in load
   order **after** `tier3.browser.js` and **before** `model.js`/`v2-engine.js` (same order as the
   extension manifest). Verify: open the app, paste a real Suno lyric → it should score ~high (≈90s);
   a human classic should score low. (Sanity targets: Bohemian Rhapsody ~0%, a real Suno song ~98%.)

## The edits (two classes)
Build `app/humanize.js` exposing `Humanize.next(text) → { text, label, applied:bool }` that picks the
single highest-impact **applicable mechanical** transform and returns the edited text. Mechanical =
pure-deterministic, offline, safe. Map them to the `bad[i].feature` ids / panel signals:

| feature / signal | edit |
|---|---|
| `s_dupLinesTotal`, `s_consecDupLines`, `s_maxConsecDup`, `f_repetition`, `s_hookMaxRepeat` | find a verbatim-repeated line; remove one duplicate OR change one word in the last repeat |
| `s_vocableLines`, `s_vocables` | delete a line that's mostly vocable filler (na-na/oh-oh/la-la) |
| `lex_cliche`, `f_clicheDensity`, `t4_poet_stockImagery` | replace a stock cliché word (neon/shadow/ember/crimson…) with a plainer/concrete synonym from a small built-in table |
| `lex_rhyme`, `f_perfectRhymeRatio`, `f_endRhymeRate` | break one perfect end-rhyme — swap the rhyming end-word for a near-synonym that slant-rhymes (use `Prosody.rhymeKey`/`eyeRhyme`) |
| `t4_poet_imageDensity`, `t4_poet_senseDiversity` (AI over-imagery) | cut the most image-stacked line (lots of sensory/cliché nouns) |
| `s_abstractEnding` | for a line ending on a feeling-word, you may drop the line (don't fabricate) |

**CREATIVE fixes need generation — DO NOT fake them in v1** (e.g. "name the place", "add a turn",
"add a concrete detail" — `t4_story_namedEntities`, `t4_story_setting`, `f_properNounDensity`). For
v1, skip these (mechanical-only). Optionally, leave a clearly-marked hook to plug a qwen/local-LLM or
a user fill-in slot later — but v1 ships mechanical-only and works fully offline.

## Loop logic (in `app/app.js`)
On Humanize click: `sc = SlopV2.score(text); panel = SlopPanel.build(text, sc)`. Walk `panel.bad`
(highest contrib first); for each, ask `Humanize` for a mechanical transform that applies to that
feature; apply the FIRST that changes the text. Re-score, update the meter + panel, and show a small
toast "Applied: {label} · {old}% → {new}% AI". If no mechanical fix applies (clean, or only creative
fixes remain) show "Nothing safe left to auto-fix — the rest needs your words" and stop. Keep an undo
stack.

## Files to touch
- `app/humanize.js` (new) — the transform library + `Humanize.next(text)`.
- `app/index.html` — add the Humanize + Undo buttons + the perspectives.browser.js script.
- `app/app.js` — wire the buttons (reuse the existing `analyse()`; add `humanize()` + `undo()`).
- `app/app.css` — style the buttons (match Clear).
- `app/sw.js` — bump the `CACHE` version string so the PWA updates.
- `app/sync_engine.sh` — add perspectives.browser.js (the prerequisite).
- After app/ edits, re-sync the Capacitor wrapper: `python3 mobile/build_www.py` then overwrite
  `mobile/android/app/src/main/assets/public/index.html` (see project memory for the WebView
  single-file inline gotcha) — only if you also want the Android build refreshed.

## Constraints (hard)
- Pure JS, **offline, no network, no eval, no innerHTML** (build DOM with APIs — the existing app
  already does; match it). No telemetry.
- Edits must be **safe + reversible** and never produce gibberish. Prefer deletion/swap over
  invention. When unsure, skip the edit.
- Do not modify the trained model or scoring engine. Humanize only *transforms text and re-scores*.

## Acceptance test
Paste a cliché-heavy AI sample (e.g. "In the shadows of the night I feel my broken heart / The echoes
of my pain are fading in the dark / Shattered dreams and endless crimson light"). Click Humanize
repeatedly: the AI% should drop several clicks in a row, each edit visibly sensible (a removed
duplicate, a swapped cliché, a broken rhyme), the lyric stays readable, and Undo restores the prior
text. A real human song should have few/zero mechanical fixes available ("nothing safe left").

## Reference pointers
- Engine + panel: `src/ext/v2-engine.js`, `src/ext/v2-panel.js` (FEATURE_INFO maps feature→label/fix;
  buildBad pushes `{feature,label,quote,fix}`). Primitives: `analysis/prosody.js`,
  `analysis/eye_rhymes.js`. Lenses: `analysis/perspectives/*.js`.
- Design notes for the perspective system + this Humanize idea + the v5 detector-as-critic concept:
  `analysis/perspectives/DESIGN_AND_CALIBRATION.md`.
- This is "after v4" in the roadmap, but it can be built independently on the current v0.3 engine.
</content>
