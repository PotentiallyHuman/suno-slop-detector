/* embeddings.js — call ollama nomic-embed-text on text lines and derive
 * semantic-coherence features:
 *   emb_adj_cos_mean : average adjacent-line cosine sim (low = jumpy)
 *   emb_adj_cos_min  : worst adjacent-line jump
 *   emb_adj_cos_std  : variability of adjacent sims
 *   emb_doc_consistency : avg cosine of each line to the song's centroid
 *   emb_self_repeat_max : max cosine between any two non-adjacent lines
 *
 * No copyright leak: lines stay in RAM, only the 5 numeric features survive.
 */
'use strict';
const SlopScore = require('../src/slop-core.js');

function lines(text) {
  return SlopScore.stripSectionLabels(String(text || ''))
    .split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

async function embed(text) {
  const r = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
  });
  if (!r.ok) throw new Error(`ollama embed ${r.status}`);
  return (await r.json()).embedding;
}

function cosine(a, b) {
  let s = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return s / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

async function analyze(text) {
  const L = lines(text);
  // For songs of >40 lines, sample every other line to stay fast (~17 min over 6500 songs)
  const sample = L.length > 40 ? L.filter((_, i) => i % 2 === 0) : L;
  if (sample.length < 2) {
    return { emb_adj_cos_mean: 0, emb_adj_cos_min: 0, emb_adj_cos_std: 0, emb_doc_consistency: 0, emb_self_repeat_max: 0 };
  }
  // Sequential per song; concurrency is at the song level above this.
  const vecs = [];
  for (const l of sample) {
    try { vecs.push(await embed(l)); } catch (_) { vecs.push(null); }
  }
  const ok = vecs.filter(Boolean);
  if (ok.length < 2) {
    return { emb_adj_cos_mean: 0, emb_adj_cos_min: 0, emb_adj_cos_std: 0, emb_doc_consistency: 0, emb_self_repeat_max: 0 };
  }
  // adjacent cos
  const adj = [];
  for (let i = 1; i < ok.length; i++) adj.push(cosine(ok[i - 1], ok[i]));
  const m = adj.reduce((a, b) => a + b, 0) / adj.length;
  const mn = Math.min(...adj);
  const sd = Math.sqrt(adj.reduce((a, b) => a + (b - m) ** 2, 0) / adj.length);
  // centroid + per-line dist
  const D = ok[0].length;
  const c = new Float64Array(D);
  for (const v of ok) for (let i = 0; i < D; i++) c[i] += v[i];
  for (let i = 0; i < D; i++) c[i] /= ok.length;
  const consistencies = ok.map(v => cosine(v, c));
  const cMean = consistencies.reduce((a, b) => a + b, 0) / consistencies.length;
  // max self repeat (non-adjacent)
  let maxRepeat = 0;
  for (let i = 0; i < ok.length; i++) for (let j = i + 2; j < ok.length; j++) {
    const cs = cosine(ok[i], ok[j]);
    if (cs > maxRepeat) maxRepeat = cs;
  }
  return {
    emb_adj_cos_mean: +m.toFixed(4),
    emb_adj_cos_min:  +mn.toFixed(4),
    emb_adj_cos_std:  +sd.toFixed(4),
    emb_doc_consistency: +cMean.toFixed(4),
    emb_self_repeat_max: +maxRepeat.toFixed(4),
  };
}

module.exports = { analyze, embed, cosine };
