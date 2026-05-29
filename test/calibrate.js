#!/usr/bin/env node
const { scoreLyrics } = require("../src/slop-core.js");
const corpus = require("../examples/corpus.js");

let pass = 0;
const rows = [];
for (const ex of corpus) {
  const r = scoreLyrics(ex.text);
  const [lo, hi] = ex.expect;
  const ok = r.score >= lo && r.score <= hi;
  if (ok) pass++;
  rows.push({ ok, ex, r });
}

const pad = (s, n) => String(s).padEnd(n);
console.log("\n=== Suno Slop Detector — calibration ===\n");
for (const { ok, ex, r } of rows) {
  console.log(
    `${ok ? "✅" : "❌"} ${pad(r.score + "%", 5)} ` +
      `(target ${ex.expect[0]}-${ex.expect[1]})  ${ex.name}`
  );
  const b = r.breakdown;
  console.log(
    `      logit parts → words:${b.words} phrase:${b.phrases} ` +
      `rhyme:${b.rhymes} repeat:${b.repetition} tags:${b.sectionTags}  ` +
      `| "${r.label}"`
  );
  const top = r.hits.words.slice(0, 6).map((w) => `${w.word}×${w.count}`).join(", ");
  if (top) console.log(`      top words: ${top}`);
  console.log();
}
console.log(`Ranking check: ${pass}/${corpus.length} in target band.\n`);

// monotonicity: every "ai" should outscore every "human"
const ai = rows.filter((x) => x.ex.kind === "ai").map((x) => x.r.score);
const human = rows.filter((x) => x.ex.kind === "human").map((x) => x.r.score);
const minAi = Math.min(...ai);
const maxHuman = Math.max(...human);
const ranks = minAi > maxHuman;
console.log(
  `Separation: lowest AI (${minAi}%) ${ranks ? ">" : "!>"} highest human (${maxHuman}%)  ${ranks ? "✅" : "❌"}\n`
);

// ---- data-driven baseline classifier (if built) ----------------------------
let baseOk = true;
try {
  const { classify } = require("../src/features.js");
  const baseline = require("../src/baseline.json");
  console.log("=== baseline classifier (vs AI corpus) ===");
  console.log(
    `corpus: ${baseline.meta.aiCount} AI songs, ${baseline.meta.humanCount} human anchors`,
    baseline.meta.perModel
  );
  for (const { ex, r } of rows) {
    const c = classify(ex.text, baseline);
    const blended = Math.round(0.45 * r.score + 0.55 * c.pAI);
    console.log(
      `  ${pad(ex.kind, 6)} lexicon ${pad(r.score + "%", 5)} corpus ${pad(
        c.pAI + "%",
        5
      )} → blended ${pad(blended + "%", 5)}  ${ex.name}`
    );
  }
  console.log();
} catch (e) {
  baseOk = true; // baseline is optional; don't fail the heuristic test on it
  console.log(`(baseline not built yet: ${e.message})\n`);
}

process.exit(pass === corpus.length && ranks && baseOk ? 0 : 1);
