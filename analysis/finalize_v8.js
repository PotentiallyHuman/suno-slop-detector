/* finalize_v8.js — engineering pass on v5:
 *  - prune ultra-rare dense features (<1% prevalence) at the source, so we can use
 *    MODERATE L2 (recover accuracy) without the s_halfXHalfY-style +40 artifact
 *  - THRESHOLD CALIBRATION: sweep out-of-fold scores, pick an operating point that
 *    tames the 13.5% human false-positive; bake the threshold into the export
 *  - HONEST attribution: per-model phrase banks rebuilt per CV fold (no leakage)
 * Humans fetched live to /tmp/final_humans.json (resumable). Exports corpus/model_v5.json.
 */
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..');
const slop = require(ROOT + '/src/slop-core.js'), feats = require(ROOT + '/src/features.js'), pat = require('./patterns.js'), PX = require('./portability_tells.js');
const { predict } = require(ROOT + '/predict.js');
const MODELS = ['suno', 'claude', 'grok', 'chatgpt', 'gemini'], USAGE = { chatgpt: .35, suno: .30, gemini: .12, claude: .12, grok: .05 };
const HUMAN_CAP = parseInt(process.argv[2] || '2500', 10), L2 = 1e-3, PRUNE = 0.01, AIBANK_CAP = 8000, MBANK_CAP = 1500;

const toks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 1 || w === 'i');
const ENG = new Set('the and you i to a of in it is my me we be that this for on are with not no your so but all just like was have what when there her his she he they out up down know feel time'.split(' '));
const isEng = t => { const w = (String(t).toLowerCase().match(/[a-z']+/g) || []); return w.length >= 20 && (String(t).match(/[^\x00-\x7F]/g) || []).length / Math.max(1, t.length) <= .08 && w.filter(x => ENG.has(x)).length / w.length >= .12; };
const tri = t => { const w = toks(t), s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [...s]; };
const bankCapped = (rows, cap) => { const D = new Map(); for (const r of rows) for (const g of tri(r.text)) D.set(g, (D.get(g) || 0) + r.w); return new Set([...D.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, cap).map(e => e[0])); };
const typ = (t, b) => { const g = tri(t); return g.length ? g.filter(x => b.has(x)).length / g.length : 0; };
function denseDict(text, aiBank, mBanks) {
  const d = {}; try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {}
  const a = pat.analyze(text), nL = Math.max(1, a.__nLines), R = new Set(['contentDensity']); let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) { if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = R.has(n) ? v : v / nL; } else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v; }
  d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL;
  try { const sq = PX.selfQualify(text), ta = PX.templateAnaphora(text), hj = PX.hedgeJust(text); d.px_just = hj.justRate; d.px_negAnaphora = ta.negAnaphoraRate; d.px_correction = sq.correctionRate; d.px_selfQualify = sq.selfQualifyScore; } catch (e) {}
  d.typ_ai = typ(text, aiBank); for (const m of MODELS) d['typ_' + m] = typ(text, mBanks[m]);
  return d;
}
async function fl(a, t) { try { const r = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const l = (await r.json()).plainLyrics || ''; if (l.length > 60) return l; } } catch (e) {} try { const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const j = await r.json(); if (j.lyrics && j.lyrics.length > 60) return j.lyrics; } } catch (e) {} return ''; }
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); }
function trainLR(rows, DN, Vn, l2) {
  const wB = new Float64Array(Vn), wD = new Float64Array(DN); let b = 0; const lr = .5;
  for (let e = 0; e < 100; e++) {
    for (let k = rows.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[rows[k], rows[j]] = [rows[j], rows[k]]; }
    for (const s of rows) { let z = b; for (const i in s.bow) z += wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += wD[j] * s.dn[j]; const p = 1 / (1 + Math.exp(-z)), g = s.w * (p - s.y); for (const i in s.bow) wB[i] -= lr * (g * s.bow[i] + l2 * wB[i]); for (let j = 0; j < DN; j++) wD[j] -= lr * (g * s.dn[j] + l2 * wD[j]); b -= lr * g; }
  }
  return { wB, wD, b };
}
const pred = (m, s, DN) => { let z = m.b; for (const i in s.bow) z += m.wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += m.wD[j] * s.dn[j]; return 1 / (1 + Math.exp(-z)); };

(async () => {
  // AI
  const ai = [];
  for (const m of MODELS) for (const s of (JSON.parse(fs.readFileSync(`${ROOT}/corpus/models/${m}.json`)).songs || [])) { const t = s.lyrics_en || s.lyrics; if (typeof t === 'string' && t.length >= 120 && isEng(t)) ai.push({ model: m, text: t }); }
  const cnt = Object.fromEntries(MODELS.map(m => [m, ai.filter(r => r.model === m).length]));
  const rawW = Object.fromEntries(MODELS.map(m => [m, USAGE[m] / Math.max(1, cnt[m])])), sumW = ai.reduce((s, r) => s + rawW[r.model], 0), sc = ai.length / sumW;
  for (const r of ai) r.uw = rawW[r.model] * sc;
  // humans (resumable cache)
  const CACHE = '/tmp/final_humans.json'; let hum = [];
  if (fs.existsSync(CACHE)) hum = JSON.parse(fs.readFileSync(CACHE)).filter(isEng);
  if (hum.length < HUMAN_CAP) { let profs = JSON.parse(fs.readFileSync(`${ROOT}/corpus/human_profiles.json`)).profiles.filter(p => p.artist && p.title && (p.lang || 'en') === 'en'); for (let k = profs.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[profs[k], profs[j]] = [profs[j], profs[k]]; } let got = hum.length; await pool(profs, 8, async (p) => { if (got >= HUMAN_CAP) return; const t = await fl(p.artist, p.title); if (t && t.length > 120 && isEng(t)) { hum.push(t); got++; if (got % 250 === 0) { fs.writeFileSync(CACHE, JSON.stringify(hum)); process.stderr.write(' human ' + got + '\n'); } } }); fs.writeFileSync(CACHE, JSON.stringify(hum)); }
  hum = hum.slice(0, HUMAN_CAP);
  console.log('AI', ai.length, JSON.stringify(cnt), '| human', hum.length);

  // banks + cached dense dicts (computed ONCE)
  const aiBank = bankCapped(ai.map(r => ({ text: r.text, w: r.uw })), AIBANK_CAP);
  const mBanks = Object.fromEntries(MODELS.map(m => [m, bankCapped(ai.filter(r => r.model === m).map(r => ({ text: r.text, w: 1 })), MBANK_CAP)]));
  const aiD = ai.map(r => denseDict(r.text, aiBank, mBanks)), huD = hum.map(t => denseDict(t, aiBank, mBanks));
  // prune ultra-rare dense features
  const allNames = [...new Set(aiD.concat(huD).flatMap(Object.keys))].sort();
  const total = aiD.length + huD.length;
  const prevalence = k => (aiD.filter(d => d[k]).length + huD.filter(d => d[k]).length) / total;
  const names = allNames.filter(k => k.startsWith('typ_') || k.startsWith('f_') || k.startsWith('lex_') || prevalence(k) >= PRUNE);
  const dropped = allNames.filter(k => !names.includes(k));
  const DN = names.length, IT = Object.fromEntries(names.map((k, j) => [k, j]));
  console.log('dense kept', DN, '| pruned <' + (100 * PRUNE) + '%:', dropped.length, dropped.slice(0, 8).join(','));
  // vocab + vectors
  const dfw = {}; for (const r of ai) for (const w of new Set(toks(r.text))) dfw[w] = (dfw[w] || 0) + 1;
  const VOCAB = Object.keys(dfw).filter(w => dfw[w] >= 2).sort(), VIDX = new Map(VOCAB.map((w, i) => [w, i]));
  const bow = text => { const tk = toks(text), b = {}; for (const w of tk) { const i = VIDX.get(w); if (i !== undefined) b[i] = (b[i] || 0) + 1; } const n = Math.max(1, tk.length); for (const i in b) b[i] /= n; return b; };
  const dnFrom = dict => { const a = new Float64Array(DN); names.forEach((k, j) => a[j] = +dict[k] || 0); return a; };
  const AIv = ai.map((r, i) => ({ model: r.model, uw: r.uw, text: r.text, bow: bow(r.text), dn: dnFrom(aiD[i]) }));
  const HUv = hum.map((t, i) => ({ bow: bow(t), dn: dnFrom(huD[i]) }));

  const zfit = rows => { const mean = new Float64Array(DN), std = new Float64Array(DN); for (const s of rows) for (let j = 0; j < DN; j++) mean[j] += s.dn[j]; for (let j = 0; j < DN; j++) mean[j] /= rows.length; for (const s of rows) for (let j = 0; j < DN; j++) std[j] += (s.dn[j] - mean[j]) ** 2; for (let j = 0; j < DN; j++) std[j] = Math.sqrt(std[j] / rows.length) || 1; return { mean, std }; };
  const zap = (rows, m) => rows.map(s => { const c = s.dn.slice(); for (let j = 0; j < DN; j++) c[j] = (c[j] - m.mean[j]) / m.std[j]; return { ...s, dn: c }; });
  const totAIw = AIv.reduce((s, x) => s + x.uw, 0);

  // 5-fold CV, collect OUT-OF-FOLD scores for calibration
  const all = AIv.map(s => ({ ...s, y: 1, w: s.uw })).concat(HUv.map(s => ({ ...s, y: 0, w: totAIw / HUv.length })));
  for (let k = all.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[all[k], all[j]] = [all[j], all[k]]; }
  const oof = [];
  for (let f = 0; f < 5; f++) { const te = all.filter((_, i) => i % 5 === f), tr = all.filter((_, i) => i % 5 !== f); const zm = zfit(tr); const m = trainLR(zap(tr, zm), DN, VOCAB.length, L2); for (const s of zap(te, zm)) oof.push({ p: pred(m, s, DN), y: s.y }); }
  const accAt = th => oof.filter(o => (o.p >= th ? 1 : 0) === o.y).length / oof.length;
  const fpAt = th => { const H = oof.filter(o => o.y === 0); return H.filter(o => o.p >= th).length / H.length; };
  const recAt = th => { const A = oof.filter(o => o.y === 1); return A.filter(o => o.p >= th).length / A.length; };
  const precAt = th => { const P = oof.filter(o => o.p >= th); return P.length ? P.filter(o => o.y === 1).length / P.length : 0; };
  const f1At = th => { const p = precAt(th), r = recAt(th); return p + r ? 2 * p * r / (p + r) : 0; };
  console.log('\nTHRESHOLD SWEEP (out-of-fold):  th   acc   FP%   recall  prec   F1');
  let bestF1 = 0, bestTh = .5, fp8 = null;
  for (let th = .30; th <= .80001; th += .05) { const a = accAt(th), fp = fpAt(th), r = recAt(th), p = precAt(th), f = f1At(th); console.log('  ' + th.toFixed(2) + '  ' + (100 * a).toFixed(1) + '  ' + (100 * fp).toFixed(1) + '  ' + (100 * r).toFixed(1) + '  ' + (100 * p).toFixed(1) + '  ' + (100 * f).toFixed(1)); if (f > bestF1) { bestF1 = f; bestTh = th; } if (fp <= .08 && fp8 === null) fp8 = th; }
  const TH = fp8 != null ? fp8 : bestTh; // prefer the threshold that gets FP<=8%, else best-F1
  console.log(`chosen threshold: ${TH.toFixed(2)}  (FP ${(100 * fpAt(TH)).toFixed(1)}% | recall ${(100 * recAt(TH)).toFixed(1)}% | acc ${(100 * accAt(TH)).toFixed(1)}%)  [best-F1 th=${bestTh.toFixed(2)}]`);

  // HONEST attribution: per-fold banks
  const aiO = AIv.map(s => ({ ...s, dn: s.dn.slice() })); for (let k = aiO.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[aiO[k], aiO[j]] = [aiO[j], aiO[k]]; }
  const inv = Object.fromEntries(MODELS.map(m => [m, ai.length / (MODELS.length * Math.max(1, cnt[m]))]));
  const C = {}; MODELS.forEach(a => { C[a] = {}; MODELS.forEach(b => C[a][b] = 0); }); let cov = 0, covC = 0, tot = 0;
  const TYPM = Object.fromEntries(MODELS.map(m => [m, IT['typ_' + m]]));
  for (let f = 0; f < 5; f++) {
    const te = aiO.filter((_, i) => i % 5 === f), tr = aiO.filter((_, i) => i % 5 !== f);
    const fb = Object.fromEntries(MODELS.map(m => [m, bankCapped(tr.filter(s => s.model === m).map(s => ({ text: s.text, w: 1 })), MBANK_CAP)]));
    const rebuild = s => { const c = s.dn.slice(); for (const m of MODELS) if (TYPM[m] != null) c[TYPM[m]] = typ(s.text, fb[m]); return { ...s, dn: c }; };
    const trr = tr.map(rebuild), ter = te.map(rebuild); const zm = zfit(trr); const trz = zap(trr, zm), tez = zap(ter, zm);
    const heads = {}; for (const m of MODELS) heads[m] = trainLR(trz.map(s => ({ ...s, y: s.model === m ? 1 : 0, w: s.model === m ? inv[m] : 1 })), DN, VOCAB.length, L2);
    for (const s of tez) { const sc2 = MODELS.map(m => [m, pred(heads[m], s, DN)]).sort((a, b) => b[1] - a[1]); C[s.model][sc2[0][0]]++; tot++; if (sc2[0][1] >= .5 && sc2[0][1] - sc2[1][1] >= .15) { cov++; if (sc2[0][0] === s.model) covC++; } }
  }
  let diag = 0, tt = 0; for (const a of MODELS) for (const b of MODELS) { tt += C[a][b]; if (a === b) diag += C[a][b]; }
  console.log(`\nHONEST attribution (per-fold banks): argmax ${(100 * diag / tt).toFixed(1)}% | gated coverage ${(100 * cov / tot).toFixed(0)}% acc ${(100 * covC / Math.max(1, cov)).toFixed(1)}%`);

  // FINAL fit + export (threshold baked in)
  const zmF = zfit(all); const binM = trainLR(zap(all, zmF), DN, VOCAB.length, L2);
  const heads = {}; for (const m of MODELS) heads[m] = trainLR(zap(AIv, zmF).map(s => ({ ...s, y: s.model === m ? 1 : 0, w: s.model === m ? inv[m] : 1 })), DN, VOCAB.length, L2);
  const out = { note: 'v5.1 model: pruned features + L2=1e-3 + calibrated threshold; binary + 5-way attribution', threshold: +TH.toFixed(3), vocab: VOCAB, denseNames: names, denseMean: [...zmF.mean], denseStd: [...zmF.std], binary: { wBow: [...binM.wB], wDense: [...binM.wD], bias: binM.b }, attribution: Object.fromEntries(MODELS.map(m => [m, { wBow: [...heads[m].wB], wDense: [...heads[m].wD], bias: heads[m].b }])), aiBank: [...aiBank], modelBanks: Object.fromEntries(MODELS.map(m => [m, [...mBanks[m]]])), usage: USAGE, nAI: ai.length, nHuman: hum.length, cnt };
  fs.writeFileSync(ROOT + '/corpus/model_v5.json', JSON.stringify(out));
  console.log('\nEXPORTED corpus/model_v5.json (' + (fs.statSync(ROOT + '/corpus/model_v5.json').size / 1024 | 0) + ' KB, threshold ' + TH.toFixed(2) + ')');

  // re-score 4 refs at calibrated threshold
  const scoreNew = text => { const s = { bow: bow(text), dn: dnFrom(denseDict(text, aiBank, mBanks)) }; for (let j = 0; j < DN; j++) s.dn[j] = (s.dn[j] - zmF.mean[j]) / zmF.std[j]; return pred(binM, s, DN); };
  console.log('\n=== 4 refs: OLD% -> NEW% (verdict at th=' + TH.toFixed(2) + ') ===');
  const refs = [['Queen', 'Bohemian Rhapsody', 'HUMAN'], ['Justin Bieber', 'Baby', 'HUMAN']];
  for (const [a, t, tag] of refs) { const L = await fl(a, t); if (!L) { console.log('  [no fetch] ' + t); continue; } const p = scoreNew(L); console.log('  ' + (100 * predict(L, 'combined')).toFixed(0).padStart(3) + '% -> ' + (100 * p).toFixed(0).padStart(3) + '% ' + (p >= TH ? 'AI' : 'human').padEnd(6) + ' "' + t + '" (' + tag + ')'); }
  for (const [f, tag] of [['/tmp/annoying.txt', 'AI Suno song'], ['/tmp/dear_claude.txt', 'Dear Claude']]) { const L = fs.readFileSync(f, 'utf8'); const p = scoreNew(L); console.log('  ' + (100 * predict(L, 'combined')).toFixed(0).padStart(3) + '% -> ' + (100 * p).toFixed(0).padStart(3) + '% ' + (p >= TH ? 'AI' : 'human').padEnd(6) + ' ' + tag); }
})();
