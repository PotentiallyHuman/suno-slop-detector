#!/usr/bin/env bash
# Grind Suno lyric generations from concept lines in $1.
# Random 5-30s pace between generations; capture-retry for slow renders; dedup-save.
SW=10485783
DISPLAY=:1 xdotool windowactivate "$SW" 2>/dev/null; sleep 0.3
mkdir -p /tmp/suno_shots
cd "$(dirname "$0")/.."
i=0
while IFS= read -r concept; do
  [ -z "$concept" ] && continue
  i=$((i+1))
  slug=$(echo "$concept" | cut -c1-28 | tr -cd 'a-zA-Z0-9 ' | tr ' ' '-')
  # random pacing between generations (not before the first)
  if [ $i -gt 1 ]; then w=$((RANDOM % 26 + 5)); echo "...pacing ${w}s..."; sleep $w; fi
  DISPLAY=:1 xdotool windowactivate "$SW" 2>/dev/null; sleep 0.2
  # set prompt
  DISPLAY=:1 xdotool mousemove 550 1692 click 1; sleep 0.4
  DISPLAY=:1 xdotool key --clearmodifiers ctrl+a; DISPLAY=:1 xdotool key --clearmodifiers Delete; sleep 0.2
  printf '%s' "$concept" | DISPLAY=:1 xclip -selection clipboard
  DISPLAY=:1 xdotool key --clearmodifiers ctrl+v; sleep 0.4
  # generate
  DISPLAY=:1 xdotool mousemove 810 1742 click 1
  sleep 13
  echo "=== [$i] $concept ==="
  # capture with retry (slow renders)
  ok=0
  for attempt in 1 2 3 4; do
    DISPLAY=:1 xdotool mousemove 175 263 click 1; sleep 0.2
    DISPLAY=:1 xdotool keydown shift; DISPLAY=:1 xdotool mousemove 250 1560 click 1; DISPLAY=:1 xdotool keyup shift; sleep 0.2
    DISPLAY=:1 xdotool key --clearmodifiers ctrl+c; sleep 0.3
    DISPLAY=:1 xclip -selection clipboard -o > /tmp/clip.txt 2>/dev/null
    n=$(grep -c . /tmp/clip.txt)
    if [ "$n" -ge 8 ]; then ok=1; break; fi
    echo "   retry $attempt (got $n lines, waiting for render)"; sleep 6
  done
  python3 build/capture_suno.py /tmp/clip.txt "$slug" 2>&1
  DISPLAY=:1 gnome-screenshot -f "/tmp/suno_shots/song_$(printf '%02d' $i).png" 2>/dev/null
done < "$1"
echo "=== batch done. corpus now: $(ls corpus/suno_capture/simple/suno/ | wc -l) songs ==="
