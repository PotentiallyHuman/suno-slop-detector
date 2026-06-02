#!/usr/bin/env bash
# run_hourly.sh — cron entry point. Low-priority, single-instance, logged.
# Fires gen_lyrics.py, which writes 10 labeled AI-lyric files then UNLOADS
# the model (idle RAM ~0 between hourly runs).
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$HERE/logs"
LOCK="$HERE/.run.lock"
mkdir -p "$LOG_DIR"

# Single instance: if a previous hour is somehow still running, skip this one.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Is) skipped: previous run still active" >> "$LOG_DIR/cron.log"
  exit 0
fi

PY="$(command -v python3)"
# nice/ionice so it never competes with diffusion/GPU work.
NICE="nice -n 19"
command -v ionice >/dev/null 2>&1 && NICE="ionice -c3 $NICE"

LOG="$LOG_DIR/$(date +%Y-%m-%d).log"
{
  echo "================ $(date -Is) ================"
  $NICE "$PY" "$HERE/gen_lyrics.py"
  echo "exit=$? at $(date -Is)"
} >> "$LOG" 2>&1
