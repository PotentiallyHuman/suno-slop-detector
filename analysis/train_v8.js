/* train_v8.js — train_v7 methodology + 9 AUDITED craft features + format false-positives STRIPPED.
 * HUMAN: read from /tmp/human_lyrics_cache.json (cached, no fetch). AI: 5 models, usage-reweighted.
 * 3 accumulating rounds (test on unseen humans) + 5-fold CV + typicality ablation, then the
 * DENSE WEIGHT TABLE so we see which features (craft incl.) predict human vs AI. Nothing excluded
 * except the format features, which are removed on principle (they flip on reformatting).
 */
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..');
const slop = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat = require('./patterns.js');
const PX = require('./portability_tells.js');
const craft = require(path.join(ROOT, 'app/engine/ext/craft_features.browser.js'));
const TARGET_H = parseInt(process.argv[2] || '6000', 10);
const MODELS = ['suno', 'claude', 'grok', 'chatgpt', 'gemini'];
const USAGE = { chatgpt: 0.35, suno: 0.30, gemini: 0.12, claude: 0.12, grok: 0.05 };
const STRIP = new Set(['f_avgLineLen', 'f_lineLenCV', 'f_phrasePerLine', 'f_avgWordLen', 's_endStoppedRatio', 'f_endRhymeRate', 'f_perfectRhymeRatio', 'f_rhymePerLine', 'lex_rhyme']);

const toks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 1 || w === 'i');
const ENGLISH = new Set('the and you i to a of in it is my me we be that this for on are with not no your so but all just like was have what when there her his she he they out up down know feel time'.split(' '));
function isEnglish(text) { const w = (String(text).toLowerCase().match(/[a-z']+/g) || []); if (w.length < 20) return false; if ((String(text).match(/[^\x00-\x7F]/g) || []).length / Math.max(1, text.length) > 0.08) return false; return w.filter(x => ENGLISH.has(x)).length / w.length >= 0.12; }
function tri(text) { const w = toks(text); const s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [...s]; }
function buildBankW(rows, thresh) { const DF = new Map(); for (const r of rows) for (const g of tri(r.text)) DF.set(g, (DF.get(g) || 0) + r.w); const b = new Set(); for (const [g, c] of DF) if (c >= thresh) b.add(g); return b; }
function typ(text, bank) { const g = tri(text); return g.length ? g.filter(x => bank.has(x)).length / g.length : 0; }
function dense(text) {
  const d = {}; try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {}
  const a = pat.analyze(text), nL = Math.max(1, a.__nLines), RATE = new Set(['contentDensity']); let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) { if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = RATE.has(n) ? v : v / nL; } else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v; }
  d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL;
  try { const sq = PX.selfQualify(text), ta = PX.templateAnaphora(text), hj = PX.hedgeJust(text); d['px_just'] = hj.justRate; d['px_negAnaphora'] = ta.negAnaphoraRate; d['px_resolvedNot'] = ta.resolvedNotRate; d['px_correction'] = sq.correctionRate; d['px_denyRun'] = sq.denyRunRate; d['px_selfQualify'] = sq.selfQualifyScore; } catch (e) {}
  const cfv = craft.extract(text); for (const k in cfv) d[k] = cfv[k];   // <-- 9 audited craft features
  return d;
}
function trainLR(rows, DN, VOCABn, init) { const wB = new Float64Array(VOCABn), wD = init ? init.wD.slice() : new Float64Array(DN); let b = init ? init.b : 0; if (init) wB.set(init.wB); const lr = 0.5, l2 = 3e-4, EP = init ? 50 : 100;
  for (let e = 0; e < EP; e++) { for (let k = rows.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[rows[k], rows[j]] = [rows[j], rows[k]]; }
    for (const s of rows) { let z = b; for (const i in s.bow) z += wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += wD[j] * s.dn[j]; const p = 1 / (1 + Math.exp(-z)), g = s.w * (p - s.y); for (const i in s.bow) wB[i] -= lr * (g * s.bow[i] + l2 * wB[i]); for (let j = 0; j < DN; j++) wD[j] -= lr * (g * s.dn[j] + l2 * wD[j]); b -= lr * g; } } return { wB, wD, b }; }
const predLR = (m, s, DN) => { let z = m.b; for (const i in s.bow) z += m.wB[i] * s.bow[i]; for (let j = 0; j < DN; j++) z += m.wD[j] * s.dn[j]; return 1 / (1 + Math.exp(-z)); };

(async () => {
  // HUMAN from cache (no fetch)
  let humTexts = Object.values(JSON.parse(fs.readFileSync('/tmp/human_lyrics_cache.json'))).filter(t => typeof t === 'string' && t.length > 120 && isEnglish(t));
  for (let k = humTexts.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[humTexts[k], humTexts[j]] = [humTexts[j], humTexts[k]]; }
  humTexts = humTexts.slice(0, TARGET_H);
  console.log('HUMAN songs (cached):', humTexts.length);
  // AI
  const ai = [];
  for (const m of MODELS) { try { for (const s of (JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/models', m + '.json'))).songs || [])) { const t = s.lyrics_en || s.lyrics; if (typeof t === 'string' && t.length >= 120 && isEnglish(t)) ai.push({ model: m, text: t }); } } catch (e) {} }
  const cnt = Object.fromEntries(MODELS.map(m => [m, ai.filter(r => r.model === m).length]));
  const rawW = Object.fromEntries(MODELS.map(m => [m, (USAGE[m] || 0) / Math.max(1, cnt[m])]));
  const sumW = ai.reduce((s, r) => s + rawW[r.model], 0), scale = ai.length / sumW; for (const r of ai) r.uw = rawW[r.model] * scale;
  console.log('AI songs:', ai.length, JSON.stringify(cnt));
  // features (format STRIPPED from baseNames)
  const dfw = {}; for (const r of ai) for (const w of new Set(toks(r.text))) dfw[w] = (dfw[w] || 0) + 1;
  const VOCAB = Object.keys(dfw).filter(w => dfw[w] >= 2).sort(); const IDX = new Map(VOCAB.map((w, i) => [w, i]));
  const baseNames = [...new Set(ai.map(r => r.text).concat(humTexts).slice(0, 60).flatMap(t => Object.keys(dense(t))))].filter(k => !STRIP.has(k)).sort();
  console.log('dense features:', baseNames.length, '(format stripped:', [...STRIP].length, '| craft added:', craft.names.length + ')');
  const TYP = ['typ_ai', ...MODELS.map(m => 'typ_' + m)], denseNames = [...baseNames, ...TYP], DN = denseNames.length;
  const IT = Object.fromEntries(TYP.map(t => [t, denseNames.indexOf(t)]));
  const bowOf = text => { const tk = toks(text), bow = {}; for (const w of tk) { const i = IDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; } const n = Math.max(1, tk.length); for (const i in bow) bow[i] /= n; return bow; };
  const baseDense = text => { const d = dense(text); const arr = new Float64Array(DN); baseNames.forEach((k, j) => arr[j] = (+d[k] || 0)); return arr; };
  const aiBank = buildBankW(ai.map(r => ({ text: r.text, w: r.uw })), 4);
  const vec = text => { const dn = baseDense(text); dn[IT.typ_ai] = typ(text, aiBank); return { bow: bowOf(text), dn }; };
  const AIv = ai.map(r => ({ model: r.model, uw: r.uw, ...vec(r.text), y: 1 }));
  const HUv = humTexts.map(t => ({ ...vec(t), y: 0 }));
  const zfit = rows => { const mean = new Float64Array(DN), std = new Float64Array(DN); for (const s of rows) for (let j = 0; j < DN; j++) mean[j] += s.dn[j]; for (let j = 0; j < DN; j++) mean[j] /= rows.length; for (const s of rows) for (let j = 0; j < DN; j++) std[j] += (s.dn[j] - mean[j]) ** 2; for (let j = 0; j < DN; j++) std[j] = Math.sqrt(std[j] / rows.length) || 1; return { mean, std }; };
  const zap = (rows, m) => rows.map(s => { const c = s.dn.slice(); for (let j = 0; j < DN; j++) c[j] = (c[j] - m.mean[j]) / m.std[j]; return { ...s, dn: c }; });
  // 3 accumulating rounds (test on unseen humans)
  const per = Math.floor(HUv.length / 3), B = [HUv.slice(0, per), HUv.slice(per, 2 * per), HUv.slice(2 * per)];
  console.log('\n=== 3 accumulating rounds (human-recall on UNSEEN batches) ===');
  let warm = null;
  for (let r = 0; r < 3; r++) {
    const trainHum = B.slice(0, r + 1).flat(), testHum = B.slice(r + 1).flat();
    const totAIw = AIv.reduce((s, x) => s + x.uw, 0), humW = totAIw / Math.max(1, trainHum.length);
    const tr = AIv.map(s => ({ ...s, w: s.uw })).concat(trainHum.map(s => ({ ...s, w: humW })));
    const zm = zfit(tr); const m = trainLR(zap(tr, zm), DN, VOCAB.length, warm); warm = m;
    const aiRec = zap(AIv, zm).filter(s => predLR(m, s, DN) >= 0.5).length / AIv.length;
    let humRec = '(none left)'; if (testHum.length) { const hz = zap(testHum, zm); humRec = (100 * hz.filter(s => predLR(m, s, DN) < 0.5).length / hz.length).toFixed(1) + '%'; }
    console.log(`  round ${r + 1}: AI+${trainHum.length} humans | AI-recall ${(100 * aiRec).toFixed(1)}% | human-recall UNSEEN ${humRec}`);
  }
  // 5-fold CV
  const totAIw = AIv.reduce((s, x) => s + x.uw, 0), humW = totAIw / HUv.length;
  const all = AIv.map(s => ({ ...s, w: s.uw })).concat(HUv.map(s => ({ ...s, w: humW })));
  for (let k = all.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[all[k], all[j]] = [all[j], all[k]]; }
  let c = 0, t = 0; const K = 5; let finalM = null, finalZm = null;
  for (let f = 0; f < K; f++) { const te = all.filter((_, i) => i % K === f), trr = all.filter((_, i) => i % K !== f); const zm = zfit(trr); const m = trainLR(zap(trr, zm), DN, VOCAB.length); finalM = m; finalZm = zm; for (const s of zap(te, zm)) { const p = predLR(m, s, DN) >= 0.5 ? 1 : 0; if (p === s.y) c++; t++; } }
  console.log('\n=== 5-fold CV: acc ' + (100 * c / t).toFixed(1) + '% ===');
  // WEIGHT TABLE (dense, z-scored model from last fold)
  const rows = denseNames.map((n, j) => ({ n, w: finalM.wD[j] })).sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
  let out = `train_v8 weight table — dense features (format stripped, craft added)\n>0 = predicts AI, <0 = predicts HUMAN (AI label=1)\n\n`;
  rows.forEach(r => { out += `  ${r.n.padEnd(24)} ${(r.w >= 0 ? '+' : '') + r.w.toFixed(2)}${craft.names.includes(r.n) ? '   <- NEW craft' : ''}\n`; });
  fs.writeFileSync('/tmp/train_v8_weights.txt', out); console.log('\n' + out);

  // ---- EXPORT shippable model_v8.json (final model on ALL data) ----
  const zmAll = zfit(all); const mFull = trainLR(zap(all, zmAll), DN, VOCAB.length);
  const wBow = {}; for (let i = 0; i < mFull.wB.length; i++) if (Math.abs(mFull.wB[i]) > 1e-4) wBow[i] = +mFull.wB[i].toFixed(4);
  const model = { version: 'v8', bias: mFull.b, wDense: [...mFull.wD].map(x => +x.toFixed(4)), wBow,
    denseNames, vocab: VOCAB, zmean: [...zmAll.mean].map(x => +x.toFixed(5)), zstd: [...zmAll.std].map(x => +x.toFixed(5)),
    aiBank: [...aiBank], stripped: [...STRIP], craftNames: craft.names, threshold: 0.5, cvAcc: +(100 * c / t).toFixed(1) };
  fs.writeFileSync(path.join(ROOT, 'corpus/model_v8.json'), JSON.stringify(model));
  console.log('\nEXPORTED corpus/model_v8.json  (' + DN + ' dense + ' + VOCAB.length + ' bow words, CV ' + model.cvAcc + '%)');
})();
