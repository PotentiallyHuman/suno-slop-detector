/* train_v6.js — corrected multi-round AI-origin trainer.
 * Fixes from corpus audit (2026-06-04):
 *   - adds GEMINI (was dropped) -> 5-way attribution
 *   - drops non-English songs (lyrics_en preferred; English filter)
 *   - REWEIGHTS AI models to real-world usage (chatgpt35/suno30/gemini12/claude12/grok5)
 *     via per-song LOSS WEIGHTS (data too scarce to subsample to ratio) — applied to
 *     BOTH the typicality phrase bank (weighted DF) and the Round-1 logistic loss.
 *   - keeps ALL Claude (user decision).
 * Round 1: AI vs HUMAN (+ typicality). Round 2: which-model (5-way, conf-gated).
 * Copyright-clean: human text in memory only; numbers + banks exported.
 */
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..');
const slop = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat = require('./patterns.js');
const HUMAN_CAP = parseInt(process.argv[2] || '500', 10);
const MODELS = ['suno', 'claude', 'grok', 'chatgpt', 'gemini'];
const USAGE = { chatgpt: 0.35, suno: 0.30, gemini: 0.12, claude: 0.12, grok: 0.05 }; // real-world target

const toks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 1 || w === 'i');
// crude but effective English filter: needs enough common-English function words
const ENGLISH = new Set('the and you i to a of in it is my me we be that this for on are with not no your so but all just like was have what when there her his she he they out up down know feel time'.split(' '));
function isEnglish(text) {
  const w = (String(text).toLowerCase().match(/[a-z']+/g) || []);
  if (w.length < 20) return false;
  const nonAscii = (String(text).match(/[^\x00-\x7F]/g) || []).length / Math.max(1, text.length);
  if (nonAscii > 0.08) return false;
  const hits = w.filter(x => ENGLISH.has(x)).length / w.length;
  return hits >= 0.12;
}
function tri(text) { const w = toks(text); const s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [...s]; }
// weighted phrase bank: trigram kept if its weighted document-count >= thresh
function buildBankW(rows, thresh) { const DF = new Map(); for (const r of rows) for (const g of tri(r.text)) DF.set(g, (DF.get(g) || 0) + r.w); const b = new Set(); for (const [g, c] of DF) if (c >= thresh) b.add(g); return b; }
function typ(text, bank) { const g = tri(text); return g.length ? g.filter(x => bank.has(x)).length / g.length : 0; }

function dense(text) {
  const d = {};
  try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {}
  const a = pat.analyze(text), nL = Math.max(1, a.__nLines), RATE = new Set(['contentDensity']);
  let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) { if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = RATE.has(n) ? v : v / nL; } else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v; }
  d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL; return d;
}
async function fetchLyrics(a, t) {
  try { const r = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const l = (await r.json()).plainLyrics || ''; if (l.length > 60) return l; } } catch (e) {}
  try { const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const j = await r.json(); if (j.lyrics && j.lyrics.length > 60) return j.lyrics; } } catch (e) {}
  return '';
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); }

// weighted logistic regression (per-row weight s.w)
function trainLR(rows, DN, VOCABn) {
  const wB = new Float64Array(VOCABn), wD = new Float64Array(DN); let b = 0; const lr = 0.5, l2 = 3e-4, EP = 100;
  for (let e = 0; e < EP; e++) {
    for (let k = rows.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[rows[k], rows[j]] = [rows[j], rows[k]]; }
    for (const s of rows) { let z = b; for (const i in s.bow) z += wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += wD[j] * s.dn[j];
      const p = 1 / (1 + Math.exp(-z)), g = s.w * (p - s.y);
      for (const i in s.bow) wB[i] -= lr * (g * s.bow[i] + l2 * wB[i]); for (let j = 0; j < DN; j++) wD[j] -= lr * (g * s.dn[j] + l2 * wD[j]); b -= lr * g; }
  }
  return { wB, wD, b };
}
const predLR = (m, s, DN) => { let z = m.b; for (const i in s.bow) z += m.wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += m.wD[j] * s.dn[j]; return 1 / (1 + Math.exp(-z)); };

(async () => {
  // ---- load AI (5 models), English only, lyrics_en preferred ----
  const ai = []; const dropped = {};
  for (const m of MODELS) { dropped[m] = 0;
    for (const s of (JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/models', m + '.json'))).songs || [])) {
      const t = s.lyrics_en || s.lyrics; if (typeof t !== 'string' || t.length < 120) { dropped[m]++; continue; }
      if (!isEnglish(t)) { dropped[m]++; continue; } ai.push({ model: m, text: t }); } }
  const cnt = Object.fromEntries(MODELS.map(m => [m, ai.filter(r => r.model === m).length]));
  console.log('AI (English):', ai.length, JSON.stringify(cnt), '| dropped non-en/short:', JSON.stringify(dropped));
  // usage loss-weights, normalized so mean AI weight = 1
  const rawW = Object.fromEntries(MODELS.map(m => [m, (USAGE[m] || 0) / Math.max(1, cnt[m])]));
  const sumW = ai.reduce((s, r) => s + rawW[r.model], 0); const scale = ai.length / sumW;
  for (const r of ai) r.uw = rawW[r.model] * scale; // mean 1, class influence = USAGE
  console.log('per-song usage weights (mean1):', Object.fromEntries(MODELS.map(m => [m, +(rawW[m] * scale).toFixed(2)])));

  // ---- fetch human ----
  let profs = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/human_profiles.json'))).profiles.filter(p => p.artist && p.title);
  for (let k = profs.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[profs[k], profs[j]] = [profs[j], profs[k]]; }
  profs = profs.slice(0, HUMAN_CAP); const hum = []; let done = 0;
  await pool(profs, 6, async (p) => { const t = await fetchLyrics(p.artist, p.title); if (++done % 100 === 0) process.stderr.write('  fetched ' + done + '\n'); if (t && t.length > 120 && isEnglish(t)) hum.push(t); });
  console.log('human (English):', hum.length, '/', profs.length);

  // ---- vocab + dense names ----
  const dfw = {}; for (const r of ai) for (const w of new Set(toks(r.text))) dfw[w] = (dfw[w] || 0) + 1;
  const VOCAB = Object.keys(dfw).filter(w => dfw[w] >= 2).sort(); const IDX = new Map(VOCAB.map((w, i) => [w, i]));
  const baseNames = [...new Set(ai.map(r => r.text).concat(hum).slice(0, 40).flatMap(t => Object.keys(dense(t))))].sort();
  const TYP = ['typ_ai', ...MODELS.map(m => 'typ_' + m)]; const denseNames = [...baseNames, ...TYP]; const DN = denseNames.length;
  const IT = Object.fromEntries(TYP.map(t => [t, denseNames.indexOf(t)]));
  console.log('vocab', VOCAB.length, '| dense', DN);
  const bowOf = text => { const tk = toks(text), bow = {}; for (const w of tk) { const i = IDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; } const n = Math.max(1, tk.length); for (const i in bow) bow[i] /= n; return bow; };
  const baseDense = text => { const d = dense(text); const arr = new Float64Array(DN); baseNames.forEach((k, j) => arr[j] = (+d[k] || 0)); return arr; };
  const AIv = ai.map(r => ({ model: r.model, uw: r.uw, bow: bowOf(r.text), dn: baseDense(r.text), text: r.text }));
  const HUv = hum.map(t => ({ bow: bowOf(t), dn: baseDense(t), text: t }));
  const zfit = rows => { const mean = new Float64Array(DN), std = new Float64Array(DN); for (const s of rows) for (let j = 0; j < DN; j++) mean[j] += s.dn[j]; for (let j = 0; j < DN; j++) mean[j] /= rows.length; for (const s of rows) for (let j = 0; j < DN; j++) std[j] += (s.dn[j] - mean[j]) ** 2; for (let j = 0; j < DN; j++) std[j] = Math.sqrt(std[j] / rows.length) || 1; return { mean, std }; };

  // ===== ROUND 1: AI vs HUMAN (usage-weighted), 5-fold CV, per-fold weighted banks =====
  function cv1(withTyp) {
    const totAIw = AIv.reduce((s, r) => s + r.uw, 0), humW = totAIw / Math.max(1, HUv.length); // balance human to AI total
    const all = AIv.map(s => ({ ...s, dn: s.dn.slice(), y: 1, w: s.uw })).concat(HUv.map(s => ({ ...s, dn: s.dn.slice(), y: 0, w: humW })));
    for (let k = all.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[all[k], all[j]] = [all[j], all[k]]; }
    let c = 0, t = 0, tp = 0, fp = 0, fn = 0; const K = 5;
    for (let f = 0; f < K; f++) {
      const te = all.filter((_, i) => i % K === f), tr = all.filter((_, i) => i % K !== f);
      const bank = withTyp ? buildBankW(tr.filter(s => s.y).map(s => ({ text: s.text, w: s.uw })), 4) : null;
      for (const s of tr.concat(te)) s.dn[IT.typ_ai] = withTyp ? typ(s.text, bank) : 0;
      const { mean, std } = zfit(tr); const z = s => { const cc = s.dn.slice(); for (let j = 0; j < DN; j++) cc[j] = (cc[j] - mean[j]) / std[j]; return { ...s, dn: cc }; };
      const m = trainLR(tr.map(z), DN, VOCAB.length);
      for (const s of te.map(z)) { const p = predLR(m, s, DN) >= 0.5 ? 1 : 0; if (p === s.y) c++; t++; if (s.y && p) tp++; else if (!s.y && p) fp++; else if (s.y && !p) fn++; }
    }
    return { acc: c / t, prec: tp / Math.max(1, tp + fp), rec: tp / Math.max(1, tp + fn) };
  }
  console.log('\n=== ROUND 1: AI vs HUMAN (usage-reweighted, 5-fold CV) ===');
  const b = cv1(false), w = cv1(true);
  console.log('  without typicality : acc ' + (100 * b.acc).toFixed(1) + '%  precAI ' + (100 * b.prec).toFixed(1) + '%  recAI ' + (100 * b.rec).toFixed(1) + '%');
  console.log('  WITH typicality    : acc ' + (100 * w.acc).toFixed(1) + '%  precAI ' + (100 * w.prec).toFixed(1) + '%  recAI ' + (100 * w.rec).toFixed(1) + '%');

  // ===== ROUND 2: which model (5-way, inverse-freq weights, conf-gated) =====
  console.log('\n=== ROUND 2: model attribution (5-way), 5-fold CV ===');
  const inv = Object.fromEntries(MODELS.map(m => [m, AIv.length / (MODELS.length * Math.max(1, cnt[m]))]));
  const aiOnly = AIv.map(s => ({ ...s, dn: s.dn.slice() }));
  for (let k = aiOnly.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[aiOnly[k], aiOnly[j]] = [aiOnly[j], aiOnly[k]]; }
  const K = 5, conf = {}; MODELS.forEach(a => { conf[a] = {}; MODELS.forEach(b2 => conf[a][b2] = 0); });
  let covered = 0, coveredCorrect = 0, total = 0;
  for (let f = 0; f < K; f++) {
    const te = aiOnly.filter((_, i) => i % K === f), tr = aiOnly.filter((_, i) => i % K !== f);
    const banks = Object.fromEntries(MODELS.map(m => [m, buildBankW(tr.filter(s => s.model === m).map(s => ({ text: s.text, w: 1 })), 3)]));
    for (const s of tr.concat(te)) { for (const m of MODELS) s.dn[IT['typ_' + m]] = typ(s.text, banks[m]); s.dn[IT.typ_ai] = 0; }
    const { mean, std } = zfit(tr); const z = s => { const cc = s.dn.slice(); for (let j = 0; j < DN; j++) cc[j] = (cc[j] - mean[j]) / std[j]; return { ...s, dn: cc }; };
    const trz = tr.map(z), tez = te.map(z);
    const heads = {}; for (const m of MODELS) heads[m] = trainLR(trz.map(s => ({ ...s, y: s.model === m ? 1 : 0, w: s.model === m ? inv[m] : 1 })), DN, VOCAB.length);
    for (const s of tez) { const sc = MODELS.map(m => [m, predLR(heads[m], s, DN)]).sort((a, b2) => b2[1] - a[1]);
      const pred = sc[0][0], top = sc[0][1], margin = sc[0][1] - sc[1][1]; conf[s.model][pred]++; total++;
      if (top >= 0.5 && margin >= 0.15) { covered++; if (pred === s.model) coveredCorrect++; } }
  }
  console.log('  confusion (row=true,col=pred): ' + MODELS.map(m => m.slice(0, 4)).join(' '));
  let diag = 0, tot = 0; for (const a of MODELS) { console.log('   ' + a.padEnd(8) + MODELS.map(b2 => String(conf[a][b2]).padStart(6)).join('')); for (const b2 of MODELS) { tot += conf[a][b2]; if (a === b2) diag += conf[a][b2]; } }
  console.log('  argmax accuracy: ' + (100 * diag / tot).toFixed(1) + '%  (chance ' + (100 / MODELS.length).toFixed(0) + '%)');
  console.log('  CONFIDENCE-GATED: coverage ' + (100 * covered / total).toFixed(0) + '%  acc-when-confident ' + (100 * coveredCorrect / Math.max(1, covered)).toFixed(1) + '%');
  console.log('\n(Round1 typicality lift: ' + ((w.acc - b.acc) * 100).toFixed(1) + ' pts acc, ' + ((w.prec - b.prec) * 100).toFixed(1) + ' pts precision)');
})();
