#!/usr/bin/env bash
# Resilient retrain: re-run the pipeline until the live fetch completes (each run resumes from the
# seeded /tmp/human_lyrics_cache.json), then bake model.js. Survives the random SIGKILLs that hit
# the long lrclib fetch in this environment.
cd "$(dirname "$0")/.."
LOG=/tmp/retrain_loop.log; : > "$LOG"
for i in $(seq 1 14); do
  echo "=== ATTEMPT $i $(date +%H:%M:%S) ===" >> "$LOG"
  NO_EMBED=1 CLAUDE_CAP=400 MAX_AI=1200 FETCH_POOL=12 node pipeline_tier3.js >> "$LOG" 2>&1
  grep -q "TOP 20 DENSE" "$LOG" && { echo ">>> TRAINING COMPLETE on attempt $i" >> "$LOG"; break; }
  echo "  (attempt $i killed before completing; cache persisted — retrying)" >> "$LOG"
  sleep 2
done
if grep -q "TOP 20 DENSE" "$LOG"; then
  node build/gen_model.js >> "$LOG" 2>&1 && echo ">>> BAKED_MODEL" >> "$LOG"
fi
echo ">>> LOOP_DONE" >> "$LOG"
