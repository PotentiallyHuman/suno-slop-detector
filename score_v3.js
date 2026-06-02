#!/usr/bin/env node
/* score_v3.js — canonical v3 inference. Matches pipeline_tier3.js feature pipeline
 * exactly (f_ + s_ + lex_ + t3_ + emb_ dense, BoW with section blacklist).
 *   node score_v3.js <file.txt> [--noembed]
 * Prints { pBow, pDense, pCombined }. emb_ features = 0 when --noembed or ollama down.
 */
'use strict';
const fs = require('fs'), path = require('path'), ROOT = __dirname;
const slop = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat = require(path.join(ROOT, 'analysis/patterns.js'));
const t3 = require(path.join(ROOT, 'analysis/tier3_detectors.js'));
const emb = require(path.join(ROOT, 'analysis/embeddings.js'));
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/combined_model.json')));

const SECTION_BLACKLIST = new Set(['verse','verses','chorus','choruses','bridge','bridges','intro','outro','hook','hooks','refrain','refrains','breakdown','coda','interlude','prechorus','postchorus','reprise','vamp','tag','vers','omkvad','omkvaed','verso','estribillo','puente','couplet','pont','ritornello']);
const bowToks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => !SECTION_BLACKLIST.has(w) && (w.length > 1 || w === 'i'));

function denseDict(text, embObj) {
  const d = {};
  try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {}
  const a = pat.analyze(text), nL = Math.max(1, a.__nLines), RATE = new Set(['contentDensity']);
  let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = RATE.has(n) ? v : v / nL; }
    else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v;
  }
  d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL;
  const tf = t3.analyze(text); for (const k in tf) d[k] = tf[k];
  if (embObj) for (const k in embObj) d[k] = embObj[k];
  return d;
}

async function score(text, noembed) {
  let embObj = null;
  if (!noembed) { try { embObj = await emb.analyze(text); } catch (e) { embObj = null; } }
  const IDX = new Map(M.vocab.map((w, i) => [w, i]));
  const tk = bowToks(text), bow = {};
  for (const w of tk) { const i = IDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; }
  const n = Math.max(1, tk.length); for (const i in bow) bow[i] /= n;
  const d = denseDict(text, embObj);
  const dn = new Float64Array(M.denseNames.length);
  M.denseNames.forEach((k, j) => { dn[j] = ((+d[k] || 0) - M.denseMean[j]) / (M.denseStd[j] || 1); });
  const sig = z => 1 / (1 + Math.exp(-z));
  let zb = M.bias, zd = M.bias, zc = M.bias;
  for (const i in bow) { zb += M.wBow[i] * bow[i]; zc += M.wBow[i] * bow[i]; }
  for (let j = 0; j < dn.length; j++) { zd += M.wDense[j] * dn[j]; zc += M.wDense[j] * dn[j]; }
  return { pBow: sig(zb), pDense: sig(zd), pCombined: sig(zc), usedEmbed: !!embObj };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const noembed = args.includes('--noembed');
  const file = args.find(a => !a.startsWith('--'));
  const text = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
  score(text, noembed).then(r => console.log(JSON.stringify(r, null, 2)));
}
module.exports = { score };
