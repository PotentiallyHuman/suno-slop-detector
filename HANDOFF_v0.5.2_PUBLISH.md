# Publish handoff — Suno Slop Detector v0.5.2 (2026-06-10)

## ✅ Ready to submit — you do this (you control the store accounts)
Both packages are built, tested, AMO-linted (0 errors), and committed (`041b006`):
- **Chrome:** `dist/suno-slop-detector-chrome-0.5.2.zip` → Chrome Web Store dashboard
- **Firefox:** `dist/suno-slop-detector-0.5.2.zip` → addons.mozilla.org (AMO)

Each: 32 files, ~632 KB, fix verified inside the zip, `version: 0.5.2`, v5 model present.

## What changed in 0.5.2 (exactly one fix)
The false-0% / inconsistent-score bug you caught (same song: 98% create page, 100% one
song page, 0% another). The 0% was the detector finding **nothing** — the song-page lyrics
selector was pinned to brittle Suno styling classes (`pr-6`/`font-sans`/`text-foreground-primary`);
when Suno changed them per layout variant, it missed and read an empty string, shown as a real 0%.

- Song pages → lyrics found by the stable semantic class `whitespace-pre-wrap` in a `<section>`
  (largest block). Create page → pinned to stable `data-testid="lyrics-textarea"`.
- Empty / no-match now shows **"?"**, never a number.
- URL-change flush so a new page can't inherit the previous song's %AI.
- Verified against the exact DOM you pasted. **Detector model + humanizer unchanged** —
  0.5.2 = 0.5.1 + this one selector fix. Nothing else ships.

## NOT in this release — left uncommitted on purpose (your call)
Preserved on disk, deliberately kept OUT of 0.5.2 (it's a separate, bigger release and
wasn't verified for store review):
- **v8 detector model** — `analysis/train_v8.js`, `corpus/model_v8.json` (PWA-only; the
  extension scores with v5, confirmed by audit).
- **Humanizer redesign** — `src/humanize.js`, `HUMANIZE_DESIGN.md`, `human_pool.browser.js`.
- **PWA v8 integration** — `app/engine/ext/v8-*.js`; mobile build tweaks.
Review and commit these when you want to ship them — don't bundle into the 0.5.2 store update.

## Reorganization (done)
The freestyle-rap / voice-clone work forked off Project 28 and is now **`~/projects/31_talking_head_freestyle_rap/`** (engine + voice + dataset + README, 65 files preserved out of `/tmp`). Nothing freestyle remains in the detector repo.

## Session reconciliation — every ask bucketed
**Implemented + verified:** consistency-bug diagnosis (it was selector fragility, not "reads
outside the box" — that part was already safe); robust selector fix (both browsers); nav-flush;
0.5.2 build + AMO lint + detector test + commit; freestyle/voice moved to project 31.
**Acknowledged + intentionally deferred:** the v8/humanizer/PWA pile (above) — not store-verified,
so out of 0.5.2; the FastPitch voice fine-tune (project 31, blocked on more Suno-extend data).
**Flagged for you:** submit the two zips; decide when to ship the v8/humanizer release; extend
the Suno take (training_lyric.txt) for more voice-clone data.
