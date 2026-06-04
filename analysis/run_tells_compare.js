/*
 * run_tells_compare.js — measure the templated-anaphora / portability tells on
 * the FULL pulled AI corpus (corpus/models/*.json, ~2000 songs) vs real human
 * songs fetched live from lyrics.ovh (text used in memory, then discarded;
 * a transient raw cache lives only in /tmp for fast dev iteration).
 */
'use strict';
const fs = require('fs'), path = require('path');
const { analyze } = require('./portability_tells.js');
const ROOT = path.join(__dirname, '..');

const MEASURES = ['negAnaphoraRate', 'frameAnaphoraRate', 'resolvedNotRate',
  'anaphoraRate', 'hedgeRate', 'justRate', 'floatingRate', 'genericPhraseRate', 'genericness'];

// ---- AI: the pulled corpus (raw text present) ------------------------------
function loadModel(name) {
  const d = require(path.join(ROOT, 'corpus/models', name + '.json'));
  const a = Array.isArray(d) ? d : (d.songs || Object.values(d));
  return a.map(s => (s.lyrics_en || s.lyrics || '')).filter(t => (t.match(/[a-z]/gi) || []).length > 80);
}

// ---- HUMAN: fetch live, cache raw text only in /tmp (transient) -------------
const HCACHE = '/tmp/human_raw_cache.json';
function cleanLyrics(s) { return String(s || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(); }
async function fetchLyrics(artist, title) {
  try {
    const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(9000) });
    if (r.ok) { const L = cleanLyrics((await r.json()).lyrics); if (L && L.length > 120) return L; }
  } catch (e) {}
  return null;
}
async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}
async function loadHuman(cap) {
  if (fs.existsSync(HCACHE)) { const c = JSON.parse(fs.readFileSync(HCACHE)); if (c.length >= cap * 0.6) { process.stderr.write(`HUMAN: ${c.length} from /tmp cache\n`); return c; } }
  let q = [];
  for (const f of ['../corpus/human_queue_extra.js', '../corpus/human_queue_extra2.js', '../corpus/human_queue_underground.js']) { try { q = q.concat(require(f)); } catch (e) {} }
  q = q.filter(x => x[4] === 'en').slice(0, cap);
  let ok = 0;
  const res = await pool(q, 6, async (song) => { const L = await fetchLyrics(song[0], song[1]); if (L) { ok++; if (ok % 25 === 0) process.stderr.write(`  fetched ${ok}\n`); } return L; });
  const texts = res.filter(Boolean);
  fs.writeFileSync(HCACHE, JSON.stringify(texts)); // transient dev cache only
  process.stderr.write(`HUMAN: ${texts.length} fetched (cached to /tmp)\n`);
  return texts;
}

// ---- stats -----------------------------------------------------------------
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
function cohensD(ai, hu) { const na = ai.length, nh = hu.length; const sp = Math.sqrt(((na - 1) * sd(ai) ** 2 + (nh - 1) * sd(hu) ** 2) / (na + nh - 2)); return sp === 0 ? 0 : (mean(ai) - mean(hu)) / sp; }
const pctHit = a => a.filter(x => x > 0).length / a.length;

(async () => {
  const models = ['suno', 'claude', 'grok', 'chatgpt'];
  const byModel = {}; let aiAll = [];
  for (const m of models) { byModel[m] = loadModel(m).map(analyze); aiAll = aiAll.concat(byModel[m]); }
  process.stderr.write(`AI: ${aiAll.length} songs (` + models.map(m => `${m} ${byModel[m].length}`).join(', ') + `)\nFetching HUMAN ...\n`);
  const hu = (await loadHuman(parseInt(process.argv[2] || '300', 10))).map(analyze);

  console.log(`\n=== Templated-anaphora tells: AI (n=${aiAll.length}) vs HUMAN (n=${hu.length}) ===`);
  console.log('measure'.padEnd(18), 'AI_mean'.padStart(8), 'HU_mean'.padStart(8), 'Cohen_d'.padStart(8), 'AI_%hit'.padStart(8), 'HU_%hit'.padStart(8), '  dir');
  for (const k of MEASURES) {
    const A = aiAll.map(r => r[k]), H = hu.map(r => r[k]); const d = cohensD(A, H);
    const lab = Math.abs(d) >= 0.8 ? 'STRONG' : Math.abs(d) >= 0.5 ? 'good' : Math.abs(d) >= 0.3 ? 'useful' : 'weak';
    console.log(k.padEnd(18), mean(A).toFixed(3).padStart(8), mean(H).toFixed(3).padStart(8), d.toFixed(2).padStart(8),
      pctHit(A).toFixed(2).padStart(8), pctHit(H).toFixed(2).padStart(8), '  ' + (d > 0 ? 'AI↑ ' : 'HU↑ ') + lab);
  }
  console.log('\n--- negAnaphoraRate by source (the "not A, not B, not C" tell) ---');
  for (const m of models) console.log('  ' + m.padEnd(9), 'mean', mean(byModel[m].map(r => r.negAnaphoraRate)).toFixed(3), '| %hit', pctHit(byModel[m].map(r => r.negAnaphoraRate)).toFixed(2), '| tripleNeg songs', byModel[m].filter(r => r.tripleNegCount > 0).length);
  console.log('  ' + 'HUMAN'.padEnd(9), 'mean', mean(hu.map(r => r.negAnaphoraRate)).toFixed(3), '| %hit', pctHit(hu.map(r => r.negAnaphoraRate)).toFixed(2), '| tripleNeg songs', hu.filter(r => r.tripleNegCount > 0).length);
})();
