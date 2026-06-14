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

For each lyric line, worst-AI first, only touching lines that carry their own evidence.

**OVERARCHING NO-SOUP PRINCIPLE (cycle 16):** REFUSE beats SOUP. v1.0.0's bar is "humanize line/half
WITHOUT soup", not "lower the AI%". Every emitted edit (swap, restructure, OR replacement) must:
(a) come from a song that reads AI (song-level guard >=50 — never mutate a clean song),
(b) act only on a real CLAUSE (>=4 words WITH a finite verb — never a gerund-fragment list line), and
(c) pass the PROFESSOR on its OUTPUT (grammatical POS-bigrams + completeLine opens/closes).
If nothing passes for a line, emit nothing. Measure with build/soup_test.js (real Line+Half judged by
the calibrated blind judge), NOT the A/B (which is coherence/register-blind). Result: swap soup 6-9%->0%.

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

4. **No swap/mold applies?** → the SENTENCE-REPLACER (the coverage path, cycles 11-16): replace the AI
   line with a whole CLEAN-LIBRARY line — same rhyme-key (the song's scheme holds), syllable ±1, best
   theme fit, with a theme-fit FLOOR + anti-repeat, passed through the professor; refuse if none passes.
   The library is BUILD-TIME judge-cleaned (overnight/distill/clean_library.js = deterministic gates +
   a Qwen coherence judge) because coherence is NOT capturable deterministically at runtime — proven
   repeatedly — so the LLM judge runs at BUILD time and the runtime stays no-network. ~98% coverage on
   real AI songs; ~0 soup after the judge-clean. WIRED LIVE (commit 574cdad: src/ext/replace_lib.browser.js + a branch-4 fallback in humanizeOne).
   CAVEAT (cycles 19-23): replacements are COHERENT but often OFF-TOPIC — "And I'm gonna bite" (shark
   song) -> "Mom's call comes through fine". The on-device theme-vec is NON-DISCRIMINATIVE for topical
   fit, and content-word re-ranking only marginally helps. RETRIEVAL FROM A GENERIC LIBRARY CANNOT
   ACHIEVE FIT — true fit needs CONTENT-CONDITIONED GENERATION (a line built from the song's OWN words),
   not retrieval. So branch 4 is the no-soup COVERAGE path, NOT meaning/fit-preserving (that's 1-3).
   - If even the replacer refuses → pure TYPICALITY (uniform line lengths, all-perfect rhyme, zero
     specifics). Hand to the writer: diagnose the shape + ask for one real anchor. Never invent content.
   - CONFIRMED structural-typicality frame with NO safe mechanical lever (cycle 13): the
     "I don't want X … I just want Y" antithesis (detector measures it via negNegPos/antithesisNotBut).
     Frame words aren't clichés → word-swap N/A; it's a TWO-LINE parallelism → no coherent single-line
     restructure without generation. Do NOT add it to MOLD (restructure() can't handle it → it would
     fall through to a no-op/bad swap). Diagnose + ask for a concrete want; leave the words alone.

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

## ACCEPTANCE PROOF (2026-06-13 — measured the "only acceptable lines" goal end-to-end)
Built an acceptance harness with an INDEPENDENT blind judge (Grok, build-time/validation only — NOT
runtime). CALIBRATED the judge first (it MUST pass real lyrics): v1 strict prompt rejected 7/8 real
human lines -> useless; v2 lenient "coherent + human-soundable, ignore thematic-fit" passes 8/8 humans
AND rejects 8/8 scrambles. Trust only a calibrated judge.
- **Library is real & sizable** (overnight/distill/dataset.jsonl): ~390 contexts, ~1970 good lines.
- **Raw student is NOT "only acceptable":** 80-83% by the calibrated judge. The 17-20% are word-salad
  the v8 AI-SCORE CANNOT catch (rejected lines score LOWER AI%). POS-bigram table (validBG) ALSO can't
  catch them (human/scramble/awkward all ~0.00 invalid). Coherence is not capturable by our on-device
  statistical tools — CONFIRMED a third way.
- **end-POS grammar gate** (added to student2.js grammarOK): refuses dangling/stranded endings
  ("...name how", "...more they", "...around, expand") -> 83%->87%. Real but partial (misses internal
  scrambles like "time that slow takes").
- **THE KEY RESULT (select_vs_coverage / topk):** top-1 acceptable 80% vs ANY-of-top-3 96%. The library
  HAS an acceptable line for 96% of contexts — the failure is SELECTION, not coverage. So:
- **PROVEN ARCHITECTURE for "only acceptable":** (1) BUILD-TIME judge-clean the library (offline judge
  is allowed; runtime stays no-network) so awkward lines never rank first; (2) retrieve best-pick +
  end-POS gate; (3) REFUSE on the ~4% with no good line (keep original / hand to writer). Refusing is
  what makes it "only acceptable" — emitted lines ~100% acceptable at ~96% coverage. NOT YET WIRED into
  the shipped extension (the 3 modes still use the swap/mold engine); wiring + a build-time judge pass
  over the library is the next concrete step (budget: ~1 Grok call per library line).
- **Decision-tree flow for the 3 modes (evidence-based):** LINE/REWRITE = swap+mold on REAL human lines
  (stays coherent by only changing words inside an existing line — already ships, conservative). CHAOS
  = library generation: retrieve top-K -> gate (AI<55 + end-POS + pre-judged-clean) -> emit best, else
  REFUSE. The refuse branch is mandatory; without it "only acceptable" is impossible (80% otherwise).

## OPEN BUGS / TODO (highest value first)

- **MOLD restructure fires on verbless simile-fragment lines** (cycle 18): "Every night like a setting
  sail" -> "This night like a setting sail" (soup). isFullClause is fooled by "like" tagged as a finite
  verb when it's a preposition ("like a/the ..."). FIX (humanizer-gen, a future cycle): in isFullClause,
  don't count "like" as a verb when the next word is a/an/the (preposition usage) — and consider the
  same for other prep/verb-ambiguous words. [FIXED cycle 19: actual culprit was "sail"=VB (a line-final
  noun mistagged as a verb), not "like"; isFullClause now skips a verb-ambiguous word after DT/VBG.]

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
- cycle 13 (VOWEL): user flagged the "I don't want X / I just want Y" antithesis as a measured cliché and asked whether the teacher CLONES it. Ran the cheap clone-test (W6) -> Grok does NOT clone the frame: 0/10 frame-clones, 10/10 distinct, it escapes into "Sick of this nonstop pretending" / "Done with always over spending". Our "original" prompt already breaks the mold -> NO teacher frame-guard needed (clean disproof = deliverable). Classified the antithesis as a branch-4 typicality case (see DECISION TREE): detector measures it but there's no safe mechanical humanizer lever; adding it to MOLD would be net-negative. VOWEL re-confirmed detection-only (report: end-vowel e:3950 dominates, perfect-rhyme 0.102, rhymes sacred); BADPAIRS all low-count marginal (lights->lamps:4, memory->keepsake:3) -> swap dimension stays CONVERGED. NO engine change (don't manufacture a wash; don't disturb the running teachers). Real motion this session = the teacher/library thread: fed both models the detector's full 125-word cliche lexicon + 50-phrase list as an avoid-list, hard-banned "hum/humming", added an echo-guard + resume-dedup (overnight/distill/gen_dataset.js + gen_grok.js).
- cycle 14 (SYLLABLE — NOOP-by-design): SYLLABLE re-confirmed detection-only (adjacent-equal-length 0.306 vs human ~0.20; fixing line-length = the generation frontier, no swap lever). Swaps converged; report shows only the marginal long tail (lights->lamps:4, memory->keepsake:3). Checked whether last turn's acceptance-proof coherence-gate belongs in humanizer-gen -> it does NOT: humanizer-gen ALREADY has a STRONGER professor than the student (completeLine: STARTBG/ENDBG opens+closes like a real line, DANGLE set, MD-without-VB, content quota; grammatical: VALIDBG POS-bigrams). The 80->96% acceptance failures live in the separate student2/library thread (weaker gate), NOT here. NO engine change (don't manufacture a wash; don't disturb the running teachers). Frontier value remains the PROVEN architecture (see ACCEPTANCE PROOF): build-time judge-cleaned library + retrieve + refuse-branch -> ~100% acceptable emitted at ~96% coverage. NEXT: wire the FREE local-Qwen judge into the teacher (clean-by-construction library), then wire Chaos to the cleaned library.
- cycle 15 (WIT — NOOP-by-design): WIT/REGISTER is a dead SWAP lens, and it was effectively WORKED this session via the red-team de-souping: pruned 8 register-wrong substitutes (nickel/sodium/beam(s)/outline/mumble/scalding) + emptied bad noun-echo, added a song-level AI guard, the professor grammar-gate on BOTH swap and restructure outputs, and a clause guard (only edit real >=4-word clauses with a finite verb). Validated by the NEW build/soup_test.js (real Line+Half, calibrated blind judge): swap-path soup 6-9% -> 0% on 12 songs — a better validator than the coherence-blind A/B. Skipped analyze.js + try_change.sh: both compete heavily with the RUNNING judge-cleaner (Qwen) + teacher, and the A/B scores register-prunes as washes anyway (register/coherence not capturable by the metric — CONFIRMED). The real frontier is the SENTENCE-REPLACER: prototype (overnight/distill/replacer_proto.js) hits 98% coverage on real AI songs with deterministic gates (8% soup); the build-time Qwen judge-clean (overnight/distill/clean_library.js) is RUNNING to remove the awkward survivors and push retrieval soup ->0. NEXT: wire the cleaned library into Line/Half (with refuse) + drive soup_test to 0 + the 5-song Firefox demo. NOTE: Qwen judge is dropping only ~3% vs the prototype's 8% Grok-soup — Qwen may be too lenient; reassess the judge strength when the clean run finishes.
- cycle 16 (SYNTHESIS — no code change): folded the session's shift into the DECISION TREE (added the OVERARCHING NO-SOUP PRINCIPLE + rewrote branch 4 around the sentence-replacer). What cycles 9-16 proved: the SWAP dimension is fully converged AND, when red-teamed by a human-level eye, was shipping SOUP the coherence-blind A/B could never see — register-wrong substitutes (nickel/sodium/beam/outline), agreement breaks ("rooftops keeps"), fragments ("This shape dancin'"). The fix-set that reached 0 swap-soup: prune register-wrong subs + song-level AI guard + professor gate on ALL outputs + clause guard. The product bar moved from "lower AI%" to "humanize WITHOUT soup", so REFUSE>SOUP is now overarching, measured by build/soup_test.js (real Line+Half + calibrated blind judge), NOT the A/B. Coverage now comes from the SENTENCE-REPLACER (clean-library whole-line, ~98% coverage on real songs), whose library is BUILD-TIME judge-cleaned by a Qwen pass (this run: 2684 kept / 204 dropped = 7.1%) because coherence can't be gated deterministically at runtime. The hourly SWAP cycle is retired in practice — 5 straight NOOPs (12-16); the live work is the replacer. NEXT (when judge-clean finishes): build the clean-library index -> wire the replacer into Line/Half (with refuse) -> drive soup_test to 0 -> the 5-song Firefox demo (the v1.0.0 GO gate).
- cycle 17 (BADPAIRS): soup_test on a fresh 10-song sample surfaced ONE bad pair — skyline->rooftops (singular->plural = "rooftops keeps" subject-verb disagreement; grammatical() missed it because "rooftops" is untagged -> defaults to NN -> masks the plural). Pruned it (skyline: ["treeline"] only). ACCEPTED on BOTH validators: soup_test 6%->0%, AND the A/B (bad edits 221->204, fitness .007->.01 — this time the A/B's grammar proxy DID catch the break). Taught: soup_test (calibrated blind judge) is the sharper finder for register/agreement bad-pairs, and a real fix it flags often ALSO wins the A/B. NEW BAD-PAIR CLASS to scan: number-mismatch substitutes (singular source -> plural sub, or vice versa) break agreement. JUDGE-CLEAN FINISHED: 3085 clean library lines (232 dropped, 6.9%) ready for the replacer.
- cycle 18 (POOLS): soup_test (16 songs) flagged 4 soup incl light->daylight ("porch daylight burns bright ... night" contradiction). Tried removing light as a swap source -> A/B WON (bad edits 125->104, fitness .181->.205) BUT the benchmark catastrophe tripwire REVERTED it (1 song regressed) — the EXACT cycle-5/6/7/9 light trap: whole-source removal wins the aggregate but a benchmark song leans on a light swap the AI% rewards, even though the eye/soup_test calls it soup. CONFIRMED light is PARKED PERMANENTLY (5th confirmation). The light->daylight soup is real but has NO safe POOL fix (removal reverts; substitute-level pruning reverted in c6/c7) — it needs the SENTENCE-REPLACER (whole-line replace), not a swap. Clean disproof = deliverable; moving on.
- cycle 19 (RESIDUAL): fixed the cycle-18 OPEN BUG (mold/swap fires on verbless simile fragments). Probe found the culprit was "sail"=VB (line-final noun mistagged a verb), NOT "like"(=IN). Fix: isFullClause skips a finite-tagged word when the PREVIOUS word is DT or VBG ("the RAIN", "a setting SAIL" = object noun, not the clause verb). A/B gave a TIE (bad edits 226=226) -> auto-REVERTED — coherence-blind, its grammar proxy doesn't flag "This night like a setting sail" as a bad edit. KEPT anyway (manual commit) per the no-soup principle: soup_test (16 songs) confirms it cuts soup 21%->6% (3 of 4 cases gone) at ~0 coverage cost (19->18 edits); the 1 residual is the parked light->daylight. RE-AFFIRMED: soup_test (not the A/B) is the validator for coherence/no-soup fixes; a tie-revert is overridable when soup_test shows a clear win. (POS-ambiguity — a noun mistagged VB/VBP — is a recurring fragment-soup source; the DT/VBG-prev guard is a cheap, general dampener.)
- cycle 20 (NOOP — no code change): examined the 12 NOOP samples (analyze 300). All CORRECT refusals — specific/concrete narrative songs that read HUMAN ("Mama's crying in the kitchen again / Daddy's got his good boots on", "Phone line crackles across the miles tonight"), plus sparse songs with no cliché handle ("Come in / Step inside / Look down"). 58/300 (19%) no-op-able = the CONFIRMED ~18% honest-refusal rate. NO missed-edit pattern. NOTE: "improved" 205/300 here vs ~224 earlier — the cycle-18/19 conservative guards (song-guard >=50, clause guard) trade some swap COVERAGE for no-soup, BY DESIGN; coverage is recovered by the SENTENCE-REPLACER (branch 4), NOT by loosening the swap engine (loosening = soup). Honest NOOP-by-design; the conservative no-soup engine is behaving correctly.
- cycle 21 (VOWEL is a confirmed-dead swap lens -> applied the soup_test bad-pair hunt instead): soup_test (14 songs) flagged a 2nd POS-ambiguity fragment — "Every small rejection just another reason to try" -> "That small rejection ..." (copula-less; isFullClause read the INFINITIVE "to try" as the clause verb). Extended the cycle-19 guard: also skip a finite-tagged word after TO. A/B ACCEPTED (bad edits 165->163, benchmark PASS) — unlike cycle 19's tie, this time the A/B's grammar proxy DID reward it. Taught: the DT/VBG/TO-prev guard is the general dampener for "object-noun or infinitive mistaken as the clause's finite verb" fragment-soup. Residual soup this sample = light->headlights (number-mismatch on the PARKED light source) — needs the sentence-replacer, not a swap.
- cycle 22 (SYLLABLE dead -> soup_test hunt): only residual soup = light->headlights number-mismatch ("porch headlights flickers"). Investigated a general fix and found NONE is safe: (1) a runtime plural+VBZ guard FAILS because the verb "flickers" is mistagged NNS (not VBZ) — the engine literally can't see the disagreement; (2) a table scan found 11 number-mismatched subs (sky->clouds, tears->weeping, bones->marrow, light->headlights, hands->grip, ...) but BLANKET pruning is too broad (the cycle-3 lesson) — most are fine in object position or before a past-tense verb ("the sky cried"->"the clouds cried" is correct); only plural-subject + VBZ breaks, and that's context we can't reliably detect. CONFIRMED: number-mismatch agreement soup has NO safe swap-layer fix (verb-mistag blocks a runtime guard; number-preservation kills good swaps) — it's a SENTENCE-REPLACER job (whole-line replace sidesteps agreement entirely). Honest NOOP-by-design. SWAP ENGINE IS NOW EFFECTIVELY DONE for no-soup: the only residual on real songs is the parked light source — all of which routes to the replacer. The critical path is WIRING the replacer (3085 clean lines ready), not more swap cycles.
- REPLACER WIRED (commit 574cdad, off-cycle): the 3085 judge-cleaned lines ship as src/ext/replace_lib.browser.js; humanizeOne has a branch-4 fallback (replace a typicality AI line with a rhyme-key+syllable+theme-matched clean library line, refuse if none); removed the broken light swap (replacer now catches it). 0 SOUP across all samples, ~63% of AI songs humanized, replacer carries the load. BUT 5-song demo (build/demo5.js) exposed the real limit: replacements are COHERENT but often OFF-TOPIC — "And I'm gonna bite" (shark song) -> "Mom's call comes through fine". The on-device theme-vec (averaged embeddings) is NON-DISCRIMINATIVE for topical fit (a strong floor at 0.40 changed nothing).
- cycle 23 (WIT -> tested the replacer-fit fork): the user's open call is "ship safe vs keep pushing the replacer's fit." Tested content-word OVERLAP re-ranking (bonus a candidate for sharing the song's ACTUAL vocabulary, not just embedding-average). Result: MARGINAL — a few picks improved but most stayed off-topic and "Mom's call..." still landed in the shark song. CONFIRMS the disproof: a GENERIC clean library does not CONTAIN lines that fit a specific song's topic, so no ranking can produce fit. Retrieval CANNOT achieve topical fit (option B is DEAD). Reverted (kept the milestone). The fork resolves to: (A) ship swap/mold-ONLY for Line/Half (meaning-preserving, always fits, lower coverage) — safe v1.0.0; or (C) content-CONDITIONED generation (build a line from the SONG'S OWN words) — the real "writes something that fits" frontier, more work. AWAITING USER CHOICE.
- cycle 24 (SYNTHESIS — no code change): cycles 17-24 review, folded into the DECISION TREE (branch 4 caveat above). What this run proved: (1) soup_test (calibrated blind judge on real Line+Half) is the SHARP finder for register/agreement bad-pairs the A/B is blind to — it drove EVERY real swap fix (skyline->rooftops number-mismatch c17, verbless-simile fragment c19, infinitive fragment c21); when soup_test shows a clear win and the A/B only TIES, OVERRIDE the tie-revert (c19). (2) POS-AMBIGUITY — a noun or infinitive mistagged as the clause's finite verb — is THE recurring fragment-soup source; the DT/VBG/TO-prev guard in isFullClause is the general dampener (c19+21). (3) NUMBER-MISMATCH agreement soup has NO safe swap-layer fix (verb mistagged NNS blinds a runtime guard; blanket prune kills good swaps) -> replacer job (c22). (4) THE SWAP ENGINE IS DONE — converged + de-souped; the only residual on real songs routes to the replacer. (5) THE REPLACER is WIRED + soup-free but OFF-TOPIC; retrieval-from-generic CANNOT fit (c23 disproof). PRODUCT FORK awaiting the user: (A) ship swap/mold-only (meaning-preserving, fits, lower coverage) OR (C) content-conditioned generation (the real fit frontier). The hourly swap loop has fully done its job — future value is the user's A/C choice + the 5-song Firefox demo, NOT more swap cycles.
- cycle 25 (BADPAIRS): soup_test (10 songs) = 0 soup (17 edits, 0 rejected). No new bad pair — re-confirms the swap engine + replacer are soup-free on real songs. Honest NOOP-by-design; the swap loop has no remaining work. The open items are NOT swap changes: the user's A/C fork (swap-only vs content-conditioned generation) and the off-topic replacer fit.
- cycle 26 (POOLS): NOOP. Swap engine confirmed done last cycle (soup_test 0/17); no new bad pool. Skipped a redundant analyze/soup_test to avoid competing with the running teacher. The loop is correctly IDLING — the only open work (A/C fork + the 5-song Firefox demo) awaits the user. Each cycle now just keeps the teacher alive; pick A or C to unblock.
- cycle 27 (RESIDUAL): NOOP. No new mold; surviving AI lines are the honest-refusal typicality class (cycle 20). Swap engine done; loop idling on the user's A/C decision. Deliberately NOT prototyping option C unprompted — the user asked to choose A/C first ("I'll execute it cleanly"), so building C now risks wasted work if they pick A. Kept the teacher alive (dies ~hourly; relaunched).
- cycle 28 (NOOP): NOOP-by-design (idle loop, 6th straight). Swap engine done; awaiting the user's A/C decision. Teacher relaunched. No new signal to add.
- cycle 29 (VOWEL): NOOP (dead swap lens; idle loop). Awaiting A/C. Teacher relaunched.
- cycle 30 (SYLLABLE -> ran an option-C feasibility probe instead of an 8th NOOP — decision-support for the user's fork): tested content-conditioned generation via SKELETON-FILL (a clean library line's grammar skeleton, content slots refilled with the SONG'S OWN words, POS-matched, rhyme kept). Build rate OK but QUALITY = SOUP: outputs are POS-valid (pass the professor) yet semantically incoherent — "a kitchen that dream can't contain", "a flour that sunlight can't contain", "morning call your ride down". Same as the earlier template-fill disproof: POS-matched substitution is grammatical-but-incoherent; the professor can't catch semantic soup (coherence-not-capturable, proven repeatedly). CONCLUSION: on-device content-conditioned generation (no-LLM) is DISPROVEN — it makes soup because real coherence needs a language model, which violates no-network. Combined with c23 (retrieval can't FIT) the fork RESOLVES: BOTH non-swap paths to "a fitting original line" are dead on-device. v1.0.0 = OPTION A — ship the meaning-preserving swap/mold engine (soup-free, always fits, lower coverage); the off-topic replacer becomes an opt-in aggressive "Chaos" tier (coherent, meaning-bends) or is dropped from Line/Half. Recommended A to the user.
