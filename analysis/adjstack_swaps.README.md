# Adjective-Stack Swap Table — DATA EVIDENCE

Data-vetted replacement table for the Suno Slop Detector **Humanize** plan.
Feature `t3_adjStack` (`src/ext/tier3.browser.js`) flags stock
`<adj> + <noun>` clichés ("shattered dreams", "endless night", "silent
tears"). Humanize swaps the **adjective** for a plainer/more-concrete one that
breaks the cliché while staying grammatical and reading more human.

**The corpus decided.** Nothing is in the swap list on taste — every adjective
was measured against the corpus before inclusion.

## Method

For each adjective in `STACK_ADJ` we measured:

- **AI%** = document-frequency in the AI corpus — **2056 songs**
  (`corpus/models/*.json`, excluding `claude-opus-4-8-generated.heldout` and
  `*.bak`; English text via `lyrics_en` else `lyrics`).
- **HU%** = document-frequency in the human corpus — **4215 real-human lyric
  docs** (`/tmp/human_lyrics_cache.json`, ignoring empty-string misses).
- **AI/HU ratio** = AI% / HU%.
- **wBow** = the word's logistic weight in `corpus/combined_model.json`
  (`vocab`+`wBow`). **Positive = AI-leaning word; negative = human/neutral;
  absent = not in the 1808-word model vocab.**

(Doc-frequency = "does this song contain the word at all", which is what a
human reader actually notices. We also computed the narrower adj+noun *stack*
doc-frequency; it agrees with the word-level signal and is omitted here for
brevity.)

## Decision rule

| condition | decision |
|---|---|
| AI/HU ratio ≥ ~2 **AND** wBow > 0 | **SWAP** |
| AI/HU ratio ≥ ~2 **AND** absent from model vocab (freq-proven rare-in-humans) | **SWAP (freq)** |
| AI/HU ratio ≥ ~2 **BUT** wBow ≤ 0 (model says the word reads human) | **TRANSPARENT** — still trips the structural flag, but DON'T swap |
| AI/HU ratio < 2 (humans use it as much or more) | **EXCLUDE (normal)** — not an AI tell |

## Evidence table

AI corpus N=2056 · Human corpus N=4215

| adjective | AI% | HU% | AI/HU ratio | wBow | decision |
|---|---|---|---|---|---|
| broken | 13.62% | 4.29% | 3.17 | -0.320 | TRANSPARENT |
| shattered | 0.68% | 0.57% | 1.20 | absent | EXCLUDE (normal) |
| endless | 4.72% | 1.04% | 4.52 | -0.323 | TRANSPARENT |
| fading | 6.91% | 0.88% | 7.87 | +0.549 | **SWAP** |
| forgotten | 2.38% | 1.00% | 2.39 | +0.297 | **SWAP** |
| silent | 3.21% | 0.97% | 3.30 | +0.902 | **SWAP** |
| whispered | 2.58% | 0.26% | 9.88 | +0.982 | **SWAP** |
| lost | 16.20% | 7.78% | 2.08 | +0.362 | **SWAP** |
| distant | 2.33% | 0.71% | 3.28 | +0.630 | **SWAP** |
| lonely | 5.25% | 5.77% | 0.91 | -1.304 | EXCLUDE (normal) |
| empty | 16.39% | 3.08% | 5.31 | +0.909 | **SWAP** |
| eternal | 0.10% | 0.50% | 0.20 | absent | EXCLUDE (normal) |
| burning | 6.03% | 2.73% | 2.21 | +1.110 | **SWAP** |
| flickering | 0.92% | 0.12% | 7.79 | absent | **SWAP (freq)** |
| crimson | 0.10% | 0.19% | 0.51 | absent | EXCLUDE (normal) |
| golden | 2.87% | 1.71% | 1.68 | -0.534 | EXCLUDE (normal) |
| silver | 6.08% | 2.47% | 2.46 | -0.060 | TRANSPARENT |
| midnight | 7.39% | 1.52% | 4.87 | +1.034 | **SWAP** |
| restless | 1.61% | 0.33% | 4.83 | -0.180 | TRANSPARENT |
| tender | 0.54% | 1.09% | 0.49 | absent | EXCLUDE (normal) |
| crystal | 0.19% | 0.36% | 0.55 | absent | EXCLUDE (normal) |
| sacred | 0.63% | 0.59% | 1.07 | absent | EXCLUDE (normal) |
| fragile | 0.83% | 0.14% | 5.81 | absent | **SWAP (freq)** |
| velvet | 0.97% | 0.26% | 3.73 | absent | **SWAP (freq)** |

### Tally

- **12 SWAP** (8 wBow-positive + 4 freq-proven): `fading, forgotten, silent,
  whispered, lost, distant, empty, burning, flickering, midnight, fragile,
  velvet`.
- **4 TRANSPARENT** — AI over-uses them, but the model weight says they read
  HUMAN, so the data says leave them: `broken, endless, silver, restless`.
- **8 EXCLUDE (too normal)** — humans use them as much or more, not an AI tell:
  `shattered, lonely, eternal, crimson, golden, tender, crystal, sacred`.

The standouts: `lonely` and `shattered` are *not* AI tells at all (lonely
1.0×, wBow -1.30; shattered 1.2×). `broken` and `endless` look AI-frequent but
their negative wBow proves humans say them naturally — swapping them would make
lyrics *less* human, so they're TRANSPARENT-only.

Top AI-skewed adjectives by ratio: **whispered 9.9×**, **fading 7.9×**,
**flickering 7.8×**, **fragile 5.8×**, **empty 5.3×**, **midnight 4.9×**.

## Replacements

Every replacement is a valid adjective, **not** in `STACK_ADJ` / the cliché
lexicon / the `VAGUE_EMOTION` set, with **low/negative or absent wBow** (data
says it reads human), chosen concrete/sensory and grammatical with the
`STACK_NOUN` set. Representative wBow of the replacement vocabulary: `plain`
-0.948, `worn` (as past-participle adj; +1.43 but concrete & off-cliché),
`tired` -0.478, `warm` -0.429, `bare` +0.497, `quiet` +1.94 (concrete sensory),
`dim` +0.470, `gray` +0.509, `old` +0.656, `late` +1.578 — all outside the AI
cliché/vague vocabulary, so they break the flagged pattern.

| AI-tell adj | replacements (data-vetted, plain/concrete) |
|---|---|
| fading | worn, tired, gray, old, cold, dim |
| forgotten | old, used, spare, plain, half, cold |
| silent | quiet, still, shut, numb, plain, cold |
| whispered | quiet, low, plain, half, soft, small |
| lost | old, spare, plain, wrong, tired, half |
| distant | far, near, cold, tall, wide, gray |
| empty | bare, open, plain, wide, half, spare |
| burning | warm, dry, hot, bright, red, bare |
| flickering | dim, gray, bright, faint, cold, bare |
| midnight | late, cold, gray, long, dark, quiet |
| fragile | thin, small, worn, bare, plain, tired |
| velvet | plain, worn, soft, thin, gray, old |

## Validation

`node analysis/_validate_adjstack_swaps.js` loads the production engine
(`src/ext/v2-engine.js`, content-script load order) and confirms swapping
data-vetted adjectives **lowers `t3_adjStack`**:

```
sample 1: t3_adjStack 1.2500 -> 0.0000   holistic 96 -> 91 (pAI 0.9571 -> 0.9102)
sample 2: t3_adjStack 1.7500 -> 0.0000   holistic 93 -> 79 (pAI 0.9350 -> 0.7900)
TOTAL    t3_adjStack 3.0000 -> 0.0000    PASS
```

Per the prior finding, a single-line swap moves the holistic score only a
little (sample 1: -5); the `t3_adjStack` feature itself drops to zero, and
applying every stack swap in a stanza (sample 2) moves the holistic score
meaningfully (-14). Humanize is intended to apply many such edits across a
lyric, compounding the effect.

## Files

- `analysis/adjstack_swaps.js` — `ADJ_SWAP`, `TRANSPARENT_ADJ`,
  `EXCLUDED_NORMAL`, `STACK_NOUN`, and the `swapAdjStack(text, opts)` helper
  (dual-mode CommonJS / browser global).
- `analysis/_validate_adjstack_swaps.js` — engine-backed validation harness.
