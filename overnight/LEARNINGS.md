# Overnight humanizer learnings — the decision tree for turning AI slop into original lines

This file is the running brain of the overnight loop. Each cycle: mine random AI songs, pick ONE
validated improvement through a rotating lens, A/B-test it on ~200 random songs (keep the best by
EDIT QUALITY — cliché removed, in-rhythm, grammatical, coherent — not by AI%), commit on a win,
auto-revert on a loss. Append what was learned. Goal by morning: a sharp true/false decision flow
for "what replaces what, and when."

## THE DECISION TREE (current state — refine every cycle)

For each lyric line, worst-AI first, only touching lines that carry their own evidence:

1. **Is it a verbatim REPEAT of an earlier line (a hook)?**
   - First occurrence → KEEP (sacred; the hook is the song).
   - A later repeat, and the song reads AI → can `dupVariant` make a corpus-validated variation
     ("we're burning bright" → "burning bright, still")? → VARY. Else keep.
   - GAP: dupVariant only handles pronoun-contraction / "every" openers. Gerund/noun-opener
     choruses ("Lean on me", "Riding in a pickup") have no handle yet. (seen in user songs 3,6,11)

2. **Is it a MOLD frame?** (`Every …`, `maybe X maybe Y`, `They say X but they don't Y`, `too X to Y`)
   - Is it load-bearing (removing the line drops the song's log-odds)? → RESTRUCTURE, keeping every
     user word: Every→That/This/Some (rotated), "every single"→"This one", maybe→Perhaps/Could be,
     They-say→"Why do they …?", double-every→each/each. No em-dash output (127× AI-leaning).

3. **Does the line carry CLICHÉ words?** For each cliché word, swap it ONLY if ALL true:
   - not inside a protected idiom ("caught fire", "my love", "out of your hands", …)
   - the v8 model does NOT read the word as strongly human (weight ≥ −0.5; else it's a human word —
     keep it; this caught diamond/−1.32, thunder/−1.78)
   - not a possessive/contraction ("love's", "don't")
   - Substitute is chosen: **rhyme-safe** (line-final keeps the stressed vowel), **syllable-matched
     (±1, hard reject beyond — "stratosphere" can't sit where "sky" sat)**, theme-fit by the song's
     own embedding, never itself a cliché, a **real sung word**, and **song-seed-varied** so two
     songs don't get the same substitute (but only among the top-quality picks).

4. **Else** → no safe mechanical edit. If the song still reads AI, its AI-ness is phrase TYPICALITY
   or pure structure (uniform line lengths, all-perfect rhyme, zero specifics). Hand to the writer:
   diagnose the shape + ask for one real anchor (a street, a time, a name). Never invent content.

## CONFIRMED FACTS (don't relearn)

- **Two song classes.** STRUCTURAL (repeated chorus + frames + clichés) crater (Hydrogen 100→15%).
  TYPICALITY (AI-ness is the phrasing itself) barely move; the engine correctly refuses. ~18% of
  AI songs are no-op-able and that's honest, not a bug.
- **AI% (the displayed score) is the WRONG optimization target.** A saturated song's % can't move
  while the log-odds drop 40×; and the % can be gamed (diamond→jewel lowered cliché-density but is
  broken English). Optimize EDIT QUALITY; use AI% only as a faint tiebreaker.
- **The v8 per-word weights are collinear-noisy in mid-range** (lane/+0.34 ≈ record/+0.37, opposite
  human verdicts). Trust only extreme weights (<−0.5). Curate substitute quality in the table.
- **Phrase frequency is NOT a good swap guard** ("the silence"/58 → stillness is fine; "my voice"/41
  → tone is bad, yet silence's phrase is more frequent). Substitute QUALITY is the signal.
- **Bad pools found + pruned** (300-song miner, no hand-feeding): night→dusk, voice→tone,
  song→record, diamond→jewel, sky→stratosphere, memory→snapshot, silence→vacuum, dust→grit,
  storm→squall, lost→mislaid/sideways, broken→snapped. All removed.

## OPEN BUGS / TODO (highest value first)

- **love→choose/longing/adore in NOUN position** ("I call it love" → "I call it choose"): the verb-
  swap fires when "love" is a noun without a possessive. Need a noun-vs-verb check that handles
  "call it love", "it's love", "a love".  ← do this first
- **idiom "hands up" → "palms up"**: add fixed phrases (hands up, heads up) to the idiom guard.
- **obscure substitutes** that read worse than the slop: pewter, lampposts, porchlights, snapshot —
  prune any substitute with ~0 real-lyric frequency unless it's a common natural word.
- **dupVariant has no handle on gerund/noun-opener choruses** — find a validated variation op.
- **hands→palms over-reused (44×)** and mildly stilts collocations — demote palms / expand pool.

## LENS ROTATION (one focus per cycle)
POOLS · BADPAIRS · RESIDUAL(new molds) · NOOP · VOWEL · SYLLABLE · WIT/REGISTER · SYNTHESIS

## CYCLE LOG
(append one line per cycle: lens, change tried, A/B verdict, what it taught)
- cycle 0 (seed): built A/B-quality gate + 300-song miner. Pruned 11 bad pools (A/B win:
  bad swaps 56→43). Added syllable hard-reject. Found the love-noun-position + hands-up + obscure-
  substitute bugs — queued above.
