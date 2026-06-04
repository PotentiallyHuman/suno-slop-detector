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
    "engine/ext/model.js", "engine/ext/clean-lyrics.js",
    "engine/ext/v2-engine.js", "engine/ext/v2-panel.js",
    # data-vetted Humanize word/phrase-swap catalogs — MUST precede humanize.js (it reads these globals)
    "rhyme_index.js", "adjstack_swaps.js", "ingverb_swaps.js", "prepphrase_swaps.js",
    "humanize.js", "app.js",
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
