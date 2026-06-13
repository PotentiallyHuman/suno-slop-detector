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

## PROVEN: local-Qwen generates + our rules filter (the user's design, end-to-end)
qwen2.5:32b (offline via ollama, 19GB, 110GB free — NO network/API) given [theme words + our rules
+ surrounding lines + rhyme word] produced 10 coherent, rhyming, common-word candidate lines. Our
deterministic engine then FILTERS: keep lines that (a) rhyme correctly (vkey), (b) score LOW-AI on v8
(<55% — Qwen's lines mostly score 0%! they read fully human), (c) fit syllables. ~8/10 pass.
Examples kept: "Until you came into my life, the one true aim" (perfect bridge into the next line),
"Without your love, I was alone in shame", "My world was gray and still, like an empty name".
FILTER FIX: do NOT apply the cliché-WORD list to whole generated lines — "love/heart/night/song" are
natural in a ballad; that list is only for the swap layer. The real generated-line filter = rhyme +
v8-low-AI + syllable.
SHIP MODEL: Qwen is the OFFLINE library-builder. For each common cliché MOLD × theme × rhyme, pre-
generate + filter good replacements -> a static library indexed by (rhyme-key, syllable, theme,
mold). Ship the library (no Qwen on device). Device looks it up + lightly adapts to the song's words.
This is the resolution: the extension stays LLM-free; the LLM's quality is baked into shipped data.

## v2: RHYME GRADIENT + TEMPLATE LAYER (overnight build)
- RHYME GRADIENT (user's idea): rhymeStrength(song) in [0,1] = fraction of adjacent line-pairs that
  FULL-rhyme. A candidate's rhymeQuality = 1.0 (full) / 0.55 (slant) / 0. The student requires
  candidate rhymeQuality >= rhymeStrength(song): a rap/loose song (0.2) accepts slant, a ballad (0.8)
  demands a full rhyme. Continuous, per-song. (NOTE: measure on the FULL song at runtime — the
  held-out test only had 3 lines so strength reads 0.0/0.5; production has the whole song.)
- TEMPLATE LAYER: each good Qwen line abstracted to a mold (function words + typed NN/JJ slots).
  Student is HYBRID: verbatim-retrieve first (best quality, covered 13/13 here), template-fill as the
  coverage fallback when no verbatim line fits the rhyme/theme — fills slots with common theme words,
  type-preserved. overnight/distill/student2.js. Library grows as the teacher runs overnight.
- STATUS: works. 13/13 held-out got a coherent 0%-AI rhyme-matched line. Gaps: small library (slant
  picks like "back of my kin" loosen) -> the overnight teacher grows it; template-fill quality is the
  rounds-1-9 ceiling so it stays a fallback, retrieval stays primary.

## COPYRIGHT — tested, assumption DISPROVEN, audit is the real protection
TEST (user's): asked local qwen2.5:32b directly for "Let It Go" and "Bohemian Rhapsody" lyrics.
RESULT: it reproduced BOTH verbatim. Local Qwen has NO copyright guardrail — ChatGPT's refusal is a
deployment POLICY layer, not the model. So "Qwen won't copy by default" is FALSE; we cannot rely on it.
WHY OUR LIBRARY IS STILL 0/306 COPIED: the TASK FRAMING, not the model's restraint — asking for an
ORIGINAL new line in context makes it generate fresh; asking for a known song makes it recite.
THEREFORE: the anti-copy AUDIT is essential, not optional. Protections in place: (1) prompt for
original-line-in-context (we do), (2) 4-gram anti-copy guard at generation time (added) — drops any
line repeating 4 corpus words, (3) TODO keep the 4-gram guard as a HARD gate in the shipped runtime,
(4) TODO widen the audit corpus beyond our ~7000 songs to catch famous tracks not in our set.
