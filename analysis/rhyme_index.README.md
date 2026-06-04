# Phonetic rhyme index — `analysis/rhyme_index.js`

Rhyme-**preserving** end-of-line replacement for the Humanize transforms (see
`REPLACEMENT_CATALOG_DESIGN.md` §6). When a line ends on a feeling/abstract word
(*pain, soul, heart, free, fire, dreams, alone, tonight*…), this index suggests an ending that

1. **rhymes by sound** with the line's rhyme **partner** (so the song's scheme is kept),
2. **matches the syllable count** of the original ending (±0; ±1 only when asked),
3. is itself **concrete** — not a feeling/abstract word and not in the cliché lexicon.

It supports single-word endings **and** common 1–2-word endings
(`"in vain"`, `"to blame"`, `"by name"`, `"on my own"`, `"in the rain"`, `"down the line"`).

## How it's built

- **Phonetics come only from `prosody.js`** — `Prosody.rhymeKey()` (which already folds the
  eye-rhyme overrides in `eye_rhymes.js`), `Prosody.syllables()` / `syllCount()`,
  `Prosody.orthoRime()` / `eyeRhyme()`. No new phonetic model, no dictionary, no network.
  `rhymeKey` is **authoritative**: the index buckets every entry by whatever key it returns.
- **Vocabulary (1)** — ~1,300 curated **concrete, common, non-cliché** English line-ending words
  (objects, places, body, weather, actions). No proper nouns, no brands, no copyrighted text.
- **Endings (2)** — 135 common **1–2-word endings** keyed on their last word.
- **Flags (3)** — each entry carries `abstract:bool` and `cliche:bool`, computed against the live
  engine's feeling/abstract + cliché sets (mirrored from `tier3.browser.js` `VAGUE_EMOTION` /
  `STACK_ADJ` / `STACK_NOUN` and `patterns.browser.js` `abstractEnding` / `PHRASES`). Flagged
  entries are **never suggested** by default.
- **Index (4)** — `byRhyme[rhymeKey] = [{ ending, words, key, syll, abstract, cliche }]`,
  each bucket sorted concrete-first, then by syllable count.

### A note on the engine's `rhymeKey`
`rhymeKey` is an **orthographic rime** (vowel-class + coda), per its Hirjee–Brown coarse-vowel
design. Consequences the index honours rather than fights:
- `pain / rain / brain / train / plane` group as **`An`**; `blame / name / game / flame` group
  **separately** as `Am`. (The §6 prose lumps them, but the engine does not — we follow the engine.)
- `heart` → **`OV:AR`** and `alone` → **`OV:OHN`** via the eye-rhyme overrides, so each is a small
  near-singleton group; the realistic path for these is rhyming with the **partner** word.
- A handful of silent-e / syllabic-L spellings (*apple, mile, bale, hole, city*) collapse to bare
  vowel keys (`E`, `I`) and would falsely "rhyme" with *free/tree*. A **tail-compatibility guard**
  (`orthoRime` coda + eye-rhyme check, prosody-only) screens these out by default
  (`looseTail:true` disables it).

## Contents

| metric | value |
|---|---|
| total entries | **1345** |
| distinct rhyme groups | **322** |
| concrete (non-abstract, non-cliché) entries | **1300** |
| curated concrete words | 1307 |
| 1–2-word endings | 135 |

Largest groups: `Es` (124), `E` (53), `Er` (43), `An` (30), `Ers` (24), `El` (23), `Or` (20),
`In` (20), `Et` (18), `Op` (15), `Ar` (14), `On` (14).

## API

```js
require('./prosody.js');            // must load first (provides Prosody)
const R = require('./rhyme_index.js');

R.byRhyme                           // { rhymeKey: [{ending, words, key, syll, abstract, cliche}] }

R.rhymesFor(word, {
  syllables: 1,                     // exact syllable target (null = any)
  tolerance: 0,                     // allow ±N syllables
  excludeAbstract: true,            // default true  — drop feeling/abstract endings
  excludeCliche:   true,            // default true  — drop cliché-lexicon endings
  looseTail: false,                 // default false — keep the silent-e collision guard on
});                                 // -> [entry, ...] that rhyme with `word`

R.suggestConcreteRhyme(endWord, partnerEndWord, {all:false, tolerance:0});
// -> ONE concrete, non-abstract, syllable-matched ending that rhymes with `partnerEndWord`
//    (falls back to rhyming with `endWord` itself); null if none exists ("leave the line").
//    {all:true} returns the ranked array of ending strings instead.
```

`suggestConcreteRhyme` rhymes with the **partner** first (the partner is what defines the scheme),
matches the **endWord's** syllable count, never echoes the original word, and returns **`null`** when
no same-rhyme / same-syllable / non-feeling option exists — i.e. the §6 rule "else leave the line."

## Validation

For each requested word: its `rhymeKey` and syllable count (from prosody), the top **same-syllable
concrete** rhymes `rhymesFor` returns, the top **2-syllable** results (showing the 1–2-word endings),
and `suggestConcreteRhyme(word, partner)` for a realistic partner that sets the scheme.

### `pain` — key `An`, 1 syll, partner `rain`
- same-syllable concrete: **can, chain, crane, drain, fan, grain, lane, pan, pane, plane, train**
- 2-syllable (incl. phrase endings): **curtain, dustpan, fountain, `in vain`, mountain**
- `suggestConcreteRhyme("pain","rain")` → **`can`** (full: can, chain, crane, drain, fan, grain)
- The §6 headline — *"...with the **pain**" → "**in vain**"* — appears in the 2-syll bucket
  (`"in pain"` 2 syll → `"in vain"` 2 syll). `"to blame"`/`"by name"` live under key `Am`
  (the engine's grouping), reachable when the partner rhymes on `Am`.

### `soul` — key `Ol`, 1 syll, partner `goal`
- same-syllable concrete: **coal, foal, cool, pool, school, stool, tool, soil, boil**
  *(`soil/boil` are the engine's coarse-vowel slant under `Ol` — accepted by design)*
- `suggestConcreteRhyme("soul","goal")` → **`boil`** (full: boil, coal, cool, foal, pool, school)

### `heart` — key `OV:AR`, 1 syll, partner `start`
- `heart` is a near-singleton under its eye-rhyme override key, so direct same-key concretes are
  sparse; the partner path carries it: `suggestConcreteRhyme("heart","start")` → **`cart`**
  (rhymes with the partner `start`, key `Art`, 1 syll, concrete).

### `free` — key `E`, 1 syll, partner `sea`
- same-syllable concrete: **bee, key, knee, pea, tea, tree, eye**
- 2-syllable: **money, honey, coffee, valley, barley, chimney, pulley**
  *(silent-e/`-le` collisions like apple/mile are filtered out by the tail guard)*
- `suggestConcreteRhyme("free","sea")` → **`bee`**

### `fire` — key `Ir`, 1 syll, partner `wire`
- same-syllable concrete: **pier, plier, stir, wire**
- 2-syllable: **`for hire`**
- `suggestConcreteRhyme("fire","wire")` → **`pier`**

### `dreams` — key `Ems`, 1 syll, partner `streams`
- same-syllable concrete: **beams, streams**
- `suggestConcreteRhyme("dreams","streams")` → **`beams`**

### `alone` — key `OV:OHN`, 2 syll, partner `stone`
- The `OV:OHN` override group holds only 1-syllable concretes (stone/phone/bone), so **no 2-syllable
  concrete same-rhyme exists** → `suggestConcreteRhyme("alone","stone")` → **`null`**
  (correctly the "leave the line" case).
- With `{tolerance:1}` it relaxes to **bone, phone, `to the bone`** — useful when ±1 syllable is OK.

### `tonight` — key `Ight`, 2 syll, partner `light`
- same-syllable concrete: **flashlight**
- `suggestConcreteRhyme("tonight","light")` → **`flashlight`**
- With `{tolerance:1}`: **flashlight, `holding tight`, `out of sight`** (the 1–2-word ending pool).

---
*Pure-JS, text-only, offline. Built on `prosody.js` primitives; no copyrighted text, no proper
nouns, no network. Dual-mode: `module.exports` (Node) and `globalThis.RhymeIndex` (browser).*
