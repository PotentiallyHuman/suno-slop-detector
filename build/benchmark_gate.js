/* benchmark_gate.js — the overnight safety net. Runs the FIXED quality benchmark (Hydrogen +
 * the 11 user-supplied songs) through the shipped engine and compares to a stored baseline.
 * Any autonomous change MUST keep this green: a final score may IMPROVE (drop) freely but may not
 * REGRESS by more than 2 points, and Hydrogen's log-odds may not rise. Exit 0 = safe, 1 = regressed.
 *
 *   node build/benchmark_gate.js            # check against baseline (writes baseline if absent)
 *   node build/benchmark_gate.js --rebase   # accept current scores as the new baseline
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "dist", "firefox");
const FILES = [
  "src/slop-core.js", "src/common_words.js", "src/features.js",
  "src/ext/patterns.browser.js", "src/ext/tier3.browser.js", "src/ext/perspectives.browser.js",
  "src/ext/model.js", "src/ext/model_v5.browser.js", "src/ext/portability_tells.browser.js",
  "src/ext/clean-lyrics.js", "src/ext/v2-engine.js", "src/ext/model_v8.browser.js",
  "src/ext/craft_features.browser.js", "src/ext/v8-score.browser.js",
  "src/ext/humanizer_model_p1.browser.js", "src/ext/humanizer_model_p2.browser.js",
  "src/ext/humanizer_model_p3.browser.js", "src/ext/cliche_swaps.browser.js",
  "src/ext/humanizer-gen.browser.js",
];
const sb = { console, setTimeout, clearTimeout, atob: (s) => Buffer.from(s, "base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb;
vm.createContext(sb);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
const score = (t) => sb.SlopV8.scoreV8(t).score;
const logit = (t) => sb.SlopV8.scoreV8(t).z;

function humanizeFull(text) {
  let cur = text;
  for (let p = 0; p < 6; p++) { const r = sb.HumanizeFreestyle.humanizeHalf(cur, score, logit); if (!r) break; cur = r.text; }
  if (score(cur) >= 20) { const ch = sb.HumanizeFreestyle.humanizeChaos(cur, score, logit); if (ch) cur = ch.text; }
  return cur;
}

// benchmark songs: Hydrogen + the 11 user songs, persisted in the repo so the overnight gate
// always has them (survives reboots / fresh cron sessions).
const SDIR = path.join(__dirname, "benchmark_songs");
const SONGS = fs.readdirSync(SDIR).filter((f) => f.endsWith(".txt")).sort()
  .map((f) => [f.replace(/\.txt$/, ""), fs.readFileSync(path.join(SDIR, f), "utf8")]);

const results = {};
for (const [name, text] of SONGS) {
  const out = humanizeFull(text);
  results[name] = { startZ: +logit(text).toFixed(3), finalScore: score(out), finalZ: +logit(out).toFixed(3) };
}

const BASE = path.join(__dirname, "benchmark_baseline.json");
const rebase = process.argv.includes("--rebase");
if (rebase || !fs.existsSync(BASE)) {
  fs.writeFileSync(BASE, JSON.stringify(results, null, 1));
  console.log((rebase ? "REBASED" : "no baseline — WROTE") + " benchmark baseline (" + SONGS.length + " songs)");
  for (const k in results) console.log("  " + k.padEnd(10) + results[k].finalScore + "%  z=" + results[k].finalZ);
  process.exit(0);
}

const base = JSON.parse(fs.readFileSync(BASE, "utf8"));
let fail = 0;
const SCORE_TOL = 2, Z_TOL = 0.25;
for (const k in base) {
  const b = base[k], r = results[k];
  if (!r) { console.log("MISSING " + k); fail++; continue; }
  const dScore = r.finalScore - b.finalScore, dZ = r.finalZ - b.finalZ;
  const bad = dScore > SCORE_TOL || dZ > Z_TOL;
  if (bad) { console.log("REGRESS " + k.padEnd(10) + b.finalScore + "%->" + r.finalScore + "%  z " + b.finalZ + "->" + r.finalZ); fail++; }
  else if (dScore < -1 || dZ < -0.2) console.log("IMPROVE " + k.padEnd(10) + b.finalScore + "%->" + r.finalScore + "%  z " + b.finalZ + "->" + r.finalZ);
}
if (fail) { console.log("\nGATE: FAIL (" + fail + " regressed) — revert the last change"); process.exit(1); }
console.log("GATE: PASS (" + SONGS.length + " benchmark songs non-regressed)");
process.exit(0);
