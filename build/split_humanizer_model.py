#!/usr/bin/env python3
"""Split the humanizer model into parts under AMO's 4MB-per-file linter limit.

Mozilla's addons-linter refuses to parse any JS file over 4 MB ("File is too large
to parse") and that REJECTS the whole submission — the monolithic
humanizer_model.browser.js (~7 MB) cannot ship to Firefox. This script repackages
the SAME model (no retrain) as humanizer_model_p1/p2/p3.browser.js, each well under
the limit; the last part merges them back into globalThis.HZ_MODEL, so
humanizer-gen.browser.js is untouched.

Run after every /tmp/export_model.py retrain:
    python3 build/split_humanizer_model.py
Reads the freshest monolith (app/engine/ext/ or src/ext/), writes parts to BOTH
app/engine/ext/ and src/ext/. Keep load order: p1, p2, p3 (the merge), then the gen.
"""
import json, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CANDIDATES = [ROOT / "app/engine/ext/humanizer_model.browser.js",
              ROOT / "src/ext/humanizer_model.browser.js"]
src = max((p for p in CANDIDATES if p.exists()), key=lambda p: p.stat().st_mtime)
s = src.read_text()
model = json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))

LIMIT = 3.4 * 1024 * 1024          # bytes per part, safety margin under AMO's 4 MB
sizes = {k: len(json.dumps({k: v}, separators=(",", ":"))) for k, v in model.items()}
parts, cur, cur_sz = [], {}, 0
for k in sorted(sizes, key=sizes.get, reverse=True):   # greedy bin-pack, biggest first
    if cur_sz + sizes[k] > LIMIT and cur:
        parts.append(cur); cur, cur_sz = {}, 0
    cur[k] = model[k]; cur_sz += sizes[k]
if cur: parts.append(cur)
assert len(parts) <= 3, "model grew — raise the part count (and every load-order list)"
while len(parts) < 3: parts.append({})                 # stable filenames for the load orders

names = ["humanizer_model_p1.browser.js", "humanizer_model_p2.browser.js",
         "humanizer_model_p3.browser.js"]
for dst in [ROOT / "app/engine/ext", ROOT / "src/ext"]:
    for i, (nm, pt) in enumerate(zip(names, parts)):
        js = "globalThis.HZ_MODEL_P%d=%s;\n" % (i + 1, json.dumps(pt, separators=(",", ":")))
        if i == len(names) - 1:                        # last part reassembles the model
            js += ("globalThis.HZ_MODEL=Object.assign({},globalThis.HZ_MODEL_P1,"
                   "globalThis.HZ_MODEL_P2,globalThis.HZ_MODEL_P3);\n"
                   "delete globalThis.HZ_MODEL_P1;delete globalThis.HZ_MODEL_P2;"
                   "delete globalThis.HZ_MODEL_P3;\n")
        (dst / nm).write_text(js)
        print("%s/%s  %.2f MB" % (dst.relative_to(ROOT), nm, len(js) / 1e6))
    mono = dst / "humanizer_model.browser.js"
    if mono.exists(): mono.unlink(); print("removed monolith", mono.relative_to(ROOT))
print("done — update load orders to p1,p2,p3 if not already")
