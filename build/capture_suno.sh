#!/usr/bin/env bash
# Save the current X clipboard (a Suno-generated lyric set) to the next numbered
# corpus file under corpus/suno_capture/simple/suno/. Pass a title slug as $1.
set -e
cd "$(dirname "$0")/.."
DIR="corpus/suno_capture/simple/suno"
mkdir -p "$DIR"
n=$(ls "$DIR"/suno_*.txt 2>/dev/null | wc -l)
next=$(printf "%03d" $((n+1)))
slug=$(echo "${1:-untitled}" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-')
out="$DIR/suno_${next}_${slug}.txt"
DISPLAY=:1 xclip -selection clipboard -o > "$out"
lines=$(wc -l < "$out"); chars=$(wc -c < "$out")
# sanity: a real lyric set has multiple lines and section tags
if [ "$lines" -lt 6 ]; then echo "WARN: only $lines lines — clipboard may be wrong"; fi
echo "saved $out  (${lines} lines, ${chars} bytes)"
