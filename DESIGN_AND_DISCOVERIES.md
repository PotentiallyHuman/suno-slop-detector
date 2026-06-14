# Suno Slop Detector — Design, Decisions, Discoveries & Arguments

This document is the *why* behind the engine. It records the architecture, the decisions we
committed to, the things we discovered along the way, and — just as importantly — the ideas we
**disproved**. A clean disproof saved us from shipping something worse, so they're kept here on
purpose. The detailed cycle-by-cycle log lives in `overnight/LEARNINGS.md`; this is the readable
synthesis.

---

## 1. What it is

A browser extension (Firefox + Chrome, MV3) that does two things on a Suno song or `/create` page:

1. **Detect** — scores how *AI-slop-like the lyrics read*, 0–100%, with a craft-coach panel.
2. **Humanize** — three "honest surgery" buttons that edit the lyrics in place.

Everything runs **on-device**: pure deterministic JavaScript, **no network, no storage of your
text, no LLM at runtime.** The only permission is `activeTab`. This single constraint — no network
— is the axe that shapes every decision below.

---

## 2. Architecture

- **Detector (`SlopV8.scoreV8`)** — a trained logistic model over bag-of-words + ~60 dense craft
  features + a *typicality* feature (`typ_ai`, how close the lyric's trigrams sit to the AI
  phrase-bank). Returns a 0–100 score **and** the raw log-odds `z` (the score saturates at 100%
  long before `z` stops moving — gates read `z`, not the rounded %).
- **Humanizer (`HumanizeFreestyle`)** — three entry points, all bounded to 200 lines per press:
  - **Humanize Line** (`humanizeOne`) — rebuilds the single most-AI line.
  - **Humanize Rewrite** (`humanizeHalf`) — swaps **every** cliché word in **every** line, then
    applies meaning-preserving frame-restructures (molds) to the worst remaining lines.
  - **Humanize Chaos** (`humanizeChaos`) — the aggressive tier: replaces the most-AI *lines* with
    clean library lines, then cleans every cliché word, then de-duplicates repeats.

---

## 3. The decisions (and the arguments for them)

### D1 — On-device only, no LLM. *(The founding constraint.)*
Privacy is the product promise ("reads only the lyrics box"). It also forbids the easy answer (call
an LLM to rewrite a line). Every "why is this so hard" below traces back here.

### D2 — The detector measures DEGREE, not PROVENANCE.
It scores how *typical/templated the writing reads*, not whether AI made it. A well-crafted AI song
(a real extended metaphor, concrete specifics) reads **mostly human** — e.g. our "Hydrogen"
benchmark scores 37%, not 100%, because it's genuinely well-written. Generic Suno output
("dancing in the moonlight, chasing dreams tonight") reads ~100% because it's pure template. This
is intended: a high score is a mirror of *texture*, never a verdict on a person.

### D3 — Line/Rewrite are MEANING-PRESERVING; Chaos is allowed to bend meaning. *(Option A.)*
We tried to make Line/Rewrite write *original lines that still fit the song*. Two disproofs (§4)
killed both on-device paths to "fit". So:
- **Line/Rewrite** only ever change *words inside your sentence* (cliché → curated substitute) or
  restructure a frame keeping all your words. The edit can't go off-topic because it keeps your words.
- **Chaos** is the explicit "meaning may bend" tier: it replaces whole lines with clean library
  lines. Coherent, but topically scattered (off-topic) — that's the contract, stated in its message.

### D4 — Substitutes are curated for QUALITY, not chosen by the model's word-weight.
The model's per-word weights are collinear-noisy in mid-range, so a per-word gate over-blocks good
swaps. Instead every substitute is hand-curated and corpus-checked: it must appear in real human
songs and must not itself lean AI (naive "specific" words like *quiet*, *salt*, *porch* are
**modern AI slop** — measured and rejected).

---

## 4. The discoveries (and the disproofs that earned them)

### DISC1 — Coherence and topical-fit are NOT capturable by on-device deterministic tools.
This is the deepest invariant of the whole project, proven four independent ways:
- **n-gram free-walk → soup.** A Markov rebuild produces grammatical-looking nonsense.
- **Retrieval from a generic library → off-topic.** A clean line that *fits* a shark song
  ("And I'm gonna bite") isn't *in* a generic library; no ranking can conjure fit. ("Mom's call
  comes through fine" landed in the shark song.) → **Option B is dead.**
- **Content-conditioned generation (skeleton/template fill) → soup.** POS-matched word
  substitution is grammatical but incoherent ("a kitchen that dream can't contain"). → **Option C
  is dead on-device.**
- **POS-bigram tables can't separate** human / scrambled / awkward lines (all score ~0 invalid).
Real coherence needs a language model. On-device, **meaning-preserving swap/mold is the ceiling.**

### DISC2 — The AI signal is TWO independent axes: TYPICALITY + REPETITION. *(Rhyme is a red herring.)*
A controlled experiment (bin human and AI songs by a feature, compare *within* the matched bin):
- **Control for rhyme** → AI still scores ~80 vs human ~6. **Rhyme is not the main signal.**
- Decomposing the score's log-odds, within a rhyme-matched bin: **`typ_ai` (typicality)** carries
  ~7–12, **repetition** (`f_repetition` + `dupLinesTotal` + `cf_rep`) carries ~4–5. Match human/AI
  on typicality → repetition is the #1 residual; match on repetition → typicality is #1. **Neither
  explains the other.** Concreteness, line-length, rhyme are minor or collinear.

### DISC3 — Saturation explains why some songs "won't move".
The most templated songs have astronomical log-odds (one 49-line song: `z = 83`, where `z ≈ 3`
already prints 100%). A press can drop `z` by 70 points and the rounded % still reads 100%. The two
Chaos levers below were built directly from DISC2 to push `z` past the line.

### DISC4 — Variety matters: always picking the *single best* substitute just mints the next slop.
If every `silence` became `stillness`, "stillness" becomes the new tell. The swap layer rotates
among the good substitutes seeded by the song (silence → stillness / calm / hush / lull across
different songs), with curated multi-word forms ("soft hush") to keep meter when a 1-syllable
sub would drop a beat. Generic *padding* (insert a fitting adjective) was cheap-tested and
**disproved** — the embedding picks semantic *neighbors*, not modifiers ("the pale dark").

---

## 5. The two Chaos levers (built from DISC2)

- **Lever 1 — Typicality:** Chaos's whole-line replacement drops the theme-fit floor and widens the
  syllable window, so it fills the ~half of a saturated song's lines that otherwise had no library
  match. Only the *unhandleable* typicality lines get replaced; cliché lines still get a
  meaning-preserving swap first.
- **Lever 2 — Repetition:** a repeated line we can't lightly vary is replaced with a fresh one (the
  first occurrence / hook stays sacred). AI over-repeats; this is the independent ~4–5 `z` axis.

Result: Chaos cracks **10 of 11** benchmark songs below 90% (a previously-stuck 100% song with
`z = 83` now lands at ~5–9%). The one holdout is a 74-line wall-to-wall templated song — the honest
edge of what's possible on-device without an LLM.

---

## 6. The no-soup safety system

"Soup" = broken, scrambled, or meaning-destroyed output. We refuse rather than emit soup. The guards:
- **The professor** — `grammatical()` (POS-bigram validity) + `completeLine()` (a line must open and
  close like a real line) gate every restructure's *output*.
- **Per-word context guards** — `shadows` swaps only after "the" (the place sense, not the bare
  subject "Shadows dance"); `lost and found` is protected as an idiom; `broken down` keeps its
  phrasal particle; an article-number guard blocks "a sky" → "a clouds".
- **Frozen-anchor guards** — `love`/`hands` are never swapped inside a ≥90× frozen phrase ("my love").
- **The calibrated blind judge** — a build-time only (never runtime) LLM pass that cleaned the 3085
  library lines and validates edits. Calibrated to pass 8/8 real human lines and reject 8/8 scrambles
  before we trusted it. (Build-time only — the runtime stays no-network.)
- **Validation by EYE over the A/B gate** — the coherence-blind A/B metric can't see register; many
  register fixes (`soul`→`spirit` not `core`, dropping `whisper`→`mutter`) were committed on human
  review, not the metric.

---

## 7. Honest limits (what it deliberately won't do)

- It will not invent content for you. If a song is pure structural typicality with no cliché handle,
  Line/Rewrite refuse and the panel tells you what only you can write (a real detail — a street, a
  time, a name).
- It cannot make Chaos *on-topic*. Off-topic is the price of dropping a saturated song's score
  on-device. If you want both low-% and on-topic, that needs an LLM (which no-network forbids).
- The detector is English-only; non-Latin scripts (kana, kanji, Cyrillic, Arabic, …) show "Looks
  non-English" instead of a meaningless number.

---

## 8. Robustness & privacy notes

- **Bounded work:** every press is capped to 200 lines of *processing* (the untouched tail is
  re-appended, never dropped), so a pathologically long paste can't freeze the UI.
- **Privacy:** no `fetch`, `XMLHttpRequest`, `storage`, `localStorage`, or external URLs anywhere in
  the runtime. Permissions: `activeTab` only. The lyrics box is the only element ever read.
- **Cross-browser:** the Firefox and Chrome packages ship byte-identical runtime JS; only the
  manifest differs (Chrome strips `browser_specific_settings`). All `chrome.*` calls are guarded.

## The compact, cyclable craft panel (2026-06-14)
The craft feedback used to be a long list (5 "keep this" + joker + 5 "work on"), which overran short
phone screens. It is now **three rows**: one 🃏 joker (top), one ⚠️ "work on" (middle), one ✅ "keep
this" (bottom). **Tapping a row rerolls it within its own category**, so all the feedback is still
reachable — it's paged, not cut. The joker is special: it cycles a *smart synonym move* first ("silence"
→ stillness / calm / hush) and then your most-AI lines, each with its own synonym list, instead of a
fixed real-world anchor people found arbitrary.

The non-obvious bug this surfaced: Suno is a single-page app whose DOM mutates constantly, and the
overlay watches the page with a `MutationObserver`. The panel's own reroll edits *are* DOM mutations,
so every tap re-fired the observer, which repainted the panel and **reset the reroll**. The fix is a
one-line guard: `render()` skips repainting when the analysed lyrics string is unchanged (tracked in
`renderedText`, cleared on page change). Lesson for any interactive control injected into a host SPA:
it will be wiped by the host's (or your own) mutation observer unless you guard repaint on real change.

## Honesty guard: the humanizer never makes a song worse
The detector is dominated by a song's *shape* (typicality + repetition), not its individual words, so on
a shape-pinned song a word-level edit can leave the score flat — or, occasionally, nudge it *up*. The
panel reported the before/after score literally, so a rare edit would announce "95% → 99%" as if it had
helped. All three tiers now compare the final score to the original and **return nothing if it got
worse** — the tool would rather say "this is pinned by its structure" than claim a fake win. Verified
across 150 Suno songs: zero edits returned that read more AI than the original.
