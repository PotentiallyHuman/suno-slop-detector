#!/usr/bin/env node
/*
 * translate.js — normalize a corpus model file to English before comparison.
 * Adds a `lyrics_en` field to each song (build_baseline prefers it over `lyrics`).
 * Already-English lyrics are detected and copied through untouched (no API call).
 * Translation runs locally on ollama qwen2.5 — no external network.
 *
 *   node build/translate.js corpus/models/grok.json
 *   node build/translate.js all          # every .json in corpus/models/
 */
const fs = require("fs");
const path = require("path");

const MODEL = process.env.TRANSLATE_MODEL || "qwen2.5:14b";
const MODELS_DIR = path.join(__dirname, "..", "corpus", "models");

const EN_HINTS = new Set(
  ("the and you i to a of in it that is was my me we for on with this but not your " +
   "all be have are they so what when there here love").split(/\s+/)
);
function likelyEnglish(text) {
  const toks = (text.toLowerCase().match(/[a-z']+/g) || []);
  if (toks.length < 8) return true;
  const hits = toks.filter((t) => EN_HINTS.has(t)).length;
  return hits / toks.length > 0.06; // ~6%+ common English words
}

async function translate(text) {
  const prompt =
    "Translate the following song lyrics into natural English. Keep the line " +
    "breaks and structure. Output ONLY the translated lyrics, nothing else:\n\n" +
    text;
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { temperature: 0.2 } }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return ((await res.json()).response || "").trim();
}

async function processFile(file) {
  if (!file.endsWith(".json")) {
    console.log(`skip ${file} (only .json model files are translated)`);
    return;
  }
  const full = path.join(MODELS_DIR, path.basename(file));
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  let changed = 0;
  for (const s of data.songs || []) {
    if (s.lyrics_en) continue;
    if (likelyEnglish(s.lyrics)) {
      s.lyrics_en = s.lyrics;
      s.lang = s.lang || "en";
    } else {
      process.stdout.write(`  translating ${s.strategy}#${s.index}… `);
      s.lyrics_en = await translate(s.lyrics);
      s.lang = s.lang && s.lang !== "en" ? s.lang : "auto";
      changed++;
      console.log("done");
    }
  }
  fs.writeFileSync(full, JSON.stringify(data, null, 2));
  console.log(`${path.basename(file)}: ${changed} translated, ${data.songs.length} total`);
}

(async () => {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: node build/translate.js <file.json | all>");
    process.exit(1);
  }
  const files =
    arg === "all"
      ? fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith(".json"))
      : [path.basename(arg)];
  for (const f of files) await processFile(f);
})();
