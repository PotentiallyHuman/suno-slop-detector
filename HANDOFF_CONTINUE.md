# Project 28 — Suno Slop Detector — HANDOFF (2026-06-02 ~14:25)

Paste this into a fresh chat to continue. Repo: `~/projects/28_suno_slop_detector`.

## ⚡ TL;DR — what is running RIGHT NOW (costs ZERO model tokens)
A pure-bash Suno lyrics generator is running unattended. **No model/LLM is involved — it does not
spend tokens.** It will keep producing on its own. A new chat/agent is NOT needed to run it; only to
(a) recover if it breaks badly, or (b) do the next steps (retrain + build v0.2).

- **Loop**: `/tmp/suno_loop.sh` (nohup). Inside Suno's FREE dual-lyrics generator: replace prompt →
  "Write Lyrics" → right-click→Down×5→Enter (Select All) → Ctrl+C → parse 2 variants →
  dedup-ingest into `corpus/models/suno.json` (source `suno-browser`). 10-min break every 20 songs.
  Self-heals: re-finds the Suno window + re-F11-fullscreens after the email-check disrupts it.
- **Watchdog**: `/tmp/suno_watchdog.sh` (nohup). Restarts the loop if it dies; **stops everything at
  TARGET=1000 suno songs** (edit TARGET in that file to change).
- Method detail: `/tmp/suno_working_method.md`. Parser: `/tmp/parse_suno_grab.py`.

### Monitor / control (no browser, no tokens)
```bash
cd ~/projects/28_suno_slop_detector
node -e 'console.log(JSON.parse(require("fs").readFileSync("corpus/models/suno.json")).songs.length)'  # suno count
tail -n 20 /tmp/suno_loop.log        # progress (gen# +N suno=…)
tail /tmp/suno_watchdog.log          # restarts / target
pgrep -af suno_loop.sh ; pgrep -af suno_watchdog.sh   # alive?
# STOP everything:  for p in $(pgrep -f 'suno_loop.sh|suno_watchdog.sh'); do kill $p; done
```
⚠️ Never `pkill -f suno_loop.sh` from an inline command — it self-matches and kills the shell. Kill by PID.

## Corpus state
`corpus/models/*.json` (non-qwen only; qwen is parked in `/tmp/handover_back`, NOT in repo):
- claude-opus-4-8-generated **2568** (daemon, overnight) · suno **639 → climbing to ~1000**
- chatgpt 52 · grok 15 · claude 15 · gemini 1.  **Goal of the Suno run: cut the 85% Claude
  monoculture** by growing real-target Suno data.

## Model state — CLEAN v3 is trained & validated (USE THIS, not the qwen one)
- `corpus/combined_model.json` = BoW + 77 dense features (18 stat + 39 struct + 13 tier-3 craft +
  5 ollama-embedding). **5-fold CV 88.8%**, and **held-out 13/13** (2/2 fresh AI, 6/6 real humans).
- Tier-3/embedding code (the "v3 semantic" pivot) came from the 2nd PC and is integrated:
  `analysis/tier3_detectors.js`, `analysis/embeddings.js`, `pipeline_tier3.js`, patched
  `src/slop-core.js`. Inference scorer = `score_v3.js` (the bundled `predict.js`/`score.js` are STALE).
- The 2nd PC's own `combined_model.json` was **discarded**: it was 80% qwen, broke holdout (2/10),
  violated the user's "no qwen" rule. We retrained clean on the daemon's non-qwen corpus instead.

## NEXT STEPS (do these in the new chat — they DO use tokens)
1. **When suno run is done (~1000)**: optional English-filter (≈75 Spanish AI songs leak the BoW
   head; dense head is clean), then **retrain**: `node pipeline_tier3.js` (fetches ~3500 humans live +
   embeds via local `nomic-embed-text`; ~45 min). Backs up prior model to `corpus/_prev_model/`.
2. **Build extension v0.2**: wire `combined_model.json` (use the §6.1 snippet in `HANDOFF_BACK.md` or
   `score_v3.js`) + the pre-built joker coach (`analysis/JOKER_STRATEGY_LIBRARY.md`, panel =
   5✅ good · 1🃏 joker · 5⚠️ work-on). Decide embeddings: ship a JS-native embedder (full 88.8%) or
   no-embed variant (~84%, zero dependency). Then version-bump + resubmit AMO + Chrome.

## Browser/coordination rules (in effect)
- Suno is **click-only** (no DOM/console injection on the logged-in account). Coords are for
  **F11-fullscreen 1080×1920**. Email-check Claude runs ~06:30/13:00/18:00, takes the browser to
  Outlook via a shared lock (`/tmp/browser_lock.sh`); our loop yields + self-heals. **Never click
  Outlook** (guard blocks it). Generating *lyrics* is FREE; full-song Create costs ~10 credits (avoid).
