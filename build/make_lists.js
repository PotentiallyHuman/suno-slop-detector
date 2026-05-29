#!/usr/bin/env node
/* make_lists.js — render the human-readable AI_WORDS_100.md and CLICHES_50.md
 * from analysis/*.json, augmented with well-known AI clichés. */
const fs = require("fs");
const path = require("path");
const A = path.join(__dirname, "..", "analysis");
const words = JSON.parse(fs.readFileSync(path.join(A, "ai_words_top100.json"), "utf8"));
const cl = JSON.parse(fs.readFileSync(path.join(A, "cliches_top50.json"), "utf8"));

// ---- AI_WORDS_100.md -------------------------------------------------------
const w = [];
w.push(`# The 100 most over-used AI-lyric words\n`);
w.push(`From ${words.corpusSize} AI songs across ${words.models.join(", ")}. Ranked by how many songs use the word ("songs"), then total count. "lift" = times more frequent than in the human sample (rough; small human n).\n`);
w.push(`| # | word | songs | models | lift | ${words.models.join(" | ")} |`);
w.push(`|--:|---|--:|--:|--:|${words.models.map(() => "--:").join("|")}|`);
words.words.forEach((x, i) =>
  w.push(`| ${i + 1} | ${x.word} | ${x.songs} | ${x.models} | ${x.lift}× | ${x.perModel.join(" | ")} |`)
);
fs.writeFileSync(path.join(A, "AI_WORDS_100.md"), w.join("\n") + "\n");

// ---- CLICHES_50.md ---------------------------------------------------------
// Known canonical AI clichés (curated; some appear rarely in THIS corpus but are
// classic tells worth flagging). Kept even at low corpus frequency.
const KNOWN_PHRASE = [
  "fingers trace / fingertips trace", "neon lights", "city lights", "streetlights / streetlight glow",
  "skyline", "on the horizon", "chasing the horizon", "shadows dance / dancing shadows",
  "echoes (in the night / of the past)", "whisper in the wind", "rise from the ashes",
  "like a phoenix", "concrete jungle", "painted skies", "we won't back down",
  "fire in my veins", "frozen in time", "lost in the moment", "tear me apart",
  "demons in my head", "calm before the storm", "weight of the world",
];
const KNOWN_SYNTAX = [
  "not A, not B, just C", "I'm not A, I'm (just) B", "it's not A, it's B",
  "maybe X, maybe Y", "half X, half Y", "every X, every Y",
  "I don't know where/why, but…", "anaphora: carry the X, carry the Y",
];

const c = [];
c.push(`# 50 most over-used AI-lyric clichés\n`);
c.push(`Three kinds: **syntactic templates** (sentence shapes), **stock phrases / imagery**, and **single-word tells**. Counts are from the ${cl.syntacticPatterns?.[0] ? "" : ""}AI corpus; canonical tells are kept even when rare here.\n`);

let n = 0;
c.push(`## A. Syntactic templates (the sentence shapes)\n`);
for (const p of KNOWN_SYNTAX) {
  const hit = (cl.syntacticPatterns || []).find((x) => x.name.toLowerCase().includes(p.split(",")[0].toLowerCase().slice(0, 6)));
  c.push(`${++n}. **${p}**${hit && hit.songs ? `  — seen in ${hit.songs} songs (${hit.total} hits)${hit.examples?.[0] ? `, e.g. "${hit.examples[0]}"` : ""}` : ""}`);
}
c.push(`\n## B. Stock phrases & imagery\n`);
for (const p of KNOWN_PHRASE) c.push(`${++n}. ${p}`);
// fill from corpus recurring phrases
for (const g of cl.recurringPhrases || []) {
  if (n >= 42) break;
  c.push(`${++n}. "${g.gram}" — ${g.songs} songs / ${g.models} models`);
}
c.push(`\n## C. Single-word tells (high AI-vs-human lift)\n`);
for (const x of cl.imageryWords || []) {
  if (n >= 50) break;
  c.push(`${++n}. ${x.word} (${x.lift}×)`);
}
fs.writeFileSync(path.join(A, "CLICHES_50.md"), c.join("\n") + "\n");

console.log("wrote analysis/AI_WORDS_100.md and analysis/CLICHES_50.md");
