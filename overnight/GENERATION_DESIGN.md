# Original-line generation — design (on-device, no net, no API, low memory)

## The problem
Replace a cliché line with an ORIGINAL, COHERENT line that keeps the song's rhyme + syllables +
theme. Prior on-device attempts all made SOUP because they generate word-by-word:
- n-gram free-walk: locally fluent, globally nonsense.
- strict-POS-template walk: grammatical skeleton, but words don't cohere.

## The design: "Semantic N+7" (skeleton-donor substitution)
Research (Oulipo N+7; PoeTryMe, Gonçalo Oliveira) points to one synthesis:
- **Oulipo N+7** keeps a real text's GRAMMAR and swaps content words — proving the skeleton idea —
  but substitutes RANDOMLY (7 nouns down the dictionary) → incoherent meaning.
- **PoeTryMe** shows grammar-template + seed-word generation makes coherent lines with no neural net.

So: **borrow a real human line's grammatical skeleton (function words + POS slots), and refill only
its content slots with theme-targeted words, ending on the song's rhyme word.** Coherent because the
syntax is a real human sentence (not a Markov walk); original because the content is new; not
copyright because only the (uncopyrightable) syntactic skeleton is reused + the existing anti-copy
4-gram guard forbids any 4 consecutive corpus words. It is literally the proven word-swap humanizer,
applied to a clean DONOR line instead of the cliché line.

## Cheap-test evidence (prototype: /tmp/gen_skeleton.js, 40k-line human donor bank)
GRAMMAR IS SOLVED — donor skeletons stay intact, unlike soup:
- "coming over the hill"        -> "turning over the sky"      ✓ coherent + original
- "ears don't hear a sound"     -> "knees don't hear a [name]" ✓ structure intact
- "she's gonna be my midnight queen" -> "she's gonna be my midnight [name]" (nouns-only) ✓
Round results: round 1 (swap all content) = soupy; round 2 (confident POS) = better; round 3
(NOUNS ONLY, like the real humanizer) = grammar reliably intact.

## The remaining hard problem: the SLOT-FILLER
Theme-nearest picks ABSTRACT/CENTRAL words ("rest", "return", "things", "own") and breaks idiom
donors ("in spite of" -> "in rest of"). Embedding theme-similarity doesn't know a slot's
SELECTIONAL CONSTRAINTS (what words actually occur there). FIX (the next build):
1. **Slot plausibility:** score a candidate by how often humans put it in THIS slot context
   (prev-word / next-word bigram from the corpus), not just theme similarity. Combine:
   fit = theme·cand + α·log(bigram(prev,cand)+1) + β·log(bigram(cand,next)+1).
2. **Concreteness/imageability bias:** prefer concrete nouns (proxy: high humanness + appears as a
   content word + not in a generic/abstract stoplist). Abstract central words ("rest","return") out.
3. **Idiom-safe donors:** skip donors whose content word sits in a frozen phrase (reuse FROZEN_PHRASE
   / IDIOMS — the swap layer already has this).
4. **Nouns (+ careful adjectives) only;** never verbs/proper-nouns (agreement/argument structure).
5. **Quality gate (per the proven pattern):** keep a generated line ONLY if it (a) passes the strict
   POS professor, (b) passes anti-copy 4-gram, (c) the v8 line-score drops vs the cliché line, and
   (d) wins the EDIT-QUALITY A/B vs leaving the line. Trial-and-error settles the rest.

## Build plan (multi-cycle, A/B-gated like everything else)
1. Build the donor bank as a shipped artifact: ~5-10k clean human lines indexed by (rhyme-key,
   syllable-count, last-word-POS); store compact (a few hundred KB). [done in prototype, needs curation]
2. Implement the slot-filler with selectional constraints (#1-#4 above) in humanizer-gen.
3. Wire it as the CHAOS-tier rebuild option (replacing the disproven n-gram rebuild), gated by #5.
4. A/B it on random AI songs (edit-quality metric) + the benchmark tripwire. Keep only if it wins.

## Honest status
Direction VALIDATED (skeleton solves grammar — the thing that made all prior attempts soup). The
slot-filler is a real but TRACTABLE build (selectional constraints, not open-ended generation). This
is an architectural addition the user should greenlight; then it becomes the overnight loop's focus.

## Rounds 4-5 result + the QUALITY ceiling (honest)
- Round 4 (selectional-constraint single-donor) = high-water mark: grammatical, on-theme, original,
  rhyme-locked, NO soup ("words don't hear a name", "the world of time will not be flame") — but VAGUE.
- Round 5 (best-of-N) REGRESSED: picking "the best generated line" needs to SCORE coherence, which is
  the SAME wall as the A/B metric (cycle 8: coherence isn't capturable by corpus statistics). So
  best-of-N confidently picked broken lines ("some time me name").
- CEILING (clean disproof): on-device, no-LLM, statistical generation can FIX grammar-soup but cannot
  reliably produce GOOD (coherent + meaningful + fitting) original lines, NOR judge which generated
  line is good. Both need language understanding the on-device/no-net constraint forbids.
- What IS achievable: grammatical-but-vague original lines (round 4). Useful only if "less-AI +
  coherent" is enough; falls short of "genius originality".
- OPTIONS for the user: (A) ship round-4 as a gated Chaos-rebuild (grammatical-but-vague, fires only
  when it beats the cliché's AI score + passes the grammar professor + anti-copy); (B) accept the
  boundary — swap/restructure stays the QUALITY tier, true original generation needs an LLM; (C)
  human-in-the-loop: show the user 3 candidate rewrites and let THEM pick (the human is the coherence
  judge the on-device system lacks).

## Rounds 6-7: RHYME-FIRST template selection (the user's key fix)
The "will not be flame" bug was an ORDERING bug: the old code chose the donor/template FIRST (blind
to the rhyme), then jammed the rhyme word in -> a state-ending template ("will not be ___") got
"flame" forced into it. CORRECT order (user's insight, matches freestyle's backward construction):
the rhyme word is fixed FIRST, and ONLY templates whose final slot genuinely ACCEPTS that rhyme word
are eligible. Implemented as: a donor is eligible only if bigram(donor.penultimate, rhymeWord) >= 1
in the human corpus (the rhyme word really occurs in that ending position). Plus inner slots are
TYPE-PRESERVED (substitute must be in the donor word's embedding-neighborhood, not just theme-near).
RESULT: "will not be flame" now REFUSES (no fitting template) instead of jamming -> "to feel the warm
touch of sky", "lost in a ride on the star". Refusing-when-no-fit is the desired behavior.
TRADE-OFF: strict rhyme-fit -> many refusals on the 40k bank (no fitting template for many rhymes).
NEXT ENGINEERING: a bigger template bank INDEXED by ending-context (rhyme-word -> templates that
accept it), so more rhymes find a fitting template without lowering quality.

## Rounds 8-9 + THE RESOLUTION (LLM curates the library offline)
- Round 8 (full 111k-line bank + common-word-only fill): fixed vocabulary (common words, no abstract),
  but weak endings leaked ("set bound to tonight" — function-word penults accept any rhyme).
- Round 9 (generate-MANY + HARD filters: real-ending bigram>=3, all-slots-common-filled, theme-rank):
  good coverage + REAL hits ("I feel life through rain", "to feel the warm touch of sky", "from the
  hand of dream") but still ~half odd. The device CAN'T pick its good outputs from its odd ones — the
  coherence-judging wall (cycle 8) again.
- RESOLUTION (the user's "keep only good examples / how an LLM would do it"): the on-device engine
  can't BE an LLM, but its LIBRARY can be curated BY one OFFLINE. Claude generates + judges a library
  of vivid, common-word templates with TYPED slots, keeps only coherent ones, ships it as static data.
  Device replays mechanically at runtime (rhyme-first fill). No net/API/LLM on device; the LLM's
  JUDGMENT is baked into the shipped examples. Quality ceiling = curated library quality (high).
- NEXT BUILD: (1) Claude curates ~150-300 common-word skeletons w/ typed slots + validated fills,
  indexed by ending. (2) runtime fill from that curated set only. (3) gate each produced line:
  professor + real-ending + anti-copy + v8-less-AI; keep best. (4) wire as Chaos-rebuild, A/B + eye.
