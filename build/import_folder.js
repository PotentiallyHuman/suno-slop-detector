#!/usr/bin/env node
/*
 * import_folder.js — import a folder of pasted model lyrics laid out as
 *   <root>/<difficulty>/<model>/*.txt   (difficulty: simple|medium|complex)
 * into corpus/models/<model>.json, mapping difficulty -> strategy:
 *   simple -> vibe, medium -> story, complex -> craft
 *
 * It strips chat preamble ("Here's a song based on…:"), title lines, markdown,
 * and trailing "want me to…?" notes, and (with --inplace) rewrites the cleaned
 * lyrics back over the source .txt files.
 *
 *   node build/import_folder.js /home/.../Downloads/1 --inplace
 */
const fs = require("fs");
const path = require("path");
const SlopScore = require("../src/slop-core.js");

const ROOT = process.argv[2];
const INPLACE = process.argv.includes("--inplace");
const ONLY = (() => {
  const i = process.argv.indexOf("--only");
  return i !== -1 ? process.argv[i + 1] : null;
})();
const MODELS_DIR = path.join(__dirname, "..", "corpus", "models");
fs.mkdirSync(MODELS_DIR, { recursive: true });

const DIFF_TO_STRATEGY = { simple: "vibe", medium: "story", complex: "craft" };
const HEADER_RE =
  /^[\s>*_~`-]*((?:final\s+)?(?:pre[\s-]?chorus|post[\s-]?chorus|verse|chorus|bridge|intro|outro|hook|refrain|interlude))\s*\d*\s*[:.]?[\s*_~`-]*$/i;
const isHeader = (l) => HEADER_RE.test(l) || /^\s*\[[^\]]+\]\s*$/.test(l);

const PREAMBLE_RE =
  /^(absolutely|sure|here'?s|here is|of course|got it|certainly|great|nice|okay|ok|love this|perfect|happy to|sounds good)\b/i;
const TRAILING_RE =
  /^(would you like|let me know|want me to|i can also|if you'?d like|hope (you|this)|feel free|you can )/i;

function clean(raw) {
  let t = raw
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/\*\*|__|`/g, "");
  const lines = t.split(/\r?\n/);

  // drop everything before the first section header (removes preamble + title)
  const start = lines.findIndex(isHeader);
  if (start > 0) lines.splice(0, start);
  else {
    while (lines.length) {
      const l = lines[0].trim();
      if (
        l === "" ||
        /:$/.test(l) ||
        PREAMBLE_RE.test(l) ||
        /^title\s*:/i.test(l) ||
        /^".*"$/.test(l)
      )
        lines.shift();
      else break;
    }
  }
  // strip trailing chat commentary / blank lines
  while (lines.length) {
    const l = lines[lines.length - 1].trim();
    if (l === "" || TRAILING_RE.test(l)) lines.pop();
    else break;
  }
  // remove ALL section labels -> plain lyric lines in blank-line segments
  return SlopScore.stripSectionLabels(lines.join("\n"));
}

if (!ROOT || !fs.existsSync(ROOT)) {
  console.error(`usage: node build/import_folder.js <root-dir> [--inplace]`);
  process.exit(1);
}

const byModel = {}; // model -> songs[]
for (const diff of Object.keys(DIFF_TO_STRATEGY)) {
  const dDir = path.join(ROOT, diff);
  if (!fs.existsSync(dDir)) continue;
  for (const model of fs.readdirSync(dDir)) {
    if (ONLY && model !== ONLY) continue;
    const mDir = path.join(dDir, model);
    if (!fs.statSync(mDir).isDirectory()) continue;
    for (const file of fs.readdirSync(mDir).filter((f) => f.endsWith(".txt"))) {
      const full = path.join(mDir, file);
      const idx = (file.match(/(\d+)\D*$/) || [])[1] || "0";
      const cleaned = clean(fs.readFileSync(full, "utf8"));
      if (cleaned.length < 30) continue;
      if (INPLACE) fs.writeFileSync(full, cleaned + "\n");
      (byModel[model] = byModel[model] || []).push({
        model,
        source: "paste",
        strategy: DIFF_TO_STRATEGY[diff],
        index: +idx,
        subject: `(${model} ${diff})`,
        lang: "en",
        lyrics: cleaned,
      });
    }
  }
}

for (const [model, songs] of Object.entries(byModel)) {
  songs.sort((a, b) => a.strategy.localeCompare(b.strategy) || a.index - b.index);
  const out = path.join(MODELS_DIR, `${model}.json`);
  fs.writeFileSync(out, JSON.stringify({ model, songs }, null, 2));
  console.log(`${model}: ${songs.length} songs -> ${path.relative(process.cwd(), out)}`);
}
console.log(INPLACE ? "(source .txt files cleaned in place)" : "(use --inplace to clean source files)");
