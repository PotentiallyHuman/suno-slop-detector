/* clean_library.js — BUILD-TIME judge-clean of the library (free local Qwen, batched + resumable).
 * The deterministic gates leave ~8% awkward survivors that the retrieval picks as soup. This pass
 * asks Qwen to flag the incoherent ones, line by line, in batches of 8. Output: judged_lines.jsonl
 * ({line, ok}). The clean library = the ok:true lines. Resumable: skips lines already judged.
 * Usage: node overnight/distill/clean_library.js
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { execSync } = require("child_process");
const R = path.join(__dirname, "..", "..");
const ROOT = path.join(R, "dist/firefox");
const F = ["src/slop-core.js","src/common_words.js","src/features.js","src/ext/patterns.browser.js","src/ext/tier3.browser.js","src/ext/perspectives.browser.js","src/ext/model.js","src/ext/model_v5.browser.js","src/ext/portability_tells.browser.js","src/ext/clean-lyrics.js","src/ext/v2-engine.js","src/ext/model_v8.browser.js","src/ext/craft_features.browser.js","src/ext/v8-score.browser.js","src/ext/humanizer_model_p1.browser.js","src/ext/humanizer_model_p2.browser.js","src/ext/humanizer_model_p3.browser.js","src/ext/cliche_swaps.browser.js","src/ext/humanizer-gen.browser.js"];
const sb = { console, setTimeout, clearTimeout, atob: s => Buffer.from(s, "base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb; vm.createContext(sb);
for (const f of F) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
const HF = sb.HumanizeFreestyle, G = HF._gates, V8 = sb.SlopV8;
const sc = t => V8.scoreV8(t).score, words = G.words;

// deterministic-clean candidate set (same gates as the replacer)
const rows = fs.readFileSync(path.join(__dirname, "dataset.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const cand = []; const seen = new Set();
for (const r of rows) for (const line of (r.good || [])) {
  const key = words(line).join(" "); if (seen.has(key)) continue; seen.add(key);
  if (!G.isFullClause(line)) continue;
  const w = words(line); if (!G.grammatical(w) || !G.completeLine(w)) continue;
  if (sc(line) >= 25 || !G.rhymeKey(line)) continue;
  cand.push(line);
}
const OUT = path.join(__dirname, "judged_lines.jsonl");
const done = new Set();
try { fs.readFileSync(OUT, "utf8").trim().split("\n").filter(Boolean).forEach(l => { try { done.add(JSON.parse(l).line); } catch (e) {} }); } catch (e) {}
const todo = cand.filter(l => !done.has(l));
console.log("candidates " + cand.length + " | already judged " + done.size + " | to judge " + todo.length);

function judgeBatch(batch) {
  const list = batch.map((l, i) => (i + 1) + ". " + l).join("\n");
  const prompt = `Here are ${batch.length} song lyric lines. Real lyrics are usually fine even when simple, odd, or emotional. List ONLY the NUMBERS of lines that are BROKEN English, scrambled word order, incoherent fragments, or gibberish no human would sing. If every line is fine, reply exactly NONE. Reply with just numbers (e.g. "2, 5") or NONE.\n${list}`;
  let out = ""; try { out = execSync("ollama run qwen2.5:32b", { input: prompt, encoding: "utf8", timeout: 120000, maxBuffer: 1 << 20 }); } catch (e) { return null; }
  const clean = out.replace(/[^0-9, NONEnone]/g, " ");
  if (/none/i.test(out) && !/\d/.test(clean)) return new Set();
  const bad = new Set(); (clean.match(/\d+/g) || []).forEach(n => { const k = parseInt(n, 10); if (k >= 1 && k <= batch.length) bad.add(k - 1); });
  return bad;
}

let kept = 0, dropped = 0, b = 0;
for (let i = 0; i < todo.length; i += 8) {
  const batch = todo.slice(i, i + 8);
  const bad = judgeBatch(batch);
  if (bad === null) { console.log("qwen err at batch " + b + " — stopping (resumable)"); break; }
  const recs = batch.map((line, j) => { const ok = !bad.has(j); ok ? kept++ : dropped++; return JSON.stringify({ line, ok }); });
  fs.appendFileSync(OUT, recs.join("\n") + "\n");
  b++; if (b % 5 === 0) console.log("batch " + b + " | kept " + kept + " dropped " + dropped + " | " + (i + 8) + "/" + todo.length);
}
console.log("DONE this run: kept " + kept + " dropped " + dropped + " -> judged_lines.jsonl");
