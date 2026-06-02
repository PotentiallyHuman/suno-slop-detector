# HANDOVER → other PC's Claude: rebuild the Suno-Slop-Detector data + model

You are running on a **second machine** because the primary machine is busy with a 20h+ GPU video render and can't spare memory. Your job: **regenerate the detector's data + trained model from the (already-collected) corpus, producing files the user will carry back to the primary machine to update the browser extension.** Do *exactly* these steps — nothing else.

## 0. The one rule that matters most: COPYRIGHT
**Never write raw song lyrics to disk.** Human lyrics are fetched from a web API, held in RAM only, reduced to *numbers* (metrics/counts), and discarded. The scripts below already do this correctly — do **not** add any `writeFileSync` of lyrics, do **not** cache lyric text, do **not** print full lyrics to logs. Only derived numbers + tiny cliché fragments (≤3 words) ever persist. Human songs are all **pre-2025** (post-2025 excluded — could be undisclosed AI).

## 1. Is qwen needed? **No.** (Important — don't waste time on it.)
The "summary" in this project is **deterministic computation**, not LLM output. `build_summaries.js` and `train_combined.js` just run the detector functions in `analysis/patterns.js` over each song's lyrics and count things (clichés, consecutive-duplicate lines, vocable filler, content-density, AI-vocab affinity, etc.). The string `'qwen-2.5-14b'` you'll see in the code is only a **corpus filename** it reads (songs qwen generated earlier) — it does **not** call qwen/ollama.
- **Qwen/ollama is OPTIONAL and only for one thing: generating *more* AI songs** as an extra corpus source (§6). Skip it unless the user asks.

## 2. Prerequisites
- **Node.js ≥ 18** (needs native `fetch`). Check: `node -v`.
- **Internet** (human lyrics come from `lrclib.net` then `api.lyrics.ovh`).
- **This bundle is self-contained** — everything below is already inside the folder you received (no clone/transfer-of-extra-files needed):
  - **All 554 AI songs (with lyrics)** → `corpus/models/*.json` (suno 336, chatgpt 52, claude-opus 120, claude/grok/qwen 15 each, gemini 1). AI lyrics are fine to store — they're machine-generated, not copyrighted human work.
  - **The full human song list** → `corpus/human_profiles.json` (3,848 profiles = metrics-only, **no human lyrics**) **and** `HUMAN_SONGLIST.json` (the explicit **657 re-fetchable** `[artist, title, year, genre]` rows the scripts will fetch + a note on the 3,191 dataset-only profiles).
  - **All code dependencies** → `src/` (slop-core.js, features.js, common_words.js…), `analysis/` (patterns.js, build_summaries.js, train_combined.js…), `build/` (build_baseline.js, profile_human.js, gen_ollama.mjs), `corpus/prompts.js`, `package.json`.
  - **The fetch method** (how human lyrics are pulled from "that database"): each human song is fetched live by `(artist,title)` from **`https://lrclib.net/api/get`** first, falling back to **`https://api.lyrics.ovh/v1/<artist>/<title>`** — held in RAM, reduced to numbers, discarded (see §0). The list of *which* songs = the 657 in `HUMAN_SONGLIST.json` / the non-`dataset` rows of `human_profiles.json`.
- No GPU, no models, no `npm install` of anything heavy. These scripts use only Node built-ins + `fetch`.

## 3. Sanity-check the inputs first
```bash
cd <repo root>
node -e "const g=require('glob');" 2>/dev/null  # ignore; just verifying node works
# count AI corpus
node -e "let t=0;for(const m of ['chatgpt','claude','grok','qwen-2.5-14b','claude-opus-4-8-generated','suno']){try{t+=JSON.parse(require('fs').readFileSync('corpus/models/'+m+'.json')).songs.length}catch(e){}}console.log('AI songs:',t)"
# expect ~554. Human profiles:
node -e "console.log('human profiles:',JSON.parse(require('fs').readFileSync('corpus/human_profiles.json')).profiles.length)"  # ~3848
```
If "AI songs" is much less than ~554, the corpus wasn't transferred — stop and tell the user.

## 4. Run the pipeline (in this order)
Each script fetches human lyrics in-memory, computes, and writes **numbers only**.

**(a) Discriminator summaries** — the craft-coach detector data for BOTH corpora:
```bash
node analysis/build_summaries.js
```
→ writes `corpus/ai_summaries.json` (~554) + `corpus/human_summaries.json` (~657), plus prints the **AI-overused word list** and a **discriminator-separation report** (Cohen's d effect sizes). Save that console output to `analysis/SEPARATION_REPORT.txt` (`... | tee analysis/SEPARATION_REPORT.txt`) — the user wants it.
> **Updated 2026-05-31 (full-category audit):** each summary now emits **ALL 39 structural detectors** from `patterns.js` (was only 11) + the **per-cliché breakdown** (50 phrases) + the **per-rhyme-pair breakdown** (31 pairs) + overused-word counts + AI-vocab affinity/coverage. Nothing is dropped — "all categories, more data = better prediction." The separation report auto-includes every numeric detector. Verify after running: each summary object should have ~60 keys.

**(b) 18-feature nearest-centroid baseline** (the extension's `0.55·classifier` half):
```bash
node build/build_baseline.js
```
→ writes `src/baseline.json` + `src/baseline.js`; prints **nearest-centroid accuracy** (expect ~73–75%). Capture the number.

**(c) The combined BoW + dense logistic-regression model** (the stronger model):
```bash
node analysis/train_combined.js
```
→ writes `corpus/combined_model.json`; prints a **5-fold-CV ablation** (bow / dense / combined accuracy) + top AI/human words + top dense features. Capture it.

> All three fetch the **657 re-fetchable human songs** (`source!='dataset'` with artist+title) from `lrclib.net`/`lyrics.ovh`. Expect a few minutes each (network-bound, 5–6 parallel). If the lyrics APIs rate-limit, lower the pool concurrency (the `pool(...,5,...)`/`pool(...,6,...)` arg) and rerun.

## 5. Optional — expand the HUMAN set (only if user wants more human songs)
`build/profile_human.js` has a hardcoded `SONGS = [[artist,title,year,genre],...]` list and writes the 18-feature `corpus/human_profiles.json`. To add humans: append pre-2025 songs to that array, then:
```bash
SKIP_NON_EN=1 node build/profile_human.js     # SKIP_NON_EN avoids any translation model
```
Then re-run §4 so summaries/training include them. (This machine has no render to protect, so its built-in `MIN_FREE_MB` memory guard won't trigger; leave it.)

## 6. Optional — generate MORE qwen AI songs (the ONLY legit qwen use)
If the user wants more AI-source diversity and this machine has **ollama + `qwen2.5:14b`** pulled:
```bash
npm run gen:qwen      # = node build/gen_ollama.mjs qwen2.5:14b qwen-2.5-14b
```
→ appends to `corpus/models/qwen-2.5-14b.json`. Then re-run §4. Skip entirely if unsure.
> **Updated 2026-05-31 (qwen-prompt audit):** `corpus/prompts.js` now has **55 prompts** = the original 3 strategies (vibe / story / craft — the craft one forces dodging AI-words like neon/shadows/echoes/whisper/embers) **plus a new `varied` strategy** of 40 genre×theme prompts, matching this session's Suno/ChatGPT diversity. So a fresh `gen:qwen` yields a **diverse, higher-volume** qwen sample (≈55 songs) → richer, less topic-biased summaries. Each run takes a while on a 14B model; `temperature 0.8, num_predict 700` are already tuned.

## 7. What to send back to the primary machine (the deliverables)
Copy these files back (they're all numbers/weights — copyright-clean):
- `src/baseline.json` + `src/baseline.js`  ← extension's nearest-centroid half
- `corpus/combined_model.json`             ← the stronger BoW+dense model
- `corpus/ai_summaries.json` + `corpus/human_summaries.json`  ← craft-coach discriminators
- `corpus/human_profiles.json`             ← only if you regenerated it (§5)
- `corpus/ai_summaries.json` already listed above (it carries the empirically-derived `overusedWords` list)
- `SEPARATION_REPORT.txt` + `BASELINE_REPORT.txt` + `COMBINED_REPORT.txt`  ← the printed top ±weight words / top dense features / ablation
- **`corpus/models/*.json` — the full AI-song LYRICS (now expanded with your new qwen songs). DO NOT DROP THIS.** The primary machine needs the actual lyrics (not just weights) to build v0.2.

**Why the lyrics matter (v0.2 plan on the primary machine):** the user will build a **craft-coach feedback panel = 5 ✅ good + 1 🃏 joker + 5 ⚠️ work-on**. It reads the **top ±weight words/features** from `combined_model.json` (+ `COMBINED_REPORT.txt`), then runs them over **real AI songs** to (a) quote concrete good/bad lines and (b) sample **100 songs** to design the dynamic "joker" suggestion. Without `corpus/models/*.json` it can't quote or sample anything. So: **weights + summaries + reports + the AI lyrics** all travel back together.

## 8. The "rules we decided" (context so your numbers match ours)
- **Final extension score = `0.45·cliché-lexicon (src/slop-core.js) + 0.55·classifier`.** Keep both halves.
- **18 features** (`src/features.js`): clicheDensity, phrase/rhyme-per-line, perfectRhymeRatio, endRhymeRate, repetition, hapaxRatio, commonWordRatio, abstract/concrete ratios, lineLenCV (burstiness), avgLineLen, avgWordLen, fnWordRatio, properNounDensity, numeralDensity, collectivePronoun, positivityBias.
- **Discriminator detectors** (`analysis/patterns.js`): cliché phrases, predictable rhyme pairs, and structural tells — the strongest being **mechanical consecutive repetition** (back-to-back identical lines / immediate word-doubling), **corpus-derived overused words** (AI/human freq ratio), **vocable/filler padding**, and **content-density** (AI pads → low; humans compress → high).
- **Format-blindness**: section tags (`[Verse]` and bare-word headers) are stripped before analysis — both corpora are treated identically.
- **Key finding to expect**: structural separation is *modest* (~74%) because modern Suno/AI lyrics are genuinely structure-like; the **load-bearing signal is clichés** (clicheDensity AI ≈ 2× human) + properNounDensity (humans ≈ 2×, specificity). Your separation report should reproduce this.
- All AI songs are **independent generations** and **topic-varied** (≈110 genre/theme prompts) so neither topic nor source is a cheap tell.

## 9. Done-check
You're finished when all of `src/baseline.json`, `corpus/combined_model.json`, `corpus/ai_summaries.json`, `corpus/human_summaries.json` exist, freshly written, with the AI summaries count ≈ the AI corpus count (~554) and the human counts ≈ 657 — and you've saved the printed accuracy/ablation/separation numbers. Hand the deliverables (§7) to the user. Do not modify the extension itself — that's the primary machine's job.
