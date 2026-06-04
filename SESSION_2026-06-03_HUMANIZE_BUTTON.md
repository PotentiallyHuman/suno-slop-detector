# Session log — Humanize feature (2026-06-03)

Conversation record: building the **Humanize** button (the detector used as its own
critic) and shipping it to the PWA, the browser extension, the Android APK, and GitHub.

---

## Goal
Add a **Humanize** button next to Clear. Each click applies ONE conservative, reversible,
fully-offline edit that makes pasted lyrics read *less AI*, re-scores, and shows the drop.
Keep an Undo. Never produce gibberish. Mechanical-only in v1 (no generation).

## Outcome — DONE (committed to branch `v0.3.0-nonenglish-guard`, commit `f71a988`, pushed; NOT published to stores)

---

## 1. Prerequisite fix (the PWA was scoring wrong)
v0.3 added the perspective engine but `app/sync_engine.sh` never copied it, so
`SlopPerspectives` was undefined and the model's 55 `t4_*` features all computed as 0.
- `node build/build_perspectives.js` → `src/ext/perspectives.browser.js`
- added the `cp` line to `app/sync_engine.sh`; re-ran it
- added `<script src="engine/ext/perspectives.browser.js">` to `app/index.html`
  (after tier3, before model.js); also added it to `app/sw.js` ASSETS
- Verified: Bohemian Rhapsody → 3%, Suno-style sample → 97%.

## 2. `app/humanize.js` (new) — `Humanize.next(text)`
Walks the same `SlopPanel.build(text, sc).bad[]` the user sees (highest AI-contributor
first) and applies the first mapped MECHANICAL transform that lowers model confidence:

| feature ids | transform | what it does |
|---|---|---|
| s_dupLinesTotal / s_consecDupLines / s_hookMaxRepeat / f_repetition … | `removeDuplicateLine` | drop a verbatim repeated line |
| s_vocableLines / s_vocables | `deleteFillerLine` | cut a ≥60% na-na/oh-oh line |
| lex_cliche / f_clicheDensity / t4_poet_stockImagery | `replaceStockWord` | swap a model-flagged cliché word → plainer one |
| lex_rhyme / f_perfectRhymeRatio / f_endRhymeRate | `breakRhyme` | loosen a perfect end-rhyme to a slant near-synonym (`Prosody.rhymeKey`/eyeRhyme) |
| t4_poet_imageDensity / t4_poet_senseDiversity | `cutImageStackedLine` | delete the most image-stacked line |

Key decisions discovered by testing:
- **Guard = model `pAI` strictly decreases** (not the rounded %). The score is saturated/
  nonlinear, so many genuine cliché removals drop pAI without crossing an integer. Guarding
  on pAI keeps it cleaning through clichés; because % is monotonic in pAI, the displayed
  score can only **fall or hold, never rise**.
- **Removing lines can RAISE the score** on cliché-dense text (shorter text concentrates
  cliché density — the model rewards dilution), so dedup/filler-removal are correctly
  rejected by the guard in that regime; they help on non-saturated text.
- Each click returns `{text, label, feature, before, after, detail}`. `detail` is the
  concrete change ("neon → bright", "removed a repeated line") shown in a toast.
- Creative fixes (name a place, add a turn) are intentionally NOT faked.
- Edits only touch "lyric" lines; `[Section]` labels / blanks pass through untouched.

## 3. Word-table tuning (user feedback)
User asked: "does it replace words on the list? no more neon, shadow, humming, whispering?"
- Audit confirmed: **78 cliché words swapped out**, and a hard guard means **no replacement
  is ever itself on the model's `WORD_WEIGHTS` list** (0 collisions).
- User caught that some *replacement* words were still flowery (I had introduced "humming",
  "murmuring", "moonbeam", "glint", "glitter"). Plainened them:
  neon→bright, whisper→mutter, whispering→muttering, electric→buzzing,
  moonlight/starlight→evening, stardust→specks, glimmer/shimmer→shine,
  luminous/radiant→bright, cosmic→huge, wildfire→brushfire.

## 4. Wiring
- **PWA** (`app/`): Humanize + Undo buttons (`index.html`), `humanize()`/`undo()` + undo
  stack + toast (`app.js`), toast CSS (`app.css`), bumped `sw.js` CACHE → v2 + cached
  humanize.js & perspectives. Richer EXAMPLE (repeated-chorus cliché lyric that descends
  92→…→69% over several clicks).
- **Extension** (`src/`): copied `humanize.js`; wired Humanize + Undo into the popup's
  **"Paste any lyrics to test"** box only (`popup.html`/`popup.js`/`popup.css`). The
  **live-Suno-page panel stays READ-ONLY** — no page injection (ban-risk rule).
- Rebuilt `dist/chrome` + `dist/firefox` via `build/package_chrome.sh` + `build/package.sh`
  (both copy the whole `src/` tree → humanize.js flows in automatically).
- **APK**: fixed `mobile/build_www.py` — its hardcoded `JS_ORDER` was missing
  `perspectives.browser.js` AND `humanize.js`, so a naive rebuild would ship stale code.
  Then `npx cap sync android` + `./gradlew assembleRelease` → signed
  `app-release.apk` (verified Humanize bytes inside + signature CN=Lyric Humanizer).

## 5. APK delivery (temporary, then torn down)
Served `app/` via `python3 -m http.server` + `cloudflared` quick tunnel → QR (python
`qrcode`, opened on DISPLAY :1) pointing at `…/lyric-humanizer.apk`. User downloaded +
installed successfully. Then **fully torn down per user**: stopped tunnel + server,
deleted the served APK + QR images, verified the public URL returns 530 (no origin).
The built APK is kept locally at `mobile/android/app/build/outputs/apk/release/app-release.apk`.
Added `.gitignore` rules so `dist/android/*.apk/*.aab` native binaries can never be committed.

## 6. GitHub
Commit `f71a988` on branch `v0.3.0-nonenglish-guard`, pushed to
`github.com/PotentiallyHuman/suno-slop-detector`. Carefully excluded keystore/secrets
(`mobile/keystore`, `signing.properties`), `node_modules`, and the 12 MB prebuilt
APK/AAB binaries (all gitignored / not staged; dry-run audited before commit).

## 🚦 Publish gate (user, end of session)
Do **NOT** submit these versions to the Chrome/AMO stores until the model is **retrained
on more data**. That retrain is the next step and is **someone else's task**, not mine.
Version left at 0.3.0 (no bump). The APK on the user's phone has the pre-tuning word table.

## Verification (Node, using the exact bundled engine files)
- Built-in EXAMPLE: `neon→bright 92→88` · `shadows→corners 88` · `echoes→sounds 88→69` → then "Nothing safe left".
- Filler sample: cut filler ×2 + removed repeated line, 88→60.
- Human classics (Bohemian Rhapsody, specific narrative): **zero** fixes offered.
- Undo restores prior text. All JS syntax-checked; all DOM ids cross-checked.

## Note on later edits (after this session, not part of this work)
`app/humanize.js`/`app/app.js` have since gained `Humanize.runAll(text,{max:6})` (greedy
multi-edit per click) + a `flashBox()` highlight, and a model **retrain is in progress**
(modified `corpus/combined_model.json`, summaries, etc.) — the gated next step.
