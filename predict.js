#!/usr/bin/env node
/* predict.js — load the trained combined model and score arbitrary lyrics.
 * Mirrors the feature pipeline in analysis/train_combined.js so weights line up.
 *
 *   node predict.js < song.txt          # P(AI) for stdin
 *   node predict.js --bow < song.txt    # BoW-only (the 83.3% predictor)
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const slop  = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat   = require(path.join(ROOT, 'analysis/patterns.js'));

const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/combined_model.json')));
const IDX = new Map(M.vocab.map((w, i) => [w, i]));
const DN  = M.denseNames.length;

const toks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || [])
                    .filter(w => w.length > 1 || w === 'i');

function dense(text) {
  const d = {};
  try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {}
  const a = pat.analyze(text); const nL = Math.max(1, a.__nLines);
  const RATE = new Set(['contentDensity']);
  let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = RATE.has(n) ? v : v / nL; }
    else if (k.startsWith('cliche::')) cl += v;
    else if (k.startsWith('rhyme::')) rh += v;
  }
  d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL;
  return d;
}

function vec(text) {
  const tk = toks(text);
  const bow = {};
  for (const w of tk) { const i = IDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; }
  const n = Math.max(1, tk.length); for (const i in bow) bow[i] /= n;
  const d = dense(text);
  const dn = new Float64Array(DN);
  M.denseNames.forEach((k, j) => {
    const raw = +d[k] || 0;
    dn[j] = (raw - M.denseMean[j]) / (M.denseStd[j] || 1);
  });
  return { bow, dn };
}

function predict(text, mode = 'combined') {
  const v = vec(text);
  let z = M.bias;
  if (mode !== 'dense') for (const i in v.bow) z += M.wBow[i] * v.bow[i];
  if (mode !== 'bow')   for (let j = 0; j < DN; j++) z += M.wDense[j] * v.dn[j];
  return 1 / (1 + Math.exp(-z));
}

if (require.main === module) {
  const mode = process.argv.includes('--bow') ? 'bow'
             : process.argv.includes('--dense') ? 'dense'
             : 'combined';
  const text = fs.readFileSync(0, 'utf8');
  const p = predict(text, mode);
  console.log(JSON.stringify({ mode, pAI: +p.toFixed(4), verdict: p >= 0.5 ? 'AI' : 'HUMAN' }));
}

module.exports = { predict, dense, vec };
