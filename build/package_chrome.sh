#!/usr/bin/env bash
# Build a Chrome Web Store-ready ZIP: the SAME runtime files as Firefox, but with
# a Chrome-clean manifest (Firefox-only browser_specific_settings stripped out —
# Chrome rejects it).
#
# Packages the ENTIRE src/ tree (so future runtime files are never forgotten),
# EXCLUDING node-only test files (_test_engine.js), sourcemaps (*.map), and
# editor backups (*.prev_v2), plus icons/.
set -e
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json, os, shutil, fnmatch
m = json.load(open("manifest.json")); m.pop("browser_specific_settings", None)
stage = "dist/chrome"
if os.path.isdir(stage): shutil.rmtree(stage)
os.makedirs(stage+"/icons")
json.dump(m, open(stage+"/manifest.json","w"), indent=2)
# copy the whole src/ tree, then prune node-only tests + sourcemaps + backups
shutil.copytree("src", stage+"/src")
EXCLUDE = ("_test_engine.js", "*.map", "*.prev_v2", "humanize.js", "rhyme_index.js", "adjstack_swaps.js", "ingverb_swaps.js", "prepphrase_swaps.js", "v8-rewrite.browser.js", "human_pool.browser.js")
for root, _dirs, files in os.walk(stage+"/src"):
    for fn in files:
        if any(fnmatch.fnmatch(fn, pat) for pat in EXCLUDE):
            os.remove(os.path.join(root, fn))
for n in (16,32,48,128): shutil.copy(f"icons/icon{n}.png", f"{stage}/icons/icon{n}.png")
PY
ver=$(node -p "require('./package.json').version")
out="dist/suno-slop-detector-chrome-${ver}.zip"
rm -f "$out"; ( cd dist/chrome && zip -qr "../suno-slop-detector-chrome-${ver}.zip" manifest.json icons src )
echo "built $out"; unzip -l "$out" | tail -n +2
