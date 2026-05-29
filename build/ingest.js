#!/usr/bin/env node
/*
 * ingest.js — turn a pasted plain-text lyric file into a corpus model JSON.
 *
 *   node build/ingest.js --template grok     # write a blank scaffold to fill
 *   node build/ingest.js grok                # parse corpus/models/grok.txt -> grok.json
 *
 * The .txt format is just the 15 prompts as headers; paste each model's reply
 * under the matching header:
 *
 *     ### vibe 1
 *     <paste lyrics here>
 *     ### vibe 2
 *     ...
 */
const fs = require("fs");
const path = require("path");
const { STRATEGIES, allPrompts } = require("../corpus/prompts.js");

const MODELS_DIR = path.join(__dirname, "..", "corpus", "models");
fs.mkdirSync(MODELS_DIR, { recursive: true });

function template(label) {
  let out =
    `# Paste ${label}'s reply under each header. Feed each model the EXACT\n` +
    `# prompt shown in the comment (see corpus/prompts.js / STRATEGIES.md).\n\n`;
  for (const p of allPrompts()) {
    out += `### ${p.strategy} ${p.index}\n# prompt: ${p.prompt.replace(/\n/g, " ")}\n\n\n`;
  }
  const file = path.join(MODELS_DIR, `${label}.txt`);
  fs.writeFileSync(file, out);
  console.log(`wrote scaffold ${path.relative(process.cwd(), file)} — fill it, then:`);
  console.log(`  node build/ingest.js ${label}`);
}

function subjectFor(strategy, index) {
  const st = STRATEGIES.find((s) => s.id === strategy);
  return st ? st.items[index - 1] : "";
}

function ingest(label) {
  const file = path.join(MODELS_DIR, `${label}.txt`);
  if (!fs.existsSync(file)) {
    console.error(`no ${file} — run: node build/ingest.js --template ${label}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(file, "utf8");
  const blocks = raw.split(/^###\s*/m).slice(1);
  const songs = [];
  for (const b of blocks) {
    const m = b.match(/^(vibe|story|craft)\s*(\d+)\s*\n([\s\S]*)$/);
    if (!m) continue;
    const strategy = m[1];
    const index = +m[2];
    // drop "# prompt:" comment lines, keep the pasted lyrics
    const lyrics = m[3]
      .split(/\r?\n/)
      .filter((l) => !/^\s*#/.test(l))
      .join("\n")
      .trim();
    if (lyrics.length < 20) continue;
    songs.push({ model: label, source: "paste", strategy, index, subject: subjectFor(strategy, index), lang: "auto", lyrics });
  }
  if (!songs.length) {
    console.error("no filled-in lyric blocks found.");
    process.exit(1);
  }
  const out = path.join(MODELS_DIR, `${label}.json`);
  fs.writeFileSync(out, JSON.stringify({ model: label, songs }, null, 2));
  console.log(`wrote ${path.relative(process.cwd(), out)} with ${songs.length} songs.`);
  console.log(`next:  node build/translate.js ${label}.json  &&  npm run build`);
}

const arg = process.argv[2];
if (arg === "--template") template(process.argv[3] || "model");
else if (arg) ingest(arg);
else console.error("usage: node build/ingest.js [--template] <label>");
