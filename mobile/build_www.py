#!/usr/bin/env python3
"""Build a SINGLE self-contained index.html for the Capacitor native shell.

The Android System WebView, served by Capacitor's local asset server, deadlocks
when a page requests many separate <script> sub-resources (verified via remote
DevTools: the page hangs at the first script, readyState stuck at "loading").
Inlining all CSS + JS + the brand image into one document means the WebView makes
ZERO sub-requests, so it can never deadlock. The scoring engine is unchanged —
it's the exact same files from ../app, just concatenated in load order.
"""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent
APP = ROOT.parent / "app"
OUT = ROOT / "www"
OUT.mkdir(exist_ok=True)

JS_ORDER = [
    "engine/slop-core.js", "engine/common_words.js", "engine/features.js",
    "engine/ext/patterns.browser.js", "engine/ext/tier3.browser.js",
    "engine/ext/perspectives.browser.js",
    "engine/ext/model.js", "engine/ext/model_v5.browser.js", "engine/ext/model_v8.browser.js", "engine/ext/portability_tells.browser.js", "engine/ext/clean-lyrics.js",
    "engine/ext/v2-engine.js",
    # v8 detector (88% CV, format-stripped + craft) + gated rewriter — MUST follow v2-engine.js (reads SlopV2.denseDict, CraftFeatures, SLOP_MODEL_V8)
    "engine/ext/craft_features.browser.js", "engine/ext/v8-score.browser.js", 
    "engine/ext/v2-panel.js",
    # freestyle humanizer (Humanize Line / Humanize Rewrite) — model parts MUST precede gen (p3 merges
    # them into HZ_MODEL); split into <4MB parts for AMO's linter, all surfaces stay in lockstep
    "engine/ext/humanizer_model_p1.browser.js", "engine/ext/humanizer_model_p2.browser.js",
    "engine/ext/humanizer_model_p3.browser.js", "engine/ext/cliche_swaps.browser.js", "engine/ext/humanizer-gen.browser.js",
    "app.js",
]

html = (APP / "index.html").read_text()
css = (APP / "app.css").read_text()
js = "\n;\n".join((APP / f).read_text() for f in JS_ORDER)
js = js.replace("</script", "<\\/script")          # never break out of the inline tag
brand = base64.b64encode((APP / "icons/icon-192.png").read_bytes()).decode()

# 1) inline stylesheet
html = html.replace('<link rel="stylesheet" href="app.css" />', f"<style>\n{css}\n</style>")
# 2) drop links that would be extra requests / are unused in the native shell
for pat in [
    r'\s*<link rel="manifest"[^>]*>',
    r'\s*<link rel="icon"[^>]*>',
    r'\s*<link rel="apple-touch-icon"[^>]*>',
]:
    html = re.sub(pat, "", html)
# 3) inline the brand image as a data URI
html = html.replace('src="icons/icon-192.png"', f'src="data:image/png;base64,{brand}"')
# 4) replace the 10 external scripts with one inline bundle
#    (function replacements so backslashes in css/js are never treated as regex templates)
html = re.sub(r'  <!-- trained scoring engine.*?</script>\s*<script src="app\.js"></script>',
              lambda m: f"<script>\n{js}\n</script>", html, flags=re.S)

(OUT / "index.html").write_text(html)
remaining = len(re.findall(r'<(?:script src|link)', html))
print(f"www/index.html written: {len(html)} bytes; remaining external script/link tags: {remaining}")
