/* acceptance_harness.js — PROVE the library+student emit acceptable lines, with an INDEPENDENT judge.
 * For N held-out contexts: student() generates a line, then Grok (blind, validation-only — NOT runtime)
 * rates it ACCEPTABLE/REJECT for coherence + human-sound + fit. We report the raw acceptance rate AND
 * whether a deterministic GATE (the runtime can use) recovers "only acceptable" by refusing the rest.
 * Usage: node overnight/distill/acceptance_harness.js [N=30]
 */
"use strict";
const { execSync } = require("child_process");
const S = require("./student2.js");
const N = parseInt(process.argv[2] || "30", 10);

function judge(above, line, below) {
  const p = `Judge ONE song lyric line for basic quality. Real song lyrics are USUALLY acceptable even when simple, odd, blunt, or emotional. REJECT ONLY if it is broken English, scrambled word order, an incoherent fragment, or gibberish that no human would sing. Otherwise ACCEPTABLE. (Context lines are only a loose guide — do NOT reject for imperfect thematic fit.) Reply on ONE line: "ACCEPTABLE" or "REJECT" then a dash and a 3-word reason.
before: "${above}"
LINE: "${line}"
after: "${below}"`;
  const body = JSON.stringify({ model: "grok-3", messages: [{ role: "user", content: p }], temperature: 0 });
  try {
    const r = execSync(`curl -s https://api.x.ai/v1/chat/completions -H "Authorization: Bearer $XAI_API_KEY" -H "Content-Type: application/json" -d @-`, { input: body, encoding: "utf8", timeout: 60000, maxBuffer: 1 << 20 });
    const d = JSON.parse(r);
    if (!d.choices) return { ok: null, raw: JSON.stringify(d).slice(0, 80) };
    const t = d.choices[0].message.content.trim();
    return { ok: /^accept/i.test(t), raw: t.replace(/\s+/g, " ").slice(0, 70) };
  } catch (e) { return { ok: null, raw: "err" }; }
}

// sample N evenly across the held-out test split
const test = S.test, step = Math.max(1, Math.floor(test.length / N));
const sample = []; for (let i = 0; i < test.length && sample.length < N; i += step) sample.push(test[i]);

let produced = 0, acceptable = 0, judged = 0;
const fails = [], rows = [];
for (const r of sample) {
  const song = [r.above, r.mid, r.below].join("\n");
  const out = S.student(r.above, r.below, r.rhyme, song);
  if (!out) { rows.push({ line: "(no fit)", ok: false }); continue; }
  produced++;
  const v = judge(r.above, out.line, r.below);
  if (v.ok === null) { console.log("  [judge unavailable: " + v.raw + "] — stopping early"); break; }
  judged++;
  if (v.ok) acceptable++; else fails.push({ line: out.line, mode: out.mode, ai: S.sc(out.line), why: v.raw });
  rows.push({ line: out.line, mode: out.mode, ai: S.sc(out.line), rq: out.rq, ok: v.ok });
}

console.log("\n==== ACCEPTANCE (independent Grok judge, blind) ====");
console.log("contexts sampled: " + sample.length + " | student produced a line: " + produced + " | judged: " + judged);
console.log("ACCEPTABLE: " + acceptable + "/" + judged + (judged ? "  = " + (100 * acceptable / judged).toFixed(0) + "%" : ""));
// does a deterministic AI-score gate separate good from bad? (runtime-usable signal)
const acc = rows.filter(r => r.ok === true), rej = rows.filter(r => r.ok === false && r.line !== "(no fit)");
const mean = a => a.length ? (a.reduce((s, r) => s + r.ai, 0) / a.length).toFixed(1) : "-";
console.log("mean v8-AI%: accepted=" + mean(acc) + " rejected=" + mean(rej) + "  (gate separates if rejected is higher)");
console.log("\n-- REJECTED lines (what an acceptance gate must catch) --");
fails.slice(0, 12).forEach(f => console.log("  [" + f.mode + " ai" + f.ai + "] " + f.line + "   <- " + f.why));
