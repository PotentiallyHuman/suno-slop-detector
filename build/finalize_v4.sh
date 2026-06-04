#!/usr/bin/env bash
# Finalize the PRODUCTION v4 model after the 3-model experiment completes.
# Production v4 = combined (BoW+dense) on full 2056 AI + balanced cached humans (class-weighted),
# the holdout-validated config. Then bake model.js + red-team. Resilient: if the train is SIGKILLed,
# no success flag is written and the cron re-runs this next tick (resumes from the warm cache).
cd "$(dirname "$0")/.."
NODE=node
LOG=/tmp/finalize_v4.log
[ -f /tmp/v4_finalized ] && { echo "$(date +%H:%M:%S) already finalized" >> "$LOG"; exit 0; }
echo "=== $(date +%H:%M:%S) train production v4 (combined, full AI + balanced cached humans) ===" >> "$LOG"
# back up current model once
[ -f corpus/combined_model.json.preV4 ] || cp corpus/combined_model.json corpus/combined_model.json.preV4 2>/dev/null
NO_EMBED=1 CLAUDE_CAP=400 $NODE pipeline_tier3.js >> "$LOG" 2>&1
grep -q "TOP 20 DENSE" "$LOG" || { echo "  train did not finish (killed?) — will retry next tick" >> "$LOG"; exit 0; }
echo "=== bake src/ext/model.js ===" >> "$LOG"
$NODE build/gen_model.js >> "$LOG" 2>&1
echo "=== red-team ===" >> "$LOG"
$NODE build/_redteam.js >> "$LOG" 2>&1
touch /tmp/v4_finalized
echo ">>> V4 FINALIZED $(date)" >> "$LOG"
