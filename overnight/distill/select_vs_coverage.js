// PROVE the architecture: is the 13% raw-failure a SELECTION problem (library HAS an acceptable line,
// we just picked the wrong one) or a COVERAGE gap (no good line exists)? For each held-out context,
// take the top-3 gate-passing candidates and let the calibrated blind judge accept the FIRST good one.
// top-1 acceptance = current student; any-of-3 = what a judge-cleaned library would deliver.
"use strict";
const { execSync } = require("child_process");
const S = require("./student2.js");
const N = parseInt(process.argv[2] || "25", 10);
function judge(above, line, below) {
  const p = `Judge ONE song lyric line for basic quality. Real song lyrics are USUALLY acceptable even when simple, odd, blunt, or emotional. REJECT ONLY if it is broken English, scrambled word order, an incoherent fragment, or gibberish that no human would sing. Otherwise ACCEPTABLE. (Context lines are only a loose guide — do NOT reject for imperfect thematic fit.) Reply on ONE line: "ACCEPTABLE" or "REJECT" then a dash and a 3-word reason.
before: "${above}"
LINE: "${line}"
after: "${below}"`;
  const body = JSON.stringify({ model: "grok-3", messages: [{ role: "user", content: p }], temperature: 0 });
  try { const r = execSync(`curl -s https://api.x.ai/v1/chat/completions -H "Authorization: Bearer $XAI_API_KEY" -H "Content-Type: application/json" -d @-`, { input: body, encoding: "utf8", timeout: 60000, maxBuffer: 1 << 20 }); const d = JSON.parse(r); if (!d.choices) return null; return /^accept/i.test(d.choices[0].message.content.trim()); } catch (e) { return null; }
}
const test = S.test, step = Math.max(1, Math.floor(test.length / N));
const sample = []; for (let i = 0; i < test.length && sample.length < N; i += step) sample.push(test[i]);
let top1 = 0, anyK = 0, hadCands = 0, judged = 0, aborted = false;
for (const r of sample) {
  const song = [r.above, r.mid, r.below].join("\n");
  const cands = S.studentRanked(r.above, r.below, r.rhyme, song, 3);
  if (!cands.length) continue;
  hadCands++; judged++;
  let firstOK = null, anyOK = false;
  for (let i = 0; i < cands.length; i++) {
    const ok = judge(r.above, cands[i].line, r.below);
    if (ok === null) { aborted = true; break; }
    if (i === 0) firstOK = ok;
    if (ok) { anyOK = true; break; }
  }
  if (aborted) { judged--; break; }
  if (firstOK) top1++;
  if (anyOK) anyK++;
}
console.log("\n==== SELECTION vs COVERAGE (blind calibrated judge) ====");
console.log("contexts with >=1 gate-passing candidate: " + hadCands + "/" + sample.length);
console.log("judged: " + judged + (aborted ? "  (judge funds ran out — partial)" : ""));
console.log("top-1 acceptable (current student):      " + top1 + "/" + judged + (judged?"  = "+(100*top1/judged).toFixed(0)+"%":""));
console.log("ANY of top-3 acceptable (clean library): " + anyK + "/" + judged + (judged?"  = "+(100*anyK/judged).toFixed(0)+"%":""));
console.log("\nGap top1->anyK = how much a judge-cleaned library + best-pick would gain.");
