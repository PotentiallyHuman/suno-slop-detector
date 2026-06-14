# Audit & Red-Team — v1.0.0 (2026-06-14)

Before the first public release the codebase was put through an independent **audit** (is it correct,
consistent, and safe?) and a **red-team** (try to break it). Both ran against the built `dist/` bundles,
not just the source. This is the summary; it is part of the repo so anyone can see what was checked.

## Audit — verdict: release-ready

| Area | Result |
| --- | --- |
| Compact 3-row panel across overlay / popup / Android | Consistent: one row per category, tap-to-reroll gated on >1 option, sound modulo cycling, clean empty fallback |
| "Don't repaint on unchanged lyrics" guard (overlay) | Correct — no stale-panel path, resets on page change, never inherits the previous song |
| Build integrity | `dist/firefox/src` and `dist/chrome/src` are **byte-identical**; only the manifest differs (Firefox `browser_specific_settings`). Versions consistent at 1.0.0 |
| Privacy / runtime invariants | **Zero** network, storage, or `eval` calls in the entire shipped bundle. Reads only the lyrics box. Permission = `activeTab` only. Matches `suno.com/song` + `suno.com/create` only |
| Mobile bundle | `app/engine` is byte-identical to `src/`; the inlined `www` + Android assets carry the new code |

## Red-team — verdict: GO

Attacked all surfaces with hostile inputs and 150 real Suno AI songs.

**Held up:** no XSS (everything renders via `textContent`/`createElement`, never `innerHTML`); no crashes
on empty / 1-char / 50 000-char / emoji / CJK / RTL / control-char / HTML-source / null-byte inputs;
deterministic (same input → same output); the humanizer is capped so a 10 000-line song still finishes
in under a second.

**Found and fixed before release:**
- **Humanizer could claim a false improvement.** On shape-pinned songs, a tier could return an edit that
  actually read *more* AI (e.g. 95% → 99%) while the panel announced it as a fix. All three tiers
  (Line / Rewrite / Chaos) now refuse any edit whose score is worse than the original. **Verified: 0
  worsened across 150 songs / 188 returned edits (was ~12).**

**Known fast-follows (low-risk, documented not blocking):**
- The detector has no input-length cap, so a deliberately enormous paste could freeze the tab for a few
  seconds. Low likelihood (real songs are short, scoring is user-triggered) — to be capped like the humanizer.
- Chaos word-swaps occasionally produce a grammar-agreement slip ("the heavens **gets** darker"); ~1% of
  changed lines. Chaos already warns that meaning may bend.

## How to reproduce

Load the built engine in Node and call it directly:

```bash
node -e 'const fs=require("fs"),vm=require("vm"); /* load dist/firefox/src/*.js in order */'
# then: SlopV8.scoreV8(text), SlopPanel.build(text, SlopV2.score(text)),
#       HumanizeFreestyle.humanizeOne/humanizeHalf/humanizeChaos(text, scoreFn, logitFn)
```

The worsen-guard check used for release is `build/`-adjacent: score every Suno corpus song, run all three
tiers, assert no returned edit has `after > before`.
