#!/usr/bin/env bash
# Build a Firefox store-ready ZIP for the extension.
#
# Packages the ENTIRE src/ tree (so future runtime files are never forgotten),
# EXCLUDING node-only test files (_test_engine.js) and any sourcemaps (*.map),
# plus manifest.json + icons/. Also rebuilds the dist/firefox/ staging dir.
set -e
cd "$(dirname "$0")/.."
ver=$(node -p "require('./package.json').version")
mkdir -p dist
out="dist/suno-slop-detector-${ver}.zip"
stage="dist/firefox"
rm -f "$out"
rm -rf "$stage"

# --- assemble the staging dir (mirror of what ships) ---
mkdir -p "$stage/icons"
cp manifest.json "$stage/manifest.json"
for n in 16 32 48 128; do cp "icons/icon${n}.png" "$stage/icons/icon${n}.png"; done
# copy the whole src/ tree, then prune node-only tests + sourcemaps + editor cruft
cp -r src "$stage/src"
find "$stage/src" -type f \( -name '_test_engine.js' -o -name '*.map' -o -name '*.prev_v2' \) -delete

# --- zip from the staging dir so the archive layout matches exactly ---
( cd "$stage" && zip -qr "../suno-slop-detector-${ver}.zip" manifest.json icons src )

echo "built $out"
unzip -l "$out" | tail -n +2
