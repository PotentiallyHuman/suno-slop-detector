/*
 * show_human_hits.js — re-fetch human songs WITH titles, run the tells, and
 * print the actual titles + offending lines so we can eyeball ground truth:
 * do real hits truly do "not A, not B, not C" and the filler "just"?
 */
'use strict';
const path = require('path');
const { templateAnaphora, hedgeJust, lines } = require('./portability_tells.js');

function clean(s) { return String(s || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(); }
async function fetchLyrics(artist, title) {
  try {
    const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(9000) });
    if (r.ok) { const L = clean((await r.json()).lyrics); if (L && L.length > 120) return L; }
  } catch (e) {}
  return null;
}
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

// pull the consecutive negation-frame lines that fired the anaphora
const NEG = /^(i'?m |i am |it'?s |that'?s |this is |there'?s |we'?re |you'?re |we are |you are )?(not|no|never|neither|ain'?t|nothing|no more)\b/i;
function negRunLines(text) {
  const L = lines(text); const runs = []; let cur = [];
  for (const ln of L) {
    if (NEG.test(ln.trim())) cur.push(ln.trim());
    else { if (cur.length >= 2) runs.push(cur.slice()); cur = []; }
  }
  if (cur.length >= 2) runs.push(cur);
  return runs;
}
function justLines(text) { return lines(text).filter(l => /\bjust\b/i.test(l) && !/\bjust\s+(now|then|because|about|as|once)\b/i.test(l)); }

(async () => {
  let q = [];
  for (const f of ['../corpus/human_queue_extra.js', '../corpus/human_queue_extra2.js', '../corpus/human_queue_underground.js']) { try { q = q.concat(require(f)); } catch (e) {} }
  q = q.filter(x => x[4] === 'en').slice(0, parseInt(process.argv[2] || '300', 10));

  const rows = await pool(q, 6, async (s) => { const t = await fetchLyrics(s[0], s[1]); return t ? { artist: s[0], title: s[1], year: s[2], text: t } : null; });
  const got = rows.filter(Boolean);
  process.stderr.write(`fetched ${got.length}/${q.length}\n`);

  const tagged = got.map(r => ({ ...r, ta: templateAnaphora(r.text), hj: hedgeJust(r.text), runs: negRunLines(r.text) }));

  console.log(`\n================ HUMAN songs that fired NEGATION ANAPHORA (>=3 in a row = "triple") ================`);
  const triple = tagged.filter(r => r.ta.tripleNegCount > 0).sort((a, b) => b.ta.negAnaphoraRate - a.ta.negAnaphoraRate);
  for (const r of triple) {
    console.log(`\n• "${r.title}" — ${r.artist} (${r.year})   [negAnaphoraRate ${r.ta.negAnaphoraRate.toFixed(3)}]`);
    r.runs.filter(run => run.length >= 3).forEach(run => run.forEach(l => console.log('     | ' + l)));
  }
  console.log(`\n(${triple.length} songs with a 3-in-a-row negation run)`);

  console.log(`\n================ HUMAN songs with a 2-in-a-row negation run (looser) ================`);
  const dbl = tagged.filter(r => r.runs.some(run => run.length >= 2) && r.ta.tripleNegCount === 0).sort((a, b) => b.runs.length - a.runs.length).slice(0, 12);
  for (const r of dbl) {
    const ex = r.runs.find(run => run.length >= 2);
    console.log(`\n• "${r.title}" — ${r.artist}`); ex.forEach(l => console.log('     | ' + l));
  }

  console.log(`\n================ HUMAN songs highest on filler "just" ================`);
  const byJust = tagged.filter(r => r.hj.justRate > 0).sort((a, b) => b.hj.justRate - a.hj.justRate).slice(0, 10);
  for (const r of byJust) {
    console.log(`\n• "${r.title}" — ${r.artist}   [justRate ${r.hj.justRate.toFixed(3)}, ${r.hj.justCount} hits]`);
    justLines(r.text).slice(0, 4).forEach(l => console.log('     | ' + l));
  }
})();
