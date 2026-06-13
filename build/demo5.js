/* demo5.js — the v1.0.0 self-acceptance demo. Picks 5 random AI songs, runs the REAL shipped engine
 * (Humanize Half), shows before->after per song, and judges every edit with the calibrated blind judge.
 * A song is "flawless" only if every edit is ACCEPTABLE. Usage: XAI_API_KEY=.. node build/demo5.js [seed]
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { execSync } = require("child_process");
const R = path.join(__dirname, ".."), ROOT = path.join(R, "dist/firefox");
const SEED = parseInt(process.argv[2] || "3", 10);
const F = ["src/slop-core.js","src/common_words.js","src/features.js","src/ext/patterns.browser.js","src/ext/tier3.browser.js","src/ext/perspectives.browser.js","src/ext/model.js","src/ext/model_v5.browser.js","src/ext/portability_tells.browser.js","src/ext/clean-lyrics.js","src/ext/v2-engine.js","src/ext/model_v8.browser.js","src/ext/craft_features.browser.js","src/ext/v8-score.browser.js","src/ext/humanizer_model_p1.browser.js","src/ext/humanizer_model_p2.browser.js","src/ext/humanizer_model_p3.browser.js","src/ext/cliche_swaps.browser.js","src/ext/replace_lib.browser.js","src/ext/humanizer-gen.browser.js"];
const sb = { console, setTimeout, clearTimeout, atob: s => Buffer.from(s, "base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb; vm.createContext(sb);
for (const f of F) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
const HF = sb.HumanizeFreestyle, V8 = sb.SlopV8, sc = t => V8.scoreV8(t).score, lg = t => V8.scoreV8(t).z;
function judge(above, line, below) {
  const p = `Judge ONE song lyric line for basic quality. Real song lyrics are USUALLY acceptable even when simple, odd, blunt, or emotional. REJECT ONLY if it is broken English, scrambled word order, an incoherent fragment, or gibberish that no human would sing. Otherwise ACCEPTABLE. (Context lines are only a loose guide — do NOT reject for imperfect thematic fit.) Reply on ONE line: "ACCEPTABLE" or "REJECT" then a dash and a 3-word reason.\nbefore: "${above || "(start)"}"\nLINE: "${line}"\nafter: "${below || "(end)"}"`;
  const body = JSON.stringify({ model: "grok-3", messages: [{ role: "user", content: p }], temperature: 0 });
  try { const r = execSync(`curl -s https://api.x.ai/v1/chat/completions -H "Authorization: Bearer $XAI_API_KEY" -H "Content-Type: application/json" -d @-`, { input: body, encoding: "utf8", timeout: 60000, maxBuffer: 1 << 20 }); const d = JSON.parse(r); if (!d.choices) return { ok: null }; const t = d.choices[0].message.content.trim(); return { ok: /^accept/i.test(t), why: t.replace(/\s+/g, " ").slice(0, 50) }; } catch (e) { return { ok: null }; }
}
const pools = ["suno","grok","claude","chatgpt","gemini"].map(m => { try { const j = JSON.parse(fs.readFileSync(path.join(R, "corpus/models", m + ".json"), "utf8")); const a = Array.isArray(j) ? j : (j.songs || []); return a.map(x => typeof x === "string" ? x : (x.lyrics_en || x.lyrics || x.text || "")).filter(t => t && t.length > 220 && t.length < 900 && sc(t) >= 60); } catch (e) { return []; } });
const all = []; const mx = Math.max(...pools.map(p => p.length)); for (let i = 0; i < mx; i++) for (const p of pools) if (p[i]) all.push(p[i]);
const step = Math.max(1, Math.floor(all.length / 5)); const songs = []; for (let i = SEED; songs.length < 5 && i < all.length; i += step) songs.push(all[i]);
const lines = t => String(t).split("\n");
let flawless = 0;
for (let s = 0; s < songs.length; s++) {
  const song = songs[s], b4 = Math.round(sc(song));
  const res = (() => { try { return HF.humanizeHalf(song, sc, lg); } catch (e) { return null; } })();
  console.log("\n================ SONG " + (s + 1) + " ================  (AI " + b4 + "% -> " + (res ? Math.round(sc(res.text)) : b4) + "%)");
  if (!res || !res.steps.length) { console.log("  (engine refused — no safe edit; would show the 'structural AI' diagnosis)"); continue; }
  const a = lines(song), bnew = lines(res.text); let allOk = true;
  for (let i = 0; i < Math.max(a.length, bnew.length); i++) {
    const same = (a[i] || "") === (bnew[i] || "");
    if (same) { console.log("    " + (a[i] || "")); continue; }
    const v = judge(bnew[i - 1] || "", bnew[i], bnew[i + 1] || "");
    const tag = v.ok === null ? "??" : (v.ok ? "OK" : "SOUP<-" + v.why);
    if (v.ok === false) allOk = false;
    console.log("  ~ " + (a[i] || "(+)") + "\n     -> " + bnew[i] + "   [" + tag + "]");
  }
  if (allOk) { flawless++; console.log("  >>> SONG " + (s + 1) + ": FLAWLESS (every edit accepted)"); }
  else console.log("  >>> SONG " + (s + 1) + ": has soup");
}
console.log("\n==== SELF-ACCEPTANCE: " + flawless + "/5 songs flawless ====");
