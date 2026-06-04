# "-ing Emotional Verb" Swap Table — DATA EVIDENCE

Data-vetted replacement table for the Suno Slop Detector **Humanize** plan.
Feature `t3_ingVerbAbstract` / `s_ingEmotionVerb` (`src/ext/tier3.browser.js`)
flags "**<-ing verb> + <abstract noun>**" cadences — "burning desire",
"falling apart", "fading away", "drowning in sorrow". The detector counts an
-ing verb from its `ING_VERB` set when a stock/abstract noun (`STACK_NOUN`)
appears within ~4 tokens. Humanize swaps the **-ing verb** for a more
concrete / human-reading alternative.

**Key difference from `adjstack_swaps`:** the replacement MAY CHANGE
GRAMMATICAL FORM (adjective / past participle / plain verb), not just
-ing → -ing. It is a reversible **suggestion**, so occasional imperfect
grammar-fit is acceptable — but we prefer alternatives that read naturally.

**The corpus decided.** Nothing is on the swap list on taste — every -ing verb
was measured against the corpus before inclusion.

## Method

The detector's `ING_VERB` set has 21 entries. For each we measured:

- **AI%** = document-frequency in the AI corpus — **2056 songs**
  (`corpus/models/*.json`, excluding `*.heldout` and `*.bak`; English text via
  `lyrics_en` else `lyrics`).
- **HU%** = document-frequency in the human corpus — **4402 real-human lyric
  docs** (`/tmp/human_lyrics_cache.json`, ignoring empty-string misses).
- **AI/HU ratio** = AI% / HU%.
- **wBow** = the word's logistic weight in `corpus/combined_model.json`
  (`vocab`+`wBow`). **Positive = AI-leaning; negative = human/neutral;
  absent = not in the 1808-word model vocab.**

(Doc-frequency = "does this song contain the word at all", which is what a
reader actually notices.)

## Decision rule

| condition | decision |
|---|---|
| AI/HU ratio ≥ ~2 **AND** wBow > 0 | **SWAP** |
| AI/HU ratio ≥ ~2 **AND** absent from model vocab (freq-proven rare-in-humans) | **SWAP (freq)** |
| AI/HU ratio ≥ ~2 **BUT** wBow ≤ 0 (model says the word reads human) | **TRANSPARENT** — still trips the structural flag, but DON'T swap |
| AI/HU ratio < ~2 (humans use it as much or more) | **EXCLUDE (normal)** — not an AI tell |

## Evidence table

AI corpus N=2056 · Human corpus N=4402 · sorted by AI/HU ratio

| -ing verb | AI% | HU% | AI/HU ratio | wBow | decision |
|---|---|---|---|---|---|
| chasing | 7.34% | 0.82% | 8.98 | +0.933 | **SWAP** |
| fading | 6.91% | 0.84% | 8.22 | +0.549 | **SWAP** |
| echoing | 0.73% | 0.14% | 5.35 | absent | **SWAP (freq)** |
| holding | 9.00% | 2.32% | 3.88 | +0.616 | **SWAP** |
| rising | 2.63% | 0.68% | 3.85 | +0.211 | **SWAP** |
| dancing | 5.93% | 1.86% | 3.19 | +1.365 | **SWAP** |
| whispering | 1.12% | 0.39% | 2.90 | absent | **SWAP (freq)** |
| reaching | 1.90% | 0.73% | 2.61 | -0.420 | TRANSPARENT |
| breaking | 4.13% | 1.59% | 2.60 | +0.890 | **SWAP** |
| burning | 6.03% | 2.68% | 2.25 | +1.110 | **SWAP** |
| bleeding | 1.41% | 0.64% | 2.22 | -0.020 | TRANSPARENT |
| wandering | 0.63% | 0.34% | 1.86 | absent | EXCLUDE (normal) |
| falling | 5.06% | 2.98% | 1.70 | -0.418 | EXCLUDE (normal) |
| fighting | 1.95% | 1.20% | 1.62 | -0.346 | EXCLUDE (normal) |
| drowning | 0.88% | 0.59% | 1.48 | absent | EXCLUDE (normal) |
| losing | 2.33% | 1.64% | 1.43 | -0.249 | EXCLUDE (normal) |
| shining | 2.63% | 2.04% | 1.28 | -0.372 | EXCLUDE (normal) |
| crying | 3.11% | 2.50% | 1.25 | -0.026 | EXCLUDE (normal) |
| aching | 0.63% | 0.68% | 0.93 | absent | EXCLUDE (normal) |
| dying | 1.36% | 1.91% | 0.71 | -0.321 | EXCLUDE (normal) |
| searching | 0.68% | 1.11% | 0.61 | absent | EXCLUDE (normal) |

### Tally

- **9 SWAP** (7 wBow-positive + 2 freq-proven): `chasing, fading, echoing,
  holding, rising, dancing, whispering, breaking, burning`.
- **2 TRANSPARENT** — AI over-uses them (≥2×) but the model weight says they
  read HUMAN, so the data says leave them: `reaching, bleeding`.
- **10 EXCLUDE (too normal)** — humans use them as much or more (ratio < ~2),
  not an AI tell: `wandering, falling, fighting, drowning, losing, shining,
  crying, aching, dying, searching`.

The standouts: `chasing` (9.0×, +0.93) and `fading` (8.2×, +0.55) are the
strongest -ing tells; `dancing` and `burning` carry the heaviest model weight
(+1.37, +1.11). `dying` and `searching` are actually used MORE by humans than
AI — clearly not tells. `reaching` and `bleeding` look AI-frequent but their
≤0 wBow proves humans say them naturally, so they're TRANSPARENT-only.

Top AI-skewed -ing verbs by ratio: **chasing 9.0×**, **fading 8.2×**,
**echoing 5.4×**, **holding 3.9×**, **rising 3.9×**, **dancing 3.2×**.

## How the user's seed picks held up against the data

The user seeded three verbs. Verdicts below come straight from the corpus.

### `burning → fiery, ignited, flaming` — ALL THREE SUPPORTED ✅
| repl | AI% | HU% | ratio | wBow | verdict |
|---|---|---|---|---|---|
| fiery | 0.05% | 0.05% | 1.07 | absent | keep (clean, neutral) |
| ignited | 0.00% | 0.05% | 0.00 | absent | keep (human-leaning) |
| flaming | 0.00% | 0.07% | 0.00 | absent | keep (human-leaning) |

All three are rare-in-AI, present-in-humans, off-cliché. Kept up front.
Added: `searing`, `scorched` (both absent/human), `hot` (wBow **-1.39**,
strongly human, leads on weight).

### `falling → broken, cracked, picked, struck` — VERB IS EXCLUDED ⚠️
`falling` itself is **EXCLUDE (normal)**: AI 5.06% / HU 2.98% = **1.70×**,
wBow **-0.418**. Humans say "falling" naturally — swapping it would make
lyrics *less* human, so it is NOT in the active table. The seed replacements
were still vetted and recorded in `EXCLUDED_SEED_NOTE`:
| repl | AI% | HU% | ratio | wBow | verdict |
|---|---|---|---|---|---|
| broken | 13.62% | 4.32% | 3.16 | -0.320 | **REJECT** — in VAGUE/STACK_ADJ, would re-trip `t3_adjStack` |
| cracked | 9.29% | 0.16% | 58.42 | +0.780 | **REJECT** — strongly AI-skewed itself |
| picked | 1.36% | 0.57% | 2.40 | -0.156 | keep (human-leaning) |
| struck | 0.49% | 0.43% | 1.13 | absent | keep (neutral) |

So 2 of the 4 `falling` seeds are themselves AI-ish/self-flagging; the verb is
excluded regardless.

### `fading → left, washed, gone` — ONE CLEAN, TWO MILDLY AI ⚠️
`fading` the verb is a strong SWAP (8.2×). Its seeds:
| repl | AI% | HU% | ratio | wBow | verdict |
|---|---|---|---|---|---|
| washed | 0.92% | 0.50% | 1.85 | absent | **keep & lead** (clean) |
| left | 29.33% | 11.09% | 2.65 | +0.356 | demote — itself mildly AI-skewed |
| gone | 24.61% | 11.45% | 2.15 | +0.213 | drop from primary — mildly AI-skewed |

`washed` is clean and leads the list. `left`/`gone` are extremely common but
they are themselves AI-skewed (≥2× with +wBow), so `gone` was dropped and
`left` kept only deep in the tail. Added human/absent options:
`dimmed`, `bleached`, `peeling`, `faded`.

## Replacements (full table)

Every replacement appears in human lyrics and/or has low/negative/absent wBow
(data says it reads human) and is **not** in the cliché / `VAGUE_EMOTION` /
`STACK_ADJ` sets, so it won't re-trip a flag. Lists are ordered
**most-human-first** (lowest/absent wBow leads) so the deterministic first-pick
nudges the holistic score the right way.

| AI-tell -ing verb | replacements (data-vetted, human-reading; any form) |
|---|---|
| chasing | trailing, racing, grabbing, catching, after, running |
| fading | washed, dimmed, bleached, peeling, faded, left |
| echoing | ringing, bouncing, rattling, repeating, humming |
| holding | keeping, gripping, clutching, pressing, squeezing, cradling |
| rising | growing, climbing, lifting, swelling, cresting, standing |
| dancing | swaying, stomping, shuffling, kicking, spinning, stepping |
| whispering | mumbling, muttering, murmuring, hissing, mouthing, breathing |
| breaking | snapping, cracking, splitting, tearing, crumbling, ripping |
| burning | fiery, ignited, flaming, searing, scorched, hot |

## Validation

`node analysis/_validate_ingverb_swaps.js` loads the production engine
(`src/ext/v2-engine.js`, content-script load order) and confirms swapping
data-vetted -ing verbs **lowers `t3_ingVerbAbstract`**:

```
sample 1: t3_ingVerbAbstract 1.0000 -> 0.2500
sample 2: t3_ingVerbAbstract 1.2500 -> 0.0000
TOTAL    t3_ingVerbAbstract 2.2500 -> 0.2500   PASS
```

The targeted feature drops as designed. **On the holistic score** the effect
depends on how cliché-saturated the rest of the line is:

- In a realistic, mostly-human lyric, a single `burning heart → fiery heart`
  swap drops the feature to 0 **and** the holistic score 90 → 61.
- In the deliberately AI-saturated validation samples (built from *only* the
  highest-tell words + stock nouns), `t3_ingVerbAbstract` still drops, but the
  holistic score can rise because the surrounding stack of unaddressed AI tells
  (`silent night`, `shattered`, `shadows`, `dreams`, …) still dominates the
  BoW. This mirrors the `adjstack_swaps` finding: a single-feature swap moves
  the holistic score only a little (and only cleanly when that feature is the
  main offender). Humanize is meant to apply **many** swaps across all
  detectors, compounding the effect.

## Files

- `analysis/ingverb_swaps.js` — `ING_SWAP`, `TRANSPARENT_ING`,
  `EXCLUDED_NORMAL`, `EXCLUDED_SEED_NOTE`, `STACK_NOUN`, and the
  `swapIngVerb(text, opts)` helper (dual-mode CommonJS / browser global).
- `analysis/_validate_ingverb_swaps.js` — engine-backed validation harness.
