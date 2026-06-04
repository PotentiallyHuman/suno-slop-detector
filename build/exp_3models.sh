#!/usr/bin/env bash
# 3 INDEPENDENT (standalone) trainings: same AI (all 2056), 3 DISJOINT human sets.
# Uses only the warm cache (no live fetch). Each writes its own model + prints its 5-fold CV.
cd "$(dirname "$0")/.."
LOG=/tmp/exp_3models.log; : > "$LOG"
RANGES=("0:2350" "2350:2350" "4700:2350")   # disjoint entry ranges -> ~2056 usable humans each
for k in 0 1 2; do
  echo "=== MODEL $k  humans ${RANGES[$k]}  $(date +%H:%M:%S) ===" >> "$LOG"
  NO_EMBED=1 CLAUDE_CAP=400 HUMAN_RANGE="${RANGES[$k]}" EXP_OUT="/tmp/exp_model_$k.json" \
    node pipeline_tier3.js >> "$LOG" 2>&1
  echo "  model $k written: $([ -f /tmp/exp_model_$k.json ] && echo OK || echo MISSING)" >> "$LOG"
done
echo ">>> EXP_3MODELS_DONE $(date +%H:%M:%S)" >> "$LOG"
