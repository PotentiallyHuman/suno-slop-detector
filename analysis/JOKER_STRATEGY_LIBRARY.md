# Joker Strategy Library (v0.2 craft-coach) — pre-built 2026-05-31

**Purpose.** The "joker" is the single, always-present, *decisive* creative suggestion in the v0.2 feedback panel (`5 ✅ good · 1 🃏 joker · 5 ⚠️ work-on`). This file is the **research-grounded move library**, built **on the output side** (no human-song analysis — humans only become weights). Each move = a craft principle → a measurable **trigger** on *our own detectors* → a **dynamic template** whose slots are filled from the specific song. Post-handover I only have to (a) bind triggers to the trained `combined_model.json` weights and (b) run the 100-AI-song tuning pass.

Nothing here is hardcoded advice: every joker names a real word / line / pattern from *that* track.

---

## A. Research foundation (what good lyric craft actually is)

1. **Prosody / unity (Pattison).** Everything in a lyric should serve one central idea; form and content reinforce each other. → our flat, list-y, everything-at-once songs lack a *spine*.
2. **Object writing / show-don't-tell / specificity.** The #1 lyric tool is *specific vs general*. Don't name the emotion — show an observable detail. "I miss you" → "Your jacket's still on the hook and I can't move it." Replace abstract emotion words with something you can see/touch/smell; drop in tangible nouns (a place, a brand, a time) so listeners can enter the song.
3. **Defamiliarization / *ostranenie* (Shklovsky).** Art's job is to make the familiar strange — unexpected viewpoints, fresh metaphors — to defeat "automatized" perception. The cliché is automatized language; the fix is a strange-but-true particular.
4. **Slant vs perfect rhyme.** All-perfect rhyme = predictable "nursery-rhyme" effect and forces clichés ("love/above", "fire/desire"). Slant rhyme sounds natural/modern and leaves a productive unresolved tension. AI famously *rhymes perfectly but feels inauthentic*.
5. **Point of view = camera distance.** ~40% of songs shift POV, almost always *distant → intimate*, often near the end (an "end-oriented" twist). An all-"I" song can gain depth from one verse in another POV (the Tolstoy horse-narrator is POV defamiliarization).
6. **Repetition vs filler.** Hooks should repeat *with variation*; verbatim repetition = monotony. Change one word/line in the final chorus so it lands harder. Vocable padding (oohs/las) usually = the model stretching for length.
7. **Why AI lyrics read generic (the thing we're correcting).** Statistical word-pairing (blue→true), *safety over originality*, vague emotional placeholders ("promises we made"), perfect rhyme without conviction, no specificity. Our detectors are literally measurements of these failure modes.

*Sources:* Pattison (Berklee) — [Sound on Sound](https://www.soundonsound.com/techniques/pat-pattison-writing-better-lyrics), [Berklee: Prosody](https://online.berklee.edu/takenote/prosody-in-music-and-songwriting/); show-don't-tell/specificity — [Songwriting.net](https://www.songwriting.net/blog/bid/209079/Show-Don-t-Tell-3-Steps-to-Writing-Better-Lyrics), [Berklee: imagery](https://online.berklee.edu/takenote/how-to-write-a-song-using-imagery-a-video-tutorial-with-andrea-stolpe/); defamiliarization — [Wikipedia: Defamiliarization](https://en.wikipedia.org/wiki/Defamiliarization); rhyme — [Slant vs perfect](https://www.yxory.com/blog/slant-rhyme-vs-perfect-rhyme-which-sounds-better-in-songs), [Wikipedia: Perfect/imperfect rhymes](https://en.wikipedia.org/wiki/Perfect_and_imperfect_rhymes); POV — [iZotope: POV](https://www.izotope.com/en/learn/songwriting-basics-choosing-the-right-point-of-view.html), [BaileyShea, *From Me To You* (MTO)](https://www.mtosmt.org/issues/mto.14.20.4/mto.14.20.4.baileyshea.html); repetition — [MusicRadar](https://www.musicradar.com/how-to/songwriting-repeated-hooks); AI-generic — [Jack Righteous](https://jackrighteous.com/en-us/blogs/music-creation-process-guide/avoiding-ai-cliches-in-lyrics-keep-your-songwriting-fresh-and-original), [aisongfix](https://aisongfix.com/blog/fixing-ai-songs/fix-my-ai-song-5-common-problems-with-ai-generated-lyrics.html).

---

## B. The move library (12 moves → trigger → dynamic template)

Detector names below are the **real** ones in `analysis/patterns.js` (`struct::*`) + `src/features.js` (18 stat features) + the model's per-word weights (`wBow`) / per-feature weights (`wDense`). Slots in `{ }` are filled from the song.

| # | Move (craft) | Trigger (our detectors / weights) | Dynamic joker template |
|---|---|---|---|
| 1 | **Swap an overused image** (defamiliarization) | song contains a top-+weight `wBow` word from the empirical overused list (neon, shadow, glass, scar, hum, ember, veins, horizon, whisper…) | "Swap **{aiWord}** for something only your narrator would notice right then — a brand, a smell, one small specific thing." |
| 2 | **Concretize the vaguest line** (show-don't-tell) | low `properNounDensity` + low `contentDensity` (or a line that's all abstract-emotion words) | "**'{abstractLine}'** tells the feeling — show it: one thing we could see or touch (the jacket on the hook, the cold coffee)." |
| 3 | **Break a too-perfect rhyme** (slant) | high `perfectRhymeRatio` or a `predictableRhyme` pair (fire/desire, heart/apart) | "Every rhyme lands exactly — let **'{rhymeA}/{rhymeB}'** be a near-miss; it'll sound human, not machine-perfect." |
| 4 | **Shift point of view** (camera/intimacy) | very high `iLineOpeners`/`firstPersonIOpener` + low `secondPersonDensity`/`youAndI` (all "I", no "you", no shift) | "Every line is **'I'** — try the last verse from **{otherPerson}**'s side, or pull back and watch yourself from across the room." |
| 5 | **Vary the verbatim hook** (repetition→variation) | high `hookMaxRepeat` / `consecDupLines` / `titleDropRepeat` | "Your hook **'{hookLine}'** repeats word-for-word **{N}×** — change one word the final time so it lands harder." |
| 6 | **Cut the vocable padding** | high `vocableLines`/`vocables` + low `contentDensity` | "**{N}** lines are mostly **'{vocable}'** filler — trade one for a real image; the song's carrying weight it doesn't need." |
| 7 | **Add a real anchor** (the telling detail) | `properNounDensity≈0` **and** `numeralDensity≈0` | "Nothing here is named — drop in one anchor (a street, a year, **'{aTime}'**) and the whole song gets a body." |
| 8 | **Land an ending on a thing** (strong line-ends) | high `abstractEnding` (lines end on love/pain/heart/soul/forever) | "Most lines end on a feeling-word (**{endWords}**) — land one on a *thing* instead; endings are where the ear rests." |
| 9 | **Give it a turn / volta** (spine) | low `lineLenCV` (flat) + high `repetition` + `antithesisNotBut≈0` (no surprise) | "It stays on one emotional note — give the bridge a turn: the moment the narrator realizes they were wrong about **{theme}**." |
| 10 | **Trade a cliché for a private line** (unity) | high `clicheDensity` or a specific `cliche::` phrase ("broken heart", "tears fall", "against all odds") | "**'{clichePhrase}'** is everyone's line — what's *yours*? Replace it with the one detail only your narrator would say." |
| 11 | **Loosen template syntax** | `negNegPos` / `antithesisNotBut` present (no-X-no-Y-but-Z, not-X-but-Y) | "The **'{templatePhrase}'** construction is a common AI scaffold — say it plain, in your own grammar." |
| 12 | **Pure experiment** (fallback, clean songs) | *nothing else fired* | "Craft's already tight — for fun, run the whole thing from an unexpected narrator (the room, the phone, the dog) and see what it reveals." |

---

## C. Selection logic — "always exactly one, always decisive"

For a pasted song, compute every move's **trigger score** =
`zscore(detectorValue vs our AI-corpus mean)  ×  |wDense or wBow weight for that signal|`
— so a move ranks high only when the song over-does a trait **and** the trained model agrees that trait matters. **Fire the single top-scoring move**, fill its slots from the song, done. If no move clears a small threshold (a genuinely clean track) → **Move 12** fires. → never empty, never two, always tailored.

(The `5 ✅` and `5 ⚠️` notes use the *same* machinery but are **observations, not transformations**: ⚠️ = the song's 5 strongest +weight signals present, each quoting the offending word/line + a one-line fix; ✅ = its 5 strongest −weight/human-leaning choices present, quoted as "keep this." The joker is the one *do-this* on top.)

---

## D. What I still do post-handover (the only remaining steps)

1. **Bind triggers to weights** — read `combined_model.json` (`wBow`, `wDense`, `denseNames`, `vocab`) so the overused-word list (Move 1, 10), the ±feature rankings (Moves 2–11), and the thresholds come from the *trained* model, not guesses.
2. **100-AI-song tuning pass** — run the moves over 100 of our own AI songs to (a) confirm each fires on the right tracks, (b) set thresholds, (c) make the filled templates read naturally; optionally let an LLM draft 100 *specific* jokers first, then fold them into these 12 generic-dynamic templates. *(AI songs only — never humans.)*
3. **Slot extractors** — small functions that pull `{aiWord}`, `{abstractLine}`, `{rhymeA/B}`, `{hookLine}`, `{clichePhrase}`, `{endWords}` etc. straight from the lyrics the user is viewing (all client-side, offline, deterministic).

**Inputs needed from the other PC:** `combined_model.json` + the `*_summaries.json` + `COMBINED_REPORT.txt` + `corpus/models/*.json` (the AI lyrics to tune on). That's it — the human side never re-enters.
