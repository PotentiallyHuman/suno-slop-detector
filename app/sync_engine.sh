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
cp "$SRC/ext/model_v5.browser.js" "$DST/ext/model_v5.browser.js"
cp "$SRC/ext/portability_tells.browser.js" "$DST/ext/portability_tells.browser.js"
cp "$SRC/ext/clean-lyrics.js"     "$DST/ext/clean-lyrics.js"
cp "$SRC/ext/v2-engine.js"        "$DST/ext/v2-engine.js"
cp "$SRC/ext/v2-panel.js"         "$DST/ext/v2-panel.js"
cp "$SRC/ext/model_v8.browser.js" "$DST/ext/model_v8.browser.js"
cp "$SRC/ext/craft_features.browser.js" "$DST/ext/craft_features.browser.js"
cp "$SRC/ext/v8-score.browser.js" "$DST/ext/v8-score.browser.js"
cp "$SRC/ext/humanizer_model_p1.browser.js" "$DST/ext/humanizer_model_p1.browser.js"
cp "$SRC/ext/humanizer_model_p2.browser.js" "$DST/ext/humanizer_model_p2.browser.js"
cp "$SRC/ext/humanizer_model_p3.browser.js" "$DST/ext/humanizer_model_p3.browser.js"
cp "$SRC/ext/cliche_swaps.browser.js" "$DST/ext/cliche_swaps.browser.js"
cp "$SRC/ext/humanizer-gen.browser.js" "$DST/ext/humanizer-gen.browser.js"

echo "Engine synced into $DST :"
ls -1 "$DST" "$DST/ext"
