/* analyze.js — the overnight miner. Runs K AI songs (across all models for variety) through the
 * shipped engine and reports, per LENS, what the data says to change. Pure analysis, NO edits — the
 * agent reads the report and applies VALIDATED changes gated by benchmark_gate.js.
 *
 * Lenses (rotate one focus per cycle, but all are computed each run):
 *   POOLS     — most-swapped sources, pool sizes, substitute reuse concentration ("same slop")
 *   BADPAIRS  — (source->sub) pairs that read worse (broken human collocation / grammar)
 *   RESIDUAL  — line shapes still AI after full humanize -> candidate NEW transforms/molds
 *   NOOP      — songs that don't improve at all -> what structure blocks them
 *   VOWEL     — end-rhyme density, perfect-vs-slant, end-vowel monotony (AI over-rhymes)
 *   SYLLABLE  — line-length uniformity (metric stamping: AI lines are too even)
 *   WIT       — specificity (proper nouns / numbers / rare content words) AI lacks
 *
 * Usage: node overnight/analyze.js [K=300]
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const K = parseInt(process.argv[2] || "300", 10);
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
const words = (l) => (String(l).toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g)) || [];

// ---- corpus: all AI models, interleaved for variety; deterministic spread sample ----
function load(model) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "corpus", "models", model + ".json"), "utf8"));
    const a = Array.isArray(j) ? j : (j.songs || Object.values(j));
    return a.map((x) => typeof x === "string" ? x : (x.lyrics_en || x.lyrics || x.text || "")).filter((t) => t && t.length > 100);
  } catch (e) { return []; }
}
const pools = { suno: load("suno"), grok: load("grok"), claude: load("claude"), chatgpt: load("chatgpt"), gemini: load("gemini") };
const all = [];
const keys = Object.keys(pools);
let maxLen = Math.max(...keys.map((k) => pools[k].length));
for (let i = 0; i < maxLen; i++) for (const k of keys) if (pools[k][i]) all.push(pools[k][i]);
const stride = Math.max(1, Math.floor(all.length / K));
const songs = [];
for (let i = 0; i < all.length && songs.length < K; i += stride) songs.push(all[i]);

// human bigrams for collocation-break detection (BADPAIRS lens)
const HUMAN_CACHE = fs.existsSync("/tmp/human_lyrics_cache.json") ? "/tmp/human_lyrics_cache.json" : path.join(__dirname, "..", "corpus", "human_lyrics_cache2.json");
const human = JSON.parse(fs.readFileSync(HUMAN_CACHE, "utf8"));
const hTexts = (Array.isArray(human) ? human : Object.values(human)).map((x) => typeof x === "string" ? x : (x.lyrics || x.text || ""));
const big = new Map(), hWord = new Map();
for (const t of hTexts) { const w = (t.toLowerCase().match(/[a-z']+/g) || []); for (let i = 0; i < w.length; i++) { hWord.set(w[i], (hWord.get(w[i]) || 0) + 1); if (i + 1 < w.length) { const k = w[i] + " " + w[i + 1]; big.set(k, (big.get(k) || 0) + 1); } } }
const bf = (a, b) => big.get(a + " " + b) || 0;

function humanizeFull(text) {
  let cur = text; const edits = [];
  for (let p = 0; p < 6; p++) { const r = sb.HumanizeFreestyle.humanizeHalf(cur, score, logit); if (!r) break; for (const s of r.steps) edits.push(s); cur = r.text; }
  if (score(cur) >= 20) { const ch = sb.HumanizeFreestyle.humanizeChaos(cur, score, logit); if (ch) { for (const s of ch.steps) edits.push(s); cur = ch.text; } }
  return { out: cur, edits };
}

const subUse = new Map(), srcUse = new Map(), pairUse = new Map(), badPairs = new Map();
const residual = new Map();   // residual AI line-shape -> count
let nNoop = 0, nImproved = 0, totDz = 0;
const noopSamples = [];
const vowel = { perfectPairs: 0, slantPairs: 0, totalPairs: 0, endVowel: new Map() };
const syll = { adjEqual: 0, adjTotal: 0 };
const wit = { withSpec: 0, total: 0 };

function shape(line) {
  // coarse AI-line shape: opener word class + length bucket + does it end on an abstract noun
  const w = words(line); if (w.length < 3) return null;
  const open = w[0];
  return open + " …(" + (w.length <= 5 ? "short" : w.length <= 9 ? "mid" : "long") + ")";
}
const ABSTRACT = /\b(soul|heart|love|pain|dream|light|night|fire|time|sky|hope|fear|grace|fate|peace|truth|life|tears|memory|silence|shadow|forever|eternity)\b/;

for (const orig of songs) {
  const { out, edits } = humanizeFull(orig);
  const z0 = logit(orig), z1 = logit(out); totDz += (z1 - z0);
  if (z1 < z0 - 0.05) nImproved++;
  if (Math.abs(z1 - z0) < 0.05 && score(orig) >= 55) { nNoop++; if (noopSamples.length < 40) noopSamples.push(orig); }

  for (const e of edits) {
    const fw = words(e.from), tw = words(e.to);
    const rem = fw.filter((w) => !tw.includes(w)), add = tw.filter((w) => !fw.includes(w));
    if (rem.length === 1 && add.length === 1) {
      srcUse.set(rem[0], (srcUse.get(rem[0]) || 0) + 1);
      subUse.set(add[0], (subUse.get(add[0]) || 0) + 1);
      const pk = rem[0] + "->" + add[0]; pairUse.set(pk, (pairUse.get(pk) || 0) + 1);
      // collocation break: removed word made a strong human bigram the sub doesn't keep
      const fi = fw.indexOf(rem[0]);
      const L = fi > 0 ? fw[fi - 1] : null, R = fi + 1 < fw.length ? fw[fi + 1] : null;
      if ((R && bf(rem[0], R) >= 40 && bf(add[0], R) === 0) || (L && bf(L, rem[0]) >= 40 && bf(L, add[0]) === 0))
        badPairs.set(pk, (badPairs.get(pk) || 0) + 1);
    }
  }
  // RESIDUAL: lines still in the humanized output that the line-scorer reads AI
  for (const ln of out.split("\n")) { if (words(ln).length >= 3 && score(ln) >= 80) { const sh = shape(ln); if (sh) residual.set(sh, (residual.get(sh) || 0) + 1); } }
  // VOWEL + SYLLABLE + WIT on the ORIGINAL (what AI looks like)
  const lines = orig.split("\n").filter((l) => words(l).length >= 3);
  for (let i = 0; i + 1 < lines.length; i++) {
    const a = words(lines[i]).slice(-1)[0], b = words(lines[i + 1]).slice(-1)[0];
    const va = (a.match(/[aeiouy]+(?=[^aeiouy]*$)/) || [])[0], vb = (b.match(/[aeiouy]+(?=[^aeiouy]*$)/) || [])[0];
    if (va) vowel.endVowel.set(va, (vowel.endVowel.get(va) || 0) + 1);
    vowel.totalPairs++;
    if (a !== b && a.slice(-2) === b.slice(-2)) vowel.perfectPairs++;
    syll.adjTotal++; if (words(lines[i]).length === words(lines[i + 1]).length) syll.adjEqual++;
  }
  wit.total++; if (/\d/.test(orig) || /\b[A-Z][a-z]{2,}\b/.test(orig.replace(/^[A-Z]/gm, "x"))) wit.withSpec++;
}

const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const report = {
  cycle_meta: { songs: songs.length, K, models: keys.map((k) => k + ":" + pools[k].length) },
  summary: { improved: nImproved + "/" + songs.length, noop_ai_songs: nNoop, mean_dz: (totDz / songs.length).toFixed(2) },
  POOLS: { distinct_subs: subUse.size, top_reused_subs: top(subUse, 25), top_sources: top(srcUse, 20) },
  BADPAIRS: top(badPairs, 30),
  RESIDUAL: top(residual, 30),
  NOOP_samples: noopSamples.slice(0, 12).map((s) => s.split("\n").slice(0, 4).join(" / ")),
  VOWEL: { perfect_rhyme_rate: (vowel.perfectPairs / Math.max(1, vowel.totalPairs)).toFixed(3), top_end_vowels: top(vowel.endVowel, 8) },
  SYLLABLE: { adjacent_equal_length_rate: (syll.adjEqual / Math.max(1, syll.adjTotal)).toFixed(3) },
  WIT: { songs_with_any_specificity: (wit.withSpec / Math.max(1, wit.total)).toFixed(3) },
};
fs.writeFileSync(path.join(__dirname, "report_latest.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
