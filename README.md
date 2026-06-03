# 🤖 Suno Slop Detector

A browser extension that reads the lyrics on a Suno song page and tells you, in one honest number, how much they read like AI slop:

> **62% AI** — *Heavy AI seasoning*

Open a song. A little pill appears top-right. Click it for the **craft-coach panel**: what the song does well, one creative move to try, and what to work on.

Born out of spite after r/SunoAI removed an open-source de-clicker post. So now it's open source forever. 🫡

> ### 🙅 This is for fun — it is **not** a personal attack or a judgement of any songwriter.
> The score rates **lyrical texture**, not talent, effort, or worth. Using AI to make music is **completely fine** — this is a playful mirror, not a courtroom. A high score doesn't mean a song is bad and a low score doesn't mean it's good. Plenty of beloved human songs score high (they share vocabulary with the AI that trained on them), and plenty of careful AI-assisted writing scores low. **Don't use this to harass, shame, or "out" anyone.** It's a toy for curiosity and craft, full stop.

---

## What's new in v0.3.0

v0.3 makes the model **read like a panel of craft experts** and fixes a corpus blind-spot that was letting real AI songs slip through.

- **Six craft-perspective "lenses," ~55 new text-only signals.** On top of the v0.2 features, the model now sees what a **🎤 freestyle rapper**, **✍️ poet**, **🧠 psychologist**, **🧩 philosopher**, **📖 storyteller**, and **💡 wit** would each notice — all computed deterministically from the text (no LLM, no network). Signals that actually separate human from AI in calibration: rhyme **density / internal rhyme / assonance** (humans rhyme richer), **direct address** to a listener, **named people/places** ("Texaco on Route 9"), **rich/rare vocabulary** and real-world **allusion** — versus AI's **over-stuffed sensory imagery**, **generic settings/objects**, and **stock images**. The single strongest signal is *assonance* (a human tell); the strongest AI tells are duplicate lines, cliché density, and generic objects.
- **Eye-rhyme archive.** A 241-word table of sight-rhymes (*love/move, good/blood, though/through*) so the rhyme engine stops counting words that only rhyme on paper — and flags them as a (text-AI) tell.
- **Rebalanced corpus = it now actually catches Suno.** Retrained on the **five real consumer-AI sources** (Suno-dominant + ChatGPT/Grok/Gemini) instead of letting locally-generated filler skew the AI class. Result on a real Suno song: **v0.2 scored it 17% AI (missed it); v0.3 scores it 98%** — while keeping human classics low (Bohemian Rhapsody **0%**, Baby **1%**) and *reducing* a Dylan false-positive (87%→53%). 5-fold CV: bag-of-words 89.7%, dense-features 84.2%, combined 82.8%.
- **On-device non-English guard.** Lyrics in another language (the model is English-only) get an honest "Looks non-English" note + a translate suggestion instead of a meaningless score — detected by a function-word ratio, no network.
- **Smarter panel.** The 5 ✅ / 1 🃏 / 5 ⚠️ notes now draw on the perspective lenses (with examples), the joker can surface a lens's dynamic tip ("collide two worlds — a feeling in money/weather/science terms"), and a bug where it suggested swapping the word *"the"* is fixed (function words are never targeted).

Still 100% on-device, text-only, no network. Full design + per-lens calibration: [`analysis/perspectives/DESIGN_AND_CALIBRATION.md`](analysis/perspectives/DESIGN_AND_CALIBRATION.md).

---

## What's new in v0.2.0

v0.1 was a hand-tuned cliché lexicon squashed through a curve. **v0.2 replaces the guesswork with a real trained model** and adds a craft coach:

- **A trained classifier, not hand-weights.** A logistic-regression model learned from a corpus of **3,805 AI songs** (ChatGPT, Claude, Grok, Gemini, Suno) vs **3,848 human-song metric vectors**. It combines a **bag-of-words** half with **79 text-only stylometric/craft features** (the cliché lexicon, rhyme regularity, burstiness, specificity, personification, argument structure…). ~85% cross-validated accuracy (the shipped text-only, no-embedding variant).
- **The score is pure P(AI).** No more blending. The number you see is the model's calibrated confidence that the lyric is AI-written. The raw logistic regression is wildly overconfident on separable data (it pins everything to 0 or 100), so the logit is **temperature-scaled** to spread borderline songs across the middle and keep the gradient meaningful.
- **Input cleaning.** Before scoring, the extension strips `[Verse]` / `[Chorus]` section tags, leaked JSON blobs, and model-reply scaffolding ("Sure! Here are your lyrics:") so the format never leaks into the score — exactly the way the training corpus was cleaned.
- **Instrumental detection.** If the "lyrics" are empty after cleaning, the song is flagged **instrumental** and gets **no score and no feedback** (scoring silence would be nonsense).
- **The craft-coach panel: 5 ✅ · 1 🃏 · 5 ⚠️.** Click the pill to see:
  - **5 ✅ keep-this** — the song's 5 strongest *human-leaning* choices, quoted back as "keep doing this."
  - **1 🃏 joker** — a single, always-present, decisive creative suggestion, with its slots (a word, a rhyme, a line) filled from *this* song. Grounded in real songwriting craft (Pattison's prosody, object-writing / show-don't-tell, Shklovsky's defamiliarization, slant rhyme, point-of-view shifts). See [`analysis/JOKER_STRATEGY_LIBRARY.md`](analysis/JOKER_STRATEGY_LIBRARY.md).
  - **5 ⚠️ work-on** — the song's 5 strongest *AI-leaning* signals that fired, each quoting the offending word/line plus a one-line fix.

**Everything runs on-device, text-only, with no network.** No embeddings, no LLM call, no upload. The model weights ship inside the extension; the lyric is scored in memory and thrown away.

---

## How it tells AI from human — the strongest signals

The model judges **degree of slop, not origin.** It doesn't know who made a song; it measures *texture*. A well-crafted lyric scores low even if AI made it, and a cliché-heavy human song scores high. Here are the highest-weight learned signals (from `corpus/combined_model.json` — `wDense` per-feature weights; the corpus was deliberately seeded with cliché-heavy human "hard negatives" so the model learns *degree*, not mere word-presence).

Examples in the **AI** column are **real lines from the AI corpus** (`corpus/models/*.json`). The **human** column notes the contrasting human tendency.

| Signal (weight) | What it measures | Leans | AI example (real) vs human tendency |
|---|---|:---:|---|
| **`immediateWordDouble`** (+20.4) | a word repeated back-to-back inside a line — "grow, grow", "higher, higher" | 🤖 AI | AI: *"Higher, higher, the wind-stairs curled"* / *"Lower, lower, the sea bells rang"*. Humans double words for real emphasis occasionally; AI reflexively pads with it to fill a meter. |
| **`dupLinesTotal`** (+12.2) | how many whole lines are repeated verbatim across the song | 🤖 AI | AI loops *entire identical lines* to reach length. Human hooks repeat too — but a human usually **varies one word** in the final chorus so it lands harder. |
| **`t3_specificReferent`** (−11.3) | mid-line capitalised names — people, places, brands | 🧑 human | Humans name things: *"met you outside the Texaco on Marshall Street."* AI stays generic — *"met you in the city under neon lights"* — because a named referent is a specificity it can't safely invent. |
| **`idkButOpener`** (+10.5) | the "I don't know why/where… **but** I …" opener template | 🤖 AI | AI: *"I don't know where I'm going but I know it's not here"* / *"I don't know who's listening but I sing it like I do."* A signature LLM scaffold for manufacturing false vulnerability. |
| **`t3_argumentMarkers`** (+9.4) | density of but / yet / though / however / still | 🤖 AI | AI over-uses contrast connectives to *simulate* depth: *"But you came down like weather."* Used sparingly by humans for a genuine turn; AI sprinkles them as filler texture. |
| **`f_lineLenCV`** (−8.9) | burstiness — variation in line length (stdev/mean) | 🧑 human | Humans write bursty, uneven lines (a 3-word punch next to a 12-word run). AI produces **uniform, metronomic** line lengths — low variation is a tell. |
| **`f_hapaxRatio`** (+8.7) | share of words used exactly once — a thin, padded vocabulary | 🤖 AI | AI lyrics churn through many one-off mood-words without a tight, recurring vocabulary; humans tend to compress around a few load-bearing images. |
| **`f_properNounDensity`** (−8.7) | capitalised proper nouns per line — specificity | 🧑 human | Same instinct as `specificReferent`: humans drop in *Marshall Street*, *a '79 Ford*, *Mama*; AI keeps it nameless and universal. |
| **`s_secondPersonDensity`** (−8.7) | how often a real "you" is addressed | 🧑 human | Human songs are often written *to someone*. AI tilts toward generic first-person mood-painting with no concrete addressee. |
| **`f_repetition`** (−8.0) | length-corrected lexical diversity (this direction rewards varied vocabulary) | 🧑 human | A *too-uniform* loop of the same words reads AI; varied, surprising word choice reads human. |
| **`s_consecDupLines`** (+7.6) | back-to-back identical lines | 🤖 AI | AI: *"And I wished 'em well, I wished 'em well…"* repeated immediately. Verbatim back-to-back duplication is padding, not a crafted hook. |
| **`f_abstractRatio`** (−7.6) | abstract emotion-words (love/pain/soul/forever) per content word | 🧑 human | AI *names* the feeling — *"endless pain, a shattered soul, forever lost."* Humans **show** it: *"your jacket's still on the hook and I can't move it."* Concrete beats abstract. |
| **`s_simileLikeA`** (+7.1) | "like a ___" similes | 🤖 AI | AI reaches for the easy comparison: *"the blue flame opened like a star."* Vivid human similes are strange-but-true; AI similes are generic and interchangeable. |
| **`s_antithesisNotBut`** (−6.9) | "not X, but Y" inline reversal | 🧑 human | A real human turn: *"Not for the rice but for the empty chair."* When earned (not template-filled) this contradiction-holding reads as genuine craft. |
| **`t3_inanimateAnimate`** (+6.5) | objects given human verbs — "pavement whispers", "the city sings" | 🤖 AI | AI over-personifies everything: *"the city sings itself into its morning power"*, *"we echo back when the silence calls."* One personification is poetry; personifying *everything* is the AI mood-stacking tell. |
| **`t3_aiClicheList`** (+4.9) | the documented AI-slop phrase list — echoes, whispers in the dark, fading light, shattered dreams… | 🤖 AI | AI: *"In the echoes of the streets I've always known"*, *"the weight of the road and the fading light."* These exact phrases recur across nearly every AI lyric generator. |

And the old cliché vocabulary still pulls its weight underneath all this — `neon`, `shadows`, `echoes`, `whisper`, `ember`, `velvet`, `crimson`, `ethereal`, predictable rhymes (`fire`/`desire`, `night`/`light`, `blue`/`true`) — but now as *features the model weighs*, not hand-set knobs. The headline finding across the corpus: **Suno's lyrics are structurally quite human-like** (singable burstiness, some proper nouns, looser rhymes) — its tell is **clichés**, not structure.

> **Read this honestly:** these are statistical leanings, not proof. Humans write "fire" and "midnight" and repeat hooks too. The score rates the *texture* of the words, never the person who made the song.

---

## The craft-coach panel

Click the pill and you get a panel built from the **same trained weights**:

- **✅ Keep this (×5):** the strongest human-leaning choices the song already makes — quoted so you know what *not* to touch.
- **🃏 The joker (×1):** one decisive move, tailored to this song. The selector scores every move in the [strategy library](analysis/JOKER_STRATEGY_LIBRARY.md) by `z-score(this song vs the AI corpus) × |model weight|` and fires the single top one — so it only suggests a move when the song over-does a trait *and* the model agrees that trait matters. Examples: *"Swap **neon** for something only your narrator would notice right then."* / *"Your hook repeats word-for-word 4× — change one word the final time."* / *"Every line is 'I' — try the last verse from someone else's side."* If a track is already tight, the joker becomes a pure-experiment prompt instead of nagging.
- **⚠️ Work on (×5):** the strongest AI-leaning signals that fired, each with the offending word/line and a one-line fix ("loosen one rhyme to a slant rhyme so it doesn't feel machine-perfect").

It's a coach, not a verdict — observations on top, one thing to *do*.

## Honesty (this matters)

It is a **vibe meter, not a detector of ground truth, and never a personal attack.** Humans write "fire" and "midnight" too; a great lyric can score high and a bland AI one can score low. The number rates *texture*, not the person who made the song — treat it as a conversation-starter and a craft mirror, not a courtroom, and please don't weaponize it against other creators. The whole engine is readable JS — audit it, disagree with it, send a PR.

## Privacy & safety (by design)

- **Only runs on `https://suno.com/song/*`.** Enforced in `manifest.json` (`matches`) *and* re-checked in code. It loads nowhere else.
- **Reads exactly one element** — the lyrics paragraph. It never touches the rest of the page, your account, comments, or any personal info.
- **No network. No storage of page text. No tracking.** The model ships inside the extension; the text is scored in memory and thrown away. There are no embeddings, no LLM calls, nothing leaves your machine.
- Permissions: `activeTab` only (so the popup can ask the page for its score).

## Install (unpacked, ~30 seconds)

1. `git clone` this repo.
2. Chrome / Edge / Brave → `chrome://extensions` → toggle **Developer mode** (top-right).
3. **Load unpacked** → select this folder.
4. Open any `https://suno.com/song/…` page. The badge appears top-right — click it for the craft-coach panel.

> Firefox: load `manifest.json` via `about:debugging` → "This Firefox" → "Load Temporary Add-on". (MV3 content scripts work; the manifest is cross-browser — the Chrome build just strips the Firefox-only `browser_specific_settings`.)

## Project layout

```
manifest.json                 MV3, scoped to suno.com/song/*
src/slop-core.js              cliché-lexicon engine + lyric normalisation (pure; browser + node)
src/common_words.js           top-1000 English word list (perplexity proxy)
src/features.js               18 stylometric/craft features + nearest-centroid baseline
src/ext/patterns.browser.js   ~100 structural detectors (s_*) — browser build
src/ext/tier3.browser.js      semantic-craft detectors (t3_*) — browser build
src/ext/model.js              AUTO-GENERATED trained weights (globalThis.SLOP_MODEL)
src/ext/clean-lyrics.js       strips tags/JSON/scaffolding + instrumental detection
src/ext/v2-engine.js          reproduces the training feature pipeline → pure P(AI)
src/ext/v2-panel.js           builds the 5 ✅ · 1 🃏 · 5 ⚠️ craft panel
src/content.js                reads ONLY the lyrics box, draws the badge/panel
src/overlay.css               badge + panel styling
src/popup.html/js/css         toolbar popup: current score + paste-to-test box
analysis/patterns.js          structural detectors (node build / miner)
analysis/tier3_detectors.js   semantic-craft detectors (node build)
analysis/JOKER_STRATEGY_LIBRARY.md   the joker move library + research grounding
corpus/combined_model.json    the trained weights (BoW + 79 dense features)
corpus/models/*.json          per-model AI lyrics (metrics + text for training)
pipeline_tier3.js             trains combined_model.json (5-fold CV ablation)
build/gen_model.js            bakes combined_model.json → src/ext/model.js
build/package.sh              build the Firefox store zip (entire src/ tree)
build/package_chrome.sh       build the Chrome store zip (manifest stripped)
```

## Build / package

```bash
node build/gen_model.js     # rebuild src/ext/model.js from corpus/combined_model.json
bash build/package.sh       # → dist/suno-slop-detector-<ver>.zip          (Firefox)
bash build/package_chrome.sh# → dist/suno-slop-detector-chrome-<ver>.zip   (Chrome)
node pipeline_tier3.js      # retrain the model + print 5-fold CV ablation
```

Both package scripts zip the **entire `src/` tree** (so new runtime files are never forgotten), excluding node-only tests (`_test_engine.js`) and sourcemaps. The Chrome script additionally strips `browser_specific_settings` (Chrome rejects it).

## License

MIT. Go forth and rate slop.
