#!/usr/bin/env bash
# Gentle, resilient human-lyric warm-fetch for the 3-model experiment.
# Fetches the first N entries of the seeded human queue into /tmp/human_lyrics_cache.json.
# Low concurrency + the pipeline's 20s throttle backoff + sleeps between attempts so we don't
# hammer lrclib. Each attempt RESUMES (cached skipped, throttled retried — never cached as a miss).
cd "$(dirname "$0")/.."
LOG=/tmp/fetch_humans.log
RANGE="${1:-0:7050}"     # 3 disjoint sets of 2350 entries -> ~2056 usable each
TARGET="${2:-6200}"      # stop once this many usable lyrics are cached
CACHE=/tmp/human_lyrics_cache.json
for i in $(seq 1 120); do
  echo "=== fetch attempt $i $(date +%H:%M:%S) (range $RANGE) ===" >> "$LOG"
  NO_EMBED=1 CLAUDE_CAP=400 FETCH_ONLY=1 FETCH_POOL=3 HUMAN_RANGE="$RANGE" node pipeline_tier3.js >> "$LOG" 2>&1
  USABLE=$(node -e "try{const c=require('$CACHE');console.log(Object.values(c).filter(v=>v&&v.length>60).length)}catch(e){console.log(0)}")
  echo "  >>> usable cached now: $USABLE / target $TARGET" >> "$LOG"
  if [ "$USABLE" -ge "$TARGET" ]; then echo ">>> ENOUGH ($USABLE) — fetch complete" >> "$LOG"; break; fi
  sleep 45    # let any throttle window cool before the next resume pass
done
echo ">>> FETCH_LOOP_DONE $(date +%H:%M:%S)" >> "$LOG"
