/* score_v5.js — load corpus/model_v5.json and score lyrics end-to-end, exactly as
 * the extension will: dense features (f_/s_/lex_/px_/typ_) + BoW, z-score, binary
 * P(AI), verdict at the baked threshold, then GATED 5-way attribution. This both
 * validates the exported artifact (red-team) and is the spec for the browser port.
 *   node analysis/score_v5.js <file>            # one song
 *   node analysis/score_v5.js --selftest        # the 4 reference songs
 */
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..');
const slop = require(ROOT + '/src/slop-core.js'), feats = require(ROOT + '/src/features.js'), pat = require('./patterns.js'), PX = require('./portability_tells.js');
const M = JSON.parse(fs.readFileSync(ROOT + '/corpus/model_v5.json'));
const MODELS = Object.keys(M.attribution);
const AIBANK = new Set(M.aiBank), MBANKS = Object.fromEntries(MODELS.map(m => [m, new Set(M.modelBanks[m])]));
const VIDX = new Map(M.vocab.map((w, i) => [w, i]));

const toks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 1 || w === 'i');
const tri = t => { const w = toks(t), s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [...s]; };
const typ = (t, b) => { const g = tri(t); return g.length ? g.filter(x => b.has(x)).length / g.length : 0; };
function denseDict(text) {
  const d = {}; try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {}
  const a = pat.analyze(text), nL = Math.max(1, a.__nLines), R = new Set(['contentDensity']); let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) { if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = R.has(n) ? v : v / nL; } else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v; }
  d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL;
  try { const sq = PX.selfQualify(text), ta = PX.templateAnaphora(text), hj = PX.hedgeJust(text); d.px_just = hj.justRate; d.px_negAnaphora = ta.negAnaphoraRate; d.px_correction = sq.correctionRate; d.px_selfQualify = sq.selfQualifyScore; } catch (e) {}
  d.typ_ai = typ(text, AIBANK); for (const m of MODELS) d['typ_' + m] = typ(text, MBANKS[m]);
  return d;
}
function vectors(text) {
  const dict = denseDict(text);
  const dn = M.denseNames.map((k, j) => ((+dict[k] || 0) - M.denseMean[j]) / M.denseStd[j]);
  const tk = toks(text), bow = {}; for (const w of tk) { const i = VIDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; } const n = Math.max(1, tk.length); for (const i in bow) bow[i] /= n;
  return { dn, bow };
}
const sigmoid = z => 1 / (1 + Math.exp(-z));
function headScore(head, v) { let z = head.bias; for (const i in v.bow) z += head.wBow[i] * v.bow[i]; for (let j = 0; j < v.dn.length; j++) z += head.wDense[j] * v.dn[j]; return sigmoid(z); }
function analyze(text) {
  const v = vectors(text);
  const pAI = headScore(M.binary, v);
  const isAI = pAI >= M.threshold;
  let attribution = null;
  if (isAI) { // GATE: only attribute when the song reads AI
    const sc = MODELS.map(m => [m, headScore(M.attribution[m], v)]).sort((a, b) => b[1] - a[1]);
    attribution = (sc[0][1] >= 0.5 && sc[0][1] - sc[1][1] >= 0.15) ? { model: sc[0][0], conf: sc[0][1] } : { model: null };
  }
  return { pAI, verdict: isAI ? 'AI' : 'human', threshold: M.threshold, attribution };
}
module.exports = { analyze, denseDict };

if (require.main === module) {
  const fmt = r => `${(100 * r.pAI).toFixed(0)}% AI [${r.verdict}]` + (r.verdict === 'AI' ? (r.attribution.model ? ` · likely ${r.attribution.model} (${(100 * r.attribution.conf).toFixed(0)}%)` : ' · model uncertain') : '');
  if (process.argv[2] === '--selftest') {
    console.log('threshold', M.threshold, '| denseNames', M.denseNames.length, '| vocab', M.vocab.length);
    for (const [f, tag] of [['/tmp/annoying.txt', 'AI Suno song'], ['/tmp/dear_claude.txt', 'Dear Claude']]) { try { console.log('  ' + tag.padEnd(16) + fmt(analyze(fs.readFileSync(f, 'utf8')))); } catch (e) { console.log('  [skip] ' + tag); } }
    console.log('  (fetch Bohemian Rhapsody / Baby separately if needed)');
  } else { const t = fs.readFileSync(process.argv[2], 'utf8'); console.log(fmt(analyze(t))); }
}
