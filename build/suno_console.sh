#!/usr/bin/env bash
# Run JS (file $1) in the already-open, paste-enabled Firefox console; print what it copy()'d.
SW=10485783
DISPLAY=:1 xdotool windowactivate "$SW" 2>/dev/null; sleep 0.2
DISPLAY=:1 xclip -selection clipboard -i "$1"
DISPLAY=:1 xdotool mousemove 250 1890 click 1; sleep 0.3
DISPLAY=:1 xdotool key --clearmodifiers ctrl+v; sleep 0.3
DISPLAY=:1 xdotool key --clearmodifiers Return; sleep 0.9
DISPLAY=:1 xclip -selection clipboard -o
