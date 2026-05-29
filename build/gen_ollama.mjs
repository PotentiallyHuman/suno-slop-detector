#!/usr/bin/env node
/*
 * Generate an AI-lyrics baseline from a local ollama model.
 * Usage: node build/gen_ollama.mjs qwen2.5:14b qwen-2.5-14b
 *   arg1 = ollama model tag, arg2 = corpus label (filename-safe)
 * Writes corpus/models/<label>.json  ({model, generatedAt, songs:[...]})
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { allPrompts } = require("../corpus/prompts.js");

const MODEL = process.argv[2] || "qwen2.5:14b";
const LABEL = process.argv[3] || MODEL.replace(/[^a-z0-9.]+/gi, "-");
const OUT = new URL(`../corpus/models/${LABEL}.json`, import.meta.url).pathname;
mkdirSync(new URL("../corpus/models/", import.meta.url).pathname, { recursive: true });

async function gen(prompt) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.8, num_predict: 700 },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return (j.response || "").trim();
}

const prompts = allPrompts();
const songs = [];
console.log(`[gen] ${MODEL} -> ${LABEL}.json  (${prompts.length} prompts)`);
for (const p of prompts) {
  const t0 = Date.now();
  let lyrics = "";
  try {
    lyrics = await gen(p.prompt);
  } catch (e) {
    console.error(`[gen] FAIL ${p.strategy}#${p.index}: ${e.message}`);
  }
  songs.push({
    model: LABEL,
    source: "ollama",
    strategy: p.strategy,
    index: p.index,
    subject: p.subject,
    lang: "en",
    lyrics,
  });
  console.log(
    `[gen] ${p.strategy}#${p.index} ${lyrics.length} chars ` +
      `(${((Date.now() - t0) / 1000).toFixed(1)}s)`
  );
  writeFileSync(OUT, JSON.stringify({ model: LABEL, songs }, null, 2));
}
console.log(`[gen] DONE -> ${OUT}`);
