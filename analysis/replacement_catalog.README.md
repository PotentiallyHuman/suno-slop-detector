# Replacement catalog — summary & validation

Meter-matched, context-safe line-REPLACEMENT pool for the "Humanize" feature.
Module: `analysis/replacement_catalog.js` (dual-mode: `module.exports` + `globalThis.ReplacementCatalog`).
Design + hard rules: `analysis/REPLACEMENT_CATALOG_DESIGN.md`.

## What it exports
- `bySyllable` — `{5:[{line,tags},…], … 12:[…]}` (EXACT syllable buckets via `prosody.syllCount`).
- `CONTEXT_ALLOWED` — tag-allow map per detected song context (the HARD-RULE-1 table).
- `detectContext(lyrics)` → one of `HUMAN / SELF / CREATURE / PLACE_NATURE / OBJECT_ABSTRACT / UNKNOWN` (cheap regex).
- `pickReplacement(removedLine, lyrics)` → `{line, tags, syllables, context}` or `null`.
  Matches the removed line's syllable count (exact, then ±1), filters to tags ⊆ the
  context's allowed set, **prefers ENV-only**, rotates to avoid repeats, and returns
  `null` rather than ever violating a hard rule.
- `resetRotation()` — clears the per-session no-repeat memory.

## How every line was vetted (no engine files modified)
Each candidate passed `analysis/_vet_candidates.js`, which rejects any line containing:
- a cliché phrase from `analysis/patterns.js` `PHRASES` or tier3 `AI_CLICHE_PHRASES`
- a `VAGUE_EMOTION` / `STACK_ADJ` / `ING_VERB` / ing-emotion word (tier3 + patterns)
- an adjective-stack pair (`STACK_ADJ`+`STACK_NOUN`)
- an inanimate→animate-verb personification (tier3 `INANIMATE`/`ANIMATE_VERBS`)
- an abstract line-ending word (patterns `abstractEnding`)
- any digit / proper-noun cue.

Syllable counts come from `analysis/prosody.js` `syllCount()` (computed, not guessed).
Apostrophes are ASCII (`'`) so the engine's `[a-z']+` tokenizer keeps contractions whole.

## Counts

**Total: 229 lines**, buckets 5–12.

| syllables | lines |
|-----------|-------|
| 5  | 22  |
| 6  | 17  |
| 7  | 16  |
| 8  | 110 |
| 9  | 24  |
| 10 | 12  |
| 11 | 7   |
| 12 | 21  |

**Tag appearances** (a line can carry several tags):

| tag       | count |
|-----------|-------|
| ENV       | 125 |
| OBJECT    | 77  |
| DOMESTIC  | 56  |
| PLACE     | 55  |
| URBAN     | 37  |
| PERSON    | 22  |
| BODY      | 14  |

ENV is intentionally the largest pool — it is the universal default that is safe in
every context (the only tag UNKNOWN permits), per HARD RULE 6.

## Validation (`node analysis/_test_replacement_catalog.js`)

**A. Catalog integrity** — 229 lines, `gateFail=0  bucketMismatch=0  curlyQuote=0`, no dups.

**B. detectContext** — correct on all six contexts (HUMAN/SELF/CREATURE/PLACE_NATURE/OBJECT_ABSTRACT/UNKNOWN).

**C. Score-drop (real "Humanize" workflow = rewrite the flagged vague lines across the song):**

| sample              | lines swapped | SlopV2 score | drop |
|---------------------|---------------|--------------|------|
| AI-cliché ballad    | 8 | 97 → 26 | **-71** |
| AI-mood-stack       | 4 | 78 → 3  | **-75** |
| AI-simile/adjstack  | 4 | 18 → 9  | **-9**  |

**Hard-rule subset check** (separate run): across all six contexts × 7 removed-line
lengths × 30 picks each = 210 picks/context, **0 tag violations**. CREATURE/PLACE_NATURE/
OBJECT_ABSTRACT/UNKNOWN never receive a PERSON/BODY/DOMESTIC line (the cat/boots rule holds).

## Key finding (honest, important)
The model (`SlopV2`) is **holistic / bag-of-words dominated**. Replacing a *single* vague
line moves the score only a little — and because removing high-weight AI tokens
(`shattered`, `embers`, `dreams`, `light`) is what actually lowers the score, swapping one
low-weight line can even nudge it up a point or two. But the actual Humanize use case
rewrites **all** the flagged vague lines, and that produces a large, reliable drop
(−71/−75 on heavily-clichéd songs; smaller on songs that were already low-AI). The
per-line "drop" is therefore not guaranteed in isolation; the **whole-song rewrite is**.

## Build/helper files (not shipped in the extension)
- `analysis/_candidates_raw.js` — authored candidate lines + tags (source).
- `analysis/_vet_candidates.js` — the forbidden-lexicon gate + syllable helper.
- `analysis/_bucket_literal.txt` — generated bucketed literal (intermediate).
- `analysis/_test_replacement_catalog.js` — the validation/self-test above.
