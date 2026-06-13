#!/usr/bin/env bash
# teacher watchdog: keep the overnight Qwen dataset job alive; relaunch if it died.
cd "$(dirname "$0")/../.."
if pgrep -f gen_dataset.js >/dev/null; then
  echo "$(date +%H:%M) teacher alive, rows=$(wc -l < overnight/distill/dataset.jsonl)"
else
  echo "$(date +%H:%M) teacher DEAD — relaunching (dedup-aware, resumes)"
  nohup node overnight/distill/gen_dataset.js 3000 > overnight/distill/gen_run.log 2>&1 &
fi
