# Meter-matched, context-safe line-REPLACEMENT catalog (Humanize content features)

Replace a flagged vague/cliché/personified/simile line with a concrete, cliché-free line of the
SAME syllable count — BUT only one whose context fits the song (no "boots" in a song about a cat).
Applies to all content-substitution features (vague, personification, AI-cliché, emotional-simile,
abstract-ending, adj-stack). Repetition removal stays a deletion (no replacement needed).

## 1. SONG CONTEXT (detected from the whole lyric, cheap on-device)
- **HUMAN** — has relational/2nd-3rd-person cues (you/she/he/we/him/her + love/miss/leave/call/kiss).
- **SELF** — 1st-person introspection (I/me/my) with no clear other.
- **CREATURE** — an animal subject present (cat/dog/bird/fox/wolf/horse…).
- **PLACE_NATURE** — about a place/nature (town/sea/road/mountain/rain/field).
- **OBJECT_ABSTRACT** — about a thing/idea (a clock, time, money, a machine).
- **UNKNOWN** — none confidently detected.

## 2. REPLACEMENT-LINE TAGS (what a candidate line ASSUMES / INTRODUCES)
- `ENV` — weather/light/time/sound, NO agent → safe EVERYWHERE (the universal default pool).
- `PLACE` — a setting/room/street, no person.
- `OBJECT` — a concrete thing, no person (kettle, door, clock).
- `DOMESTIC` — household items/actions (implies a lived-in human space).
- `URBAN` — city/traffic cues.
- `PERSON` — implies a human is present (she/you/his hand).
- `BODY` — hands/eyes/skin (a person OR creature).

## 3. HARD RULES (what we ALLOW suggesting)
1. Suggest a line only if its tags ⊆ the song-context's allowed set:
   - HUMAN → ENV, PLACE, OBJECT, DOMESTIC, URBAN, PERSON, BODY
   - SELF → ENV, PLACE, OBJECT, DOMESTIC, URBAN, BODY (NOT PERSON-other)
   - CREATURE → ENV, PLACE, OBJECT (NOT PERSON/DOMESTIC/BODY-human)
   - PLACE_NATURE → ENV, PLACE (NOT PERSON/DOMESTIC/OBJECT-modern)
   - OBJECT_ABSTRACT → ENV, OBJECT
   - UNKNOWN → **ENV only** (lowest risk)
2. NEVER introduce a person/body/relationship into a song with no human cues (the cat/boots rule).
3. NO proper nouns / named places / brands in the pool — stay generic-concrete so it can't contradict the song.
4. Replacement syllable count = removed line's count (±1 only).
5. Replacement must itself score LOW-AI (verified by SlopV2) AND contain zero cliché-lexicon words.
6. When context is confident, still PREFER `ENV` lines (lowest risk); use context-specific only as needed.
7. It's a SUGGESTION (reversible via Undo) — when no tag-compatible, syllable-matched line exists, do nothing (leave the line, keep it on the ⚠️ list as advice).

## 4. EXAMPLE POOL (illustrative — agent expands + verifies syllables/score)
**ENV (universal, safe in every context):**
- "the rain kept tapping on the glass" `[ENV]`
- "morning came in grey and slow" `[ENV]`
- "wind dragged the leaves across the lot" `[ENV]`
- "the light went thin behind the hills" `[ENV]`
- "thunder rolled and kept its distance" `[ENV]`
**PLACE / OBJECT (no person):**
- "the kitchen tap had start to drip" `[PLACE,OBJECT,DOMESTIC]`
- "the clock kept time it couldn't keep" `[OBJECT]`
- "the gate hung open half the night" `[PLACE]`
**PERSON / DOMESTIC (HUMAN context only):**
- "she left her cup beside the sink" `[PERSON,DOMESTIC]`
- "you didn't call me back that night" `[PERSON]`
- "his coat still smells like cigarettes" `[PERSON,BODY]`
**CREATURE-safe (ENV/PLACE only):**
- "the gravel held the day's last heat" `[ENV]`
- "the field went still before the rain" `[ENV,PLACE]`

## 5. DECISIONS LOG
- 2026-06-04: REPLACE (not delete) for content features; meter-matched; context-tagged; HARD RULES above. Applies to ALL content-substitution transforms. Repetition stays deletion. Agent builds full vetted catalog.

## 6. PHONETIC RHYME INDEX (rhyme-preserving end replacement) — analysis/rhyme_index.js
For abstract-ending lines (and any catalog replacement that must keep the song's rhyme): swap the
ending to a word/short-phrase that RHYMES BY SOUND (prosody.rhymeKey), matches syllable count, and
is NOT a feeling/abstract word.
- Build an index: rhymeKey -> [{ ending, syllables, abstract:bool, tags }] over (a) a curated
  concrete/common-word vocabulary and (b) common 1-2 word endings ("in vain","to blame","by name","on my own").
- rhymeKey is PHONETIC (vowel-class), so pain/vain/blame/shame group; eye-rhymes handled via prosody overrides.
- API: rhymesFor(word,{syllables,excludeAbstract}); suggestConcreteRhyme(endWord, partnerEndWord)
  -> a non-abstract ending that rhymes with the PARTNER line (preserves the scheme) and matches syllables.
- Rule: only suggest if a same-rhyme, same-syllable, non-feeling, context-allowed option exists; else leave the line.
- Example: line "...left here with the pain" (partner rhymes on /eɪn/) -> "in vain / to blame / by name".

## 7. FEEDBACK ACTION TYPES (every negative feedback is one of these)
1. **EDIT** — a safe mechanical fix exists (catalog line-replace, rhyme-preserving end-swap, dedup, opener-strip, in-line word-swap). Humanize applies it (kept only if it lowers the score).
2. **TRANSPARENT-ONLY** — a real AI signal but too NORMAL/legitimate to change (heart, shadow, neon, humming, soul…). The panel SHOWS it for transparency; Humanize does NOT suggest an edit. "We can't disallow 'heart' in a lyric, but we can be transparent it's an AI signal." (user, 2026-06-04)
3. **REWRITE-ONLY** — flagged by absence of content (name a place, add a turn/dialogue, build a thread). Needs new meaningful lines → the v5 LLM rewriter, not on-device Humanize.
