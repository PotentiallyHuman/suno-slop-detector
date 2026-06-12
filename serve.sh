#!/usr/bin/env bash
# Serve the PWA locally. A service worker + manifest need http(s), not file://.
# Usage: ./serve.sh [port]   then open http://localhost:8088
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8088}"
cd "$HERE"
echo "Lyric Humanizer → http://localhost:$PORT  (Ctrl+C to stop)"
exec python3 -m http.server "$PORT"
