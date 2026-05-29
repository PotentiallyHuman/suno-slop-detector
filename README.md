# 🤖 Suno Slop Detector

A browser extension that reads the lyrics on a Suno song page and tells you, in big honest numbers, how much they reek of AI cliché:

> **56% AI** — *Suspiciously seasoned*

Open a song. A little pill appears top-right. Click it to see *why* — which clichés, which stock phrases, how lazy the rhymes, how repetitive the vocabulary.

Born out of spite after r/SunoAI removed an open-source de-clicker post. So now it's open source forever. 🫡

---

## What it actually measures

The score is a transparent, tunable heuristic — **five signals** squashed through saturating curves into a 0–100% "slop probability":

| Signal | What it catches |
|---|---|
| **Cliché words** | `neon`, `horizon`, `shadows`, `echoes`, `whisper`, `ember`, `abyss`, `velvet`, `ethereal`, `crimson`… weighted 1 (mild) → 3 (flashing red) |
| **Stock phrases** | "in the dead of night", "rise from the ashes", "concrete jungle", "we won't back down", "fire in my veins"… |
| **Lazy rhymes** | the rhymes a rhyming dictionary reaches for first: fire/desire, night/light, heart/apart, sky/fly… |
| **Repetition** | low lexical diversity (length-corrected type-token ratio) — slop loops the same words |
| **Section tags** | literal `[Verse 1]` / `[Chorus]` / `[Bridge]` markers Suno emits in the lyric text |

All weights live in `src/slop-core.js` (`WORD_WEIGHTS`, `PHRASES`, `LAZY_RHYMES`, `W`). Tune away.

## The data-driven baseline (the "final mode")

The lexicon above is hand-written guesses. The **real** detector learns what AI lyrics look like from a corpus of *actual* AI lyrics:

1. Every model is fed the **same 15 prompts** — 3 prompting strategies × 5 subjects (`corpus/prompts.js`):
   - **vibe** — lazy one-liner ("write a song about my cat John")
   - **story** — tell a full story, then ask for lyrics
   - **craft** — ask the model to apply real songwriting craft and dodge clichés
2. Each lyric is turned into a 10-dimensional **feature vector** (`src/features.js`) — the heuristic signals plus stylometrics (function-word ratio, line length, vocabulary richness, rhyme regularity).
3. We compute the **AI centroid** and a **human centroid**, standardized over the pool (`build/build_baseline.js`).
4. A new song is scored by **which centroid it sits closer to** → *the more it looks like the AI baseline, the more AI it is; the further away, the less.*

The shipped score blends the two: `0.45 × lexicon + 0.55 × corpus`. The panel shows all three numbers.

**Current corpus:** 45 AI songs (ChatGPT + Claude + local Qwen 2.5 14B, 15 each) vs **54 real human songs** (1963–2019, 15 genres — metrics only, no copyrighted text stored; see `build/profile_human.js`). Resubstitution accuracy ~85% on content-only features (AI avg 73%, human avg 28%). Section-tag *count* is deliberately excluded (every Suno song has `[Verse]/[Chorus]`, so it's a format artifact, not a slop signal). Add Grok / Gemini and it sharpens — see [`corpus/STRATEGIES.md`](corpus/STRATEGIES.md).

### Translation

All lyrics are normalized to **English before comparison** (`build/translate.js`, local ollama, skips already-English text) — so a Danish Suno song is judged on equal footing. `npm run rebuild` does translate + build.

## Honesty (this matters)

It is a **vibe meter, not a detector of ground truth.** Humans write "fire" and "midnight" too; a great lyric can score high and a bland AI one can score low. Treat a number as a conversation-starter, not a verdict. The whole engine is ~250 readable lines — audit it, disagree with it, send a PR that changes the lexicon.

## Privacy & safety (by design)

- **Only runs on `https://suno.com/song/*`.** Enforced in `manifest.json` (`matches`) *and* re-checked in code. It loads nowhere else.
- **Reads exactly one element** — the lyrics paragraph (`…p.pr-6.whitespace-pre-wrap`). It never touches the rest of the page, your account, comments, or any personal info.
- **No network. No storage of page text. No tracking.** The text is scored in memory and thrown away.
- Permissions: `activeTab` only (so the popup can ask the page for its score).

## Install (unpacked, ~30 seconds)

1. `git clone` this repo.
2. Chrome / Edge / Brave → `chrome://extensions` → toggle **Developer mode** (top-right).
3. **Load unpacked** → select this folder.
4. Open any `https://suno.com/song/…` page. The badge appears top-right.

> Firefox: load `manifest.json` via `about:debugging` → "This Firefox" → "Load Temporary Add-on". (MV3 content scripts work; the manifest is cross-browser.)

## Develop / test

```bash
npm test        # runs the calibration corpus
```

`test/calibrate.js` scores the example lyrics in `examples/corpus.js` and asserts that AI-style lyrics rank above human ones and land in their target bands. Edit the lexicon, re-run, watch the numbers move:

```
✅ 100%  (target 70-100)  Suno-typical 'Neon Horizon' (synthetic slop)
✅  28%  (target 0-40)    Classic craft lyric — specific imagery
✅  40%  (target 25-65)   Real-ish pop with some staples (mixed)
Separation: lowest AI (100%) > highest human (28%)  ✅
```

Add your own examples to `examples/corpus.js` with an `expect: [lo, hi]` band to keep the heuristic honest as you tune it.

## Project layout

```
manifest.json            MV3, scoped to suno.com/song/*
src/slop-core.js          cliché-lexicon scoring engine (pure; browser + node)
src/features.js           feature vector + nearest-centroid classifier
src/baseline.{json,js}    AUTO-GENERATED corpus baseline (centroids + scaler)
src/content.js            reads ONLY the lyrics box, draws the badge/panel
src/overlay.css           badge + panel styling
src/popup.html/js/css     toolbar popup: current score + paste-to-test box
corpus/prompts.js         the 3 strategies × 5 subjects (shared by all models)
corpus/models/*.{js,json} per-model AI lyrics (claude, qwen, + pasted-in)
corpus/STRATEGIES.md      how to build/grow the baseline
build/gen_ollama.mjs      generate a baseline from a local ollama model
build/ingest.js           scaffold + parse pasted web-model lyrics
build/translate.js        normalize a corpus to English (local ollama)
build/build_baseline.js   compile corpus -> src/baseline.{json,js}
examples/human.js         human negative-class anchors
examples/corpus.js        calibration fixtures
test/calibrate.js         `npm test`
```

## npm scripts

```bash
npm test          # heuristic calibration + classifier report
npm run gen:qwen  # regenerate the local Qwen baseline
npm run rebuild   # translate all corpora -> English, then rebuild baseline.json
```

## License

MIT. Go forth and rate slop.
