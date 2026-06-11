# Handoff — roll out the on-device freestyle humanizer (paste the block below into a NEW chat)

---

Finish rolling out the new on-device "humanizer" across all surfaces of my Suno Slop Detector, then verify it the RIGHT way — by interaction-auditing, not by glancing at the output. The generator is built, quality-tested (99% grammar-clean, 100% rhyme, cliché-free), and its per-click logic is bug-fixed + interaction-audited. It's wired into the PWA but NOT the two browser extensions or the phone app — and the phone still runs an OLD broken version that swaps lines for garbage.

## Read first
- Project: `/home/potentiallyhumanspark/projects/28_suno_slop_detector`
- Memory (full design, files, status, gotchas): `knowledge/projects/project_28_humanizer_v2_freestyle.md`
- Reference wiring: `app/app.js` — `humanize()` calls `HumanizeFreestyle.humanizeOne`, `rewrite()` calls `humanizeHalf`, with an `aiScore` helper. `app/index.html` — script load order + the two buttons "Humanize Line" / "Humanize Rewrite".

## The humanizer (already built, in `app/engine/ext/`)
- `humanizer-gen.browser.js` → `globalThis.HumanizeFreestyle.humanizeOne(text, scoreFn)` (rebuild the 1 worst line, one per click) and `humanizeHalf(text, scoreFn)` (rebuild the worst half, keep the better half). `scoreFn(t)` = v8 AI score 0–100 = `SlopV8.scoreV8(t).score`.
- `humanizer_model.browser.js` (3.67 MB; MUST load before the gen). Pure on-device JS: no LLM, no network, no new permissions.

## Task (in order — interaction-audit + user-test after EACH)
1. **Chrome + Firefox extensions** (`src/` + popup): copy the 2 files into `src/ext/`; add to the load order (model before gen, after `v8-score.browser.js`) in `manifest.json` content_scripts and/or `src/popup.html`; repoint the popup's Humanize + Rewrite handlers to `humanizeOne`/`humanizeHalf` (mirror app/app.js, define a v8 `aiScore`); relabel buttons "Humanize Line"/"Humanize Rewrite". Rebuild via `build/package_chrome.sh` + `build/package.sh` (regenerates dist/{chrome,firefox} + zips; NEVER hand-edit dist). New feature → bump v0.7.0.
2. **Phone app** (`mobile/`): app.js + index.html are the SAME PWA layer (already wired). ADD the 2 files to `mobile/build_www.py`'s hardcoded `JS_ORDER` (after v8-score, before app.js) — **skip this and the APK ships without the humanizer (stale-bundle trap).** Then `python3 build_www.py` → `cap sync android` → `cd android && ./gradlew assembleRelease bundleRelease --no-daemon` (source `mobile/android_env.sh`; QEMU makes the x86 aapt2 run on aarch64 — the "can't build on ARM" claim is FALSE). Re-sideload via cloudflared QR (android-apk skill). The user's installed APK runs the OLD broken humanizer until this ships.
3. **Project 31 freestyle rapper** (`~/projects/31_talking_head_freestyle_rap`): carry the same quality shell (cliché-free vocab + whole-line POS-template grammar + completeness checks) into its `rap_backward_gen` — but a LOOSER grammar dial: rap bends grammar intentionally, so don't sand off the edge. Test separately.
4. Then: update CHANGELOG/README (+ reconcile HUMANIZE_DESIGN.md), comment the new code, git commit + push (user runs the push if it needs auth), submit Firefox AMO v0.7.0.

## How to verify (the important part — do NOT just look at the output)
**Dead-code check after EVERY surface** (this is the #1 thing that went wrong — scripts were loaded but handlers never repointed, so the whole feature was dead code):
- `grep -nE "HumanizeFreestyle|humanizeOne" <handler file>` → must be present.
- `grep -nE "Humanize\.runAll|RewriteV8\.rewrite" <handler file>` → must be GONE from the handlers.
- `unzip -p <built zip/apk> <inner bundle> | grep -c humanizeOne` → must be > 0.

**Interaction audit, not output audit:** for each surface, SIMULATE the full user flow — insert text, press each button repeatedly until done — and trace EVERY parameter through every function it touches: whole-song score in/out, per-line cliché count + per-line v8, the gate decision, convergence, did it throw, did it do NOTHING on an AI song. Ready harness: `/tmp/audit_interaction.js` (adapt paths). Test multiple REAL AI songs (corpus/ai_lyrics/) + edge cases (1-line, identical lines, empty, human-0%). FLAG: song score WORSENED on a press, non-convergence, returned null on an AI song, threw.
- Why this matters: the last bug was invisible to output testing — the generated lines were 99% clean, but pressing the button on certain real AI songs did NOTHING (the generator failed one rhyme and gave up). Only tracing the interaction caught it. "Auditing isn't asking how the output looks — it's asking what happens to every parameter when you insert the text and simulate a press, including the functions the audited code depends on and interacts with."

## Do NOT
- Break the published Chrome v0.6.0 (pending review) — the humanizer is an ADD; byte-diff-scope every change.
- Ship raw human lyrics — the model carries distilled stats only (no raw lines). Keep the full corpus locally until the app is published, then clear it.
- Use humanLean as a cliché filter (wrong signal — keeps "dream", drops "coffee"). The cliché blocklist is parsed from the detector's WORD_WEIGHTS/VAGUE_EMOTION.
- DevTools/JS-inject Suno (click-only). Enter payment / 2FA / passwords (the user does the $25 Play + identity + any auth'd git push).
- Trust exit codes — verify the built artifact actually contains the humanizer.

## Rebuild the model only if needed
`~/projects/19_suno_mastering/.venv/bin/python /tmp/export_model.py` (reads /tmp/human_lyrics_cache.json + GloVe + /tmp/humanness_table.json). Quality test: /tmp/gen3000.js → /tmp/analyze3000.py (expect ~99% grammar-clean / 100% rhyme / 98% syllable).
