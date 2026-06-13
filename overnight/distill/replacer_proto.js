/* replacer_proto.js — the SENTENCE-REPLACER prototype toward the 5-song demo.
 * (1) DETERMINISTIC judge-clean the library with the REAL shipped gates (isFullClause + grammatical +
 *     completeLine + low-AI) — free, no LLM. (2) Index clean lines by rhyme-key + syllable + theme.
 * (3) For real AI-song lines, retrieve the best clean whole-line replacement (same rhyme-key so the
 *     song's scheme holds, syllable ±1, best theme fit); refuse if none. (4) Measure coverage + soup.
 * Usage: [XAI_API_KEY=..] node overnight/distill/replacer_proto.js [N_SONGS=6]
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { execSync } = require("child_process");
const R = path.join(__dirname, "..", "..");
const ROOT = path.join(R, "dist/firefox");
const N = parseInt(process.argv[2] || "6", 10);
const F = ["src/slop-core.js","src/common_words.js","src/features.js","src/ext/patterns.browser.js","src/ext/tier3.browser.js","src/ext/perspectives.browser.js","src/ext/model.js","src/ext/model_v5.browser.js","src/ext/portability_tells.browser.js","src/ext/clean-lyrics.js","src/ext/v2-engine.js","src/ext/model_v8.browser.js","src/ext/craft_features.browser.js","src/ext/v8-score.browser.js","src/ext/humanizer_model_p1.browser.js","src/ext/humanizer_model_p2.browser.js","src/ext/humanizer_model_p3.browser.js","src/ext/cliche_swaps.browser.js","src/ext/humanizer-gen.browser.js"];
const sb = { console, setTimeout, clearTimeout, atob: s => Buffer.from(s, "base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb; vm.createContext(sb);
for (const f of F) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
const HF = sb.HumanizeFreestyle, G = HF._gates, V8 = sb.SlopV8;
const sc = t => V8.scoreV8(t).score;
const words = G.words, lc = s => String(s).toLowerCase();
function cos(a, b) { if (!a || !b) return -1; let s = 0, na = 0, nb = 0; for (let k = 0; k < a.length; k++) { s += a[k] * b[k]; na += a[k] * a[k]; nb += b[k] * b[k]; } return (na && nb) ? s / Math.sqrt(na * nb) : -1; }

// (1)+(2) build CLEAN, indexed library
const rows = fs.readFileSync(path.join(__dirname, "dataset.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const LIB = []; const seen = new Set(); let raw = 0;
for (const r of rows) for (const line of (r.good || [])) {
  raw++; const key = words(line).join(" "); if (seen.has(key)) continue; seen.add(key);
  if (!G.isFullClause(line)) continue;
  const w = words(line); if (!G.grammatical(w) || !G.completeLine(w)) continue;
  if (sc(line) >= 25) continue;                                   // reads strongly human, not AI-cliché
  const rk = G.rhymeKey(line); if (!rk) continue;
  LIB.push({ line, rk, syl: G.nsylLine(line), tv: HF.themeVec(line) });
}
console.log("library: " + raw + " good lines -> " + LIB.length + " CLEAN+indexed (" + (100 * LIB.length / raw).toFixed(0) + "% survive the gates)");

function replace(aiLine, songTv, exclude) {
  const rk = G.rhymeKey(aiLine); if (!rk) return null;
  const syl = G.nsylLine(aiLine), low = lc(aiLine);
  let best = null, bs = 0.12;                                      // theme-fit FLOOR: refuse a poor match (no soup from a forced pick)
  for (const c of LIB) {
    if (c.rk !== rk || Math.abs(c.syl - syl) > 1 || lc(c.line) === low) continue;
    if (exclude && exclude.has(lc(c.line))) continue;             // anti-repeat: never reuse a line in the same song
    const s = cos(songTv, c.tv); if (s > bs) { bs = s; best = c; }
  }
  return best ? { line: best.line, fit: bs } : null;
}

// (3)+(4) run on real AI songs
const pools = ["suno","grok","claude","chatgpt","gemini"].map(m => { try { const j = JSON.parse(fs.readFileSync(path.join(R, "corpus/models", m + ".json"), "utf8")); const a = Array.isArray(j) ? j : (j.songs || []); return a.map(x => typeof x === "string" ? x : (x.lyrics_en || x.lyrics || x.text || "")).filter(t => t && t.length > 200 && t.length < 1200); } catch (e) { return []; } });
const all = []; const mx = Math.max(...pools.map(p => p.length)); for (let i = 0; i < mx; i++) for (const p of pools) if (p[i]) all.push(p[i]);
const step = Math.max(1, Math.floor(all.length / N)); const songs = []; for (let i = 0; i < all.length && songs.length < N; i += step) songs.push(all[i]);

function judge(line, above, below) {
  const p = `Judge ONE song lyric line for basic quality. Real song lyrics are USUALLY acceptable even when simple, odd, blunt, or emotional. REJECT ONLY if it is broken English, scrambled word order, an incoherent fragment, or gibberish that no human would sing. Otherwise ACCEPTABLE. (Context lines are only a loose guide — do NOT reject for imperfect thematic fit.) Reply on ONE line: "ACCEPTABLE" or "REJECT" then a dash and a 3-word reason.\nbefore: "${above || "(start)"}"\nLINE: "${line}"\nafter: "${below || "(end)"}"`;
  const body = JSON.stringify({ model: "grok-3", messages: [{ role: "user", content: p }], temperature: 0 });
  try { const r = execSync(`curl -s https://api.x.ai/v1/chat/completions -H "Authorization: Bearer $XAI_API_KEY" -H "Content-Type: application/json" -d @-`, { input: body, encoding: "utf8", timeout: 60000, maxBuffer: 1 << 20 }); const d = JSON.parse(r); if (!d.choices) return null; return /^accept/i.test(d.choices[0].message.content.trim()); } catch (e) { return null; }
}

let aiLines = 0, covered = 0, judged = 0, soup = 0, aborted = false; const samples = [];
for (const song of songs) {
  const tv = HF.themeVec(song), L = song.split("\n").map(s => s.trim()).filter(s => words(s).length >= 4);
  const used = new Set();
  for (let i = 0; i < L.length; i++) {
    if (sc(L[i]) < 60) continue;                                  // only target AI-reading lines
    aiLines++;
    const rep = replace(L[i], tv, used);
    if (!rep) continue;
    used.add(lc(rep.line));
    covered++;
    if (samples.length < 24) samples.push({ from: L[i], to: rep.line, above: L[i - 1] || "", below: L[i + 1] || "" });
  }
}
console.log("AI lines targeted: " + aiLines + " | replacement found (coverage): " + covered + " = " + (aiLines ? (100 * covered / aiLines).toFixed(0) : 0) + "%");
console.log("\n-- sample replacements --");
samples.slice(0, 10).forEach(s => console.log("  \"" + s.from + "\"\n    -> \"" + s.to + "\""));
if (process.env.XAI_API_KEY) {
  for (const s of samples) { const ok = judge(s.to, s.above, s.below); if (ok === null) { aborted = true; break; } judged++; if (!ok) soup++; }
  console.log("\nSOUP (blind judge on " + judged + " replacements" + (aborted ? ", partial" : "") + "): " + soup + "/" + judged + (judged ? " = " + (100 * soup / judged).toFixed(0) + "%" : ""));
}
