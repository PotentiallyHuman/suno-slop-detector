# v5 — LLM Lyric Rewriter: handoff spec + ready-to-use prompt

_Authored 2026-06-04. Builds on the Humanize survey (`HUMANIZE_FEEDBACK_SURVEY.md`),
the replacement-catalog design (`REPLACEMENT_CATALOG_DESIGN.md`), and what shipped in
v0.4.1 (on-device word/phrase swaps). This is the handoff for the NEXT capability tier._

---

## 0. Why v5 exists (scope)

On-device Humanize (v0.4.x) can only do **safe mechanical word/phrase swaps** + structural
trims. It deliberately does NOT add content, because adding "name a place / add a turn /
write dialogue" needs real language generation. Those are the survey's **REWRITE-ONLY**
items (Part B), plus the **whole-line suggestion mode** we chose not to auto-apply:

- generic setting → a specific one          (`t4_story_setting`)
- generic objects → concrete ones           (`t4_story_objects`)
- no action / nothing happens → an event    (`t4_story_action`)
- no dialogue → a line someone says         (`t4_story_dialogue`)
- no sense of time passing → a time shift    (`t4_story_temporalSeq`)
- rhyme sounds rarely repeat → tighten scheme(`t4_rap_schemeEntropy`)
- no turn/volta → a turn                      (`t4_poet_volta`)
- one-note feelings → ambivalence            (`t4_psy_ambivalence`)
- no agency → the narrator does something     (`t4_psy_agency`)
- lines don't lead into each other → flow     (`t4_phil_sequentialFlow`,`t4_phil_connectives`)
- one idea per line → a blended image         (`t4_wit_blendRate`,`t4_wit_domainPeak`)
- every line sweet → tonal contrast           (`f_positivityBias`)
- every line starts "I" / anaphora            (`s_iLineOpeners`,`s_anaphora`)
- vague "we"                                   (`f_collectivePronoun`)
- stock templates ("you and I", "let it go"…) (`s_youAndI`,`s_letItGo`,…)
- generic words / uniform line length          (`f_commonWordRatio`,`f_lineLenCV`)
- whole vague/cliché/personified/simile LINE → concrete rewrite (survey items 1-4, suggestion-only)

v5 is **opt-in and off by default**. It is NOT on-device: it calls an LLM, so it requires
network. That breaks the "100% offline, no data" guarantee → it must be a clearly-labelled,
separately-consented feature (see §6). The free, private detector + mechanical Humanize stay
the default experience.

---

## 1. Non-negotiable rules (the whole reason this is hard)

These come from repeated user decisions on this project. Violating any of them is a failure,
even if the AI-score drops.

1. **It's the SAME song.** Preserve the writer's meaning, story, characters, and intent.
   Rewrite HOW something is said, never WHAT the song is about. A breakup song stays a
   breakup song; a song about a cat stays about that cat.
2. **The cat/boots rule (context safety).** Never introduce a person, body part, relationship,
   or human-domestic detail into a song that has no human subject. Detect song context first
   (HUMAN / SELF / CREATURE / PLACE_NATURE / OBJECT_ABSTRACT / UNKNOWN — see
   `REPLACEMENT_CATALOG_DESIGN.md §1-3`) and only add details that fit it. When unsure → add
   nothing.
3. **No invented specifics that could contradict the song.** No proper nouns, brand names,
   place names, or named people unless they already appear in the lyric. Concrete ≠ named.
4. **Preserve form by default.** Keep the rhyme scheme and meter (syllable counts per line)
   unless the explicit goal of that edit is to fix them — and even then, change the minimum.
   Keep section structure ([Verse]/[Chorus]) and line count unless asked otherwise.
5. **Keep the writer's voice & register.** Match their vocabulary level, slang, profanity,
   and dialect. Do not "elevate" or formalize.
6. **Transparent-only words are not targets.** heart, soul, forever, neon, shadow, and other
   ubiquitous-but-normal words are NOT things to purge (survey items 6, 10). Humans use them.
7. **Every change is a reversible SUGGESTION the user can reject**, shown with a before→after
   and a one-line reason. Never silently rewrite.
8. **If you can't improve a line without breaking rules 1-6, leave it** and say why.
9. **No new clichés.** Don't trade one stock phrase for another. The point is concrete,
   specific, human — not a different flavor of generic.

---

## 2. Input contract (what the rewriter receives)

```json
{
  "lyrics": "<the user's full lyric text, section labels intact>",
  "score":  74,                         // SlopV2 AI% before rewrite
  "context": "SELF",                    // ReplacementCatalog.detectContext(lyrics)
  "flags": [                            // SlopPanel.build(...).bad, highest-AI first
    { "feature": "t4_story_setting", "label": "The scene is generic", "line": "lost out in the night again" },
    { "feature": "f_positivityBias", "label": "Every line is sweet", "line": null }
  ],
  "doNotTouch": ["heart","soul","forever", "...transparent-only words present..."],
  "goal": "reduce AI texture while preserving meaning, form, and voice"
}
```

The host app produces `score`, `context`, and `flags` from the existing engine
(`SlopV2.score`, `ReplacementCatalog.detectContext`, `SlopPanel.build`). The rewriter does
not re-derive them; it acts on them.

## 3. Output contract (what it must return)

```json
{
  "rewrite": "<full lyric, same sections/line-count unless a fix required otherwise>",
  "changes": [
    { "before": "lost out in the night again",
      "after":  "locked out on the back step again",
      "reason": "named a concrete place (setting) — fits SELF context, same syllables/rhyme" }
  ],
  "untouched": [
    { "line": "you broke my heart", "why": "‘heart’ is a normal word; line is already concrete" }
  ],
  "notes": "what I could NOT safely fix and why"
}
```

## 4. Per-target playbook (how to fix each Part B item — minimally)

- **Generic setting / objects** → swap the abstraction for ONE concrete, context-allowed
  detail at the SAME syllable count (kettle, back step, bus, gravel…). Never a named place.
- **No action** → let one concrete thing happen in an existing line ("I sat" → "I dropped the
  keys twice"), don't add a line unless the section can hold it.
- **No dialogue** → turn one reported feeling into a short said line ("she was angry" → "she
  said ‘don't’"). Keep it tiny.
- **No time passing** → add a temporal hinge to an existing line ("by the time the kettle
  cooled"), not a new stanza.
- **Scheme entropy / weak rhyme** → tighten an existing end-word to rejoin the scheme using a
  CONCRETE rhyme (reuse `rhyme_index` logic), never a feeling-word.
- **No volta** → introduce ONE turn word/line late ("but", "until", "then it wasn't") only if
  the song's arc supports it.
- **One-note feeling / positivity bias** → let ONE line undercut the mood with a concrete
  detail, not an abstract opposite ("everything's fine" → "fine, except the sink still leaks").
- **No agency** → make the narrator do a small concrete action instead of only feeling.
- **Flow / connectives** → join two stranded lines with a causal/temporal link; don't pad.
- **Low blend / one idea per line** → fuse two concrete images the song already implies; avoid
  forced cleverness.
- **I-openers / anaphora** → vary the opener of a FEW lines, keep the ones that are doing
  deliberate anaphora (it's a real device, not always a tell).
- **Vague "we" / stock templates** → ground "we" in a shared concrete act; replace a stock
  template with a specific paraphrase that keeps the meaning.
- **Generic words / uniform length** → vary one or two line lengths and swap a couple of
  filler words for concrete ones — sparingly.

Default dosage: **change the fewest lines that move the needle.** Over-rewriting is the
most common failure mode and reads as a different (often worse, AI-ish) song.

## 5. Self-check loop (the host runs this; the prompt must cooperate)

1. Re-score the `rewrite` with `SlopV2.score`. Keep ONLY if AI% dropped meaningfully.
2. Meaning-preservation check (second LLM pass or a rubric): does the rewrite tell the same
   story with the same feeling? If not → discard, fall back to original.
3. Rule audit: any proper noun added? any person added to a non-human song? form broken? →
   discard the offending change.
4. Present surviving changes as accept/reject suggestions. The user has final say per change.

## 6. Productization / privacy (do this right)

- v5 needs a network LLM call → it is **NOT** covered by the "100% offline, no data" promise.
- Make it **opt-in with explicit consent** ("This sends your lyrics to an AI to rewrite them.
  Turn on?"), off by default, clearly separated from the free local scorer/Humanize.
- Update the privacy policy + Play Data Safety form for the rewriter path (lyrics sent to a
  third-party model). Keep the default app exactly as-is (offline) so the core promise holds.
- Prefer a model the user controls / a provider whose ToS permits this use; do not log lyrics.

---

## 7. READY-TO-USE SYSTEM PROMPT (paste into the rewriter LLM)

> You rewrite song lyrics to read more human and less AI-generated, WITHOUT changing what the
> song is about. You receive the lyric, an AI-texture score, the detected song context, and a
> list of flagged issues. Return JSON only, matching the schema you are given.
>
> Hard rules — breaking any one is a failure even if the lyric sounds better:
> 1. Keep the SAME song: same story, characters, feeling, intent. Change how things are said,
>    never what the song is about.
> 2. Respect the song context. If the song has no human subject (e.g. it's about an animal, a
>    place, or an object), do NOT add people, body parts, relationships, or household detail.
>    When unsure, add nothing.
> 3. Add NO proper nouns, brand names, place names, or named people unless they already appear
>    in the lyric. "Concrete" means specific and sensory, not named.
> 4. Preserve the rhyme scheme, the syllable count per line, the section labels, and the line
>    count — unless fixing one of those is the explicit purpose of a change, in which case
>    change the minimum.
> 5. Keep the writer's exact voice, register, slang, and dialect. Do not formalize or elevate.
> 6. Do not purge normal words (heart, soul, forever, shadow, neon…). They are not the problem.
> 7. Introduce no new clichés. Replace generic with concrete and specific, never with another
>    stock phrase.
> 8. Change the FEWEST lines that meaningfully reduce AI texture. Over-rewriting is failure.
> 9. If a flagged line cannot be improved without breaking rules 1-6, leave it unchanged and
>    record why in "untouched".
>
> For each change, give before, after, and a one-line reason tied to a flag. Output only the
> JSON object: { rewrite, changes[], untouched[], notes }.

---

## 8. Build checklist (when v5 is greenlit)

- [ ] Wire input contract from existing engine outputs (`SlopV2`, `SlopPanel`, `ReplacementCatalog.detectContext`).
- [ ] Implement the §5 self-check loop (re-score + meaning check + rule audit) host-side.
- [ ] Per-change accept/reject UI (reuse the Humanize before→after pattern).
- [ ] Opt-in consent + privacy/Data-Safety updates (§6).
- [ ] Eval set: run on the corpus + hand-picked songs; confirm meaning preserved AND score down,
      and that CREATURE/PLACE_NATURE songs never get a person added (the cat/boots regression test).
- [ ] Keep the default app fully offline; v5 is an additive, separate mode.
