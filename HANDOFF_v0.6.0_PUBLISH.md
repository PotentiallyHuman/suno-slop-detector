# Publish handoff — Suno Slop Detector v0.6.0 (2026-06-10)

## ✅ Submit these (you control the store accounts)
- **Chrome** → `dist/suno-slop-detector-chrome-0.6.0.zip`
- **Firefox** → `dist/suno-slop-detector-0.6.0.zip`

Each: version 0.6.0, AMO-linted **0 errors / 0 notices**, v8 verified.
**Skip the 0.5.2 zips** — 0.6.0 supersedes them (the consistency fix is folded in).

## What 0.6.0 contains (byte-diffed against published 0.5.1 — exactly this)
- **v8 detector model** as the headline scorer (was v5): `model_v8` + `craft_features` +
  `v8-score` browser files + the `v2-engine` `denseDict` dependency. Format-stripped + 9
  craft features, 88% CV, deterministic on-device. v5 kept only for gated LLM attribution.
- **Rewrite button** = the edit-line-inserter: `v8-rewrite`, line-by-line gated transform,
  keeps only AI-lowering changes, never invents/deletes content, reversible.
- **content.js**: the 0.5.2 false-0% selector fix + v8 scoring.
- **manifest / popup.html / popup.js**: load order + Rewrite button wiring + attribution
  gated on the v8 headline.
- Nothing else. The diff vs 0.5.1 is *only* the files above.

## Verified (red-team)
- v8 scores **AI 100% / human 0%** in the real content-script load order (node harness over
  the exact `manifest.js[]` chain) — no load errors, all globals present.
- Rewrite: gated, **line count preserved**, no content injection, no LLM/network.
- Attribution gated on the displayed v8 score (never names an LLM under a human number).
- AMO `addons-linter`: 0 errors, 0 notices. No eval/innerHTML/remote/broad-perms.
- Diff vs published 0.5.1 = exactly the v8 work; **no stray WIP** leaked in.

## Deliberately NOT in 0.6.0 (kept out for scope/safety)
- **Humanize button redesign** (`humanize.js`) — reverted to the proven 0.5.1 version; the
  redesign was outside "corpus + edit-line-inserter" and unverified. Ships in a later version.
- **PWA / phone-app v8 integration** (`app/`, `mobile/`) — separate update, not audited here.
- The v8 model *training* files (`analysis/`, `corpus/model_v8.json`) — not part of the
  shipped extension (the extension embeds `model_v8.browser.js`).
