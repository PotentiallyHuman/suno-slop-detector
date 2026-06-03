# Multi-Perspective Detector System ("the JSON as a panel of craft experts")

**Goal.** Approximate what a *rapper, poet, psychologist, philosopher, and storyteller* would each notice
in a lyric — using only **pure, deterministic JavaScript on the raw text**. No LLM, no network, no
embeddings. The model JSON stays a bag of learned **weights**; the "intelligence" lives in a growing
library of **detector flowcharts** that turn text into many true/false/scalar signals **plus a
human-readable report string per perspective**.

This is "tier-4": it extends the existing `t3_*` detectors (`src/ext/tier3.browser.js`) from ~13 to
~70 signals, organized by craft perspective, and reproduced identically in Node (training) and the
browser (inference) — the same dual-build pattern already used for `patterns`/`tier3`.

> Honesty principle (carried from the audit): every detector is a **proxy**, not understanding. We
> name what each gestures at, calibrate it on the corpus, and frame panel output as *tendencies*. A
> detector earns its place only if it measurably separates AI from human on our data.

---

## 1. Output contract

For each song, `Perspectives.analyze(text)` returns:

```jsonc
{
  "features": {                 // flat numeric/boolean -> fed to the model as t4_* (and standardized)
    "t4_rap_rhymeDensity": 1.8,
    "t4_rap_internalRhyme": 0.42,
    "t4_rap_multisyll": 0.15,
    "t4_rap_flowVariance": 0.31,
    "t4_poet_concreteRatio": 0.22,
    "t4_psy_interiority": 0.08,
    "t4_phil_argMarkers": 0.05,
    "...": 0
  },
  "perspectives": {             // per-lens score + the flowchart trace + a report string for the panel
    "rapper":      { "score": 0.34, "signals": {...}, "report": "Mostly perfect end-rhyme (AABB), ~0.4 internal rhymes/line, flat syllable count (low flow variance). A rapper would want more internal/multisyllabic play and a rhythm switch." },
    "poet":        { "score": 0.61, "signals": {...}, "report": "High abstraction, low sensory concreteness; relies on stock images (shadows, embers). One simile, no volta. A poet would push for a specific seen detail and a turn." },
    "psychologist":{ "score": 0.55, "signals": {...}, "report": "..." },
    "philosopher": { "score": 0.40, "signals": {...}, "report": "..." },
    "storyteller": { "score": 0.28, "signals": {...}, "report": "..." }
  }
}
```

- `features` → merged into `denseDict` (training) and `v2-engine` (inference); the trained model decides
  how much each matters. Score stays calibrated `sigmoid(z/T)`.
- `perspectives[*].report` → drives a richer craft panel (the 5✅/1🃏/5⚠️ notes can quote a perspective).
- `perspectives[*].score` = a *local* heuristic blend (for the panel only); the model uses `features`.

---

## 2. Shared primitives (`analysis/prosody.js`, bundled)

These are the load-bearing text→sound approximations. Validated in `/tmp/proto.js`.

| primitive | how (text-only) | use |
|---|---|---|
| `syllables(word)` | count vowel-letter groups `[aeiouy]+`; −1 silent final `e` (not `le`); +1 consonant+`le`; ~120-word exception list (rhythm, fire, every, people, business…) | meter, flow, density |
| `vowelClass(v)` | map a/e/i/o/u/y → A/E/I/O/U(/I) (collapse to ~6 vowel-sound classes; lets slant rhymes match) | rhyme, assonance |
| `rhymeKey(word)` | last vowel-group onward, vowels→classes (`bail`→`Al`, `pretend`→`End`) | perfect+slant end/internal rhyme |
| `tailVowelSeq(words,k)` | concat vowel-class sequence of last k words | **multisyllabic** rhyme (Hirjee-style longest matching vowel run) |
| `stressGuess(word)` | heuristic primary stress: penult for ≥3-syll, suffix rules (-tion, -ity), monosyllable content-word = stressed | meter, flow |
| `lines/stanzas(text)` | after `stripSectionLabels`; blank-line stanza split | scheme, arc, homogeneity |
| `posLite(word)` | suffix/closed-class heuristics → noun/verb/adj/adv/function | concreteness, argument, agency |
| lexicons | concreteness (sensory/imageable nouns), 5-senses, mental-state verbs, emotion-granularity (specific vs placeholder), connectives | poet/psych/phil signals |

Rhyme detection follows **Hirjee & Brown**: ignore consonants, match **vowel sequences**; rhyme density
= average longest matching vowel run per line; this captures internal, imperfect, and multisyllabic
rhyme that simple end-rhyme rules miss.

---

## 3. The perspective flowcharts

Each perspective is a tree of detectors. `→` shows the branch; each leaf emits a feature and a report
fragment. (Listing the signal set; full pseudocode in §5 for the hard ones.)

### 3.1 RAPPER — flow & rhyme density
- **Rhyme density**: rhymes per line (line-final + internal via `rhymeKey` matches within a window).
  AI tends to *only* perfect end-rhyme → low internal density.
- **Internal rhyme ratio** → e.g. "*went/bent…bail/ale*" within a bar.
- **Multisyllabic rhyme**: longest matching `tailVowelSeq` ≥2 across line ends (Rakim-style). Rare in AI.
- **Slant vs perfect ratio**: share of rhymes that match vowel-class but not exact spelling. Humans slant more.
- **Scheme regularity**: end-rhyme pattern entropy (AABB/ABAB vs irregular). AI = very regular.
- **Flow variance**: stdev of syllables-per-line (4/4↔6/8 switching = high). AI = monotone (your example).
- **Stress-pattern variance**: changes in stressed-syllable count per line.
- **Assonance/consonance density**: repeated vowel/consonant classes within lines.
- **Mosaic / compound rhyme** ("orange / door-hinge" via `tailVowelSeq`).
- **Enjambment** (line ends mid-phrase) vs end-stopped.
- *Report*: scheme + densities + the one thing to push ("add internal rhyme", "switch the cadence").

### 3.2 POET — imagery, sound & turn
- **Concreteness ratio**: imageable/sensory nouns ÷ abstract nouns (lexicon). AI skews abstract.
- **Sensory diversity**: how many of the 5 senses appear (sight-only = shallow).
- **Figurative density**: similes (`like/as a`), metaphor copulas ("X is a Y"), personification (reuse `inanimateAnimate`).
- **Fresh vs stock imagery**: ratio of cliché-lexicon images (shadows/embers/neon) to novel noun-pairs.
- **Sound devices**: alliteration runs, assonance, consonance (from primitives).
- **Meter regularity** + **enjambment ratio** (music vs sing-song).
- **Volta / turn**: detect a pivot (argument marker or sentiment flip between stanzas). AI rarely turns.
- **Abstraction-without-grounding**: abstract lines with no concrete anchor nearby.
- *Report*: imagery profile + "give one seen detail / add a turn".

### 3.3 PSYCHOLOGIST — interiority & realism
- **POV distribution**: 1st/2nd/3rd person pronoun mix + shifts.
- **Interiority**: mental-state verb density (think/realize/regret/wonder/refuse) — a modeled mind.
- **Emotional granularity**: specific emotions (ashamed, jealous, relieved) vs placeholders (broken, lost) — reuses `vagueEmotion` inverted.
- **Ambivalence / contradiction-holding**: same subject framed two ways (psych realism) — extends `inlineContradict`.
- **Specific autobiographical detail**: named objects/places/times (reuse `specificReferent`, `numericReferent`).
- **Agency vs passivity**: active "I did" vs passive/abstract subjects.
- **Stakes / consequence**: cause→effect about a *person* (connectives + 1st/2nd person).
- *Report*: "interior but generic feelings; add one specific, contradictory reaction."

### 3.4 PHILOSOPHER — argument & idea
- **Argument markers** (reuse `t3_argumentMarkers`) + **causal chains** (because/so/therefore → effect).
- **Conditional structures** (`when/if X, Y`) — reuse `whenConditionals`.
- **Universal↔particular ratio**: "everyone/always/no one" vs concrete instances; both present = grounded idea.
- **Paradox / antithesis** ("the more I X the less I Y", "half X half Y") — reuse `s_antithesisNotBut`, `s_halfXHalfY`.
- **Rhetorical questions** (reuse) and **definition/negation moves** ("it's not X, it's Y").
- **Idea recurrence / development**: a thesis line that returns transformed (vs verbatim chorus repeat).
- *Report*: "states a feeling but no idea/turn; pose the tension as a question or paradox."

### 3.5 STORYTELLER — narrative
- **Proper-noun / named-entity density**, **temporal sequence markers** (then/after/that night/by morning).
- **Concrete object density**, **scene/setting** (place lexicon), **dialogue presence** (quotes/"said").
- **Cause-effect connectors**, **character count** (distinct referents), **scene changes** (setting shifts).
- **Arc**: setup → turn → resolution detectable across stanzas (sentiment + temporal trajectory).
- *Report*: "a mood, not a story; add a who/where/when and one thing that happens."

> Several signals **reuse** existing `s_*`/`t3_*` detectors (don't duplicate) — tier-4 is the
> *organization into perspectives* + the **new** rhyme/flow/meter/concreteness primitives.

---

## 4. How a "score" emerges per perspective (panel only)
Each perspective computes a small weighted blend of its signals, z-scored against corpus means
(shipped in the model JSON as `t4Mean/t4Std`), then `sigmoid`. This is **only** for the panel's
narrative ("the rapper-lens says…"); the **classifier** uses the raw `t4_*` features with *learned*
weights, so we never hand-tune what decides AI-vs-human.

---

## 5. Hard-detector pseudocode (validated)

```js
// internal+end rhyme density (Hirjee-style, orthographic vowel-class approx)
function rhymeStats(text){
  const L = lines(text);
  let endPerfect=0,endSlant=0,internal=0,multi=0, lineSyll=[];
  const endKeys = L.map(l => rhymeKey(lastWord(l)));
  for(let i=0;i<L.length;i++){
    const ws = words(L[i]); lineSyll.push(ws.reduce((a,w)=>a+syllables(w),0));
    // internal: words within the line sharing a rhymeKey
    const k = ws.map(rhymeKey); const seen={};
    for(const x of k){ if(seen[x]) internal++; seen[x]=1; }
    // multisyllabic across consecutive line-ends: longest matching tail vowel seq
    if(i>0){ const m=longestCommonTailVseq(L[i-1],L[i]); if(m>=2) multi++; }
    // end rhyme vs a near neighbor (window 2)
    for(let j=Math.max(0,i-2); j<i; j++){
      if(endKeys[i]&&endKeys[i]===endKeys[j]){ exactWord(L[i],L[j])?endPerfect++:endSlant++; }
    }
  }
  const nL=Math.max(1,L.length);
  return {
    t4_rap_rhymeDensity:(endPerfect+endSlant+internal)/nL,
    t4_rap_internalRhyme: internal/nL,
    t4_rap_multisyll: multi/nL,
    t4_rap_slantRatio: endSlant/Math.max(1,endPerfect+endSlant),
    t4_rap_flowVariance: stdev(lineSyll)/Math.max(1,mean(lineSyll)),  // CV of syllables/line
    t4_rap_schemeEntropy: entropy(endKeyPattern(endKeys)),
  };
}
```
Syllable + rhymeKey primitives are the `/tmp/proto.js` versions (move to `analysis/prosody.js`, add the
exception list, fix the `C+le` double-count).

---

## 6. Integration & build
1. `analysis/prosody.js` (primitives) + `analysis/perspectives.js` (`analyze`) — Node-native.
2. Auto-wrap to `src/ext/prosody.browser.js` + `src/ext/perspectives.browser.js` (same wrapper as tier3).
3. Add `Perspectives.analyze(text).features` into `denseDict` (pipeline_tier3.js) **and** v2-engine.js
   (identical) → new `t4_*` columns in `combined_model.json`.
4. Retrain (`pipeline_tier3.js` `NO_EMBED=1` → `gen_model.js`), keeping the text-only/offline contract.
5. Panel: surface `perspectives[*].report` in `v2-panel.js` (a "craft lenses" section).
6. Load-order: prosody → perspectives → (after tier3, before v2-engine) in manifest + popup.html.

## 7. Calibration & guardrails
- Add each `t4_*` only if it shows separation (|mean_AI − mean_human| / pooled_std) on the corpus; log a
  SEPARATION_REPORT so we keep signals that earn it and drop noise.
- Watch false positives: cliché-heavy *human* rap (high rhyme density) must not auto-flag — that's why
  rhyme density is a *human*-leaning signal and clichés are separate; the model balances them.
- Keep reports as suggestions, never verdicts (tone rule).

## 8. Phasing
- **P1 (ship in v0.3 or v0.4):** `prosody.js` primitives + **RAPPER** + **POET** perspectives (highest-signal, most novel) → ~20 new `t4_*`. Retrain, measure separation.
- **P2:** PSYCHOLOGIST + PHILOSOPHER + STORYTELLER (heavy reuse of `t3_*`/`s_*`).
- **P3:** report-string panel UX + per-perspective joker moves.
</content>
