# === SURVEY COMPLETE (2026-06-04) ===
All 28 items decided. Build spec for Humanize v4.x:
- EDIT (build these transforms): 1 vague->catalog, 2 personification->catalog, 3 ai-cliche-line->catalog,
  4 emo-simile->catalog, 5 abstract-ending->catalog+rhyme_index, 7 adj-stack->adjstack_swaps,
  8 -ing->ingverb_swaps, 9 prep-phrase->prepphrase_swaps, 11 interjection-opener->stripFillerOpener(extend).
- TRANSPARENT-ONLY (flag, never edit): 6 my-heart, 10 forever/never, 12 wall-to-wall-imagery
  (+ move existing cutImageStackedLine/imageDensity/senseDiversity here for consistency), and ALL of Part B (13-28).
- REWRITE-ONLY -> v5 LLM rewriter (opt-in, future): all of Part B (story setting/objects/action/dialogue/time,
  rap scheme-entropy, poet volta, psy ambivalence/agency, phil flow/connectives, wit blend, positivity bias,
  I-openers/anaphora, we-group, stock templates, generic words/line-length).
RULE OF THUMB confirmed by data: never inject/replace CONTENT into a user's song; only swap a flagged
word/phrase for a data-vetted human-attested equivalent (meter-/context-/rhyme-safe), or be transparent.
Artifacts built+validated: replacement_catalog.js, rhyme_index.js, adjstack_swaps.js, ingverb_swaps.js, prepphrase_swaps.js.

# Humanize Feedback Survey — design decisions for negative feedbacks without an auto-edit

One item at a time. User answers in text → DECISION recorded here. This becomes the build spec
for Humanize transforms (and the v5 LLM-rewriter scope). Status legend:
`PENDING` → not yet surveyed · `DECIDED: <text>` · `SKIP`.

Proposed-edit column is the agent's mechanical design where one exists; REWRITE-ONLY = needs new content (v5).

## Part A — mechanically buildable (a safe delete/swap exists; decide build / tweak / skip)
1. **vague emotion / unanchored lines** (`t3_vagueEmotion`,`f_abstractRatio`,`t4_poet_ungrounded`) — proposed: deleteVagueLine — DECIDED: REPLACE (not delete) via context-safe meter-matched catalog — see REPLACEMENT_CATALOG_DESIGN.md + replacement_catalog.js
2. **personification** (`t3_inanimateAnimate`) — proposed: deletePersonifiedLine — DECIDED: REPLACE (not delete) via context-safe meter-matched catalog — see REPLACEMENT_CATALOG_DESIGN.md + replacement_catalog.js
3. **AI-cliché phrase lines** (`t3_aiClicheList`) — proposed: deleteAiClicheLine — DECIDED: REPLACE (not delete) via context-safe meter-matched catalog — see REPLACEMENT_CATALOG_DESIGN.md + replacement_catalog.js
4. **emotional simile "like a…"** (`t3_emoSimile`) — proposed: deleteEmoSimileLine — DECIDED: REPLACE (not delete) via context-safe meter-matched catalog — see REPLACEMENT_CATALOG_DESIGN.md + replacement_catalog.js
5. **lines end on feeling-words** (`s_abstractEnding`) — DECIDED: whole-line catalog replacement (like 1-4) + RHYME-PRESERVING via a phonetic rhyme index (rhymeKey+syllables, abstract-flagged, last-1-or-2-words: "in pain"→"in vain/to blame/in shame"). Replacement must rhyme with the line's partner, match syllables, and not be a feeling-word. See REPLACEMENT_CATALOG_DESIGN.md §6 + analysis/rhyme_index.js
6. **"my heart" phrasing** (`s_myHeart`) — DECIDED: **TRANSPARENT-ONLY** — too normal to disallow (like shadow/neon/humming/soul); keep showing it as an AI signal for transparency, NO auto-edit. (Applies to other ubiquitous single-word tells.)
7. **adjective-stack "shattered dreams"** (`t3_adjStack`) — DECIDED: EDIT the ADJECTIVE via a DATA-VETTED swap table — include only adj+noun pairings the corpus proves are AI-skewed (AI freq >> human freq); replacements must read human (low/neg model weight, not cliché). See analysis/adjstack_swaps.js
8. **"-ing verb + vague noun"** (`t3_ingVerbAbstract`,`s_ingEmotionVerb`) — DECIDED: EDIT via DATA-VETTED swap; replacements may CHANGE FORM (adj/past/plain), must be human-used (low AI-weight) + grammar-fit (it is a reversible SUGGESTION). Seeds: burning→fiery/ignited/flaming, falling→broken/cracked/picked/struck, fading→left/washed/gone. See analysis/ingverb_swaps.js
9. **"in the night/dark" prepositional cliché** (`s_prepInTheNight`) — DECIDED: DATA-VETTED PHRASE swap, METER-MATCHED (syllable-preserving), human-attested replacements; transparent-only the too-normal ones (e.g. "in the rain"). Seeds — night: through the night / dead of night / pitch black night / passing dark / 12 o'clock; rain: washing down / pouring down / washed away / while it rains / raining on. See analysis/prepphrase_swaps.js
10. **"forever/never/always" absolutes** (`s_temporalAbsolute`) — DECIDED: **TRANSPARENT-ONLY** — humans use them constantly + swapping changes meaning; just flag as AI signal (like heart). "acceptable transparency" (user).
11. **interjection openers** (`s_exclaimInterjection`) — DECIDED: EDIT — clean delete of the leading interjection ("Yeah,/Oh,/Hey,/Whoa,") + capitalize next word, via extended stripFillerOpener. Mid-line interjections untouched.
12. **wall-to-wall imagery** (`t4_poet_concreteRatio`) — DECIDED: **TRANSPARENT-ONLY** — fixing it = injecting content into the user's song; don't. Just flag. ⚠️ CONSEQUENCE: the EXISTING `cutImageStackedLine` (wired to `t4_poet_imageDensity`,`t4_poet_senseDiversity`) deletes image lines → same objection (deletion breaks meter + alters imagery content) → move those to TRANSPARENT-ONLY too, for consistency.

## Part B — rewrite-only today (flagged by ABSENCE of content; decide skip / v5 / clever idea)
13. **generic setting** (`t4_story_setting`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
14. **generic objects** (`t4_story_objects`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
15. **little actually happens / no action** (`t4_story_action`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
16. **no one speaks / no dialogue** (`t4_story_dialogue`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
17. **no sense of time passing** (`t4_story_temporalSeq`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
18. **rhyme sounds rarely repeat** (`t4_rap_schemeEntropy`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
19. **no turn / volta** (`t4_poet_volta`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
20. **one-note feelings** (`t4_psy_ambivalence`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
21. **no agency** (`t4_psy_agency`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
22. **lines don't lead into each other** (`t4_phil_sequentialFlow`,`t4_phil_connectives`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
23. **stays in one idea per line / no blend** (`t4_wit_blendRate`,`t4_wit_domainPeak`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
24. **every line is sweet (positivity bias)** (`f_positivityBias`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
25. **almost every line starts with 'I' / anaphora** (`s_iLineOpeners`,`s_anaphora`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
26. **'we' as a vague group** (`f_collectivePronoun`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
27. **stock template phrases** (`s_youAndI`,`s_letItGo`,`s_thisIs`,`s_everyEnum`,`s_neverGonna`,`s_allINeed`…) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
28. **generic words / uniform line length** (`f_commonWordRatio`,`f_lineLenCV`,`f_avgLineLen`) — DECIDED: TRANSPARENT-ONLY now (flag as AI signal); v5 LLM rewriter later (needs added content)
