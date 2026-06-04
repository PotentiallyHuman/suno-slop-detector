#!/usr/bin/env bash
# Cron-driven resilient fetch: survives the process-group SIGKILL (an in-process loop can't).
# Each firing: no-op if enough cached or a pass is already running, else run ONE gentle fetch pass.
cd "$(dirname "$0")/.."
CACHE=/tmp/human_lyrics_cache.json
LOG=/tmp/fetch_humans.log
TARGET=6200
U=$(/home/potentiallyhumanspark/.nvm/versions/node/v22.22.2/bin/node -e "try{const c=require('$CACHE');console.log(Object.values(c).filter(v=>v&&v.length>60).length)}catch(e){console.log(0)}")
if [ "$U" -ge "$TARGET" ]; then echo "$(date +%H:%M:%S) cron: enough ($U) — idle" >> "$LOG"; exit 0; fi
if pgrep -f "/home/potentiallyhumanspark/.nvm/versions/node/v22.22.2/bin/node pipeline_tier3.js" >/dev/null; then echo "$(date +%H:%M:%S) cron: pass already running ($U usable) — skip" >> "$LOG"; exit 0; fi
echo "=== $(date +%H:%M:%S) cron fetch pass (have $U / $TARGET) ===" >> "$LOG"
NO_EMBED=1 CLAUDE_CAP=400 FETCH_ONLY=1 FETCH_POOL=3 HUMAN_RANGE="0:7050" /home/potentiallyhumanspark/.nvm/versions/node/v22.22.2/bin/node pipeline_tier3.js >> "$LOG" 2>&1
