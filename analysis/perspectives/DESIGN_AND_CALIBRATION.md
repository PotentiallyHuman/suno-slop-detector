# Perspective detectors — design + calibration log

One section per perspective: the flowchart (question → how it's answered → feature → hypothesis),
the report-string logic, and the **measured** AI-vs-human separation (so we keep only signals that
earn their place). Separation `d = |meanAI − meanHuman| / pooledStd`; ≥0.3 useful, ≥0.5 strong.
Run: `node build/calibrate_perspective.js analysis/perspectives/<p>.js 150 90`.

Shared primitives: `analysis/prosody.js` (syllables, vowel-class rhymeKey w/ eye-rhyme override,
orthoRime, eyeRhyme, multiRhymeLen, stress, posLite). Eye-rhyme archive: `analysis/eye_rhymes.js`
(241 words; love/move, good/blood, though/through… — fixes false rhymes + powers `eyeRhyme`).

---

## 1. FREESTYLE RAPPER — `perspectives/rapper.js`  ✅ built + calibrated (AI=150, human=94)

| # | Question (what a rapper hears) | How answered | feature | hyp. | **measured** |
|---|---|---|---|---|---|
|1| How dense is the rhyming? | end + internal rhyme pairs / line (vowel-class match) | `t4_rap_rhymeDensity` | human↑ | **0.78 STRONG human ✓** |
|2| Rhymes INSIDE the line? | in-line words sharing a rhymeKey | `t4_rap_internalRhyme` | human↑ | **0.83 STRONG human ✓** |
|3| Assonance play? | repeated vowel-classes within line | `t4_rap_assonance` | human↑ | **1.20 STRONG human ✓** |
|4| Scheme too regular? | entropy of end-key sequence | `t4_rap_schemeEntropy` | — | **0.58 STRONG (AI = higher entropy / humans repeat hooks)** |
|5| Enjambment vs end-stop? | line ends without terminal punctuation | `t4_rap_enjambment` | — | 0.38 useful AI (partly punctuation-style) |
|6| **Eye-rhymes** (look-rhyme, sound-don't)? | `eyeRhyme()`: same orthoRime, diff sound key | `t4_rap_eyeRhyme` | AI↑ | 0.18 weak **AI ✓ (direction confirmed; rare overall; expect stronger on text-AI)** |
|7| Multisyllabic/compound rhyme? | longest matching tail vowel-class run ≥2 | `t4_rap_multisyll` | human↑ | 0.21 weak human |
|8| Flow/cadence varies? | CV of syllables/line | `t4_rap_flowVarianceCV` | human↑ | 0.22 weak human |
|9| Stress/beat varies? | CV of stressed-syllable count/line | `t4_rap_stressVarCV` | human↑ | 0.16 weak human |
|10| Lazy repeated end-word? | same end WORD as a "rhyme" | `t4_rap_repeatEndWord` | AI↑ | 0.12 weak (leans human here) |
|11| Slant vs perfect ratio | vowel-class match but diff letters | `t4_rap_slantRatio` | human↑ | 0.06 weak |

**Headline finding:** humans rhyme **denser, with more assonance & internal rhyme**; AI (Suno-heavy) is
sparser and more end-rhyme-only. 4 strong + 1 useful + eye-rhyme bonus. The weak signals stay (lean
mostly correct, cheap, power the panel); the trained model sets final weights.

**Report string:** `"Rapper's ear: ~{density} rhymes/line with {rigid|varied} scheme, {good|little}
internal rhyme[, some multisyllabic], {flat|lively} flow. {one actionable tip}."`
Tip priority: no-internal → "thread a rhyme inside the line"; flat-flow → "vary line lengths";
all-perfect → "try a slant rhyme"; repeats-end-word → "find a fresh rhyme"; else → "push a bar to
multisyllabic".

**TODO at full-corpus calibration:** test `t4_rap_eyeRhyme` on ChatGPT-only vs human (hypothesis:
text-AI eye-rhymes more than audio-trained Suno).
</content>

---
## DETECTOR IDEAS FROM USER (to build into upcoming perspectives)
- **Sequential coherence / "Somebody to Love" signal** (user, listening to Queen): human songs deliver
  sentences *in order*, each building on the last into one complete thought — like talking to the
  audience — while still rhyming/flowing. AI mood-stacks disconnected pretty lines. **Text-only proxy
  (no embeddings):** lexical cohesion between ADJACENT lines (share content words / carried referent),
  pronoun/subject continuity, low non-sequitur rate, + direct-address markers (2nd person, vocatives,
  rhetorical questions to the listener). → build into Psychologist (interiority/coherence) + Storyteller.
- **Validation datapoint:** v2 model scores Queen "Radio Ga Ga" 0% AI, Bieber 4% — real human hits read
  as human. Keep regression-checking famous human songs stay low after each retrain.

---
## 2. POET — `perspectives/poet.js`  ✅ (AI=150,human=92). FINDING: AI OVER-produces imagery.
STRONG: t4_poet_senseDiversity 0.90 (AI↑), concreteRatio 0.62 (AI↑), imageDensity 0.59 (AI↑); useful: volta 0.39 AI, alliteration 0.32 human, stockImagery 0.30 AI. → AI is trained to "sound poetic" (more senses/concrete/stock imagery); humans plainer but alliterate more. Direction flipped from naive guess but separates strongly; classifier learns direction. (Panel wording to re-tune so we don't tell AI "add senses".)

## 6. INTELLECTUAL / WIT — `perspectives/wit.js`  ✅ (AI=150,human=91)
STRONG human: t4_wit_wordLength 0.71, t4_wit_allusion 0.57 (named/outside references). Weak: domainFusion/crossRegister/hardDomain/polyptoton/lexRare/homophone (~0.1–0.2). → wit separates mainly via VOCABULARY (longer words, real-world references); deep multi-domain fusion (Queen "Mr Fahrenheit" = heat+space+science) WORKS on exemplars (Queen 1.50 > generic-cliché 1.25 once stock words excluded) but is too RARE to separate the corpus statistically — keep as panel highlight + weak feature. Key fix: exclude STOCK words from domain counting (else cliché mood-stacking fakes "fusion"); COMMON top-1000 is a Set.

## 3. PSYCHOLOGIST — `perspectives/psychologist.js`  ✅ (AI=150,human=93)
STRONG: t4_psy_directAddress 0.82 human (validates user's "talking to the audience"). Useful: t4_psy_interiority 0.37 human (mental-state verbs). WEAK/HONEST MISS: t4_psy_cohesion 0.10 — adjacent-line WORD-OVERLAP is a bad proxy for the user's "sentences build on each other" thread, because good writing ADVANCES (doesn't repeat content words) → reads ~0 for coherent AND stacked. True semantic coherence needs embeddings (excluded for offline). Better text-only angle = sequential/causal CONNECTIVES between lines → test in Philosopher. emoGranularity/agency/ambivalence/subjectContinuity all weak. Keep directAddress + interiority as the carriers; rest are weak features the model can downweight.

## 4. PHILOSOPHER — `perspectives/philosopher.js`  ✅ (AI=150,human=93)
STRONG human: t4_phil_bareUniversal 0.67 (humans make sweeping everyone/never/always claims MORE — hyp was backwards), t4_phil_rhetoricalQ 0.56 (humans ask the listener). Useful: t4_phil_causal 0.43, t4_phil_conditionals 0.32. WEAK: t4_phil_sequentialFlow 0.08 — line-initial connectives ALSO fail to capture the "sentences in order" coherence (after word-overlap also failed in psychologist). CONCLUSION: true sequential/semantic coherence needs embeddings (excluded for offline); but direct-address (0.82), rhetoricalQ (0.56), causal (0.43) capture the "reasoning / talking-to-you" feel strongly. Keep causal/conditionals/bareUniversal/rhetoricalQ; sequentialFlow stays a weak feature.

## 5. STORYTELLER — `perspectives/storyteller.js`  ✅ (AI=150,human=94)
STRONG: t4_story_setting 0.84 AI, t4_story_objects 0.70 AI (AI floods GENERIC nouns: street/room/bottle), t4_story_namedEntities 0.65 human (humans name real people/places: Sarah/Route 9/Texaco). Useful: temporalSeq 0.33 AI, dialogue 0.28 AI. → generic-noun-imagery = AI, named-specifics = human (matches long-standing properNounDensity finding).

## SYSTEM SUMMARY — all 6 lenses calibrated (AI≈150 vs human≈90, live lrclib)
~15 strong signals (sep≥0.5). HUMAN-leaning: assonance(1.20), internalRhyme(0.89), rhymeDensity(0.87), directAddress(0.82), wordLength(0.71), bareUniversal(0.67), namedEntities(0.65), rhetoricalQ(0.56), allusion(0.57). AI-leaning: poet senseDiversity(0.90), storyteller setting(0.84), objects(0.70), poet concreteRatio(0.62)/imageDensity(0.59), rapper schemeEntropy(0.58). HEADLINE: humans rhyme denser + address the listener + richer/named vocab + ask questions; AI over-produces generic imagery/settings. NEXT: wire all t4_* into denseDict (pipeline_tier3 + v2-engine, identical) + dual-build browser + retrain NO_EMBED + bake + measure full-model accuracy + lift vs the 79-feature baseline.

- **Coinage / bent-rhyme** (user, Eminem "tweece" for twice): a deliberately distorted/invented word
  to FORCE a rhyme = the inverse of an eye-rhyme. Detect: out-of-vocabulary token (not common-word,
  not proper noun, fails a basic dictionary check) at/near a rhyme position. AI ~never coins words;
  rappers do. RARE → panel highlight, not a statistical separator. (wit/rapper)
- **Self-aware aside / meta-correction** (Eminem "twice? whatever…"): interrupting/commenting on one's
  own line ("I mean", "or something", "whatever", parenthetical fixes). Extends t3_metaObservation.
  Human/wit tell; rare → panel highlight.

---
## FUTURE — v5 concept (user): detector-as-critic lyric generator
After v4 (5000/5000 data): build a qwen-based lyric generator that uses THIS model + panel as a
reward/critic in a self-refinement loop: generate → SlopV2.score + SlopPanel.build → apply the ⚠️
fixes (name the place, thread internal rhyme, swap stock image, add a turn) → regenerate → repeat
until score < 20% AI. The panel's LOCALIZED, actionable notes (not just a score) give a real gradient
to optimize against — effectively the perspective lenses as a reward model. Produces the "least-AI"
AI lyrics (the user's mondegreen workflow, automated).

## FUTURE — "Humanize" magic-editor (user, monetizable; after v4)
Add a **Humanize** button next to Clear in the standalone app: each click APPLIES one panel
suggestion to the actual pasted lyrics (edits the text), lowering the AI score step by step. Flow:
paste ChatGPT/Suno lyrics → "How AI?" → Humanize ×N → watch the % drop. Two fix classes:
(1) MECHANICAL = pure-deterministic, offline, no LLM: break a too-perfect rhyme, de-dup a repeated
line, cut vocable filler, swap a stock word via synonym table, trim padding, vary a verbatim hook.
(2) CREATIVE = needs generation (qwen) or a user fill-in slot: name the place, add a turn, add a
concrete detail. Ship (1) first (works offline, instant, ad-supported). This is the consumer-facing
form of the v5 detector-as-critic loop.

## SHELVED — "Shazam for AI lyrics" (mic → live transcribe → score). Considered 2026-06-03.
Idea: listen to a song via mic, transcribe lyrics live, score AI-likelihood. VERDICT: shelved.
- Legal/privacy = MANAGEABLE (the lesser worry): same posture as Shazam/on-device voice assistants —
  user-initiated, on-device, ephemeral (never store/upload audio), clear "listening" indicator. Fits
  the no-network ethos.
- Accuracy = THE DEALBREAKER: on-device offline ASR (whisper-tiny WASM) is poor on SUNG audio over
  instrumentation; the detector keys on fine-grained rhyme/cliché/named-entity signals that a noisy
  transcript destroys → garbage-in. A cloud-grade model (Whisper-large) breaks both offline + privacy.
- Value = LOW: the songs you most want to test (Suno/ChatGPT) you already have as text; paste is
  faster + exact. Mic only helps for songs heard "in the wild" — rare, low stakes. Not worth it.
