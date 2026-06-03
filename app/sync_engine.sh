#!/usr/bin/env bash
# Sync the trained scoring engine from the extension (../src) into the PWA (engine/).
# The 9 files are copied VERBATIM — this app must never retrain or alter the model.
# Run this whenever the model is rebuilt (node ../build/gen_model.js).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../src"
DST="$HERE/engine"
mkdir -p "$DST/ext"

# load-order list — keep in sync with index.html <script> tags
cp "$SRC/slop-core.js"            "$DST/slop-core.js"
cp "$SRC/common_words.js"         "$DST/common_words.js"
cp "$SRC/features.js"             "$DST/features.js"
cp "$SRC/ext/patterns.browser.js" "$DST/ext/patterns.browser.js"
cp "$SRC/ext/tier3.browser.js"    "$DST/ext/tier3.browser.js"
cp "$SRC/ext/perspectives.browser.js" "$DST/ext/perspectives.browser.js"
cp "$SRC/ext/model.js"            "$DST/ext/model.js"
cp "$SRC/ext/clean-lyrics.js"     "$DST/ext/clean-lyrics.js"
cp "$SRC/ext/v2-engine.js"        "$DST/ext/v2-engine.js"
cp "$SRC/ext/v2-panel.js"         "$DST/ext/v2-panel.js"

echo "Engine synced into $DST :"
ls -1 "$DST" "$DST/ext"
