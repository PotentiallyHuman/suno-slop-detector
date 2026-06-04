/* train_v7.js — full-scale multi-round trainer (matches the original method).
 * AI fixed (~2000, 5 models, English, usage-reweighted). HUMAN = 6000 distinct
 * songs fetched live, split into 3 batches. The AI-vs-human detector is trained
 * in 3 ACCUMULATING rounds — round r trains on AI + batches 1..r and is tested on
 * the batches it has NOT seen yet (true generalization to unseen humans).
 * Then a 5-fold CV headline (+ typicality ablation) and the 5-way model-attribution.
 * Resumable: fetched human text cached transiently in /tmp/human6k.json.
 */
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..');
const slop = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat = require('./patterns.js');
const TARGET_H = parseInt(process.argv[2] || '6000', 10);
const MODELS = ['suno', 'claude', 'grok', 'chatgpt', 'gemini'];
const USAGE = { chatgpt: 0.35, suno: 0.30, gemini: 0.12, claude: 0.12, grok: 0.05 };
const CACHE = '/tmp/human6k.json';

const toks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 1 || w === 'i');
const ENGLISH = new Set('the and you i to a of in it is my me we be that this for on are with not no your so but all just like was have what when there her his she he they out up down know feel time'.split(' '));
function isEnglish(text) { const w = (String(text).toLowerCase().match(/[a-z']+/g) || []); if (w.length < 20) return false; if ((String(text).match(/[^\x00-\x7F]/g) || []).length / Math.max(1, text.length) > 0.08) return false; return w.filter(x => ENGLISH.has(x)).length / w.length >= 0.12; }
function tri(text) { const w = toks(text); const s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [...s]; }
function buildBankW(rows, thresh) { const DF = new Map(); for (const r of rows) for (const g of tri(r.text)) DF.set(g, (DF.get(g) || 0) + r.w); const b = new Set(); for (const [g, c] of DF) if (c >= thresh) b.add(g); return b; }
function typ(text, bank) { const g = tri(text); return g.length ? g.filter(x => bank.has(x)).length / g.length : 0; }
const PX = require('./portability_tells.js');
function dense(text) { const d = {}; try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {} const a = pat.analyze(text), nL = Math.max(1, a.__nLines), RATE = new Set(['contentDensity']); let cl = 0, rh = 0; for (const [k, v] of Object.entries(a)) { if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = RATE.has(n) ? v : v / nL; } else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v; } d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL;
  // NEW portability detectors (filler-just + contraction-aware negation templates)
  try { const sq = PX.selfQualify(text), ta = PX.templateAnaphora(text), hj = PX.hedgeJust(text);
    d['px_just'] = hj.justRate; d['px_negAnaphora'] = ta.negAnaphoraRate; d['px_resolvedNot'] = ta.resolvedNotRate;
    d['px_correction'] = sq.correctionRate; d['px_denyRun'] = sq.denyRunRate; d['px_selfQualify'] = sq.selfQualifyScore; } catch (e) {}
  return d; }
async function fetchLyrics(a, t) {
  try { const r = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const l = (await r.json()).plainLyrics || ''; if (l.length > 60) return l; } } catch (e) {}
  try { const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(9000) }); if (r.ok) { const j = await r.json(); if (j.lyrics && j.lyrics.length > 60) return j.lyrics; } } catch (e) {}
  return '';
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); }
function trainLR(rows, DN, VOCABn, init) { const wB = new Float64Array(VOCABn), wD = init ? init.wD.slice() : new Float64Array(DN); let b = init ? init.b : 0; if (init) wB.set(init.wB); const lr = 0.5, l2 = 3e-4, EP = init ? 50 : 100;
  for (let e = 0; e < EP; e++) { for (let k = rows.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[rows[k], rows[j]] = [rows[j], rows[k]]; }
    for (const s of rows) { let z = b; for (const i in s.bow) z += wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += wD[j] * s.dn[j]; const p = 1 / (1 + Math.exp(-z)), g = s.w * (p - s.y); for (const i in s.bow) wB[i] -= lr * (g * s.bow[i] + l2 * wB[i]); for (let j = 0; j < DN; j++) wD[j] -= lr * (g * s.dn[j] + l2 * wD[j]); b -= lr * g; } } return { wB, wD, b }; }
const predLR = (m, s, DN) => { let z = m.b; for (const i in s.bow) z += m.wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += m.wD[j] * s.dn[j]; return 1 / (1 + Math.exp(-z)); };

(async () => {
  // ---------- HUMAN: resumable live fetch to /tmp cache ----------
  let humTexts = [];
  if (fs.existsSync(CACHE)) { humTexts = JSON.parse(fs.readFileSync(CACHE)); process.stderr.write(`cache: ${humTexts.length} humans\n`); }
  if (humTexts.length < TARGET_H) {
    let profs = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/human_profiles.json'))).profiles.filter(p => p.artist && p.title && (p.lang || 'en') === 'en');
    for (let k = profs.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[profs[k], profs[j]] = [profs[j], profs[k]]; }
    let got = humTexts.length, n = 0;
    await pool(profs, 8, async (p) => { if (got >= TARGET_H) return; const t = await fetchLyrics(p.artist, p.title); n++; if (t && t.length > 120 && isEnglish(t)) { humTexts.push(t); got++; if (got % 250 === 0) { fs.writeFileSync(CACHE, JSON.stringify(humTexts)); process.stderr.write(`  human ${got} (tried ${n})\n`); } } });
    fs.writeFileSync(CACHE, JSON.stringify(humTexts));
  }
  humTexts = humTexts.slice(0, TARGET_H);
  console.log('HUMAN songs:', humTexts.length);

  // ---------- AI: 5 models, English, usage-reweighted ----------
  const ai = [];
  for (const m of MODELS) for (const s of (JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/models', m + '.json'))).songs || [])) { const t = s.lyrics_en || s.lyrics; if (typeof t === 'string' && t.length >= 120 && isEnglish(t)) ai.push({ model: m, text: t }); }
  const cnt = Object.fromEntries(MODELS.map(m => [m, ai.filter(r => r.model === m).length]));
  const rawW = Object.fromEntries(MODELS.map(m => [m, (USAGE[m] || 0) / Math.max(1, cnt[m])]));
  const sumW = ai.reduce((s, r) => s + rawW[r.model], 0), scale = ai.length / sumW;
  for (const r of ai) r.uw = rawW[r.model] * scale;
  console.log('AI songs:', ai.length, JSON.stringify(cnt));

  // ---------- features ----------
  const dfw = {}; for (const r of ai) for (const w of new Set(toks(r.text))) dfw[w] = (dfw[w] || 0) + 1;
  const VOCAB = Object.keys(dfw).filter(w => dfw[w] >= 2).sort(); const IDX = new Map(VOCAB.map((w, i) => [w, i]));
  const baseNames = [...new Set(ai.map(r => r.text).concat(humTexts).slice(0, 60).flatMap(t => Object.keys(dense(t))))].sort();
  const TYP = ['typ_ai', ...MODELS.map(m => 'typ_' + m)], denseNames = [...baseNames, ...TYP], DN = denseNames.length;
  const IT = Object.fromEntries(TYP.map(t => [t, denseNames.indexOf(t)]));
  const bowOf = text => { const tk = toks(text), bow = {}; for (const w of tk) { const i = IDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; } const n = Math.max(1, tk.length); for (const i in bow) bow[i] /= n; return bow; };
  const baseDense = text => { const d = dense(text); const arr = new Float64Array(DN); baseNames.forEach((k, j) => arr[j] = (+d[k] || 0)); return arr; };
  // global AI typicality bank (usage-weighted) — built from AI only
  const aiBank = buildBankW(ai.map(r => ({ text: r.text, w: r.uw })), 4);
  const vec = (text, extraTyp) => { const dn = baseDense(text); dn[IT.typ_ai] = typ(text, aiBank); if (extraTyp) for (const k in extraTyp) dn[IT[k]] = extraTyp[k]; return { bow: bowOf(text), dn }; };
  const AIv = ai.map(r => ({ model: r.model, uw: r.uw, ...vec(r.text), text: r.text, y: 1 }));
  const HUv = humTexts.map(t => ({ ...vec(t), y: 0 }));
  const zfit = rows => { const mean = new Float64Array(DN), std = new Float64Array(DN); for (const s of rows) for (let j = 0; j < DN; j++) mean[j] += s.dn[j]; for (let j = 0; j < DN; j++) mean[j] /= rows.length; for (const s of rows) for (let j = 0; j < DN; j++) std[j] += (s.dn[j] - mean[j]) ** 2; for (let j = 0; j < DN; j++) std[j] = Math.sqrt(std[j] / rows.length) || 1; return { mean, std }; };
  const zap = (rows, m) => rows.map(s => { const c = s.dn.slice(); for (let j = 0; j < DN; j++) c[j] = (c[j] - m.mean[j]) / m.std[j]; return { ...s, dn: c }; });

  // ---------- 3 ACCUMULATING human-rotation rounds ----------
  const B = [HUv.slice(0, 2000), HUv.slice(2000, 4000), HUv.slice(4000, 6000)];
  console.log('\n=== AI-vs-HUMAN detector: 3 accumulating rounds (test on UNSEEN humans) ===');
  let warm = null;
  for (let r = 0; r < 3; r++) {
    const trainHum = B.slice(0, r + 1).flat(), testHum = B.slice(r + 1).flat();
    const totAIw = AIv.reduce((s, x) => s + x.uw, 0), humW = totAIw / Math.max(1, trainHum.length);
    const tr = AIv.map(s => ({ ...s, w: s.uw })).concat(trainHum.map(s => ({ ...s, w: humW })));
    const zm = zfit(tr); const m = trainLR(zap(tr, zm), DN, VOCAB.length, warm); warm = m;
    // AI recall (held-in, indicative) + human recall on UNSEEN batches
    const aiRec = zap(AIv, zm).filter(s => predLR(m, s, DN) >= 0.5).length / AIv.length;
    let humRec = '(none left)';
    if (testHum.length) { const hz = zap(testHum, zm); humRec = (100 * hz.filter(s => predLR(m, s, DN) < 0.5).length / hz.length).toFixed(1) + '%'; }
    console.log(`  round ${r + 1}: trained on AI + ${trainHum.length} humans | AI-recall ${(100 * aiRec).toFixed(1)}% | human-recall on ${testHum.length} UNSEEN ${humRec}`);
  }

  // ---------- 5-fold CV headline + typicality ablation (all 6000 humans) ----------
  function cv(withTyp) {
    const totAIw = AIv.reduce((s, x) => s + x.uw, 0), humW = totAIw / HUv.length;
    const all = AIv.map(s => ({ ...s, dn: withTyp ? s.dn.slice() : zeroTyp(s.dn), w: s.uw, y: 1 })).concat(HUv.map(s => ({ ...s, dn: withTyp ? s.dn.slice() : zeroTyp(s.dn), w: humW, y: 0 })));
    for (let k = all.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[all[k], all[j]] = [all[j], all[k]]; }
    let c = 0, t = 0, tp = 0, fp = 0, fn = 0; const K = 5;
    for (let f = 0; f < K; f++) { const te = all.filter((_, i) => i % K === f), trr = all.filter((_, i) => i % K !== f); const zm = zfit(trr); const m = trainLR(zap(trr, zm), DN, VOCAB.length); for (const s of zap(te, zm)) { const p = predLR(m, s, DN) >= 0.5 ? 1 : 0; if (p === s.y) c++; t++; if (s.y && p) tp++; else if (!s.y && p) fp++; else if (s.y && !p) fn++; } }
    return { acc: c / t, prec: tp / Math.max(1, tp + fp), rec: tp / Math.max(1, tp + fn) };
  }
  function zeroTyp(dn) { const c = dn.slice(); for (const k of TYP) c[IT[k]] = 0; return c; }
  console.log('\n=== 5-fold CV (all ' + HUv.length + ' humans) ===');
  const nb = cv(false), wb = cv(true);
  console.log('  without typicality : acc ' + (100 * nb.acc).toFixed(1) + '%  precAI ' + (100 * nb.prec).toFixed(1) + '%  recAI ' + (100 * nb.rec).toFixed(1) + '%');
  console.log('  WITH typicality    : acc ' + (100 * wb.acc).toFixed(1) + '%  precAI ' + (100 * wb.prec).toFixed(1) + '%  recAI ' + (100 * wb.rec).toFixed(1) + '%');

  // ---------- attribution (5-way, conf-gated) ----------
  console.log('\n=== model attribution (5-way), 5-fold CV ===');
  const inv = Object.fromEntries(MODELS.map(m => [m, ai.length / (MODELS.length * Math.max(1, cnt[m]))]));
  const aiOnly = AIv.map(s => ({ ...s, dn: s.dn.slice() })); for (let k = aiOnly.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[aiOnly[k], aiOnly[j]] = [aiOnly[j], aiOnly[k]]; }
  const K = 5, C = {}; MODELS.forEach(a => { C[a] = {}; MODELS.forEach(b => C[a][b] = 0); }); let cov = 0, covC = 0, tot2 = 0;
  for (let f = 0; f < K; f++) { const te = aiOnly.filter((_, i) => i % K === f), tr = aiOnly.filter((_, i) => i % K !== f);
    const banks = Object.fromEntries(MODELS.map(m => [m, buildBankW(tr.filter(s => s.model === m).map(s => ({ text: s.text, w: 1 })), 3)]));
    for (const s of tr.concat(te)) for (const m of MODELS) s.dn[IT['typ_' + m]] = typ(s.text, banks[m]);
    const zm = zfit(tr), trz = zap(tr, zm), tez = zap(te, zm);
    const heads = {}; for (const m of MODELS) heads[m] = trainLR(trz.map(s => ({ ...s, y: s.model === m ? 1 : 0, w: s.model === m ? inv[m] : 1 })), DN, VOCAB.length);
    for (const s of tez) { const sc = MODELS.map(m => [m, predLR(heads[m], s, DN)]).sort((a, b) => b[1] - a[1]); const pred = sc[0][0]; C[s.model][pred]++; tot2++; if (sc[0][1] >= 0.5 && sc[0][1] - sc[1][1] >= 0.15) { cov++; if (pred === s.model) covC++; } }
  }
  console.log('  confusion (row=true): ' + MODELS.map(m => m.slice(0, 4)).join(' '));
  let diag = 0, tt = 0; for (const a of MODELS) { console.log('   ' + a.padEnd(8) + MODELS.map(b => String(C[a][b]).padStart(6)).join('')); for (const b of MODELS) { tt += C[a][b]; if (a === b) diag += C[a][b]; } }
  console.log('  argmax acc ' + (100 * diag / tt).toFixed(1) + '%  | confidence-gated: coverage ' + (100 * cov / tot2).toFixed(0) + '% acc ' + (100 * covC / Math.max(1, cov)).toFixed(1) + '%');
})();
