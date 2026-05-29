#!/usr/bin/env bash
# Build a store-ready ZIP containing ONLY the runtime extension files.
set -e
cd "$(dirname "$0")/.."
ver=$(node -p "require('./package.json').version")
mkdir -p dist
out="dist/suno-slop-detector-${ver}.zip"
rm -f "$out"
zip -q "$out" \
  manifest.json \
  icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png \
  src/slop-core.js src/common_words.js src/features.js src/baseline.js \
  src/content.js src/overlay.css \
  src/popup.html src/popup.js src/popup.css
echo "built $out"
unzip -l "$out" | tail -n +2
