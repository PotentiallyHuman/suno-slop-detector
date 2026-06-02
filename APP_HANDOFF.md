# APP_HANDOFF — building the standalone Suno Slop Detector app

This document is the single source of truth for developing a **standalone app**
(paste lyrics → get an AI-likeness score + craft feedback) that reuses the EXACT
trained scoring engine already shipped in the browser extension. **Do NOT retrain
or redesign the model — wrap the existing engine in a new UI.**

Location of this file: `~/projects/28_suno_slop_detector/APP_HANDOFF.md`

---

## Where everything is

- **Repo:** `~/projects/28_suno_slop_detector` (local git, MIT, framework-free plain JS)
- Read these first for full context:
  - `README.md` — what the product is + the strongest human-vs-AI signals
  - `dist/STORE_LISTING_v0.2.0.md` — user-facing copy / tone / ethos
  - `~/.claude/projects/-home-potentiallyhumanspark/memory/project_28_suno_slop_detector.md` — full project history

## Current status (as of 2026-06-03)

v0.2.0 is **shipped to both stores**: Firefox AMO = "Version Submitted",
Chrome Web Store = "Pending review". The extension runs on `suno.com/song/*`,
reading the lyrics box. This new app generalizes that to **any pasted lyrics**
(mobile / PWA / website). The app-form decision is **OPEN** — the prior analysis
weighed Android overlay-app vs PWA vs plain website; **revisit it as step 1.**

## The model (`src/ext/model.js` → `globalThis.SLOP_MODEL`)

A logistic-regression classifier trained on ~3.8k AI songs (ChatGPT/Claude/Grok/
Gemini/Suno) vs ~3.8k human-song metric vectors. Two halves summed into one logit `z`:

- **Bag-of-words:** 2254-word vocab, term-frequency × `wBow` weights.
- **79 dense text-only features** (`denseNames`/`wDense`), standardized by
  `denseMean`/`denseStd`. Features: clichéDensity, perfect-rhyme ratio, line-length
  burstiness, proper-noun specificity, over-personification (inanimate→animate),
  vague-emotion, repeated lines, argument markers, etc.
- `bias = -4.55`. `aiDenseMean`/`aiDenseStd` = per-feature stats over the AI corpus
  (used by the craft panel for z-scores).

**Score semantics:** `pAI = sigmoid(z / T)` with **temperature T = 8** (raw LR
saturates to 0/100 on separable data; T=8 spreads borderline songs across the
middle). Displayed score = `round(pAI*100)`. **0% = confident human, 50% =
coin-flip, 100% = confident AI.** It measures **DEGREE of "AI texture," NOT
origin** — a polished AI song scores low, a cliché-heavy human song scores high.
Framing is always playful/suggestive, never a verdict or an accusation.

## The engine (~10 plain-JS files, NO build step, NO deps)

Runs identically in a browser, a web worker, OR Node (verified). **Load in this
order;** each attaches a global:

1. `src/slop-core.js` — `globalThis.SlopScore` (lexicon, `stripSectionLabels`, `verdict`)
2. `src/common_words.js` — top-1000 word list (perplexity proxy)
3. `src/features.js` — `globalThis.SlopFeatures` (18 stat features)
4. `src/ext/patterns.browser.js` — `globalThis.SlopPatterns` (struct + cliché + rhyme detectors)
5. `src/ext/tier3.browser.js` — `globalThis.SlopTier3` (13 craft detectors)
6. `src/ext/model.js` — `globalThis.SLOP_MODEL` (trained weights)
7. `src/ext/clean-lyrics.js` — `globalThis.SlopClean` (`.clean(raw)→{lyrics,instrumental}`)
8. `src/ext/v2-engine.js` — `globalThis.SlopV2` (`.score(text)`)
9. `src/ext/v2-panel.js` — `globalThis.SlopPanel` (`.build(text, sc)`)

## Public API

```js
SlopV2.score(text)  // → either:
  { instrumental:true, pAI:null, score:null }            // input was tags/JSON-only or blank
  // OR:
  { pAI, score, z, dense, denseNames, denseStdz,
    contributions, nLines, nTokens }
  // score = round(pAI*100); contributions = sorted
  // [{name, kind:'dense'|'word', value, std, weight, contrib}] for explainability.

SlopPanel.build(text, score)  // → the 5 ✅ / 1 🃏 / 5 ⚠️ panel:
  { good:[{label,quote}], joker:{text}, bad:[{label,quote,fix}] }
```

**Input cleaning is automatic inside `score()`:** `clean-lyrics.js` strips
`[Verse]`/`[Chorus]` tags, leaked JSON, model scaffolding, and a leading title;
if nothing remains it's an **instrumental** → show no score/feedback.

## What to build (NOT rebuild)

- A **paste/textarea input** — this replaces `src/content.js`, the Suno-page DOM
  reader. You do **not** need `content.js`; everything else ports as-is.
- Call `SlopV2.score(text)` on input → render the `%` + `SlopPanel.build()` panel.
  Reuse `src/overlay.css` / `src/popup.css` styling cues if helpful.
- Heavy scoring can run in a **web worker** (the engine is just globals + functions).

## Hard constraints (keep them)

100% on-device · text-only · **NO network, NO embeddings, NO LLM at inference** —
the model ships inside the app. Privacy by design. No telemetry. Keep it
framework-light if you can (the engine is dependency-free).

## First step

Confirm the app form (PWA vs native Android vs website), then scaffold the chosen
target and wire the 9 engine files + a paste box.
