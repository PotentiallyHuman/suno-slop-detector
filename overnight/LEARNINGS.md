# Overnight humanizer learnings — the decision tree for turning AI slop into original lines

## NORTH STAR
Replace ANY AI-cliché line with something **original AND fitting** — fitting the song's theme, meter,
rhyme, and register. Word-swaps and frame-restructures are the proven-safe near term; the open
frontier is generating a genuinely new line that's still coherent (the n-gram rebuild was disproven —
it makes soup — so the path to "original" is unsolved and worth real creativity). Every cycle, hold
TWO perspectives at once: CLOSE-UP (this exact line: what's wrong, what fits) and OVERVIEW (what does
the pattern across 100s of songs say to change in the system). Alternate or fuse them — both must agree
before a rule ships.

## EVERY ~100 SONGS: STOP AND THINK
After each analyze run, write 2-3 sentences: what did these songs TEACH? Then choose — push further
in that direction, OR pivot to a direction not yet tried (a new lens, a new transform class, a new way
to measure "fitting"). Don't grind one idea; the goal is coverage of the whole problem. Creativity is
expected; thoroughness is required. A disproof is progress (it crosses a path off the map).

This file is the running brain of the overnight loop. Each cycle: mine random AI songs, pick ONE
validated improvement through a rotating lens, A/B-test it on ~200 random songs (keep the best by
EDIT QUALITY — cliché removed, in-rhythm, grammatical, coherent — not by AI%), commit on a win,
auto-revert on a loss. Append what was learned. Goal by morning: a sharp true/false decision flow
for "what replaces what, and when."

## DESIGN PHILOSOPHY (how to build the tree — read this BEFORE editing the tree)

The tree is not rigid true/false. When two rules collide, resolve it like a real system, not by
jamming one rule on top of another. Don't get stuck on the current shape — redesign the fork if a
better one fits the evidence.

- **PRIORITY (if/else):** order branches by confidence and by cost-of-being-wrong. The safest,
  highest-certainty rule fires first and the rest are `else`. Established order:
  hook-is-sacred > idiom/collocation protection > human-word guard > mold-restructure >
  word-swap > hand-to-writer. A higher rule that fires STOPS the lower ones.
- **WEIGHTED FORK:** when several transforms are each valid and none clearly dominates, don't pick
  blindly — score each by (confidence it's right) × (expected quality gain) and take the best; on a
  near-tie, let the A/B gate settle it by **trial and error** (try the change, keep it only if it
  wins on random songs). Uncertainty is a reason to measure, not to guess.
- **CONSEQUENCES + MITIGATIONS:** every rule must own what it can break and carry the guard that
  prevents it. swap → can break rhyme/rhythm/collocation → guards: rhyme-vowel, syllable±1,
  protected-phrase. restructure → can break grammar → guard: the professor. This pairing IS the
  design — a rule without its mitigation is a bug waiting to ship.
- **ADAPTATION:** prefer data-driven thresholds (corpus frequency, model weight, A/B fitness) over
  hardcoded constants, so the tree tunes itself as more songs are seen. A constant that the data
  later contradicts should become a measured value.
- **HUMILITY:** the v8 score, the bigram table, my own taste — all are fallible. Cross-check
  (model says X, corpus says Y, reads-wrong-to-the-eye says Z); when they conflict, COHERENCE wins
  over score, and trial-and-error breaks remaining ties. A clean disproof (a change that loses the
  A/B) is a real result — log it and move on; don't force a pet idea through.

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
- cycle 1 (BADPAIRS): added idiom guards (hands up/down, heads up, hand in hand, see the light, play with fire, in the shadow) — ACCEPTED (bad edits 221→217). Taught: fixed multi-word phrases are a priority-rule (idiom > swap); "hands"/"fire"/"light"/"shadow" sit in many frozen phrases that a noun-swap wrecks.
- cycle 2 (POOLS): pruned obscure-to-sing substitutes (pewter, voltaic, lampposts, porchlights, halogen, brassy, russet, padlocks, soot, fidgety, flimsy, snowbound, shatterproof, infinitude) — ACCEPTED (quality/song -0.419→-0.355). Taught: corpus-frequency=0 does NOT mean obscure — mutter/drumbeat/thinning/keepsake are freq0 yet fine. The distinguishing trait is "would a person SING this word," which is JUDGMENT, not frequency. METRIC FLAW noted: the gate's freq0 penalty is blunt (treats "thinning" like "pewter") so the loop could over-prune good freq0 words — keep an eye; consider a general-English-frequency or embedding-coverage signal instead of lyric-frequency.
