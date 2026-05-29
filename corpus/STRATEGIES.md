# Building the AI-lyrics baseline

The detector's "final mode" doesn't just match a word list — it compares a song
to a **corpus of real AI lyrics**. The closer a song sits to that corpus in
feature space, the higher its AI score. This doc is how the corpus is built.

## The 3 prompting strategies × 5 subjects (15 prompts)

Every model gets the **exact same 15 prompts** (defined in `corpus/prompts.js`)
so the baseline captures the *AI signature*, not the topic.

| Strategy | What it simulates | Example |
|---|---|---|
| **vibe** | lazy one-liner, hope it's good | "Write a song about my cat John." |
| **story** | tell a full story, then ask for lyrics | "I went to the park where I met a person I thought was…" → "Now write song lyrics about this." |
| **craft** | ask the model to apply real songwriting craft & dodge clichés | "First think about how to write good lyrics… avoid clichés and AI words… then write about [hard subject]." |

Run `node build/ingest.js --template <model>` to print all 15 prompts.

## Models in the baseline

| Model | How | Status |
|---|---|---|
| **Claude (Opus)** | written by the agent | ✅ `corpus/models/claude.js` |
| **Qwen 2.5 14B** | local ollama (`npm run gen:qwen`) | ✅ `corpus/models/qwen-2.5-14b.json` |
| **Grok** | paste from grok.com | ⬜ see "Add a web model" |
| **Gemini** | paste from gemini.google.com | ⬜ |
| **ChatGPT** | paste from chatgpt.com | ⬜ |

More models = a sharper baseline. The classifier rebuilds automatically.

## Add a web model (Grok / Gemini / ChatGPT)

```bash
# 1. make a scaffold with all 15 prompts as headers
node build/ingest.js --template grok

# 2. open corpus/models/grok.txt, feed each prompt to grok.com,
#    paste each reply under its "### vibe 1" / "### story 3" / … header

# 3. turn it into corpus JSON
node build/ingest.js grok

# 4. translate to English (no-op if already English) + rebuild the baseline
npm run rebuild
```

## Translation

`build/translate.js` normalizes every song to English (`lyrics_en`) before
featurizing — so a Danish Suno song is compared on equal footing. It runs
locally on ollama qwen2.5 (no external network) and skips text already in
English. `npm run rebuild` does translate + build in one go.

## What gets baked out

`build/build_baseline.js` →
- `src/baseline.json` — for Node / inspection
- `src/baseline.js` — `globalThis.SLOP_BASELINE = …` for the extension

It prints per-feature AI-vs-human means and a resubstitution accuracy so you can
see the corpus separating as you add models.
