# Session Log & Status — Suno Slop Detector

**Last updated:** 2026-05-30
**Repo (published):** https://github.com/PotentiallyHuman/suno-slop-detector
**Local path:** `~/projects/28_suno_slop_detector`
**Status:** ✅ Working, published to GitHub, **SUBMITTED to BOTH stores — awaiting review** (Firefox AMO ~17:23, Chrome Web Store ~19:17, 2026-05-30). **+100 Suno-generated songs added to the AI corpus + classifier rebuilt (2026-05-31 ~00:35).**

## 🎵 Suno-generated AI corpus (2026-05-31) — 100 songs, + a key finding
Captured **100 distinct Suno lyric-generator songs** (corpus/suno_capture/simple/suno/, imported → corpus/models/suno.json). AI corpus is now **280 songs** (chatgpt 15, claude 15, grok 15, qwen 15, claude-opus-4-8 120, **suno 100**) vs 269 human.
- **HOW (the reliable method):** drove the Suno wizard via the **Firefox DevTools console (JavaScript/DOM)**, NOT pixel-clicking. `build/grind_dom.py` → finds the prompt textarea + Write Lyrics button by placeholder/text, sets value via the native React setter + input event, clicks, polls `innerText.length` until streaming stabilizes, then `copy(box.innerText)` → clipboard → `build/capture_suno.py` (cleans, strips title/preamble, dedups at <55% word-bigram Jaccard, sanity-checks ≥8 lines + section tags). **2 songs per generation**, random 5-30s pacing, lyrics-gen is free (credits steady ~5k). Pixel-clicking was abandoned after endless coord drift; see memory [[reference_browser_automation_via_devtools_console]].
- ⚠️ Bug fixed mid-run: Python `subprocess.run([...xclip...], capture_output=True)` HANGS (xclip won't daemonize with a captured-pipe stdout) → use `stdout=DEVNULL`.
- **THE FINDING:** adding Suno **dropped the 18-feature nearest-centroid accuracy 92% → 76%** — Suno's lyrics are *structurally* far more human-like than chatbot lyrics (burstiness, proper nouns, less-perfect rhymes), because Suno is purpose-built for singable lyrics. **BUT** the product slop-score still flags Suno at **~59% avg** because the cliché-lexicon half (0.45 weight) catches them. **Suno's tell is CLICHÉS, not structure.** Per-model avg slopScore: chatgpt 65.4, qwen 62.9, grok 58.7, **suno 59.2**, claude-opus 51.8, claude 49.7.

## 🌐 Chrome Web Store submission (2026-05-30 ~19:17) — "Submitted for review"
Uploaded `dist/suno-slop-detector-chrome-0.1.0.zip` (Chrome-clean manifest: Firefox-only `browser_specific_settings` stripped; built by `build/package_chrome.sh`). Listing: category **Just for Fun**, language English, store icon `icons/icon128.png`, 1 screenshot (`store/screenshot_1_ai.png`, 1280×800), description = same as AMO. Privacy tab: single-purpose set, activeTab + host-permission justifications written, remote code = No, **no data collected**, all 3 data-use certifications checked, privacy policy URL = GitHub `blob/main/PRIVACY.md`. Distribution: free, **Public**, all regions.
- **Account setup gauntlet (all account-level, one-time):** created a Google account on the existing Outlook email (`.google_credentials.txt`, gitignored); paid the **$5** one-time CWS developer fee; declared **non-trader** (EEA); had to **enable 2-Step Verification** (CWS blocks uploads without it — adding a 2SV phone ≠ turning it ON, the master switch must be flipped); had to **add + email-verify a publisher contact email** (this email is PUBLIC on the listing, and verifying it was the LAST blocker before "Submit for review" enabled).
- Outcome notification → email to augustosjclaw@outlook.com (the verified contact email) on approve/reject; auto-publish-after-review was left checked. ⚠️ Host permission (`suno.com`) → deeper manual review → expect days-to-~2-weeks, 30-day stated max. Status also visible in CWS dashboard → Items.
- Reach rationale: Chrome Web Store covers the whole Chromium ecosystem (~80% desktop) vs Firefox ~6% — ~12-15× the audience for the open-source-discovery flywheel.

## 🚀 AMO submission (2026-05-30 17:23) — "Version Submitted"
Idea → live-store-submission in **under 24 hours**. Recovered after a mid-submit machine reboot (~16:58); AMO had saved the uploaded `.xpi` draft server-side so nothing was lost.
- Uploaded `dist/suno-slop-detector-0.1.0.xpi` (42 KB, MV3, `web-ext lint` 0 errors).
- Platform: **Firefox only** (Android left off — desktop DOM selector `p.pr-6.whitespace-pre-wrap` unverified on mobile Suno; enable later if confirmed).
- Category: **Games & Entertainment**. License: **MIT**. Data collection: **none**.
- Reviewer note: plain JS, no build step / bundler / minifier; reads only the lyrics `<p>`; no network/eval/storage; source link.
- Source-code-needed prompt answered: **No**.
- Add-on ID: `suno-slop-detector@local`. Min Firefox: **142.0** (per packaged manifest).
- Next (no user action): Mozilla emails augustosjclaw@outlook.com on publish — minutes-to-hours for auto-approval, up to 24h if human-queued.
- ⚠️ Crash doctrine confirmed: this box reboots under **unified-memory exhaustion** when a GPU/video cascade overlaps a browser session (NOT the UI automation). Keep AMO/browser work and heavy GPU jobs from overlapping.

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

## 🎯 PRODUCT PIVOT (2026-05-31) — detector → songwriting craft COACH
Key realization (user): the hover/breakdown panel shouldn't just show a score — it should give **specific, localized, constructive feedback** (which lines/words triggered which AI-tell + how to fix), turning the extension from a one-time "is this AI?" toy into a **real-time songwriting coach**. Every discovered discriminator = one nameable, fixable craft note. Reframes value prop (curiosity → repeat-use craft tool), perfects the "craft mirror, not a personal attack" disclaimer, and raises the bar on the methodology (each feature becomes public writing advice, so it must be right → validates the close-reading discovery rounds).
- v0.2 build: detectors return localized instances; breakdown = ranked constructive notes (offending text + suggestion + occasional ✅ "keep this"); framed as tendencies/suggestions, never verdicts.
- Discovered discriminators so far (Rounds 1-2): **mechanical CONSECUTIVE repetition** (back-to-back identical lines, immediate doubling "this this") = strongest tell; **corpus-derived over-used images** ("symphony" is a Suno tic — measure AI/human phrase-freq ratio); **vocable/filler padding** ("ooh ooh"); content-density (AI pads, humans compress). Traps that DON'T work: specificity, emotional complexity, repetition *amount* (modern Suno does all three; humans like Sparklehorse are simple+repetitive).
