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
   - not a collocation-ANCHOR word (love, hands) sitting inside a >=90x FROZEN phrase
     ("my hands", "love can") — those swaps reliably read wrong (cycle 4)
   - Substitute is chosen: **rhyme-safe** (line-final keeps the stressed vowel), **syllable-matched
     (±1, hard reject beyond — "stratosphere" can't sit where "sky" sat)**, theme-fit by the song's
     own embedding, never itself a cliché, a **real sung word**, and **song-seed-varied** so two
     songs don't get the same substitute (but only among the top-quality picks).

4. **Else** → no safe mechanical edit. If the song still reads AI, its AI-ness is phrase TYPICALITY
   or pure structure (uniform line lengths, all-perfect rhyme, zero specifics). Hand to the writer:
   diagnose the shape + ask for one real anchor (a street, a time, a name). Never invent content.

## CONFIRMED FACTS (don't relearn)
- **SWAP DIMENSION CONVERGED (cycles 9-10).** The big swap wins are LOCKED (per-word frozen anchors hands/love, pruned bad pools, noun-position fix, idiom guards). Every REMAINING swap-pool change is now a NEUTRAL WASH under the soft metric (light: 4 cycles -> wash; silver/nickel -> wash). Context-ambiguous concrete nouns (light, silver) have no universal substitute and removing them is neutral (loses the tiny Δz tiebreaker). DO NOT keep grinding individual pools — a cycle that finds no safe NON-marginal change should say so plainly (a clean 'no change, here's why' is a valid output; do not manufacture washes). The ONLY remaining value is the GENERATION FRONTIER.
- **GENERATION FRONTIER is blocked for hourly cycles.** A coherent ORIGINAL line without an LLM is the hard open problem: n-gram free-walk = soup (disproven), strict-template walk = soup (disproven in chaos), verbatim-human = copyright (anti-copy 4-gram forbids it), LLM = violates no-network. It needs a dedicated build (e.g. a curated human PHRASE-BANK + rhyme/syllable/theme-locked recombination with the professor), which is a research project the USER should direct — not an hourly micro-change. Until then, hourly cycles have largely done their job.

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

- **GENERATION FRONTIER (now the highest value — swaps are tapped out):** (a) dupVariant gerund/noun-opener chorus variation (e.g. 'Riding in a pickup' repeat -> a validated drop/insert that varies it); (b) a controllable original-line synthesis that passes the strict professor (the n-gram free-walk made soup; try template-constrained or phrase-bank-recombination with rhyme+syllable+theme locked).

## LENS ROTATION (one focus per cycle)
POOLS · BADPAIRS · RESIDUAL(new molds) · NOOP · VOWEL · SYLLABLE · WIT/REGISTER · SYNTHESIS

## CYCLE LOG
(append one line per cycle: lens, change tried, A/B verdict, what it taught)
- cycle 0 (seed): built A/B-quality gate + 300-song miner. Pruned 11 bad pools (A/B win:
  bad swaps 56→43). Added syllable hard-reject. Found the love-noun-position + hands-up + obscure-
  substitute bugs — queued above.
- cycle 1 (BADPAIRS): added idiom guards (hands up/down, heads up, hand in hand, see the light, play with fire, in the shadow) — ACCEPTED (bad edits 221→217). Taught: fixed multi-word phrases are a priority-rule (idiom > swap); "hands"/"fire"/"light"/"shadow" sit in many frozen phrases that a noun-swap wrecks.
- cycle 2 (POOLS): pruned obscure-to-sing substitutes (pewter, voltaic, lampposts, porchlights, halogen, brassy, russet, padlocks, soot, fidgety, flimsy, snowbound, shatterproof, infinitude) — ACCEPTED (quality/song -0.419→-0.355). Taught: corpus-frequency=0 does NOT mean obscure — mutter/drumbeat/thinning/keepsake are freq0 yet fine. The distinguishing trait is "would a person SING this word," which is JUDGMENT, not frequency. METRIC FLAW noted: the gate's freq0 penalty is blunt (treats "thinning" like "pewter") so the loop could over-prune good freq0 words — keep an eye; consider a general-English-frequency or embedding-coverage signal instead of lyric-frequency.
- cycle 3 (RESIDUAL→pivoted BADPAIRS): RESIDUAL was a dead lens (surviving AI lines are common-word openers and/the/but/i — no safe transform), so pivoted to the top bad-pairs. Tried a NARROW frozen-phrase guard (>=90x) to stop hands→palms/love→longing. A/B AGGREGATE WIN (fitness -0.234→+0.033!) but the catastrophe tripwire REVERTED it: it regressed Hydrogen 15→27% by also blocking a FINE swap ("lost in"→"stranded in", since "lost in"/123 is frozen). KEY INSIGHT (data-confirmed): the bad/fine split is NOT phrase frequency (lost-in/123 fine > love-can/93 bad) — it's the SOURCE WORD. love & hands are collocation-anchors whose swaps reliably read wrong; lost/silence/shadows swap fine. The frozen guard has real value (big aggregate win) but must be PER-WORD, not blanket.
- cycle 4 (NOOP→applied cycle-3 refinement): per-word frozen guard — protect ONLY love & hands (the bad-pair anchors) inside >=90x frozen phrases, not blanket. ACCEPTED + passed tripwire (quality/song -0.364→-0.156, bad edits 203→177). Taught: the cycle-3 disproof was right — scoping a guard to the proven-bad SOURCE WORDS wins both the aggregate A/B AND the benchmark, where the blanket version failed. Anchors are data-driven (in bad-pairs AND in many frozen phrases); 'lost' looked like an anchor (3 frozen phrases) but its swap is fine, so it's excluded.
- cycle 5 (VOWEL): VOWEL is a DETECTION signal, not a humanizing lever — AI over-rhymes on -e/-ee endings (e:3950 dominates) but rhymes are sacred, no safe change. Pivoted: tried pruning light->beam (over-reused 20x + bad pair) -> REVERTED (bad edits 166->179). LESSON: pruning ONE bad sub backfires when the fallback subs are worse (light->headlights/daylight). For a source with no good substitute, anchor-protect or remove the SOURCE, don't prune one option. GOOD NEWS: cycle-4 frozen guard held — hands->palms gone from top bad-pairs, palms reuse 41->19.
- cycle 6 (SYLLABLE): SYLLABLE is detection-only (adjacent-equal-length 0.306 vs human 0.20; fixing it = rewriting line lengths = the unsolved generation frontier). Applied cycle-5's queued light fix: removed light/lights as sources -> A/B aggregate WIN (fitness .062→.163) but tripwire-REVERTED (song1 97→98, song5 14→21). LESSON: cycle-5's 'no good substitute' was too broad — lights→lamps is GOOD/user-accepted, only light→beam is bad. Whole-source removal throws out the good with the bad. Refine to: drop only beam/beams, keep lamps.
- cycle 7 (WIT): top-bug light retried (surgical beam/beams prune, keep lamps) -> REVERTED AGAIN (bad edits 221→232). ROOT CAUSE FOUND: not light — the A/B METRIC mis-scores "lights→lamps" as a bad collocation-break, but the user ACCEPTED that swap (song1). 3 cycles lost to light = the metric fighting a good swap. PARKED light; elevated the metric-flaw as #1 for the cycle-8 SYNTHESIS. Lesson: when the gate keeps rejecting changes that read fine, suspect the METRIC, not the change.

## SYNTHESIS (cycle 8 — what 8 cycles of trial-and-error proved)
1. **My first instinct is always too BROAD; the real rule is word-specific.** Blanket frozen guard (c3), whole-light-source removal (c6) — both A/B-won aggregate but tripwire-reverted. The fix was always narrower: per-word anchors {love,hands} (c4, won both). DESIGN RULE: start a guard word-specific (the proven-bad source words), never blanket; expand only if the data demands it.
2. **Coherence is NOT capturable by corpus n-gram statistics (proven c8).** 'the lights'/157 ≈ 'my hands'/150 yet lights->lamps is fine and hands->palms is bad; the split is idiomatic, not statistical. CONSEQUENCE: the A/B metric's phrase/freq penalties have IRREDUCIBLE false positives. So (a) the TRUE bad cases live in the ENGINE as per-word guards (FROZEN_ANCHOR, idioms, source-removal — these I trust), and (b) the METRIC is a SOFT hint (penalties halved c8), never a hard veto. When the gate keeps rejecting fine-reading changes, suspect the metric (c7).
3. **State of play:** big quality wins LOCKED — bad pools pruned, noun-position fixed, idiom guards, per-word frozen anchors (hands/love). Bad-pairs are now a low-value long tail the metric can't cleanly score. The remaining FRONTIER is the NORTH STAR: generating an ORIGINAL coherent line (n-gram rebuild = soup, disproven). Future cycles: try the controllable-generation angle (template-constrained line synthesis, or phrase-bank recombination with the professor), and re-test the parked light fix under the now-softer metric.
- cycle 8 (SYNTHESIS): no engine change. Proved corpus n-grams can't separate fine/bad swaps -> softened the A/B metric's collocation penalty (-1.5->-0.6) and freq0 penalty (-0.7->-0.4) to hints; refined the decision tree (branch 3 now records the per-word frozen anchor). Taught: handle true bad swaps in the ENGINE (per-word), keep the METRIC soft. Champion unchanged.
- cycle 9 (BADPAIRS): re-tested the light fix under the cycle-8 softened metric -> TIE -> REVERT. Now the bad edits even DROP (226→217) and quality is neutral; it only loses the tiny AI%-reduction tiebreaker (removing light swaps = fewer edits = less Δz). VERDICT: light swaps are a WASH — marginal quality, not harmful, not worth removing. PARKED PERMANENTLY (4 cycles). BIGGER PICTURE: the remaining bad-pairs are all low-count marginal (light→beam:3, memory→keepsake:3, dreams→plans:2) that the metric can't cleanly score — the SWAP-QUALITY dimension is at DIMINISHING RETURNS. The big wins (hands/love anchors, pruned pools, noun-position, idioms) are locked. NEXT DIRECTION: stop grinding swaps; pivot to the NORTH STAR — original-line generation (the dupVariant gerund-chorus handle, and a controllable line-synthesis angle that beats the disproven n-gram-soup).
- cycle 10 (POOLS): tried removing silver->nickel (metal not color, over-reused 20x) -> TIE -> REVERT (quality 0.128=0.128). 3rd straight wash. CONCLUSION: swap dimension CONVERGED — stop grinding pools; remaining value is the (currently-blocked) generation frontier. Logged the convergence + frontier-block as CONFIRMED FACTS so future cycles don't manufacture marginal changes.
- cycle 11 (RESIDUAL/generation): swap dimension is converged, so advanced the GENERATION FRONTIER instead of a swap wash. Round 4 of Semantic-N+7: added SELECTIONAL CONSTRAINTS to the slot-filler (candidate must fit the slot's prev/next bigram in human text) + concreteness filter (no abstract -ness/-tion words). Result: lines are now GRAMMATICAL + on-theme + original, NO longer soup ('words don't hear a name', 'the world of time will not be flame') — but still sometimes VAGUE (substitution ceiling). Prototype: overnight/gen_skeleton_prototype.js. NEXT: prefer vivid/concrete DONORS (not abstract ones like 'joys of caring'); tighter per-line theme; then integrate as a gated Chaos-rebuild option + A/B. Awaiting user greenlight to integrate.
- cycle 12 (NOOP-by-design): SKIPPED the swap A/B. Swap dimension is CONVERGED (cycles 9-10: all remaining pool changes are washes) AND the Qwen distillation TEACHER is running in the background (28+ examples, deadline 15:00). Running analyze.js/try_change would manufacture a wash AND compete with Qwen for GPU/RAM. Per philosophy ("don't manufacture washes") + don't-disturb-active-work: no code change. The real frontier work is the distillation thread (overnight/distill/: teacher gen_dataset.js -> student.js). Heartbeat will resume swap cycles only if a NEW non-marginal lens signal appears.
