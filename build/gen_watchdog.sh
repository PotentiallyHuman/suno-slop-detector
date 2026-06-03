#!/usr/bin/env bash
# Self-healing heartbeat for the AI-lyrics generators.
# Every CHECK seconds: log progress, and relaunch any generator that has died
# before hitting its target (e.g. after the logged-out rate-limit auto-stop).
# Runs in the background; produces songs with ZERO model tokens.
#   bash build/gen_watchdog.sh   (launch with run_in_background)
cd "$(dirname "$0")/.."
LOG=/tmp/gen_watchdog.log
CHECK=1200                     # 20 min between checks (finer than the 80-min agent heartbeat)
GPT_TARGET=${GPT_TARGET:-1000}

count(){ node -e "try{console.log((require('./corpus/models/$1.json').songs||require('./corpus/models/$1.json')).length)}catch(e){console.log(0)}" 2>/dev/null; }

echo "$(date '+%F %T') watchdog start (gpt_target=$GPT_TARGET)" >> "$LOG"
while true; do
  ts=$(date '+%F %T')
  gpt=$(count chatgpt)
  alive=$(pgrep -f "python3 build/chatgpt_gen.py" | head -1)
  echo "$ts chatgpt=$gpt/$GPT_TARGET alive=${alive:-no}" >> "$LOG"
  if [ "${gpt:-0}" -lt "$GPT_TARGET" ] && [ -z "$alive" ]; then
    echo "$ts -> relaunch chatgpt_gen ($gpt/$GPT_TARGET)" >> "$LOG"
    nohup python3 build/chatgpt_gen.py "$GPT_TARGET" "$RANDOM" >> /tmp/chatgpt_gen.log 2>&1 &
  fi
  [ "${gpt:-0}" -ge "$GPT_TARGET" ] && { echo "$ts target reached; watchdog exiting" >> "$LOG"; break; }
  sleep "$CHECK"
done
