# Session Log & Status — Suno Slop Detector

**Last updated:** 2026-05-30
**Repo (published):** https://github.com/PotentiallyHuman/suno-slop-detector
**Local path:** `~/projects/28_suno_slop_detector`
**Status:** ✅ Working, published to GitHub, Firefox-store-ready. Corpus expansion paused (GPU yielded to user's video cascade), resumable in one command.

---

## What this is
A Chrome/Edge/Firefox extension that reads **only** the lyrics box on a `suno.com/song/*`
page and scores how "AI" the lyrics read (e.g. "56% AI"). Final score =
`0.45 × cliché-lexicon + 0.55 × data-driven classifier`. Born from spite after r/SunoAI
removed the user's open-source declicker post. **It's a fun vibe-meter, NOT a personal
attack or a judgement of songwriters** (disclaimer is in README + STORE_LISTING).

---

## How the session unfolded (narrative)

1. **v0.1 — heuristic detector.** Cliché-word lexicon + stock phrases + lazy-rhyme + repetition
   + section-tag signals → 0–100% score with a badge + breakdown panel. Calibrated against
   example lyrics (`test/calibrate.js`, `npm test`).
2. **Safety scoping (user's hard rules).** Runs ONLY on `https://suno.com/song/*`; reads ONLY
   the lyrics `<p>` (`p.pr-6.whitespace-pre-wrap`); no network, no storing page text.
3. **Data-driven baseline.** 3 prompting strategies × 5 subjects (`corpus/prompts.js`), fed to
   every model. Built an AI-lyrics corpus: **Claude + local Qwen 2.5 14B**, then user pasted
   **ChatGPT** and **Grok** sets (`build/import_folder.js` cleans preamble/titles/markdown;
   all corpora normalized to label-free plain lyrics). → **60 AI songs (4 models × 15)**.
4. **Real human baseline.** Fetched real songs via lyrics.ovh + lrclib, stored **metrics only**
   (no copyrighted text) — `build/profile_human.js`. Grew 54 → 104 → 151 → **269 songs**.
5. **Key insight — degree, not presence.** Real songs use "AI vocabulary" too (it's the
   training data — e.g. Linkin Park, Coldplay's "Paradise"). Added ~47 cliché-heavy human
   songs as **hard negatives** so the classifier judges cliché *density*, not mere presence.
6. **18 research-grounded features** (`src/features.js`): cliché density, stock-phrase & lazy-
   rhyme rate, **perfect-vs-slant rhyme**, repetition, hapax/vocab richness, **word-commonness
   (perplexity proxy)**, abstract-vs-concrete, **burstiness (line-length variance)**, line/word
   length, function-word ratio, **proper-noun & numeral specificity**, **collective-vs-personal
   voice** ("we are the ones"), **positivity bias**. Section-tag *count* deliberately excluded
   (every Suno song has tags → format artifact).
7. **Multilingual.** Top-20 languages (`corpus/human_queue_extra.js`); each non-English song is
   **translated to English (local Qwen) before analysis** so features compare fairly. lrclib
   fallback rescued Asian/Cyrillic lyrics.
8. **Publishing & hardening.** Published to GitHub. Generated icons, PRIVACY.md, STORE_LISTING.md,
   synthetic store screenshots (no real Suno user shown). Refactored UI off `innerHTML` →
   DOM APIs (kills an XSS vector + clears AMO lint). **Scrubbed the user's email from all git
   history** and force-pushed (remote now shows only the GitHub noreply address).

---

## Current numbers
- **Corpus:** 60 AI songs (chatgpt/claude/grok/qwen ×15) vs **269 real human songs**.
- **Languages (≥5 songs):** en(177), es, fr, de, it, pt, ja, ko, hi, tr, nl, id — **12 languages**.
  All 20 present; thin (<5): **ar, pl, sv, vi, ru, el, th, zh**.
- **Classifier:** 18 features, nearest-centroid. Resubstitution accuracy **~92% (303/329)**.
- **Demo scores:** AI-style slop ≈ 82%; concrete/hooky human-style ≈ 32%.

## Security status (audited this session)
- ✅ No secrets/keys/PII in repo. ✅ Email scrubbed from git history (force-pushed).
- ✅ `innerHTML` XSS vector removed (DOM-built UI). ✅ Minimal perms (`activeTab` +
  `suno.com/song/*`), no remote code/eval/network. Privacy: nothing collected/sent/stored.
- Note: old pre-scrub commit SHAs may linger in GitHub's cache by direct-SHA until GC, but
  they're gone from branch history.

## Firefox store readiness
- `dist/suno-slop-detector-0.1.0.zip` passes `web-ext lint` (0 errors). Requires Firefox 140+.
- Submit at addons.mozilla.org → Developer Hub: upload the zip, paste from `STORE_LISTING.md`,
  upload `store/screenshot_*.png`. Declare "no data collected".
- ⚠️ Only thing the user must add: nothing — screenshots are synthetic (no real user). Done.

---

## ▶️ Resume tomorrow (one command, when GPU is free)
```bash
cd ~/projects/28_suno_slop_detector && node build/profile_human.js && npm run rebuild
```
- Incremental + writes per-song (resumable, memory-light). Reuses all 269 existing.
- Fills the 8 thin languages and climbs toward 1000 (add more entries to the SONGS list in
  `build/profile_human.js` or to `corpus/human_queue_extra.js`).
- After rebuild, **reload the extension** (chrome://extensions ↻ / about:debugging Reload).
- ⚠️ Uses local Qwen for translation (GPU) — run only when the video cascade is NOT using the GPU.

## To add another AI model (Gemini still pending)
```bash
node build/import_folder.js <root> --inplace --only gemini   # root/<simple|medium|complex>/gemini/*.txt
npm run rebuild
```

## GPU state at session close
- Unloaded Qwen → freed 17 GB VRAM. No profiling/ollama/node jobs running. GPU fully yielded
  to the user's video cascade (highest priority).

---

## Key files
- `HANDOVER.md` — full how-to (publish, develop, add models, file map, hard rules).
- `README.md` — public description + "not a personal attack" disclaimer + methodology.
- `src/{slop-core,common_words,features,baseline.js,content,popup}.*` — the shipped extension.
- `corpus/` — prompts, AI model lyrics, human_profiles.json (metrics only), STRATEGIES.md.
- `build/` — gen_ollama, import_folder, ingest, translate, profile_human, analyze,
  build_baseline, make_lists, generate_icons, make_screenshots, package.sh.
- `analysis/` — AI_WORDS_100.md, CLICHES_50.md, REPORT.md.
- `store/` — synthetic screenshots + promo tile; `dist/` — packaged zip.

## Fun fact worth keeping
The user's **least-AI** song uses a *mondegreen* method: remove the lyric reference on a Suno
remix → Suno emits improvised "ghost vocals" → transcribe the mis-heard sounds. It's an inverse
(voice→text) pipeline, so the words never passed through an LLM's word-prediction step → it
dodges every AI tell. The detector correctly scores it lowest.
