#!/usr/bin/env node
/* clean_corpus.js — normalize every corpus/models/* file to ONE format:
 * plain lyric lines in blank-line segments, no titles, no [Verse]/Chorus labels.
 * Rewrites .js modules as .json so all model files are uniform. */
const fs = require("fs");
const path = require("path");
const SlopScore = require("../src/slop-core.js");

const DIR = path.join(__dirname, "..", "corpus", "models");
for (const file of fs.readdirSync(DIR).filter((f) => /\.(js|json)$/.test(f))) {
  const full = path.join(DIR, file);
  const mod = require(full);
  const songs = (mod.songs || []).map((s) => {
    const out = { ...s };
    if (out.lyrics) out.lyrics = SlopScore.stripSectionLabels(out.lyrics);
    if (out.lyrics_en) out.lyrics_en = SlopScore.stripSectionLabels(out.lyrics_en);
    return out;
  });
  const base = file.replace(/\.(js|json)$/, "");
  const outPath = path.join(DIR, base + ".json");
  fs.writeFileSync(outPath, JSON.stringify({ model: mod.model || base, songs }, null, 2));
  if (file.endsWith(".js")) fs.unlinkSync(full); // converted .js -> .json
  console.log(`cleaned ${file} -> ${base}.json (${songs.length} songs)`);
}
console.log("done — all corpus files are now label-free plain lyrics.");
