# Session 2026-05-31 — save + compressed resume

## ⚡ COMPRESSED TL;DR (read this first)
Project 28 = Suno AI-slop detector extension. This (very long) session:
- **AI corpus 280 → 554.** Suno 100→**336** (click-only drag-select 2× wizard method, no DOM injection on the logged-in acct), ChatGPT 15→**52** (logged-out console extract), + claude-opus 120 / claude·grok·qwen 15 / gemini 1. All **independent + topic-varied** (~110 genre/theme prompts). **Titles stripped corpus-wide.** Baseline retrained ≈**74%** (cliché signal stays ~2× = load-bearing, as predicted).
- **4 reward Suno SONGS** (audio) in user's Workspace, unpublished.
- **Chrome Web Store review = Pending** (checked devconsole).
- **Built `handover_bundle.zip` (1 MB, self-contained, idiot-proof)** at repo root → for the **2nd PC** to: optionally `gen:qwen` to AI≈human parity → fetch humans (in-RAM, copyright-clean, lrclib.net→lyrics.ovh) → `build_summaries.js` (now emits **ALL 39 detectors** + cliché/rhyme breakdowns) → `build_baseline.js` → `train_combined.js`. Bundle has CHECK.sh/RUN_ALL.sh/README + `HUMAN_SONGLIST.json` (657) + all 554 AI lyrics + code.
- **v0.2 craft-coach DESIGNED + library pre-built.** UI = **5 ✅ good · 1 🃏 joker · 5 ⚠️ work-on**. Joker = `analysis/JOKER_STRATEGY_LIBRARY.md` — 12 research-grounded moves (Pattison/Shklovsky/slant-rhyme/POV/etc.), each = trigger on our real detectors + model weights → dynamic slot-filled template; selection = `zscore(detector) × |weight|`, fallback Move 12 so never empty.

## ⏭ WHAT'S PENDING / RESUME STEPS
1. **2nd PC (in progress, ~couple hours):** generating qwen songs to parity, then runs the pipeline. User is driving it with that PC's Claude. Nudge already given: it must **send back** `corpus/combined_model.json` + `ai_summaries.json` + `human_summaries.json` + the 3 `*_REPORT.txt` + **`corpus/models/*.json` (AI lyrics)**.
2. **When user hands back that data → I:** (a) drop the files in, (b) **bind joker triggers to `combined_model.json` weights** (`wBow` overused words, `wDense` feature ranks), (c) run the **100-AI-song tuning pass** + write slot-extractors, (d) build the good/bad generators (top +weight = bad, top −weight = good), (e) wire `combined_model.json`/`baseline.json` + the feedback panel into the extension as **v0.2**, (f) version-bump + resubmit to AMO + Chrome stores.
3. **Memory note:** all of this is in [[project_28_suno_slop_detector]] + [[reference_suno_click_only_lyric_automation]].

## 🛡 SYSTEM STATE (do not disturb)
- **LTX music-video render** running in the OTHER terminal (conda env `lyra2`, project `songs/isbjoern`), progressing through stages, ~hours left. **Unified RAM/VRAM** — a memory spike crashes everything.
- **Memory watchdog** running (`/tmp/mem_watchdog.sh`, bg) — alerts only on **sustained <2 GB for ~90s** (transient render spikes are normal/ignored) or render finishing. One real transient spike (70→2.1→77 GiB) already happened + self-recovered.
- **My rule until render done:** launch NOTHING memory-heavy (no diffusion, no local LLM, no model loads). The v0.2 wiring + joker tuning are node/JS + read-only research → memory-light, safe to do anytime.

## 📁 KEY FILES (repo root `~/projects/28_suno_slop_detector`)
- `handover_bundle.zip` / `handover_bundle.tar.gz` / `handover_bundle/` — for the 2nd PC
- `HANDOVER_OTHER_PC.md` — the 2nd-PC task spec (copyright rules, qwen optional, all-detectors, send-back list incl. AI lyrics)
- `analysis/JOKER_STRATEGY_LIBRARY.md` — the pre-built joker research + 12 moves
- `analysis/build_summaries.js` — FIXED to emit all 39 struct detectors + rhyme breakdown
- `corpus/prompts.js` — qwen prompts expanded to 55 (added `varied` strategy)
- `corpus/models/*.json` — 554 AI songs; `corpus/human_profiles.json` — 3848 human metric vectors
- `src/baseline.json` (retrained), `corpus/combined_model.json` (will be refreshed by 2nd PC)

## 🧠 CORE THESIS (unchanged, reconfirmed this session)
Modern Suno/AI lyrics are *structurally* human-like → the structural classifier saturates (~74%); the **load-bearing discriminator is CLICHÉS** (clicheDensity AI ≈ 2× human) + properNounDensity (humans 2×). The deployed blend `0.45·cliché + 0.55·classifier` leans on the cliché half — correct by design.

---
*Saved 2026-05-31. Conversation context may compact after this — nothing is lost; this doc + the memory files + the repo artifacts hold the full state.*
