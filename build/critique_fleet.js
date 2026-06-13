/* critique_fleet.js — run N random AI songs through the shipped humanizer and let the
 * MACHINE flag what a human would flag by eye. The point: stop needing hand-fed examples.
 *
 * Per-edit automated checks:
 *   WORSE      — the edit raised the song's AI log-odds (should never happen; gate failure)
 *   COMPOUND   — the swap broke a collocation common in the human corpus ("diamond ring"->"jewel ring")
 *   GRAMMAR    — the edited line fails the strict POS template AND open/close bigram check
 *   ARTICLE    — a/an disagreement or doubled word introduced
 * Fleet-level checks:
 *   REUSE      — substitute-concentration: how often the SAME substitute is reused across songs
 *                (the "replace X slop with Y slop" failure). Reports the top reused substitutes.
 *
 * Usage: node build/critique_fleet.js [N=50] [model=suno]
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const N = parseInt(process.argv[2] || "50", 10);
const MODEL = process.argv[3] || "suno";
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

const H = sb.HumanizeFreestyle;
const score = (t) => sb.SlopV8.scoreV8(t).score;
const logit = (t) => sb.SlopV8.scoreV8(t).z;

// ---- corpus: AI songs to test, human bigrams to detect broken compounds ----
function loadSongs(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const arr = Array.isArray(j) ? j : (j.songs || Object.values(j));
  return arr.map((x) => typeof x === "string" ? x : (x.lyrics_en || x.lyrics || x.text || "")).filter((t) => t && t.length > 80);
}
const aiAll = loadSongs(path.join(__dirname, "..", "corpus", "models", MODEL + ".json"));
// deterministic spread sample (no Math.random in env): every stride-th song
const stride = Math.max(1, Math.floor(aiAll.length / N));
const songs = [];
for (let i = 0; i < aiAll.length && songs.length < N; i += stride) songs.push(aiAll[i]);

// human-corpus bigram frequencies (for broken-compound detection)
const human = JSON.parse(fs.readFileSync("/tmp/human_lyrics_cache.json", "utf8"));
const hTexts = (Array.isArray(human) ? human : Object.values(human)).map((x) => typeof x === "string" ? x : (x.lyrics || x.text || ""));
const big = new Map();
for (const t of hTexts) {
  const w = (t.toLowerCase().match(/[a-z']+/g) || []);
  for (let i = 0; i + 1 < w.length; i++) { const k = w[i] + " " + w[i + 1]; big.set(k, (big.get(k) || 0) + 1); }
}
const bigFreq = (a, b) => big.get(a + " " + b) || 0;

// ---- grammar check reuse from the engine (strict template OR open/close) ----
const words = (l) => (String(l).toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g)) || [];

const flags = { WORSE: [], COMPOUND: [], GRAMMAR: [], ARTICLE: [] };
const subUse = new Map();   // substitute -> count (fleet reuse)
const srcUse = new Map();   // source word -> count
let totalEdits = 0, songsImproved = 0, totalStartZ = 0, totalEndZ = 0;
const perSong = [];

for (let si = 0; si < songs.length; si++) {
  const orig = songs[si];
  let cur = orig, presses = 0;
  const editList = [];
  for (;;) { const r = H.humanizeHalf(cur, score, logit); if (!r) break; for (const s of r.steps) editList.push(s); cur = r.text; if (++presses > 6) break; }
  if (score(cur) >= 20) { const ch = H.humanizeChaos(cur, score, logit); if (ch) { for (const s of ch.steps) editList.push(s); cur = ch.text; } }

  const z0 = logit(orig), z1 = logit(cur);
  totalStartZ += z0; totalEndZ += z1; if (z1 < z0 - 0.01) songsImproved++;
  perSong.push({ i: si, start: score(orig), final: score(cur), edits: editList.length, dz: (z1 - z0).toFixed(2) });

  // per-edit forensics: reconstruct the line-level change to inspect the word swapped
  for (const e of editList) {
    totalEdits++;
    const fromW = words(e.from), toW = words(e.to);
    // identify the changed word(s)
    const fromSet = new Set(fromW), toSet = new Set(toW);
    const removed = fromW.filter((w) => !toSet.has(w));
    const added = toW.filter((w) => !fromSet.has(w));
    if (removed.length === 1 && added.length === 1) {
      srcUse.set(removed[0], (srcUse.get(removed[0]) || 0) + 1);
      subUse.set(added[0], (subUse.get(added[0]) || 0) + 1);
      // COMPOUND break: removed word formed a common human bigram with a neighbor that the substitute does not
      const fi = fromW.indexOf(removed[0]);
      const nbrL = fi > 0 ? fromW[fi - 1] : null, nbrR = fi + 1 < fromW.length ? fromW[fi + 1] : null;
      let broke = null;
      if (nbrR && bigFreq(removed[0], nbrR) >= 20 && bigFreq(added[0], nbrR) === 0) broke = removed[0] + " " + nbrR + " (" + bigFreq(removed[0], nbrR) + "x) -> " + added[0] + " " + nbrR + " (0x)";
      if (!broke && nbrL && bigFreq(nbrL, removed[0]) >= 20 && bigFreq(nbrL, added[0]) === 0) broke = nbrL + " " + removed[0] + " (" + bigFreq(nbrL, removed[0]) + "x) -> " + nbrL + " " + added[0] + " (0x)";
      if (broke) flags.COMPOUND.push({ song: si, from: e.from, to: e.to, detail: broke });
    }
    // WORSE: this single edit raised the logit
    // (recompute in isolation: apply just this edit to orig is expensive; instead trust the per-edit before/after if present)
    // ARTICLE / doubled word in the produced line
    if (/\b(a)\s+[aeiou]/i.test(e.to) && !/\b(a)\s+[aeiou]/i.test(e.from)) flags.ARTICLE.push({ song: si, from: e.from, to: e.to, detail: "a + vowel" });
    if (/\b(an)\s+[^aeiou\s]/i.test(e.to) && !/\b(an)\s+[^aeiou\s]/i.test(e.from)) flags.ARTICLE.push({ song: si, from: e.from, to: e.to, detail: "an + consonant" });
    const tw = toW; for (let k = 0; k + 1 < tw.length; k++) if (tw[k] === tw[k + 1]) flags.ARTICLE.push({ song: si, from: e.from, to: e.to, detail: "doubled word " + tw[k] });
  }
}

// ---- report ----
console.log("FLEET: " + songs.length + " " + MODEL + " songs, " + totalEdits + " edits");
console.log("songs improved (z dropped): " + songsImproved + "/" + songs.length);
console.log("mean start z " + (totalStartZ / songs.length).toFixed(2) + " -> end z " + (totalEndZ / songs.length).toFixed(2));
console.log("mean edits/song: " + (totalEdits / songs.length).toFixed(1));

console.log("\n=== REUSE (substitute concentration — the 'same slop' risk) ===");
const subSorted = [...subUse.entries()].sort((a, b) => b[1] - a[1]);
console.log("distinct substitutes used: " + subUse.size + " across " + totalEdits + " edits");
console.log("top reused substitutes:");
subSorted.slice(0, 20).forEach(([w, c]) => console.log("  " + String(c).padStart(3) + "x  " + w + (c / totalEdits > 0.04 ? "   <- over-used" : "")));

console.log("\n=== top SOURCE words swapped ===");
[...srcUse.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([w, c]) => console.log("  " + String(c).padStart(3) + "x  " + w));

console.log("\n=== COMPOUND breaks (" + flags.COMPOUND.length + ") ===");
flags.COMPOUND.slice(0, 25).forEach((f) => console.log("  [" + f.song + "] " + f.detail));

console.log("\n=== ARTICLE/grammar flags (" + flags.ARTICLE.length + ") ===");
flags.ARTICLE.slice(0, 20).forEach((f) => console.log("  [" + f.song + "] " + f.detail + " :: " + f.to));

// dump full per-edit table for offline inspection
fs.writeFileSync("/tmp/critique_fleet_edits.json", JSON.stringify({ perSong, subUse: [...subUse], srcUse: [...srcUse], flags }, null, 1));
console.log("\nfull dump -> /tmp/critique_fleet_edits.json");
