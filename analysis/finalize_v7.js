/* finalize_v7.js — fit the FINAL v5 model on all data + EXPORT the deployable
 * artifact (model JSON + capped typicality phrase banks), report metrics, and
 * re-score the 4 reference songs old-vs-new. Humans read from /tmp/final_humans.json.
 */
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..');
const slop = require(ROOT + '/src/slop-core.js'), feats = require(ROOT + '/src/features.js'), pat = require('./patterns.js'), PX = require('./portability_tells.js');
const { predict } = require(ROOT + '/predict.js'); // OLD model, for before/after
const MODELS = ['suno', 'claude', 'grok', 'chatgpt', 'gemini'], USAGE = { chatgpt: .35, suno: .30, gemini: .12, claude: .12, grok: .05 };
const AIBANK_CAP = 8000, MODELBANK_CAP = 1500;

const toks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 1 || w === 'i');
const ENG = new Set('the and you i to a of in it is my me we be that this for on are with not no your so but all just like was have what when there her his she he they out up down know feel time'.split(' '));
const isEng = t => { const w = (String(t).toLowerCase().match(/[a-z']+/g) || []); return w.length >= 20 && (String(t).match(/[^\x00-\x7F]/g) || []).length / Math.max(1, t.length) <= .08 && w.filter(x => ENG.has(x)).length / w.length >= .12; };
const tri = t => { const w = toks(t), s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [...s]; };
function bankCapped(rows, cap) { const D = new Map(); for (const r of rows) for (const g of tri(r.text)) D.set(g, (D.get(g) || 0) + r.w); return new Set([...D.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, cap).map(e => e[0])); }
const typ = (t, b) => { const g = tri(t); return g.length ? g.filter(x => b.has(x)).length / g.length : 0; };
function dense(text, aiBank, mBanks) { const d = {}; try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {} const a = pat.analyze(text), nL = Math.max(1, a.__nLines), R = new Set(['contentDensity']); let cl = 0, rh = 0; for (const [k, v] of Object.entries(a)) { if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = R.has(n) ? v : v / nL; } else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v; } d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL; try { const sq = PX.selfQualify(text), ta = PX.templateAnaphora(text), hj = PX.hedgeJust(text); d.px_just = hj.justRate; d.px_negAnaphora = ta.negAnaphoraRate; d.px_correction = sq.correctionRate; d.px_selfQualify = sq.selfQualifyScore; } catch (e) {} d.typ_ai = aiBank ? typ(text, aiBank) : 0; if (mBanks) for (const m of MODELS) d['typ_' + m] = typ(text, mBanks[m]); else for (const m of MODELS) d['typ_' + m] = 0; return d; }
async function fl(a, t) { try { const r = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const l = (await r.json()).plainLyrics || ''; if (l.length > 60) return l; } } catch (e) {} try { const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const j = await r.json(); if (j.lyrics && j.lyrics.length > 60) return j.lyrics; } } catch (e) {} return ''; }
function trainLR(rows, DN, Vn) { const wB = new Float64Array(Vn), wD = new Float64Array(DN); let b = 0; const lr = .5, l2 = 1e-2; /* stronger L2: tame rare-feature overfit */ for (let e = 0; e < 100; e++) { for (let k = rows.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[rows[k], rows[j]] = [rows[j], rows[k]]; } for (const s of rows) { let z = b; for (const i in s.bow) z += wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += wD[j] * s.dn[j]; const p = 1 / (1 + Math.exp(-z)), g = s.w * (p - s.y); for (const i in s.bow) wB[i] -= lr * (g * s.bow[i] + l2 * wB[i]); for (let j = 0; j < DN; j++) wD[j] -= lr * (g * s.dn[j] + l2 * wD[j]); b -= lr * g; } } return { wB, wD, b }; }
const pred = (m, s, DN) => { let z = m.b; for (const i in s.bow) z += m.wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += m.wD[j] * s.dn[j]; return 1 / (1 + Math.exp(-z)); };

(async () => {
  // load AI + reweight
  const ai = [];
  for (const m of MODELS) for (const s of (JSON.parse(fs.readFileSync(`${ROOT}/corpus/models/${m}.json`)).songs || [])) { const t = s.lyrics_en || s.lyrics; if (typeof t === 'string' && t.length >= 120 && isEng(t)) ai.push({ model: m, text: t }); }
  const cnt = Object.fromEntries(MODELS.map(m => [m, ai.filter(r => r.model === m).length]));
  const rawW = Object.fromEntries(MODELS.map(m => [m, USAGE[m] / Math.max(1, cnt[m])])), sumW = ai.reduce((s, r) => s + rawW[r.model], 0), sc = ai.length / sumW;
  for (const r of ai) r.uw = rawW[r.model] * sc;
  const hum = JSON.parse(fs.readFileSync('/tmp/final_humans.json')).filter(isEng);
  console.log('AI', ai.length, JSON.stringify(cnt), '| human', hum.length);

  // banks (shipped, capped)
  const aiBank = bankCapped(ai.map(r => ({ text: r.text, w: r.uw })), AIBANK_CAP);
  const mBanks = Object.fromEntries(MODELS.map(m => [m, bankCapped(ai.filter(r => r.model === m).map(r => ({ text: r.text, w: 1 })), MODELBANK_CAP)]));
  console.log('banks: aiBank', aiBank.size, '| per-model', MODELS.map(m => m + ':' + mBanks[m].size).join(' '));

  // features
  const names = [...new Set(ai.map(r => r.text).concat(hum).slice(0, 80).flatMap(t => Object.keys(dense(t, aiBank, mBanks))))].sort(); const DN = names.length;
  const dfw = {}; for (const r of ai) for (const w of new Set(toks(r.text))) dfw[w] = (dfw[w] || 0) + 1;
  const VOCAB = Object.keys(dfw).filter(w => dfw[w] >= 2).sort(), IDX = new Map(VOCAB.map((w, i) => [w, i]));
  const bow = text => { const tk = toks(text), b = {}; for (const w of tk) { const i = IDX.get(w); if (i !== undefined) b[i] = (b[i] || 0) + 1; } const n = Math.max(1, tk.length); for (const i in b) b[i] /= n; return b; };
  const dnOf = (text) => { const d = dense(text, aiBank, mBanks), a = new Float64Array(DN); names.forEach((k, j) => a[j] = +d[k] || 0); return a; };
  const AIv = ai.map(r => ({ model: r.model, uw: r.uw, bow: bow(r.text), dn: dnOf(r.text) }));
  const HUv = hum.map(t => ({ bow: bow(t), dn: dnOf(t) }));
  console.log('vocab', VOCAB.length, '| dense', DN);

  const zfit = rows => { const mean = new Float64Array(DN), std = new Float64Array(DN); for (const s of rows) for (let j = 0; j < DN; j++) mean[j] += s.dn[j]; for (let j = 0; j < DN; j++) mean[j] /= rows.length; for (const s of rows) for (let j = 0; j < DN; j++) std[j] += (s.dn[j] - mean[j]) ** 2; for (let j = 0; j < DN; j++) std[j] = Math.sqrt(std[j] / rows.length) || 1; return { mean, std }; };
  const zap = (rows, m) => rows.map(s => { const c = s.dn.slice(); for (let j = 0; j < DN; j++) c[j] = (c[j] - m.mean[j]) / m.std[j]; return { ...s, dn: c }; });
  const totAIw = AIv.reduce((s, x) => s + x.uw, 0);

  // ---- generalization: train on 2000 humans, test on the UNSEEN rest ----
  const Hs = HUv.slice(); for (let k = Hs.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[Hs[k], Hs[j]] = [Hs[j], Hs[k]]; }
  const trainH = Hs.slice(0, 2000), testH = Hs.slice(2000);
  { const humW = totAIw / trainH.length; const tr = AIv.map(s => ({ ...s, y: 1, w: s.uw })).concat(trainH.map(s => ({ ...s, y: 0, w: humW }))); const zm = zfit(tr); const m = trainLR(zap(tr, zm), DN, VOCAB.length);
    const aiRec = zap(AIv, zm).filter(s => pred(m, s, DN) >= .5).length / AIv.length;
    const huRec = zap(testH, zm).filter(s => pred(m, s, DN) < .5).length / testH.length;
    console.log(`\nGENERALIZATION: train on 2000 humans -> AI-recall ${(100 * aiRec).toFixed(1)}% | human-recall on ${testH.length} UNSEEN ${(100 * huRec).toFixed(1)}%`); }

  // ---- 5-fold CV headline (with/without typicality) ----
  function cv(withTyp) { const all = AIv.map(s => ({ ...s, dn: withTyp ? s.dn.slice() : zt(s.dn), y: 1, w: s.uw })).concat(HUv.map(s => ({ ...s, dn: withTyp ? s.dn.slice() : zt(s.dn), y: 0, w: totAIw / HUv.length })));
    for (let k = all.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[all[k], all[j]] = [all[j], all[k]]; }
    let c = 0, t = 0, tp = 0, fp = 0, fn = 0; const K = 5; for (let f = 0; f < K; f++) { const te = all.filter((_, i) => i % K === f), trr = all.filter((_, i) => i % K !== f); const zm = zfit(trr); const m = trainLR(zap(trr, zm), DN, VOCAB.length); for (const s of zap(te, zm)) { const p = pred(m, s, DN) >= .5 ? 1 : 0; if (p === s.y) c++; t++; if (s.y && p) tp++; else if (!s.y && p) fp++; else if (s.y && !p) fn++; } } return { acc: c / t, prec: tp / Math.max(1, tp + fp), rec: tp / Math.max(1, tp + fn), fp, n: t }; }
  const TYPI = names.map((k, j) => k.startsWith('typ_') ? j : -1).filter(j => j >= 0);
  function zt(dn) { const c = dn.slice(); for (const j of TYPI) c[j] = 0; return c; }
  const nb = cv(false), wb = cv(true);
  console.log(`\n5-fold CV: without typ acc ${(100 * nb.acc).toFixed(1)}% prec ${(100 * nb.prec).toFixed(1)}% rec ${(100 * nb.rec).toFixed(1)}% | WITH typ acc ${(100 * wb.acc).toFixed(1)}% prec ${(100 * wb.prec).toFixed(1)}% rec ${(100 * wb.rec).toFixed(1)}%`);
  console.log(`human false-positive rate (WITH typ): ${(100 * wb.fp / HUv.length).toFixed(1)}%`);

  // ---- attribution 5-fold ----
  const inv = Object.fromEntries(MODELS.map(m => [m, ai.length / (MODELS.length * Math.max(1, cnt[m]))]));
  const aiO = AIv.map(s => ({ ...s, dn: s.dn.slice() })); for (let k = aiO.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[aiO[k], aiO[j]] = [aiO[j], aiO[k]]; }
  const C = {}; MODELS.forEach(a => { C[a] = {}; MODELS.forEach(b => C[a][b] = 0); }); let cov = 0, covC = 0, tot = 0;
  for (let f = 0; f < 5; f++) { const te = aiO.filter((_, i) => i % 5 === f), tr = aiO.filter((_, i) => i % 5 !== f); const zm = zfit(tr); const trz = zap(tr, zm), tez = zap(te, zm); const heads = {}; for (const m of MODELS) heads[m] = trainLR(trz.map(s => ({ ...s, y: s.model === m ? 1 : 0, w: s.model === m ? inv[m] : 1 })), DN, VOCAB.length); for (const s of tez) { const sc2 = MODELS.map(m => [m, pred(heads[m], s, DN)]).sort((a, b) => b[1] - a[1]); C[s.model][sc2[0][0]]++; tot++; if (sc2[0][1] >= .5 && sc2[0][1] - sc2[1][1] >= .15) { cov++; if (sc2[0][0] === s.model) covC++; } } }
  let diag = 0, tt = 0; for (const a of MODELS) for (const b of MODELS) { tt += C[a][b]; if (a === b) diag += C[a][b]; }
  console.log(`\nATTRIBUTION 5-way: argmax ${(100 * diag / tt).toFixed(1)}% | confidence-gated coverage ${(100 * cov / tot).toFixed(0)}% acc ${(100 * covC / Math.max(1, cov)).toFixed(1)}%`);
  console.log('  confusion: ' + MODELS.map(m => m.slice(0, 4)).join(' ')); for (const a of MODELS) console.log('   ' + a.padEnd(8) + MODELS.map(b => String(C[a][b]).padStart(6)).join(''));

  // ---- FINAL FIT (all data) + EXPORT ----
  const zmF = zfit(AIv.map(s => ({ ...s, y: 1 })).concat(HUv.map(s => ({ ...s, y: 0 }))));
  const allB = AIv.map(s => ({ ...s, y: 1, w: s.uw })).concat(HUv.map(s => ({ ...s, y: 0, w: totAIw / HUv.length })));
  const binM = trainLR(zap(allB, zmF), DN, VOCAB.length);
  const heads = {}; for (const m of MODELS) heads[m] = trainLR(zap(AIv, zmF).map(s => ({ ...s, y: s.model === m ? 1 : 0, w: s.model === m ? inv[m] : 1 })), DN, VOCAB.length);
  const out = { note: 'v5 combined model: usage-reweighted AI corpus + typicality; binary AI/human + 5-way attribution', vocab: VOCAB, denseNames: names, denseMean: [...zmF.mean], denseStd: [...zmF.std], binary: { wBow: [...binM.wB], wDense: [...binM.wD], bias: binM.b }, attribution: Object.fromEntries(MODELS.map(m => [m, { wBow: [...heads[m].wB], wDense: [...heads[m].wD], bias: heads[m].b }])), aiBank: [...aiBank], modelBanks: Object.fromEntries(MODELS.map(m => [m, [...mBanks[m]]])), usage: USAGE, nAI: ai.length, nHuman: hum.length, cnt };
  fs.writeFileSync(ROOT + '/corpus/model_v5.json', JSON.stringify(out));
  console.log('\nEXPORTED corpus/model_v5.json  (' + (fs.statSync(ROOT + '/corpus/model_v5.json').size / 1024 | 0) + ' KB)');

  // ---- dense weights (what's relevant) ----
  const ranked = names.map((k, j) => [k, binM.wD[j]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  console.log('\nTOP DENSE WEIGHTS (binary AI/human):'); ranked.slice(0, 14).forEach(([k, w]) => console.log('  ' + k.padEnd(20) + (w > 0 ? '+' : '') + w.toFixed(2) + (w > 0 ? ' (AI)' : ' (human)')));
  for (const k of ['typ_ai', 'px_just', 'px_negAnaphora', 'px_selfQualify', 's_imNotImB', 's_negNegPos']) { const j = names.indexOf(k); if (j >= 0) console.log('  [tracked] ' + k.padEnd(18) + (binM.wD[j] > 0 ? '+' : '') + binM.wD[j].toFixed(2)); }

  // ---- re-score 4 reference songs OLD vs NEW ----
  const scoreNew = text => { const s = { bow: bow(text), dn: dnOf(text) }; for (let j = 0; j < DN; j++) s.dn[j] = (s.dn[j] - zmF.mean[j]) / zmF.std[j]; return pred(binM, s, DN); };
  const attrNew = text => { const s = { bow: bow(text), dn: dnOf(text) }; for (let j = 0; j < DN; j++) s.dn[j] = (s.dn[j] - zmF.mean[j]) / zmF.std[j]; const sc2 = MODELS.map(m => [m, pred(heads[m], s, DN)]).sort((a, b) => b[1] - a[1]); return sc2[0][1] >= .5 && sc2[0][1] - sc2[1][1] >= .15 ? `${sc2[0][0]} ${(100 * sc2[0][1]).toFixed(0)}%` : 'uncertain'; };
  console.log('\n=== 4 reference songs: OLD model -> NEW model (% AI) ===');
  const refs = [['Queen', 'Bohemian Rhapsody', 'HUMAN'], ['Justin Bieber', 'Baby', 'HUMAN']];
  for (const [a, t, tag] of refs) { const L = await fl(a, t); if (!L) { console.log('  [no fetch] ' + t); continue; } console.log('  ' + (100 * predict(L, 'combined')).toFixed(0).padStart(3) + '% -> ' + (100 * scoreNew(L)).toFixed(0).padStart(3) + '%  "' + t + '" (' + tag + ')  attrib: ' + attrNew(L)); }
  for (const [f, tag] of [['/tmp/annoying.txt', 'AI Suno song'], ['/tmp/dear_claude.txt', 'Dear Claude']]) { const L = fs.readFileSync(f, 'utf8'); console.log('  ' + (100 * predict(L, 'combined')).toFixed(0).padStart(3) + '% -> ' + (100 * scoreNew(L)).toFixed(0).padStart(3) + '%  ' + tag + '  attrib: ' + attrNew(L)); }
})();
