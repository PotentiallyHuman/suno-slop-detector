/* soup_test.js — the v1.0.0 NO-SOUP gate. Loads the SHIPPED dist/firefox engine, runs the REAL
 * Line (humanizeOne) and Half (humanizeHalf) entry points on random AI songs, and judges every
 * EMITTED edit with the calibrated blind judge (coherent + human-soundable). Any soup = fail.
 * Usage: XAI_API_KEY=... node build/soup_test.js [N_SONGS=6]
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { execSync } = require("child_process");
const R = path.join(__dirname, "..");
const ROOT = path.join(R, "dist/firefox");
const N = parseInt(process.argv[2] || "6", 10);
const Fs = ["src/slop-core.js","src/common_words.js","src/features.js","src/ext/patterns.browser.js","src/ext/tier3.browser.js","src/ext/perspectives.browser.js","src/ext/model.js","src/ext/model_v5.browser.js","src/ext/portability_tells.browser.js","src/ext/clean-lyrics.js","src/ext/v2-engine.js","src/ext/model_v8.browser.js","src/ext/craft_features.browser.js","src/ext/v8-score.browser.js","src/ext/humanizer_model_p1.browser.js","src/ext/humanizer_model_p2.browser.js","src/ext/humanizer_model_p3.browser.js","src/ext/cliche_swaps.browser.js","src/ext/humanizer-gen.browser.js"];
const sb = { console, setTimeout, clearTimeout, atob: s => Buffer.from(s, "base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb; vm.createContext(sb);
for (const f of Fs) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
const HF = sb.HumanizeFreestyle, V8 = sb.SlopV8;
const scoreFn = t => V8.scoreV8(t).score, logitFn = t => V8.scoreV8(t).z;

function judge(above, line, below) {
  const p = `Judge ONE song lyric line for basic quality. Real song lyrics are USUALLY acceptable even when simple, odd, blunt, or emotional. REJECT ONLY if it is broken English, scrambled word order, an incoherent fragment, or gibberish that no human would sing. Otherwise ACCEPTABLE. (Context lines are only a loose guide — do NOT reject for imperfect thematic fit.) Reply on ONE line: "ACCEPTABLE" or "REJECT" then a dash and a 3-word reason.
before: "${above || "(start)"}"
LINE: "${line}"
after: "${below || "(end)"}"`;
  const body = JSON.stringify({ model: "grok-3", messages: [{ role: "user", content: p }], temperature: 0 });
  try { const r = execSync(`curl -s https://api.x.ai/v1/chat/completions -H "Authorization: Bearer $XAI_API_KEY" -H "Content-Type: application/json" -d @-`, { input: body, encoding: "utf8", timeout: 60000, maxBuffer: 1 << 20 }); const d = JSON.parse(r); if (!d.choices) return { ok: null, why: "judge-unavailable" }; const t = d.choices[0].message.content.trim(); return { ok: /^accept/i.test(t), why: t.replace(/\s+/g, " ").slice(0, 60) }; } catch (e) { return { ok: null, why: "err" }; }
}

// load random AI songs
const pools = ["suno","grok","claude","chatgpt","gemini"].map(m => { try { const j = JSON.parse(fs.readFileSync(path.join(R, "corpus/models", m + ".json"), "utf8")); const a = Array.isArray(j) ? j : (j.songs || []); return a.map(x => typeof x === "string" ? x : (x.lyrics_en || x.lyrics || x.text || "")).filter(t => t && t.length > 200 && t.length < 1200); } catch (e) { return []; } });
const all = []; const mx = Math.max(...pools.map(p => p.length)); for (let i = 0; i < mx; i++) for (const p of pools) if (p[i]) all.push(p[i]);
const step = Math.max(1, Math.floor(all.length / N)); const songs = []; for (let i = 0; i < all.length && songs.length < N; i += step) songs.push(all[i]);

const lines = t => String(t).split("\n");
function changedLines(orig, res) { const a = lines(orig), b = lines(res); const out = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || "") !== (b[i] || "") && (b[i] || "").trim()) out.push({ i, from: a[i] || "", to: b[i], above: b[i - 1] || "", below: b[i + 1] || "" }); return out; }

let edits = 0, soup = 0, aborted = false; const fails = [];
for (let s = 0; s < songs.length; s++) {
  const song = songs[s], s0 = Math.round(scoreFn(song));
  for (const mode of ["Line", "Half"]) {
    let res; try { res = mode === "Line" ? HF.humanizeOne(song, scoreFn, logitFn) : HF.humanizeHalf(song, scoreFn, logitFn); } catch (e) { res = null; }
    if (!res || !res.text || res.text === song) continue;
    const ch = changedLines(song, res.text);
    for (const c of ch) {
      edits++;
      const v = judge(c.above, c.to, c.below);
      if (v.ok === null) { aborted = true; break; }
      if (!v.ok) { soup++; fails.push(`[song${s+1} ${mode}] "${c.from}" -> "${c.to}"  <- ${v.why}`); }
    }
    if (aborted) break;
  }
  if (aborted) break;
}
console.log("\n==== NO-SOUP GATE (real Line+Half on " + songs.length + " random AI songs) ====");
console.log("emitted edits judged: " + edits + (aborted ? " (judge ran out mid-run — partial)" : ""));
console.log("SOUP (rejected): " + soup + "/" + edits + (edits ? "  = " + (100 * soup / edits).toFixed(0) + "%" : ""));
console.log(soup === 0 && edits > 0 ? ">>> CLEAN: zero soup in this sample" : ">>> NOT clean yet");
if (fails.length) { console.log("\n-- SOUP cases to fix --"); fails.slice(0, 20).forEach(f => console.log("  " + f)); }
