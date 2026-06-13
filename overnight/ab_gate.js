/* ab_gate.js — the "keep the best" decision, on RANDOM AI songs (not the 11 examples).
 * Runs the SAME N random AI songs through the CHAMPION engine (overnight/champion/) and the
 * CHALLENGER engine (current src/ext/). Whichever humanizes better — more reduction in AI
 * log-odds, with FEWER bad swaps — wins. ACCEPT the change if challenger wins, else REVERT.
 *
 *   node overnight/ab_gate.js [N=150] [offset=0]
 * Exit 0 = challenger WINS (accept), 1 = champion wins or tie (reject/revert).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const N = parseInt(process.argv[2] || "150", 10);
const OFFSET = parseInt(process.argv[3] || "0", 10);
const ROOT = path.join(__dirname, "..", "dist", "firefox");
const BASE = [
  "src/slop-core.js", "src/common_words.js", "src/features.js",
  "src/ext/patterns.browser.js", "src/ext/tier3.browser.js", "src/ext/perspectives.browser.js",
  "src/ext/model.js", "src/ext/model_v5.browser.js", "src/ext/portability_tells.browser.js",
  "src/ext/clean-lyrics.js", "src/ext/v2-engine.js", "src/ext/model_v8.browser.js",
  "src/ext/craft_features.browser.js", "src/ext/v8-score.browser.js",
  "src/ext/humanizer_model_p1.browser.js", "src/ext/humanizer_model_p2.browser.js",
  "src/ext/humanizer_model_p3.browser.js",
];

// human bigrams for the bad-swap (broken collocation) penalty
const human = JSON.parse(fs.readFileSync("/tmp/human_lyrics_cache.json", "utf8"));
const hTexts = (Array.isArray(human) ? human : Object.values(human)).map((x) => typeof x === "string" ? x : (x.lyrics || x.text || ""));
const big = new Map();
for (const t of hTexts) { const w = (t.toLowerCase().match(/[a-z']+/g) || []); for (let i = 0; i + 1 < w.length; i++) { const k = w[i] + " " + w[i + 1]; big.set(k, (big.get(k) || 0) + 1); } }
const bf = (a, b) => big.get(a + " " + b) || 0;
const words = (l) => (String(l).toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g)) || [];

function makeEngine(genFile, swapFile) {
  const sb = { console, setTimeout, clearTimeout, atob: (s) => Buffer.from(s, "base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
  sb.globalThis = sb; sb.self = sb; sb.window = sb; vm.createContext(sb);
  for (const f of BASE) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
  vm.runInContext(fs.readFileSync(swapFile, "utf8"), sb, { filename: swapFile });
  vm.runInContext(fs.readFileSync(genFile, "utf8"), sb, { filename: genFile });
  const score = (t) => sb.SlopV8.scoreV8(t).score, logit = (t) => sb.SlopV8.scoreV8(t).z;
  return { sb, score, logit };
}

function loadAI() {
  const pools = ["suno", "grok", "claude", "chatgpt", "gemini"].map((m) => {
    try { const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "corpus", "models", m + ".json"), "utf8")); const a = Array.isArray(j) ? j : (j.songs || Object.values(j)); return a.map((x) => typeof x === "string" ? x : (x.lyrics_en || x.lyrics || x.text || "")).filter((t) => t && t.length > 100); }
    catch (e) { return []; }
  });
  const all = []; const maxLen = Math.max(...pools.map((p) => p.length));
  for (let i = 0; i < maxLen; i++) for (const p of pools) if (p[i]) all.push(p[i]);
  return all;
}
const all = loadAI();
const stride = Math.max(1, Math.floor(all.length / N));
const songs = [];
for (let i = OFFSET % stride; i < all.length && songs.length < N; i += stride) songs.push(all[i]);

function evalEngine(eng) {
  let totDz = 0, improved = 0, badPairs = 0, edits = 0;
  for (const orig of songs) {
    let cur = orig; const steps = [];
    for (let p = 0; p < 6; p++) { const r = eng.sb.HumanizeFreestyle.humanizeHalf(cur, eng.score, eng.logit); if (!r) break; for (const s of r.steps) steps.push(s); cur = r.text; }
    if (eng.score(cur) >= 20) { const ch = eng.sb.HumanizeFreestyle.humanizeChaos(cur, eng.score, eng.logit); if (ch) { for (const s of ch.steps) steps.push(s); cur = ch.text; } }
    const dz = eng.logit(cur) - eng.logit(orig); totDz += dz; if (dz < -0.05) improved++;
    for (const e of steps) {
      edits++;
      const fw = words(e.from), tw = words(e.to);
      const rem = fw.filter((w) => !tw.includes(w)), add = tw.filter((w) => !fw.includes(w));
      if (rem.length === 1 && add.length === 1) {
        const fi = fw.indexOf(rem[0]), L = fi > 0 ? fw[fi - 1] : null, R = fi + 1 < fw.length ? fw[fi + 1] : null;
        if ((R && bf(rem[0], R) >= 40 && bf(add[0], R) === 0) || (L && bf(L, rem[0]) >= 40 && bf(L, add[0]) === 0)) badPairs++;
      }
    }
  }
  const meanDz = totDz / songs.length, badRate = badPairs / songs.length;
  // fitness: reward humanization (-meanDz), penalize bad swaps heavily (quality > reach).
  const fitness = (-meanDz) - 1.5 * badRate;
  return { meanDz: +meanDz.toFixed(3), improved, badPairs, edits, badRate: +badRate.toFixed(3), fitness: +fitness.toFixed(3) };
}

const champ = evalEngine(makeEngine(path.join(__dirname, "champion", "humanizer-gen.browser.js"), path.join(__dirname, "champion", "cliche_swaps.browser.js")));
const chall = evalEngine(makeEngine(path.join(ROOT, "src/ext/humanizer-gen.browser.js"), path.join(ROOT, "src/ext/cliche_swaps.browser.js")));

console.log("AB GATE on " + songs.length + " random AI songs (offset " + OFFSET + ")");
console.log("metric          CHAMPION   CHALLENGER");
console.log("mean Δz        " + String(champ.meanDz).padStart(8) + "   " + String(chall.meanDz).padStart(8) + "   (more negative = more humanized)");
console.log("improved        " + String(champ.improved).padStart(8) + "   " + String(chall.improved).padStart(8));
console.log("bad swaps       " + String(champ.badPairs).padStart(8) + "   " + String(chall.badPairs).padStart(8) + "   (lower = better)");
console.log("total edits     " + String(champ.edits).padStart(8) + "   " + String(chall.edits).padStart(8));
console.log("FITNESS         " + String(champ.fitness).padStart(8) + "   " + String(chall.fitness).padStart(8));
const win = chall.fitness > champ.fitness + 0.002;
console.log("\nVERDICT: " + (win ? "CHALLENGER WINS -> ACCEPT the change (promote champion)" : "champion wins/tie -> REVERT the change"));
process.exit(win ? 0 : 1);
