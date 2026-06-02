# AI Lyrics Generator — hourly corpus builder (project 28)

Produces **10 AI-written songs every 60 minutes** for the Suno AI-lyrics
detector's baseline. Each is a labeled `.md` data point: frontmatter holds the
features (strategy, genre, subject, persona, constraint, model…) and the body
holds the lyrics.

## Two engines

| Engine | Memory | Cost | How it runs |
|---|---|---|---|
| **Claude (default)** | ~0 local RAM | API | this Claude session fires every 60 min via `/loop`, writes the songs itself |
| **ollama (optional)** | loads 1 model, then **unloads** it | free | cron → `run_hourly.sh` → `gen_lyrics.py` |

We use **Claude** because your other program is already holding ~60 GB RAM and
we must not crash it. Claude generation adds no local model. The ollama path is
kept as a free, fully-autonomous fallback for when the machine is idle.

## Files
- `briefs.py` — simulates a human's Suno request (10 strategies, big pools).
- `next_briefs.py N` — prints N briefs as JSON (the Claude loop reads these).
- `corpus_io.py` — canonical labeled-`.md` writer (both engines use it).
- `save_batch.py` / `_batch_seed.py` — save Claude-written songs.
- `FIRE.md` — the exact per-fire runbook the loop follows.
- `gen_lyrics.py` + `config.json` — optional ollama batch generator (unloads
  the model after each run → idle RAM ~0).
- `run_hourly.sh` + `install_cron.sh` — optional cron driver for the ollama path
  (nice -19, single-instance lock).
- `state.json` — running counters (total songs, runs, last model).

## Run the Claude path (default)
In this session: `/loop 60m` with the prompt pointing at `FIRE.md`. Each fire
writes 10 songs to `../corpus/ai_lyrics/YYYY-MM-DD/`. Keep the terminal open
while away — the loop re-fires hourly. (Files are written to local disk, so the
loop must run in this local session, not a remote routine.)

## Run the ollama path (optional, machine idle)
```bash
./install_cron.sh        # hourly job at minute 0
./install_cron.sh --remove
# manual one-off:
python3 gen_lyrics.py --n 3 --model qwen2.5:3b
```

## Output schema (per file)
```
---
id, source: ai, engine, model, generated_at, strategy, genre, subject,
mood, pov, constraint, structure, title, persona, occasion, lang
brief: | <the human-typed request, verbatim>
---
<the lyrics, with [Verse]/[Chorus] tags>
```
The `brief` + `meta` are the labels; `lyrics` is the generated text.
```
