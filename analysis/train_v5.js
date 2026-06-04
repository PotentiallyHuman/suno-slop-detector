/* train_v5.js — multi-round AI-origin trainer.
 *   Round 1: AI vs HUMAN (binary)  — adds the new typicality feature (share of a
 *            song's 3-grams that recur in the AI phrase bank). Banks rebuilt per
 *            CV fold (no leakage). Human lyrics fetched live (lrclib + lyrics.ovh).
 *   Round 2: WHICH MODEL (suno/claude/grok/chatgpt) among AI — one-vs-rest LR over
 *            features incl. per-model typicality banks; confidence-gated so it only
 *            attributes when sure, else "AI (model uncertain)".
 * Copyright-clean: human text in memory only; only numbers + phrase banks exported.
 */
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..');
const slop = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat = require('./patterns.js');
const HUMAN_CAP = parseInt(process.argv[2] || '500', 10);
const MODELS = ['suno', 'claude', 'grok', 'chatgpt'];

const toks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 1 || w === 'i');
function tri(text) { const w = toks(text); const s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [...s]; }
function buildBank(texts, thresh) { const DF = new Map(); for (const t of texts) for (const g of tri(t)) DF.set(g, (DF.get(g) || 0) + 1); const b = new Set(); for (const [g, c] of DF) if (c >= thresh) b.add(g); return b; }
function typ(text, bank) { const g = tri(text); return g.length ? g.filter(x => bank.has(x)).length / g.length : 0; }

function dense(text) {
  const d = {};
  try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {}
  const a = pat.analyze(text), nL = Math.max(1, a.__nLines), RATE = new Set(['contentDensity']);
  let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = RATE.has(n) ? v : v / nL; }
    else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v;
  }
  d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL;
  return d;
}
async function fetchLyrics(a, t) {
  try { const r = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const l = (await r.json()).plainLyrics || ''; if (l.length > 60) return l; } } catch (e) {}
  try { const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const j = await r.json(); if (j.lyrics && j.lyrics.length > 60) return j.lyrics; } } catch (e) {}
  return '';
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); }

// ---- logistic regression (SGD, class-balanced) ----
function trainLR(rows, DN, useBow, VOCABn) {
  const wB = new Float64Array(VOCABn), wD = new Float64Array(DN); let b = 0;
  const lr = 0.5, l2 = 3e-4, EP = 100;
  const nP = rows.filter(s => s.y).length, nN = rows.length - nP, wP = rows.length / (2 * Math.max(1, nP)), wN = rows.length / (2 * Math.max(1, nN));
  for (let e = 0; e < EP; e++) {
    for (let k = rows.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[rows[k], rows[j]] = [rows[j], rows[k]]; }
    for (const s of rows) {
      let z = b; if (useBow) for (const i in s.bow) z += wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += wD[j] * s.dn[j];
      const p = 1 / (1 + Math.exp(-z)), g = (s.y ? wP : wN) * (p - s.y);
      if (useBow) for (const i in s.bow) wB[i] -= lr * (g * s.bow[i] + l2 * wB[i]); for (let j = 0; j < DN; j++) wD[j] -= lr * (g * s.dn[j] + l2 * wD[j]); b -= lr * g;
    }
  }
  return { wB, wD, b };
}
const predLR = (m, s, useBow, DN) => { let z = m.b; if (useBow) for (const i in s.bow) z += m.wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += m.wD[j] * s.dn[j]; return 1 / (1 + Math.exp(-z)); };

(async () => {
  // ---- load AI (per-model) ----
  const ai = [];
  for (const m of MODELS) for (const s of (JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/models', m + '.json'))).songs || [])) { const t = s.lyrics_en || s.lyrics; if (typeof t === 'string' && t.length > 120) ai.push({ model: m, text: t }); }
  console.log('AI songs:', ai.length, '(' + MODELS.map(m => m + ' ' + ai.filter(r => r.model === m).length).join(', ') + ')');

  // ---- fetch human live ----
  let profs = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/human_profiles.json'))).profiles.filter(p => p.artist && p.title);
  for (let k = profs.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[profs[k], profs[j]] = [profs[j], profs[k]]; }
  profs = profs.slice(0, HUMAN_CAP);
  const hum = []; let done = 0;
  await pool(profs, 6, async (p) => { const t = await fetchLyrics(p.artist, p.title); if (++done % 100 === 0) process.stderr.write('  fetched ' + done + '\n'); if (t && t.length > 120) hum.push(t); });
  console.log('human fetched:', hum.length, '/', profs.length);

  // ---- BoW vocab (AI df>=2) + dense names ----
  const dfw = {}; for (const r of ai) for (const w of new Set(toks(r.text))) dfw[w] = (dfw[w] || 0) + 1;
  const VOCAB = Object.keys(dfw).filter(w => dfw[w] >= 2).sort(); const IDX = new Map(VOCAB.map((w, i) => [w, i]));
  const baseNames = [...new Set(ai.map(r => r.text).concat(hum).slice(0, 40).flatMap(t => Object.keys(dense(t))))].sort();
  const TYP_NAMES = ['typ_ai', ...MODELS.map(m => 'typ_' + m)];
  const denseNames = [...baseNames, ...TYP_NAMES]; const DN = denseNames.length;
  console.log('vocab', VOCAB.length, '| dense', DN, '(incl', TYP_NAMES.join(','), ')');

  function bowOf(text) { const tk = toks(text), bow = {}; for (const w of tk) { const i = IDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; } const n = Math.max(1, tk.length); for (const i in bow) bow[i] /= n; return bow; }
  // base dense (no typ) cached per song; typ filled per-fold to avoid leakage
  function baseDense(text) { const d = dense(text); const arr = new Float64Array(DN); baseNames.forEach((k, j) => arr[j] = (+d[k] || 0)); return arr; }

  const AIv = ai.map(r => ({ model: r.model, bow: bowOf(r.text), dn: baseDense(r.text), text: r.text }));
  const HUv = hum.map(t => ({ bow: bowOf(t), dn: baseDense(t), text: t }));

  // ================= ROUND 1: AI vs HUMAN (5-fold CV, per-fold banks) =================
  function zfit(rows) { const mean = new Float64Array(DN), std = new Float64Array(DN); for (const s of rows) for (let j = 0; j < DN; j++) mean[j] += s.dn[j]; for (let j = 0; j < DN; j++) mean[j] /= rows.length; for (const s of rows) for (let j = 0; j < DN; j++) std[j] += (s.dn[j] - mean[j]) ** 2; for (let j = 0; j < DN; j++) std[j] = Math.sqrt(std[j] / rows.length) || 1; return { mean, std }; }
  const TYP_AI_IDX = denseNames.indexOf('typ_ai');
  const MODEL_TYP_IDX = Object.fromEntries(MODELS.map(m => [m, denseNames.indexOf('typ_' + m)]));

  function cvRound1(withTyp) {
    const all = AIv.map(s => ({ ...s, dn: s.dn.slice(), y: 1 })).concat(HUv.map(s => ({ ...s, dn: s.dn.slice(), y: 0 })));
    for (let k = all.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[all[k], all[j]] = [all[j], all[k]]; }
    let c = 0, t = 0, tp = 0, fp = 0, fn = 0; const K = 5;
    for (let f = 0; f < K; f++) {
      const te = all.filter((_, i) => i % K === f), tr = all.filter((_, i) => i % K !== f);
      // build AI bank from TRAIN AI only
      const bank = withTyp ? buildBank(tr.filter(s => s.y).map(s => s.text), 4) : null;
      for (const s of tr.concat(te)) s.dn[TYP_AI_IDX] = withTyp ? typ(s.text, bank) : 0;
      const { mean, std } = zfit(tr);
      const z = s => { const c = s.dn.slice(); for (let j = 0; j < DN; j++) c[j] = (c[j] - mean[j]) / std[j]; return { ...s, dn: c }; };
      const trz = tr.map(z), tez = te.map(z);
      const m = trainLR(trz, DN, true, VOCAB.length);
      for (const s of tez) { const p = predLR(m, s, true, DN) >= 0.5 ? 1 : 0; if (p === s.y) c++; t++; if (s.y && p) tp++; else if (!s.y && p) fp++; else if (s.y && !p) fn++; }
    }
    return { acc: c / t, prec: tp / Math.max(1, tp + fp), rec: tp / Math.max(1, tp + fn) };
  }
  console.log('\n=== ROUND 1: AI vs HUMAN (5-fold CV) ===');
  const r1base = cvRound1(false), r1typ = cvRound1(true);
  console.log('  without typicality : acc ' + (100 * r1base.acc).toFixed(1) + '%  precAI ' + (100 * r1base.prec).toFixed(1) + '%  recAI ' + (100 * r1base.rec).toFixed(1) + '%');
  console.log('  WITH typicality    : acc ' + (100 * r1typ.acc).toFixed(1) + '%  precAI ' + (100 * r1typ.prec).toFixed(1) + '%  recAI ' + (100 * r1typ.rec).toFixed(1) + '%');

  // ================= ROUND 2: WHICH MODEL (AI only, 5-fold CV) =================
  console.log('\n=== ROUND 2: model attribution (suno/claude/grok/chatgpt), 5-fold CV ===');
  const aiOnly = AIv.map(s => ({ ...s, dn: s.dn.slice() }));
  for (let k = aiOnly.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[aiOnly[k], aiOnly[j]] = [aiOnly[j], aiOnly[k]]; }
  const K = 5; const conf = {}; MODELS.forEach(a => { conf[a] = {}; MODELS.forEach(b => conf[a][b] = 0); });
  let covered = 0, coveredCorrect = 0, total = 0;
  for (let f = 0; f < K; f++) {
    const te = aiOnly.filter((_, i) => i % K === f), tr = aiOnly.filter((_, i) => i % K !== f);
    // per-model banks from TRAIN only
    const banks = Object.fromEntries(MODELS.map(m => [m, buildBank(tr.filter(s => s.model === m).map(s => s.text), 3)]));
    for (const s of tr.concat(te)) { for (const m of MODELS) s.dn[MODEL_TYP_IDX[m]] = typ(s.text, banks[m]); s.dn[TYP_AI_IDX] = 0; }
    const { mean, std } = zfit(tr);
    const z = s => { const c = s.dn.slice(); for (let j = 0; j < DN; j++) c[j] = (c[j] - mean[j]) / std[j]; return { ...s, dn: c }; };
    const trz = tr.map(z), tez = te.map(z);
    // one-vs-rest LR per model
    const heads = {}; for (const m of MODELS) heads[m] = trainLR(trz.map(s => ({ ...s, y: s.model === m ? 1 : 0 })), DN, true, VOCAB.length);
    for (const s of tez) {
      const scores = MODELS.map(m => [m, predLR(heads[m], s, true, DN)]);
      const sorted = scores.slice().sort((a, b) => b[1] - a[1]);
      const pred = sorted[0][0], top = sorted[0][1], margin = sorted[0][1] - sorted[1][1];
      conf[s.model][pred]++; total++;
      const sure = top >= 0.5 && margin >= 0.15;
      if (sure) { covered++; if (pred === s.model) coveredCorrect++; }
    }
  }
  // confusion matrix (all predictions, argmax)
  console.log('  confusion (row=true, col=pred):  ' + MODELS.map(m => m.slice(0, 4)).join('  '));
  let diag = 0, tot = 0;
  for (const a of MODELS) { console.log('   ' + a.padEnd(8) + MODELS.map(b => String(conf[a][b]).padStart(6)).join('')); for (const b of MODELS) { tot += conf[a][b]; if (a === b) diag += conf[a][b]; } }
  console.log('  argmax accuracy: ' + (100 * diag / tot).toFixed(1) + '%   (chance ~' + (100 / MODELS.length).toFixed(0) + '%)');
  console.log('  CONFIDENCE-GATED (top>=0.5 & margin>=0.15): coverage ' + (100 * covered / total).toFixed(0) + '%  accuracy-when-confident ' + (100 * coveredCorrect / Math.max(1, covered)).toFixed(1) + '%');

  console.log('\n(Round 1 lift from typicality: ' + ((r1typ.acc - r1base.acc) * 100).toFixed(1) + ' pts acc)');
})();
