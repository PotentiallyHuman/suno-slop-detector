#!/usr/bin/env bash
# install_cron.sh — register the hourly job (idempotent). Fires at minute 0
# of every hour. Remove with: ./install_cron.sh --remove
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JOB="0 * * * * $HERE/run_hourly.sh"
TAG="# suno-ai-lyrics-generator"

current="$(crontab -l 2>/dev/null || true)"
cleaned="$(printf '%s\n' "$current" | grep -vF "$TAG" | grep -vF "$HERE/run_hourly.sh" || true)"

if [[ "${1:-}" == "--remove" ]]; then
  printf '%s\n' "$cleaned" | crontab -
  echo "removed hourly lyrics job"
  exit 0
fi

{ printf '%s\n' "$cleaned"; echo "$JOB $TAG"; } | sed '/^$/d' | crontab -
echo "installed hourly job:"
echo "  $JOB"
echo "current crontab:"
crontab -l
