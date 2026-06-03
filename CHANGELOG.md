# Changelog

All notable changes to the Suno Slop Detector. Dates are release-submission dates.

## [0.3.0] — 2026-06-03
### Added
- **Six craft-perspective lenses** (`analysis/perspectives/*`) — rapper, poet, psychologist,
  philosopher, storyteller, wit — contributing ~55 new text-only `t4_*` features. Each emits a
  human-readable per-lens report; the model learns their weights. Pure JS, no LLM/network/embeddings.
- **Prosody primitives** (`analysis/prosody.js`): syllable estimator, vowel-class rhyme keys
  (perfect + slant + internal + multisyllabic rhyme à la Hirjee & Brown), stress/POS heuristics.
- **Eye-rhyme archive** (`analysis/eye_rhymes.js`, 241 words): love/move, good/blood, though/through…
  — fixes false rhymes and flags sight-rhymes as a text-AI tell.
- **On-device non-English guard**: <8% English-function-word ratio → "Looks non-English" notice +
  translate tip instead of a meaningless score (on-page panel + popup paste box).
- **Calibration harness** (`build/calibrate_perspective.js`) + design log
  (`analysis/perspectives/DESIGN_AND_CALIBRATION.md`).

### Changed
- **Rebalanced training corpus** to the five real consumer-AI sources (Suno-dominant + ChatGPT,
  Grok, Gemini; Claude filler dropped). This fixed a blind spot: a real Suno song scored **17% AI
  in v0.2 → 98% in v0.3**, while human classics stay low (Bohemian Rhapsody 0%, Baby 1%) and a Dylan
  false-positive dropped 87%→53%. 5-fold CV: bow 89.7%, dense 84.2%, combined 82.8%.
- Craft panel now surfaces perspective signals (with examples) and a perspective-driven joker.

### Fixed
- **Sparse-feature standardization explosion** — a near-zero-variance feature (e.g. generic-object
  density) could blow up into a +95 contribution and pin out-of-distribution songs to 100% AI. Fixed
  with ±3σ clipping (training + inference) + per-group L2 (BoW 3e-4, dense 2e-3).
- Feedback no longer suggests swapping function words (the "change 'the' to…" bug).
- `SlopPanel.build` returns an empty panel on instrumental/empty input instead of throwing.
- Resilient, cache-backed retrain (`build/retrain_loop.sh`) so the live human-lyric fetch resumes.

### Audited
- Security/robustness pass before release: 0 dangerous patterns (no eval / network / innerHTML /
  storage), engine⇄model parity verified to <1e-6 (`src/ext/_test_engine.js`), 11/11 adversarial
  inputs (empty, 50k-line, unicode, HTML-injection, emoji…) handled without crash, and AMO
  `web-ext lint` reports **0 errors**.

## [0.2.0] — 2026-06-03
### Changed
- Replaced the hand-tuned cliché meter with a trained logistic-regression model (bag-of-words + 79
  text-only craft/stylometric features), temperature-calibrated P(AI).
### Added
- Craft-coach panel: 5 ✅ keep · 1 🃏 try · 5 ⚠️ work-on, each quoting a real line. Input cleaning
  (tag/JSON/scaffolding strip) + instrumental detection.

## [0.1.0] — 2026-05-30
### Added
- First release: hand-tuned cliché-lexicon score on `suno.com/song/*`, on-device, text-only.
  Chrome + Firefox (MV3). Reads only the lyrics box.
</content>
