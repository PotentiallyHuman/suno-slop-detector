# 📦 Handover — Suno Slop Detector

Everything you need to **publish this to GitHub from another PC** and keep building it.
Project lives at `~/projects/28_suno_slop_detector` on the build machine. It's a local
git repo (MIT licensed) with full history — **not yet pushed anywhere**.

---

## 1. Get the code onto the other PC

**Option A — copy the whole folder (simplest).** Copy the entire
`28_suno_slop_detector/` directory (it contains `.git/` with all history) to the other
PC via USB / scp / cloud drive. Done.

**Option B — single-file git bundle (clean history, one file).** On the build machine:
```bash
cd ~/projects/28_suno_slop_detector
git bundle create /tmp/suno-slop-detector.bundle --all
```
Copy `suno-slop-detector.bundle` to the other PC, then:
```bash
git clone suno-slop-detector.bundle suno-slop-detector
cd suno-slop-detector
```

---

## 2. Publish to GitHub (on the other PC)

**With the GitHub CLI (`gh`):**
```bash
gh auth login          # GitHub.com → HTTPS → web browser; or paste a PAT with 'repo' scope
gh repo create suno-slop-detector --public --source=. --remote=origin --push
```

**Without `gh`** — create an empty repo at github.com/new (name `suno-slop-detector`,
no README/license), then:
```bash
git remote add origin https://github.com/<your-username>/suno-slop-detector.git
git branch -M main
git push -u origin main
```
(HTTPS will prompt for username + a Personal Access Token as the password.)

That's it — your spite-driven open-source vengeance is live. 🫡

---

## 3. What this is (1 paragraph)

A Chrome/Edge/Firefox extension that reads **only** the lyrics box on a
`suno.com/song/*` page and scores how "AI" the lyrics read (e.g. "56% AI"). Final score
= `0.45 × cliché-lexicon + 0.55 × a data-driven classifier` trained on a corpus of AI
lyrics vs real human lyrics. **It's a fun vibe-meter, not a personal attack** — see the
disclaimer at the top of `README.md`.

## 4. Current state

- **Corpus:** 45 AI songs (ChatGPT + Claude + Qwen 2.5 14B, 15 each) vs **151 real human
  songs** (1953–2019, ~20 genres + ~50 cliché-heavy "hard negatives" like Linkin Park).
  Human corpus is **metrics only** — no copyrighted lyrics stored.
- **Classifier:** nearest-centroid over **18 features** → `src/baseline.{json,js}`.
  Resubstitution accuracy ~91%.
- **Working extension:** load unpacked (Chrome) / `about:debugging` (Firefox). Badge +
  paste-to-test popup both functional.
- **Grok / Gemini:** _pending your paste-in_ (ChatGPT already imported).

## 5. Add more models (Grok / Gemini) — sharpens the baseline

Drop the lyrics as `.txt` under `<root>/<simple|medium|complex>/<model>/songN.txt`
(simple→vibe, medium→story, complex→craft — same layout as the ChatGPT data), then:
```bash
node build/import_folder.js <root> --inplace   # cleans preamble/titles/markdown
npm run rebuild                                  # translate→English + rebuild baseline.json
```
Or for a single pasted-text file: `node build/ingest.js --template grok` → fill it →
`node build/ingest.js grok`. Full guide: `corpus/STRATEGIES.md`.

## 6. Develop / test

```bash
npm test           # heuristic calibration + classifier report
npm run gen:qwen   # regenerate local Qwen baseline (needs ollama)
node build/profile_human.js          # add human songs (incremental; --fresh = full)
node build/analyze.js                # cross-model word/phrase/structure analysis
npm run rebuild    # rebuild baseline after any corpus change
```
After any rebuild, **reload the extension** (chrome://extensions ↻ / about:debugging Reload).

## 7. File map

```
manifest.json                 MV3, scoped to suno.com/song/* (+ Firefox settings)
src/slop-core.js               cliché-lexicon scorer + section normalizer (pure JS)
src/common_words.js            top English words (perplexity-proxy feature)
src/features.js                18-feature vector + nearest-centroid classifier
src/baseline.{json,js}         AUTO-GENERATED corpus baseline (don't hand-edit)
src/content.js                 reads ONLY the lyrics <p>, draws badge/panel
src/popup.*                    toolbar popup (paste-to-test)
corpus/prompts.js              3 strategies × 5 subjects (all models get these)
corpus/models/*.{js,json}      per-model AI lyrics (claude, chatgpt, qwen, +grok/gemini)
corpus/human_profiles.json     151 human songs — METRICS ONLY, no lyrics text
build/                         gen_ollama, import_folder, ingest, translate,
                               profile_human, analyze, build_baseline, make_lists
analysis/                      AI_WORDS_100.md, CLICHES_50.md, REPORT.md
examples/, test/               calibration fixtures + npm test
```

## 8. Hard rules (keep these if you refactor)

- Extension runs **only** on `https://suno.com/song/*` (manifest `matches` + re-checked
  in `content.js`). Reads **only** the lyrics `<p>`. No network, no storing page text.
- Human corpus stores **derived metrics only**, never copyrighted lyrics.
- Section tags `[Verse]/[Chorus]` are stripped from analysis (format artifact, not a
  slop signal) — the focus is words, rhymes, phrases, clichés, repetition.

## 9. Notes & ideas

- It's **degree, not presence**: real songs use AI vocabulary too (it's the training
  data). The cliché-heavy human "hard negatives" teach the model to judge density, not
  the mere presence of words like "neon/shadows/horizon".
- Strongest human-vs-AI signals: proper-noun density, collective-vs-personal voice
  ("we are the ones"), perfect-vs-slant rhyme, hook repetition, word length, burstiness.
- Fun fact: the user's **least-AI** song uses a *mondegreen* method — remove the lyric
  reference on a Suno remix, let it emit improvised "ghost vocals", transcribe the
  mis-heard sounds. It's an inverse (voice→text) pipeline, so it dodges every AI tell.
- TODO ideas: add Grok+Gemini; a shareable result card; per-feature explanation in the
  panel; on-device translation for non-English live songs.
```
