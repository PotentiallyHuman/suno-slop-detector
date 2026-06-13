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

// human corpus: word frequency (is the substitute a real word?) + bigrams (collocation breaks)
const human = JSON.parse(fs.readFileSync("/tmp/human_lyrics_cache.json", "utf8"));
const hTexts = (Array.isArray(human) ? human : Object.values(human)).map((x) => typeof x === "string" ? x : (x.lyrics || x.text || ""));
const big = new Map(), hWord = new Map();
for (const t of hTexts) { const w = (t.toLowerCase().match(/[a-z']+/g) || []); for (let i = 0; i < w.length; i++) { hWord.set(w[i], (hWord.get(w[i]) || 0) + 1); if (i + 1 < w.length) { const k = w[i] + " " + w[i + 1]; big.set(k, (big.get(k) || 0) + 1); } } }
const bf = (a, b) => big.get(a + " " + b) || 0;
const hf = (w) => hWord.get(w) || 0;
const words = (l) => (String(l).toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g)) || [];
const nsyl = (w) => { w = w.toLowerCase().replace(/[^a-z]/g, ""); if (!w) return 1; const m = w.match(/[aeiouy]+/g); let n = m ? m.length : 1; if (/e$/.test(w) && n > 1) n--; return Math.max(1, n); };
function grammarErr(line) {
  if (/\ba\s+[aeiou]/i.test(line)) return true;          // "a apple"
  if (/\ban\s+[^aeiou\s]/i.test(line)) return true;       // "an cat"
  const w = words(line); for (let i = 0; i + 1 < w.length; i++) if (w[i] === w[i + 1]) return true;  // doubled word
  return false;
}

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

// EDIT QUALITY (the real objective, per the user): does each replacement read BETTER than the
// original — less cliché, in-rhythm, grammatical, coherent — not merely "lower AI %"? We score the
// deterministic proxies of that: cliché removed, syllable (rhythm) kept, no broken human phrase,
// substitute is a real human word, no grammar error. AI% (Δz) is only a faint tiebreaker.
function editQuality(e, CLICHE) {
  if (grammarErr(e.to)) return -2;
  // route by the TRANSFORM TYPE (the decision-tree branch that fired), not word count:
  // restructure/vary are designed frame transforms (Every->That, hook variation) — good if clean;
  // rebuild is generated (risky); swap is a word substitution — judged on cliché/rhythm/phrase below.
  if (e.mode === "restructure" || e.mode === "vary") return 0.6;
  if (e.mode === "rebuild") return 0.2;
  const fw = words(e.from), tw = words(e.to);
  const rem = fw.filter((w) => !tw.includes(w)), add = tw.filter((w) => !fw.includes(w));
  if (rem.length !== 1 || add.length !== 1) return 0.3;     // multi-word swap (rare) — neutral-good
  const r = rem[0], a = add[0];
  let q = 0;
  if (CLICHE.has(r) && !CLICHE.has(a)) q += 1.0;            // the core goal: a cliché became a non-cliché
  else if (!CLICHE.has(r)) q -= 0.3;                         // swapped a word that wasn't even slop
  if (CLICHE.has(a)) q -= 1.0;                               // replaced slop with slop
  const ds = Math.abs(nsyl(a) - nsyl(r));
  if (ds === 0) q += 0.3; else if (ds >= 2) q -= 1.5;        // rhythm: same syllables good, off-by-2+ wrecks the beat
  // broken natural phrase ("the night"->"the dusk", "diamond ring"->"jewel ring")
  const fi = fw.indexOf(r), L = fi > 0 ? fw[fi - 1] : null, R = fi + 1 < fw.length ? fw[fi + 1] : null;
  if ((R && bf(r, R) >= 40 && bf(a, R) === 0) || (L && bf(L, r) >= 40 && bf(L, a) === 0)) q -= 1.5;
  // singability: penalize substitutes that almost never appear in real sung lyrics (graded, so a
  // merely-uncommon-but-natural word like "thinning" isn't treated like an obscure "porchlights").
  if (hf(a) === 0) q -= 0.7; else if (hf(a) < 3) q -= 0.25;
  return q;
}

function evalEngine(eng) {
  const CLICHE = new Set((eng.sb.SLOP_MODEL_V8 && eng.sb.SLOP_MODEL_V8.cliche) || []);
  let totDz = 0, improved = 0, edits = 0, totQ = 0, goodEdits = 0, badEdits = 0;
  for (const orig of songs) {
    let cur = orig; const steps = [];
    for (let p = 0; p < 6; p++) { const r = eng.sb.HumanizeFreestyle.humanizeHalf(cur, eng.score, eng.logit); if (!r) break; for (const s of r.steps) steps.push(s); cur = r.text; }
    if (eng.score(cur) >= 20) { const ch = eng.sb.HumanizeFreestyle.humanizeChaos(cur, eng.score, eng.logit); if (ch) { for (const s of ch.steps) steps.push(s); cur = ch.text; } }
    totDz += eng.logit(cur) - eng.logit(orig); if (eng.logit(cur) < eng.logit(orig) - 0.05) improved++;
    for (const e of steps) { edits++; const q = editQuality(e, CLICHE); totQ += q; if (q > 0.3) goodEdits++; if (q < 0) badEdits++; }
  }
  const meanDz = totDz / songs.length;
  // FITNESS = total edit quality per song (the real objective), with AI% only as a faint tiebreaker.
  const fitness = (totQ / songs.length) + 0.05 * (-meanDz);
  return { meanDz: +meanDz.toFixed(3), improved, edits, goodEdits, badEdits, qPerSong: +(totQ / songs.length).toFixed(3), fitness: +fitness.toFixed(3) };
}

const champ = evalEngine(makeEngine(path.join(__dirname, "champion", "humanizer-gen.browser.js"), path.join(__dirname, "champion", "cliche_swaps.browser.js")));
const chall = evalEngine(makeEngine(path.join(ROOT, "src/ext/humanizer-gen.browser.js"), path.join(ROOT, "src/ext/cliche_swaps.browser.js")));

console.log("AB GATE on " + songs.length + " random AI songs (offset " + OFFSET + ")  — judging EDIT QUALITY, not AI%");
console.log("metric            CHAMPION   CHALLENGER");
console.log("good edits        " + String(champ.goodEdits).padStart(8) + "   " + String(chall.goodEdits).padStart(8) + "   (clean cliché removals)");
console.log("bad edits         " + String(champ.badEdits).padStart(8) + "   " + String(chall.badEdits).padStart(8) + "   (slop/rhythm/grammar/collocation — lower better)");
console.log("total edits       " + String(champ.edits).padStart(8) + "   " + String(chall.edits).padStart(8));
console.log("quality / song    " + String(champ.qPerSong).padStart(8) + "   " + String(chall.qPerSong).padStart(8) + "   (THE objective)");
console.log("mean Δz (AI%)     " + String(champ.meanDz).padStart(8) + "   " + String(chall.meanDz).padStart(8) + "   (faint tiebreaker only)");
console.log("FITNESS           " + String(champ.fitness).padStart(8) + "   " + String(chall.fitness).padStart(8));
const win = chall.fitness > champ.fitness + 0.002;
console.log("\nVERDICT: " + (win ? "CHALLENGER WINS -> ACCEPT (better edits)" : "champion wins/tie -> REVERT"));
process.exit(win ? 0 : 1);
