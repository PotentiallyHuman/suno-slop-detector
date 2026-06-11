# Changelog

All notable changes to the Suno Slop Detector. Dates are release-submission dates.

## [0.7.2] — line grammar learned from 2000 fresh human songs (2026-06-12)
A cross-corpus study (2000 newly fetched human songs vs the 6388 training songs, with a
split-half baseline as ceiling) settled what "a human line structure" actually is:
- Exact whole-line POS templates do NOT replicate across independent human corpora (15%
  coverage) — they are corpus one-offs. The generator's old rule demanded them, which is
  why long (13+ syllable) lines could almost never be rebuilt.
- What replicates at the ceiling: how lines OPEN (0.85-0.92 overlap), how they CLOSE
  (0.89), the POS-transition inventory, rhyme-with-previous-line (~33%), first-word echo
  (~14%), sentence spillover (~6%), and neighbor-relative length (peak ±0-1 syllables).
### Changed
- The line-acceptance rule now uses the proven-universal grammar (open + close + valid
  transitions; known templates remain a fast path). Long clichéd lines finally regenerate.
- Model retrained on all 8388 human songs (richer word chains, 16k vocab).
- The candidate judge gained anti-filler penalties (repeated content words, function-word
  share) so the looser grammar can't admit fluent-but-empty pronoun runs.
### Data
- The learned structure tables (no lyric text, structures only) ship in
  corpus/context_grammar.json; the raw fetched lyrics never enter the repo.

## [0.7.1] — the humanizer now only touches lines that earn it (2026-06-11)
Found by a real before/after on a finished song ("Hydrogen"): the song scored 95% AI from its
STRUCTURE alone (repeated chorus, identical hook lines), every individual line read human, and
the humanizer — unable to regenerate the long clichéd verse lines — fell through its ranking and
rewrote the hook and chorus instead. Score 95% → 0%; song ruined. Three fixes:
### Changed
- **Evidence-only selection.** A line is a rebuild candidate ONLY if it carries its own AI
  evidence (blocklist clichés, or a high line-level AI score). Human-reading lines are never
  touched, no matter what the whole song scores. If no candidate can be rebuilt, the button now
  says so honestly: "that's the song's SHAPE, not its words — vary line lengths, break up a
  repeated chorus" instead of editing something innocent.
- **Hook immunity.** Lines repeated verbatim (hooks/choruses) are structure, never rebuilt.
- **Best-of-10 with a judge.** Each press generates up to 10 distinct replacement lines and
  judges them all — trained line AI score + cliché count + the 6 craft lenses (same calibration
  as the craft panel) — and keeps the winner that passes the never-worsen gate. A replacement
  also may not duplicate another line's end word ("...airport / ...airport").
### Fixed
- **Corpus junk leak.** The model could stitch publisher footers from scraped lyric pages into a
  song ("Copyright nazareth tiflis tunes inc ascap"). Footer lines are now stripped at corpus
  ingestion, metadata words are banned from the vocabulary, and 3-letter tokens must be real
  words (kills "game ame"). Model re-exported.

## [0.7.0] — on-device freestyle humanizer, every surface (2026-06-11)
### Added
- **The freestyle humanizer**, now wired into the extension popup (Chrome + Firefox), the
  PWA, and the Android app. Instead of patching words, it rebuilds the most-AI lines as
  **new** lines — constructed backward from the end-rhyme the way a freestyler writes:
  rhyme locked first, then the line built word-by-word to the syllable target, themed to
  the song's own embedding.
  - **Cliché-free by construction** — the detector's 125-word AI-cliché blocklist is
    excluded from the generator's vocabulary at build time (it literally cannot say
    "whisper").
  - **Grammar professor** — a candidate line is kept only if its whole-line
    part-of-speech structure matches a real human line's structure, so output reads as a
    complete standalone thought, never a fragment.
  - **Anti-copy** — any candidate containing 4 consecutive corpus words is rejected
    (FNV-1a hash check), so no human lyric is ever reproduced.
  - **v8-gated** — a rebuilt line is kept only if the song's v8 AI score doesn't rise; a
    press can only improve the song or do nothing.
  - Pure on-device: a 3.7 MB distilled model (word transitions, rhyme banks, int8 GloVe
    theme vectors, POS templates). No LLM, no network, **no new permissions**.
- Two buttons, two speeds: **"Humanize Line"** rebuilds the single worst line per click
  (worst-first, so you watch the song clean up); **"Humanize Rewrite"** rebuilds the worst
  half in one press and keeps the better half yours. Both reversible via Undo.
### Changed
- The popup's old **Humanize** (mechanical word-swaps) and **Rewrite** (gated line
  transform) handlers are repointed at the freestyle generator; buttons relabeled
  "Humanize Line" / "Humanize Rewrite" to match the PWA.
- Android app rebuilt to 1.2.0 with the same generator (the 1.1.0 APK still carried the
  old broken pool-transplant humanizer).
### Quality (measured)
- 3000-line scale test: 99% grammar-clean, 100% rhyme-correct, 98% syllable-within-2,
  0 clichés. Every surface interaction-audited: simulated button presses to convergence on
  real AI songs + edge cases — a press never worsens a song, never throws, and never
  silently does nothing on an AI song.

## [0.6.0] — v8 detector model + line-rewrite (2026-06-10)
### Added
- **v8 detector model** as the headline scorer (replaces v5). Format-stripped features
  (no more line-break-style false positives) + 9 craft features; 88% cross-validated.
  Deterministic, on-device, no LLM/network. v5 is retained only for the gated LLM attribution.
- **Rewrite button** (the line-rewrite / "edit-line-inserter"). Rewrites pasted lyrics line
  by line with the v8 gated transformer, keeping **only** changes that lower the AI score;
  never invents content, never deletes lines (line count preserved), no LLM. Reversible via Undo.
### Changed
- Attribution is gated on the **displayed (v8) headline** (`>=50`), not the v5 verdict — they
  can disagree, and "likely Suno" must never show under a human-reading number.
### Fixed
- Folds in 0.5.2: the false-0% / inconsistent-score selector fix.

## [0.5.2] — robust lyrics selector + navigation flush (2026-06-10)
### Fixed
- **Inconsistent and false-0% scores across Suno page layouts.** The song-page lyrics
  selector was pinned to brittle styling classes (`pr-6` / `font-sans` /
  `text-foreground-primary`). When Suno changed those for a layout variant, the selector
  missed, read an empty string, and showed it as a real **0% AI** score (same song could
  read 98% on the create page, 100% on one song page, 0% on another). Now the lyrics are
  identified by the stable semantic class `whitespace-pre-wrap` scoped to a `<section>`
  (largest matching block); the create-page editor is pinned to the stable
  `data-testid="lyrics-textarea"`. Empty/no-match shows `?`, never a number.
- **Stale score lingering after navigation.** Added a URL-change flush on every re-check so
  a new song page can never inherit the previous song's %AI (belt-and-suspenders on top of
  the existing history hooks).

## [Unreleased] — v5 model retrain (2026-06-05)
_Model + analysis only; the extension is not yet wired to it. Full results, red-team, and
integration steps: `analysis/V5_MODEL_RESULTS_AND_INTEGRATION.md`._
### Added
- **Retrained detector (`corpus/model_v5.json`).** AI corpus reweighted to real-world tool usage
  (ChatGPT 35 / Suno 30 / Gemini 12 / Claude 12 / Grok 5) via per-song loss weights; Gemini added
  (5-way); English-only filter; human side fetched live (4,750 songs) with a 3-round rotating
  method and generalization checked on unseen humans.
- **New "typicality" feature** — share of a song's 3-word phrases that recur in the AI phrase bank
  (closeness to the AI corpus). Strongest new signal (held-out, subject-disjoint d≈1.03); adds
  +6 pts accuracy / +8 pts precision.
- **Model attribution** — which LLM likely wrote it (suno/claude/grok/chatgpt/gemini),
  confidence-gated. Powered by per-model phrase banks.
- New structural detectors logged (`analysis/portability_tells.js`): filler-"just",
  contraction-aware negation-anaphora, self-qualify (weak/mixed — kept for completeness).
### Results (v5.1 — pruned + calibrated)
- 5-fold CV **87.9%** acc at the calibrated threshold (vs 79.6% without typicality). **Human
  false-positive 9.8%** at threshold **0.55** (down from 13.5% at 0.5), recall 85%. Unseen-human
  recall 89.9%. Attribution **86.2% argmax / 94.2% when confident** (honest, per-fold banks).
  The old model couldn't tell an AI Suno song from Bohemian Rhapsody; the new one scores the AI
  song 100% (AI) and the human hits 0% (human).
### Fixed
- Overfit artifact: a rare feature (`s_halfXHalfY`, <1% of songs) got a +40 weight under weak L2.
  Now **pruned at the source** (drop dense features <1% prevalence) + moderate L2 → robust, and
  recovered the accuracy lost to blunt regularization.
- **Threshold calibrated** (0.55, baked into `model_v5.json` as `threshold`) via out-of-fold sweep.
- `hedgeJust` counted at most one "just" per line (greedy regex) → now counts all.
### Known / TODO before release
- **Attribution must be gated behind the AI verdict** in the UI (ungated it mis-attributes human
  songs, e.g. "Bohemian Rhapsody = Suno"). See integration doc §3/§5.
- Human corpus is famous hits (older) — part of the human↔AI gap is era/genre.

## [0.4.1] — 2026-06-04
### Changed
- **Humanize now uses the data-vetted swap catalogs.** One-click Humanize swaps only the
  flagged cliché **word/phrase** for a corpus-proven, human-reading equivalent — never a whole
  line (honors the "don't replace the writer's content" rule). Wired in:
  - adjective-stack swaps (`adjstack_swaps`: e.g. *fading dreams → worn dreams*),
  - `-ing`-verb swaps (`ingverb_swaps`: *burning love → warm love*),
  - prepositional scene-phrase swaps, meter-matched (`prepphrase_swaps`: *in the dark → after dark*),
  - rhyme-**preserving** concrete end-word swap for feeling-word line endings (`rhyme_index`).
  Each swap is kept only if it lowers the AI score; every change is reversible.
- **Transparent-only, honored in code.** Words/structures the data says read human are flagged
  but never auto-edited: *heart, soul, forever, neon, shadow*, "in the night", and adjectives like
  *shattered / broken / endless* (corpus-neutral). Vague/personification/cliché-line/simile
  features are advice-only.
### Fixed
- Humanize no longer **deletes** image-stacked lines (that removed the user's own content) and no
  longer word-swaps the transparent-only words above — both contradicted the design but had shipped.
### Verified
- 27/27 Humanize unit assertions; red-team 11/11 (engine **and** Humanize, loaded the browser way);
  engine⇄model parity unchanged (<1e-6). No copyrighted text in any shipped artifact.

## [0.4.0] — 2026-06-04
### Added
- **Bigger, cleaner AI corpus, mined from the real tools people use.** Grok (grok-3 + grok-4 via the
  xAI API), Claude (the *bare* Anthropic API — no assistant system-prompt/personality leakage),
  Gemini + ChatGPT (logged-out browser), Suno. Context-contaminated locally-generated samples excluded.
- **Punchier Humanize.** One click now applies several targeted edits in a greedy pass (biggest
  score-drop first), an expanded cliché→plain lexicon, and strips throwaway "oh/hey/yeah" openers;
  the box flashes + shows a multi-fix summary so the change is visible.
### Changed
- **Retrained model (v4).** Combined BoW + dense logistic regression, balanced ~1:1. 5-fold CV
  **86.6%** (precision 85.4 / recall 87.9), up from v0.3's 82.8%.
- **Evidence-based feature config.** A leave-one-generator-out study showed bag-of-words *alone*
  overfits each generator's vocabulary — fragile on unseen generators and ~67% human-recall
  (over-flags real songs). The shipped model stays **combined** (vocabulary + structural craft),
  which generalizes better and rarely false-flags humans. A 3-model stability experiment (same AI
  vs three disjoint human sets) confirmed the core signal is stable (~0.87 weight-cosine).
### Verified
- Red-team 11/11 adversarial inputs handled without crash. No copyrighted lyrics in any shipped
  artifact — the model is numbers + a single-word vocabulary only.

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
