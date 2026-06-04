# Prepositional / Scene-Phrase Swap Table — DATA EVIDENCE

Data-vetted, **meter-matched** replacement table for the Suno Slop Detector
**Humanize** plan. Feature `s_prepInTheNight` (`src/ext/patterns.browser.js`,
exposed by `src/ext/v2-engine.js` as `s_prepInTheNight` = count / nLines) flags
stock prepositional scene tags. The detector regex is exactly:

```js
prepInTheNight: t => (lc(t).match(/\bin the (dark|night|rain|cold|morning|silence|shadows)\b/g) || []).length
```

So the ONLY phrases this feature matches are the seven `in the X` tags below —
"through the storm" / "in the cold night" (mentioned in the brief) are **not**
matched by this regex (they belong to the cliché `PHRASES` list, a different
feature). Humanize swaps a flagged phrase for a **same-syllable-count**
alternative that the DATA says reads human.

**The corpus decided.** Every phrase — flagged and replacement — was measured
against the corpus before inclusion.

## Method

- **AI%** = document-frequency in the AI corpus — **2056 songs**
  (`corpus/models/*.json`, excluding `*.heldout` and `*.bak`; English text via
  `lyrics_en` else `lyrics`).
- **HU%** = document-frequency in the human corpus — **4547 real-human lyric
  docs** (`/tmp/human_lyrics_cache.json`, ignoring empty-string fetch-misses;
  the cache was mid-fetch, so N grew from the 4215 used by adjstack).
- **AI/HU ratio** = AI% / HU%. Doc-frequency = "does the song contain the phrase
  at all", which is what a reader actually notices.
- **syllables** via `analysis/prosody.js` `syllables()` (the same estimator the
  engine's craft detectors use), summed per word.

Reproduce: `node analysis/_compute_prepphrase_data.js` (flagged + seeds) and
`node analysis/_compute_prepphrase_pool.js` (expanded candidate pool).

## Decision rule

| condition | decision |
|---|---|
| AI/HU ratio ≥ ~2 | **SWAP** — genuinely AI-skewed scene tag |
| AI/HU ratio < ~2 | **TRANSPARENT** — humans use it as much; still trips the flag, but DON'T swap |

## STEP 1+2 — Flagged phrases (the data decides inclusion)

AI corpus N=2056 · Human corpus N=4547

| flagged phrase | AI% | HU% | AI/HU ratio | syllables | decision |
|---|---|---|---|---|---|
| in the dark | 7.93% | 1.39% | **5.72** | 3 | **SWAP** |
| in the silence | 1.26% | 0.22% | **5.75** | 4 | **SWAP** |
| in the rain | 4.62% | 1.08% | **4.29** | 3 | **SWAP** |
| in the cold | 1.31% | 0.59% | **2.21** | 3 | **SWAP** |
| in the morning | 4.09% | 1.98% | **2.06** | 4 | **SWAP** |
| in the night | 1.75% | 1.54% | 1.14 | 3 | TRANSPARENT |
| in the shadows | 0.24% | 0.35% | 0.69 | 4 | TRANSPARENT |

**5 SWAP, 2 TRANSPARENT.** The brief's guess that "in the rain" might be
too-normal was *wrong* — at 4.29× it is strongly AI-skewed and IS swapped. The
phrases that turned out too-normal are **"in the night" (1.14×)** — humans say
it just as often — and **"in the shadows" (0.69×)** — humans say it *more*.
Those two are TRANSPARENT-only.

## STEP 3 — Replacements (meter-grouped, data-vetted)

A replacement is kept only if (a) its `prosody.syllables()` count **equals** the
flagged phrase's (±0; no ±1 fallback was needed) and (b) it is not itself a
flagged `in the X` tag / cliché. We **prefer human-attested** phrases (HU% > 0)
with AI/HU ratio ≤ ~2; a few plain concrete phrases that appear in neither
corpus (0%/0%) are included as low-confidence novelty options, marked `*`.

### NIGHT / DARK / COLD family — 3 syllables

Replaces `in the dark` (5.72×) and `in the cold` (2.21×).

| replacement | syll | AI% | HU% | ratio | note |
|---|---|---|---|---|---|
| all night long | 3 | 0.54% | 0.66% | 0.81 | attested, human-leaning ✅ |
| down the road | 3 | 0.44% | 0.44% | 1.00 | attested, neutral ✅ |
| after dark | 3 | 0.24% | 0.11% | 2.21 | attested |
| late at night | 3 | 0.58% | 0.33% | 1.77 | attested |
| well past dark | 3 | 0.00% | 0.00% | — | plain/concrete novelty `*` |
| out past dark | 3 | 0.00% | 0.00% | — | plain/concrete novelty `*` |

### RAIN family — 3 syllables

Replaces `in the rain` (4.29×).

| replacement | syll | AI% | HU% | ratio | note |
|---|---|---|---|---|---|
| soaking wet | 3 | 0.05% | 0.07% | 0.74 | attested, human-leaning ✅ |
| coming down | 3 | 0.49% | 0.44% | 1.11 | attested, neutral ✅ |
| washed away | 3 | 0.19% | 0.09% | 2.21 | attested |
| cold and wet | 3 | 0.00% | 0.00% | — | plain/concrete novelty `*` |

### MORNING / SILENCE family — 4 syllables

Replaces `in the morning` (2.06×) and `in the silence` (5.75×).

| replacement | syll | AI% | HU% | ratio | note |
|---|---|---|---|---|---|
| out in the storm | 4 | 0.00% | 0.02% | (HU only) | attested, human-only ✅ |
| caught in the rain | 4 | 0.00% | 0.02% | (HU only) | attested, human-only ✅ |
| when the lights go | 4 | 0.15% | 0.11% | 1.33 | attested |
| out in the rain | 4 | 0.24% | 0.13% | 1.84 | attested |
| out on the porch | 4 | 0.05% | 0.02% | 2.21 | attested |
| quarter to three | 4 | 0.05% | 0.02% | 2.21 | attested |
| out past midnight | 4 | 0.00% | 0.00% | — | plain/concrete novelty `*` |
| wet to the bone | 4 | 0.00% | 0.00% | — | plain/concrete novelty `*` |

## How the user's SEED picks fared

The brief seeded specific picks. The data vetted each one — several were
**rejected** because they are themselves AI-ish or unverifiable:

### night-family seeds (~3 syll)

| seed | syll | AI% | HU% | ratio | verdict |
|---|---|---|---|---|---|
| through the night | 3 | 1.99% | 1.14% | 1.74 | OK-ish but borderline; not used (close to its own flagged sibling "in the night") |
| **dead of night** | 3 | 0.34% | 0.07% | **5.16** | ❌ REJECTED — *itself* an AI tell (5.16×), as AI-skewed as the phrase it replaces |
| **pitch black night** | 3 | 0.00% | 0.00% | — | ❌ REJECTED — appears in **neither** corpus; cannot claim it "reads human", and it is a stacked cliché image |
| **passing dark** | 3 | 0.00% | 0.00% | — | ❌ REJECTED — appears in neither corpus; unverifiable |
| **12 o'clock** | **2** | 0.00% | 0.02% | — | ❌ REJECTED — **wrong meter** (2 syllables, not 3) |

### rain-family seeds (~3 syll)

| seed | syll | AI% | HU% | ratio | verdict |
|---|---|---|---|---|---|
| washing down | 3 | 0.05% | 0.00% | (AI only) | ❌ REJECTED — appears only in the AI corpus, never in humans |
| **pouring down** | 3 | 0.15% | 0.04% | **3.32** | ❌ REJECTED — itself AI-skewed (3.32×) |
| washed away | 3 | 0.19% | 0.09% | 2.21 | ✅ KEPT (attested in humans, modest ratio) |
| while it rains | **4** | 0.00% | 0.00% | — | ❌ REJECTED — wrong meter (4 syll) **and** unattested |
| raining on | 3 | 0.00% | 0.00% | — | not used — unattested |

**Headline on the seeds:** the user's instinct that `pitch black night` might be
cliché was right — but the data shows it is worse than cliché, it is *invisible*
(0%/0% — not used by AI or humans, so we can't vouch it reads human). The two
genuinely AI-ISH seeds are **`dead of night` (5.16×)** and **`pouring down`
(3.32×)** — both are as much an AI tell as the phrase being replaced, so swapping
to them would not humanize. The most reusable seed was **`washed away`** (kept).
Replacements were therefore drawn mostly from the expanded, human-attested pool
(`all night long`, `soaking wet`, `coming down`, `out in the storm`, etc.).

## STEP 4 — Validation

`node analysis/_validate_prepphrase_swaps.js` loads the production engine
(content-script load order) and confirms swapping data-vetted scene phrases
**lowers `s_prepInTheNight`** while leaving TRANSPARENT phrases untouched:

```
sample 1 (all SWAP):  s_prepInTheNight 1.0000 -> 0.0000   holistic 99 -> 94 (pAI .9865 -> .9360)
sample 2 (2 SWAP + 2 TRANSPARENT controls): 1.0000 -> 0.5000   (the 0.5 = the two
        TRANSPARENT phrases "in the night" + "in the shadows", correctly preserved)
TOTAL    s_prepInTheNight 2.0000 -> 0.5000    PASS
```

As with the adjective-stack table, a single swap moves the holistic score only a
little; the structural feature itself drops to zero. Humanize is designed to
apply many such edits across a lyric, compounding the effect.

## Files

- `analysis/prepphrase_swaps.js` — `PHRASE_SWAP` (`{phrase:{syll, alts:[...]}}`),
  `TRANSPARENT_PHRASE` set, `REJECTED_AS_AI` set, and the `swapPrepPhrase(text,
  opts)` helper (dual-mode CommonJS / browser global).
- `analysis/_compute_prepphrase_data.js` — flagged-phrase + seed data pass.
- `analysis/_compute_prepphrase_pool.js` — expanded candidate-pool vetting.
- `analysis/_validate_prepphrase_swaps.js` — engine-backed validation harness.
