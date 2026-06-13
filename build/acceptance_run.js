/* acceptance_run.js — run one real AI song through the EXACT shipped extension chain
 * (dist/firefox), pressing the buttons the way a user would:
 *   score -> Humanize Rewrite until it refuses -> Humanize Chaos if it arms -> final score.
 * Prints every edit (mode, from -> to) so each one can be accepted or rejected by eye.
 *
 * Usage: node build/acceptance_run.js <song.txt> [--json]
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
const sb = { console, setTimeout, clearTimeout,
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb;
vm.createContext(sb);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });

const score = (t) => sb.SlopV8.scoreV8(t).score;
const logit = (t) => { const r = sb.SlopV8.scoreV8(t); if (typeof r.z === "number") return r.z; let p = Math.min(Math.max(r.pAI, 1e-9), 1 - 1e-9); return Math.log(p / (1 - p)); };

const file = process.argv[2];
if (!file) { console.error("usage: node build/acceptance_run.js <song.txt>"); process.exit(1); }
const original = fs.readFileSync(file, "utf8");

const trace = { file, start: score(original), presses: [], final: null, finalText: null };
let cur = original;

// Humanize Rewrite, pressed until it refuses (max 6 — converges long before)
for (let p = 1; p <= 6; p++) {
  const r = sb.HumanizeFreestyle.humanizeHalf(cur, score, logit);
  if (!r) break;
  trace.presses.push({ button: "Rewrite", before: score(cur), after: score(r.text), steps: r.steps });
  cur = r.text;
}
// the button morphs to Chaos when Rewrite refuses and the song still reads >= 20%
if (score(cur) >= 20) {
  const ch = sb.HumanizeFreestyle.humanizeChaos(cur, score, logit);
  if (ch) {
    trace.presses.push({ button: "Chaos", before: ch.before, after: ch.after, steps: ch.steps });
    cur = ch.text;
  } else {
    trace.presses.push({ button: "Chaos", refused: true, steps: [] });
  }
}
trace.final = score(cur);
trace.finalText = cur;

if (process.argv.includes("--json")) { console.log(JSON.stringify(trace, null, 1)); process.exit(0); }

console.log("==== " + path.basename(file) + " ====");
console.log("START: " + trace.start + "% AI");
for (const pr of trace.presses) {
  if (pr.refused) { console.log("\n[" + pr.button + "] refused — nothing safe left to change"); continue; }
  console.log("\n[" + pr.button + "] " + pr.before + "% -> " + pr.after + "%  (" + pr.steps.length + " edits)");
  for (const s of pr.steps) {
    console.log("   L" + (s.lineIndex + 1) + (s.mode ? " [" + s.mode + "]" : "") + ":");
    console.log("     - " + s.from);
    console.log("     + " + s.to);
  }
}
const z0 = logit(original), z1 = logit(cur);
console.log("\nFINAL: " + trace.final + "% AI  (z " + z0.toFixed(2) + " -> " + z1.toFixed(2) + " — the model is " + Math.round(Math.exp(z0 - z1)) + "x less sure it's AI)");
const out = file.replace(/(\.txt)?$/, ".humanized.txt");
fs.writeFileSync(out, cur);
console.log("humanized text written to: " + out);
