#!/usr/bin/env node
/* pipeline_tier3.js — pipeline_fresh.js + tier-3 semantic features.
 *
 * Adds 7 text-only craft detectors (argument markers, meta-observation,
 * conditionals, specific referent density, numeric referent, inanimate-animate
 * personification, inline contradiction) AND 5 embedding-based coherence
 * features (adj cos mean/min/std, doc consistency, self repeat).
 *
 * Pre-computes embeddings in a concurrent pool before training so denseDict
 * stays synchronous in the inner loop.
 *
 * Outputs: same file set as pipeline_fresh.js — drop-in replacement.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const slop  = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat   = require(path.join(ROOT, 'analysis/patterns.js'));
const t3    = require(path.join(ROOT, 'analysis/tier3_detectors.js'));
const emb   = require(path.join(ROOT, 'analysis/embeddings.js'));
require(path.join(ROOT, 'src/common_words.js'));                    // SlopCommon global for wit lens
const persp = require(path.join(ROOT, 'analysis/perspectives.js')); // tier-4 craft-perspective lenses (t4_*)

const STOP = new Set("a an the and or but if then so as of to in on at by for with from into about over under up down out off i you he she it we they me him her us them my your his its our their this that these those is am are was were be been being do does did have has had will would can could should may might must shall not no n't oh yeah la na ooh".split(/\s+/));
// Section-marker words — exclude from BoW + content frequencies. Even if used
// legitimately as content ("the chorus rang loud"), they're a leak risk because
// many sources include them as labels we can't always strip.
const SECTION_BLACKLIST = new Set([
  'verse', 'verses', 'chorus', 'choruses', 'bridge', 'bridges', 'intro',
  'outro', 'hook', 'hooks', 'refrain', 'refrains', 'breakdown', 'coda',
  'interlude', 'prechorus', 'postchorus', 'reprise', 'vamp', 'tag',
  'vers', 'omkvad', 'omkvaed', 'verso', 'estribillo', 'puente',
  'couplet', 'pont', 'ritornello'
]);
// Non-English function words: the AI side has some Spanish/French songs (mariachi/flamenco/
// tango prompts) but the human corpus is English-only, so these would otherwise become a
// spurious "language -> AI" BoW shortcut. Exclude from BoW + content tokens.
const NONEN_STOP = new Set('el la los las un una que en por con para pero se mi tu lo del como esta este eso esa ese nada todo soy eres muy sin cuando porque donde je les des une est dans pour avec che gli della sono non il elle ich und der die das ist nicht'.split(/\s+/));
const contentTokens = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => !STOP.has(w) && !SECTION_BLACKLIST.has(w) && !NONEN_STOP.has(w) && w.length > 2);
const bowToks       = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => !SECTION_BLACKLIST.has(w) && !NONEN_STOP.has(w) && (w.length > 1 || w === 'i'));

// Persistent local cache so a re-run RESUMES instead of re-fetching (the live fetch gets
// randomly SIGKILLed in this env). Local dev cache only — the shipped model stays numbers-only.
const LYR_CACHE_FILE = process.env.LYR_CACHE || '/tmp/human_lyrics_cache.json';
let LYR_CACHE = {}; try { LYR_CACHE = JSON.parse(fs.readFileSync(LYR_CACHE_FILE, 'utf8')); } catch (_) {}
let _lyrDirty = 0;
function saveLyrCache() { try { fs.writeFileSync(LYR_CACHE_FILE, JSON.stringify(LYR_CACHE)); } catch (_) {} }
async function fetchLyrics(artist, title) {
  const key = artist + '' + title;
  if (Object.prototype.hasOwnProperty.call(LYR_CACHE, key)) return LYR_CACHE[key];   // cached (incl. '' misses)
  let out = '';
  try { const r = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`); if (r.ok) { const j = await r.json(); if (j.plainLyrics && j.plainLyrics.length > 60) out = j.plainLyrics; } } catch (_) {}
  if (!out) try { const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`); if (r.ok) { const j = await r.json(); if (j.lyrics && j.lyrics.length > 60) out = j.lyrics; } } catch (_) {}
  LYR_CACHE[key] = out; if (++_lyrDirty % 40 === 0) saveLyrCache();              // persist incrementally
  return out;
}
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

function denseDict(s) {
  const text = s.text;
  const d = {};
  try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (_) {}
  const a = pat.analyze(text);
  const nL = Math.max(1, a.__nLines);
  const RATE = new Set(['contentDensity']);
  let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = RATE.has(n) ? v : v / nL; }
    else if (k.startsWith('cliche::')) cl += v;
    else if (k.startsWith('rhyme::'))  rh += v;
  }
  d['lex_cliche'] = cl / nL;
  d['lex_rhyme']  = rh / nL;
  // tier-3 text-only craft detectors
  const tf = t3.analyze(text);
  for (const k in tf) d[k] = tf[k];
  // tier-3 embedding coherence (pre-computed on song object)
  if (s.t3emb) for (const k in s.t3emb) d[k] = s.t3emb[k];
  // tier-4 craft-perspective lenses (rapper/poet/wit/psych/phil/story) — text-only. NO_T4=1 to A/B.
  if (!process.env.NO_T4) { try { const pf = persp.features(text); for (const k in pf) d[k] = pf[k]; } catch (_) {} }
  return d;
}

(async () => {
  const startedAt = new Date().toISOString();
  console.log('=== pipeline_tier3 start ===');

  // [1] AI corpus
  console.log('\n[1] loading AI corpus from disk...');
  let aiRaw = []; const perModel = {};
  for (const file of fs.readdirSync(path.join(ROOT, 'corpus/models'))) {
    if (!/\.json$/.test(file)) continue;
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/models', file)));
    for (const s of (j.songs || j)) {
      const tx = s.lyrics || s;
      if (typeof tx === 'string' && tx.length > 40) {
        const m = s.model || j.model || file.replace('.json', '');
        aiRaw.push({ model: m, text: tx });
        perModel[m] = (perModel[m] || 0) + 1;
      }
    }
  }
  console.log(`  AI songs loaded: ${aiRaw.length}`);

  // --- BALANCE: English-only + cap Claude-family, for an English-vs-English source-balanced corpus ---
  const NONEN = /\b(que|los|las|para|pero|con|por|una|este|esta|cuando|porque|nada|todo|corazon|amor|noche|vida|je|les|des|une|dans|pour|avec|che|gli|della|sono|ich|und|nicht|vous|nous)\b/gi;
  const beforeN = aiRaw.length;
  aiRaw = aiRaw.filter(s => (s.text.match(NONEN) || []).length < 4);
  const afterEn = aiRaw.length;
  const CLAUDE_CAP = (process.env.CLAUDE_CAP != null) ? +process.env.CLAUDE_CAP : 1000;
  const claudeSongs = aiRaw.filter(s => /claude/i.test(s.model));
  const otherSongs = aiRaw.filter(s => !/claude/i.test(s.model));
  for (let i = claudeSongs.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[claudeSongs[i], claudeSongs[j]] = [claudeSongs[j], claudeSongs[i]]; }
  aiRaw = otherSongs.concat(claudeSongs.slice(0, CLAUDE_CAP));
  for (let i = aiRaw.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[aiRaw[i], aiRaw[j]] = [aiRaw[j], aiRaw[i]]; }
  if (process.env.MAX_AI) aiRaw = aiRaw.slice(0, +process.env.MAX_AI);   // subsample for a fast run that finishes before the fetch-killer
  console.log(`  AI balance: ${beforeN} -> drop ${beforeN - afterEn} non-English -> cap Claude ${claudeSongs.length}->${Math.min(claudeSongs.length, CLAUDE_CAP)} -> ${aiRaw.length}`);

  // [2] Humans (live fetch)
  console.log('\n[2] fetching humans live...');
  const hp = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/human_profiles.json')));
  let list = hp.profiles.filter(p => p.artist && p.title);
  // SEEDED shuffle (deterministic) so re-runs target the SAME humans → the fetch cache converges.
  let _seed = 1234567;
  const _rnd = () => { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; };
  for (let i = list.length - 1; i > 0; i--) { const j = (_rnd() * (i + 1)) | 0;[list[i], list[j]] = [list[j], list[i]]; }
  list = list.slice(0, Math.round(aiRaw.length * 1.12));   // down-sample humans ~1:1 with AI (+12% for fetch fails)
  console.log(`  target: ${list.length} human songs (balanced to AI)`);
  const humanRaw = []; let done = 0, fail = 0;
  await pool(list, +(process.env.FETCH_POOL || 24), async (s) => {
    const tx = await fetchLyrics(s.artist, s.title);
    done++;
    if (tx && tx.length > 60) humanRaw.push({ artist: s.artist, title: s.title, year: s.year, genre: s.genre, text: tx });
    else fail++;
    if (done % 200 === 0) console.log(`  fetched ${done}/${list.length} (${fail} failed)`);
  });
  saveLyrCache();   // flush full fetch cache so the next run reuses everything (resume-safe)
  console.log(`  human songs fetched: ${humanRaw.length}  (${fail} failed)`);

  // [2.5] Embedding-based coherence features. SKIPPED when NO_EMBED=1, because emb_ needs
  // ollama, which a browser extension can't run — the extension must reproduce every feature
  // from text alone, so v2 ships no-embed (text-only, deterministic, on-device).
  const allSongs = aiRaw.concat(humanRaw);
  if (process.env.NO_EMBED) {
    console.log('\n[2.5] NO_EMBED=1 -> skipping embeddings (text-only / extension-reproducible model)');
  } else {
    console.log('\n[2.5] computing embedding-based semantic features...');
    let embDone = 0; let embFail = 0;
    const t0 = Date.now();
    await pool(allSongs, 8, async (s) => {
      try { s.t3emb = await emb.analyze(s.text); }
      catch (_) { s.t3emb = null; embFail++; }
      embDone++;
      if (embDone % 250 === 0) {
        const rate = embDone / ((Date.now() - t0) / 1000);
        const eta = Math.round((allSongs.length - embDone) / rate);
        console.log(`  embedded ${embDone}/${allSongs.length}  (rate ${rate.toFixed(1)}/s, ETA ${eta}s, ${embFail} failed)`);
      }
    });
    console.log(`  embeddings done. ${embDone}/${allSongs.length}, fails: ${embFail}`);
  }

  // [3] corpus content freq
  console.log('\n[3] corpus content-word frequencies...');
  const freq = (arr) => {
    const f = {}; let tot = 0;
    for (const s of arr) for (const w of contentTokens(s.text)) { f[w] = (f[w] || 0) + 1; tot++; }
    return { f, tot };
  };
  const A = freq(aiRaw), H = freq(humanRaw);
  const eps = 1 / Math.max(A.tot, H.tot);
  const ALPHA = 0.5;
  const allW = new Set([...Object.keys(A.f), ...Object.keys(H.f)]);
  const llr = {};
  for (const w of allW) {
    const ar = (A.f[w] + ALPHA) / (A.tot + ALPHA * allW.size);
    const hr = (H.f[w] + ALPHA) / (H.tot + ALPHA * allW.size);
    llr[w] = Math.log(ar / hr);
  }
  const cand = Object.keys(A.f).filter(w => A.f[w] >= aiRaw.length * 0.15);
  const overused = cand.map(w => {
    const ar = A.f[w] / A.tot, hr = (H.f[w] || 0) / H.tot;
    return [w, ar / (hr + eps), A.f[w], H.f[w] || 0];
  }).sort((x, y) => y[1] - x[1]).slice(0, 40);
  const OVER = new Set(overused.map(x => x[0]));

  // [4] per-song summaries
  console.log('\n[4] per-song discriminator summaries...');
  function summarize(text, isAI) {
    const a = pat.analyze(text);
    const cw0 = contentTokens(text);
    let inV = 0, aff = 0;
    const selfCnt = {}; if (isAI) for (const w of cw0) selfCnt[w] = (selfCnt[w] || 0) + 1;
    for (const w of cw0) {
      const inAi = isAI ? ((A.f[w] || 0) - (selfCnt[w] || 0) > 0) : ((A.f[w] || 0) > 0);
      if (inAi) inV++;
      aff += (llr[w] || 0);
    }
    const nW = Math.max(1, cw0.length);
    const vocab = {
      aiCoverage:   +(inV / nW).toFixed(3),
      outOfAiVocab: +(1 - inV / nW).toFixed(3),
      aiAffinity:   +(aff / nW).toFixed(3),
    };
    const cl = Object.entries(a).filter(([k, v]) => k.startsWith('cliche::') && v > 0).map(([k, v]) => [k.slice(8), v]);
    const rh = Object.entries(a).filter(([k, v]) => k.startsWith('rhyme::')  && v > 0);
    const st = {}; for (const [k, v] of Object.entries(a)) if (k.startsWith('struct::')) st[k.slice(8)] = v;
    const ov = {}; for (const w of cw0) if (OVER.has(w)) ov[w] = (ov[w] || 0) + 1;
    return {
      nLines: a.__nLines, nWords: cw0.length, ...vocab,
      clicheCount: cl.reduce((s, [, v]) => s + v, 0), cliches: Object.fromEntries(cl),
      overusedCount: Object.values(ov).reduce((s, v) => s + v, 0), overused: ov,
      predictableRhyme: rh.reduce((s, [, v]) => s + v, 0), rhymes: Object.fromEntries(rh.map(([k, v]) => [k.slice(7), v])),
      ...st,
    };
  }
  const aiSum = aiRaw.map(s => ({ model: s.model, ...summarize(s.text, true) }));
  const huSum = humanRaw.map(s => summarize(s.text, false));
  fs.writeFileSync(path.join(ROOT, 'corpus/ai_summaries.json'),
    JSON.stringify({ note: 'discriminator-summary v1, numbers only', overusedWords: overused.map(x => x[0]), count: aiSum.length, summaries: aiSum }, null, 0));
  fs.writeFileSync(path.join(ROOT, 'corpus/human_summaries.json'),
    JSON.stringify({ note: 'discriminator-summary v1, numbers only', count: huSum.length, summaries: huSum }, null, 0));

  // [5] separation report
  const numKeys = Object.keys(huSum[0] || {}).filter(k => typeof (huSum[0] || {})[k] === 'number');
  const RATEKEYS = new Set(['contentDensity', 'aiAffinity', 'aiCoverage', 'outOfAiVocab']);
  const norm = (s, k) => RATEKEYS.has(k) ? (s[k] || 0) : (s[k] || 0) / Math.max(1, s.nLines);
  const stat = (arr, k) => {
    const v = arr.map(s => norm(s, k));
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
    return { m, sd };
  };
  const rows = numKeys.map(k => {
    const a = stat(aiSum, k), h = stat(huSum, k);
    const d = (a.m - h.m) / Math.sqrt((a.sd ** 2 + h.sd ** 2) / 2 + 1e-9);
    return [k, a.m, h.m, d];
  });
  rows.sort((x, y) => Math.abs(y[3]) - Math.abs(x[3]));

  // [6] baseline
  console.log('\n[6] training baseline...');
  const aiVecs    = aiRaw.map(s => feats.extract(s.text).values);
  const humanVecs = humanRaw.map(s => feats.extract(s.text).values);
  const D = feats.FEATURE_NAMES.length;
  const all = aiVecs.concat(humanVecs);
  const baseMean = Array(D).fill(0), baseStd = Array(D).fill(0);
  for (const v of all) for (let i = 0; i < D; i++) baseMean[i] += v[i];
  for (let i = 0; i < D; i++) baseMean[i] /= all.length;
  for (const v of all) for (let i = 0; i < D; i++) baseStd[i] += (v[i] - baseMean[i]) ** 2;
  for (let i = 0; i < D; i++) baseStd[i] = Math.sqrt(baseStd[i] / all.length) || 1;
  const z = v => v.map((x, i) => (x - baseMean[i]) / baseStd[i]);
  const centroid = vecs => {
    const c = Array(D).fill(0);
    for (const v of vecs) { const zv = z(v); for (let i = 0; i < D; i++) c[i] += zv[i]; }
    return c.map(x => x / vecs.length);
  };
  const aiCentroid    = centroid(aiVecs);
  const humanCentroid = centroid(humanVecs);
  const baseline = {
    builtAt: startedAt,
    featureNames: feats.FEATURE_NAMES,
    scaler: { mean: baseMean, std: baseStd },
    centroids: { ai: aiCentroid, human: humanCentroid },
    temperature: 1.0,
    meta: { aiCount: aiVecs.length, humanCount: humanVecs.length, humanSource: 'pipeline_tier3 fresh', perModel },
  };
  fs.writeFileSync(path.join(ROOT, 'src/baseline.json'), JSON.stringify(baseline, null, 2));
  fs.writeFileSync(path.join(ROOT, 'src/baseline.js'),
    '/* AUTO-GENERATED by pipeline_tier3.js — do not edit */\n' +
    'globalThis.SLOP_BASELINE = ' + JSON.stringify(baseline) + ';\n');

  const pAIof = v => {
    const zv = v.map((x, i) => (x - baseMean[i]) / (baseStd[i] || 1));
    const dd = c => Math.sqrt(c.reduce((s, x, i) => s + (x - zv[i]) ** 2, 0));
    return 100 / (1 + Math.exp(-(dd(humanCentroid) - dd(aiCentroid)) / baseline.temperature));
  };
  let correct = 0;
  const aiP = aiVecs.map(pAIof), huP = humanVecs.map(pAIof);
  aiP.forEach(p => { if (p >= 50) correct++; });
  huP.forEach(p => { if (p < 50) correct++; });
  const total = aiP.length + huP.length;
  console.log(`  baseline resubst: ${correct}/${total} = ${(100 * correct / total).toFixed(1)}%`);

  // [7] combined BoW + dense
  console.log('\n[7] training combined BoW+dense logistic regression...');
  const df = {};
  for (const s of aiRaw) for (const w of new Set(bowToks(s.text))) df[w] = (df[w] || 0) + 1;
  const MIN_DF = 12; // raised from 2 to kill prompt-subject leakage (HANDOVER_BACK §5.1)
  const VOCAB = Object.keys(df).filter(w => df[w] >= MIN_DF).sort();
  const IDX = new Map(VOCAB.map((w, i) => [w, i]));
  console.log(`  AI vocab (df>=${MIN_DF}): ${VOCAB.length}`);
  // Build dense feature names from a sample. allSongs has t3emb populated.
  const denseNames = [...new Set(allSongs.slice(0, 80).flatMap(s => Object.keys(denseDict(s))))].sort();
  const DN = denseNames.length;
  console.log(`  dense features:  ${DN}`);
  function vec(s) {
    const text = s.text;
    const tk = bowToks(text);
    const bow = {};
    for (const w of tk) { const i = IDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; }
    const n = Math.max(1, tk.length);
    for (const i in bow) bow[i] /= n;
    const d = denseDict(s);
    const dn = new Float64Array(DN);
    denseNames.forEach((k, j) => dn[j] = (+d[k] || 0));
    return { bow, dn };
  }
  const X = aiRaw.map(s => ({ ...vec(s), y: 1 })).concat(humanRaw.map(s => ({ ...vec(s), y: 0 })));
  const denseMean = new Float64Array(DN), denseStd = new Float64Array(DN);
  for (const s of X) for (let j = 0; j < DN; j++) denseMean[j] += s.dn[j];
  for (let j = 0; j < DN; j++) denseMean[j] /= X.length;
  for (const s of X) for (let j = 0; j < DN; j++) denseStd[j] += (s.dn[j] - denseMean[j]) ** 2;
  for (let j = 0; j < DN; j++) denseStd[j] = Math.sqrt(denseStd[j] / X.length) || 1;
  // CLIP standardized features to ±3σ so a near-zero-variance feature (e.g. t4_story_objects)
  // can't explode into a +95 contribution on an out-of-distribution song (Queen "Radio Ga Ga").
  const DCLIP = 3;
  for (const s of X) for (let j = 0; j < DN; j++) { let z = (s.dn[j] - denseMean[j]) / denseStd[j]; s.dn[j] = z > DCLIP ? DCLIP : z < -DCLIP ? -DCLIP : z; }

  function train(tr, mode) {
    const wB = new Float64Array(VOCAB.length), wD = new Float64Array(DN);
    let b = 0;
    const lr = 0.5, EP = 120;
    // BoW (tiny TF values, 1600+ sparse cols) needs far LESS L2 than the dense cols, else bow underfits.
    const l2B = +(process.env.L2_BOW || 3e-4), l2D = +(process.env.L2 || 2e-3);
    const nP = tr.filter(s => s.y).length, nN = tr.length - nP;
    const wP = tr.length / (2 * Math.max(1, nP)), wN = tr.length / (2 * Math.max(1, nN));
    for (let e = 0; e < EP; e++) {
      for (let k = tr.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [tr[k], tr[j]] = [tr[j], tr[k]]; }
      for (const s of tr) {
        let z = b;
        if (mode !== 'dense') for (const i in s.bow) z += wB[i] * s.bow[i];
        if (mode !== 'bow')   for (let j = 0; j < DN; j++) z += wD[j] * s.dn[j];
        const p = 1 / (1 + Math.exp(-z));
        const g = (s.y ? wP : wN) * (p - s.y);
        if (mode !== 'dense') for (const i in s.bow) wB[i] -= lr * (g * s.bow[i] + l2B * wB[i]);
        if (mode !== 'bow')   for (let j = 0; j < DN; j++) wD[j] -= lr * (g * s.dn[j] + l2D * wD[j]);
        b -= lr * g;
      }
    }
    return { wB, wD, b, mode };
  }
  const predLR = (m, s) => {
    let z = m.b;
    if (m.mode !== 'dense') for (const i in s.bow) z += m.wB[i] * s.bow[i];
    if (m.mode !== 'bow')   for (let j = 0; j < DN; j++) z += m.wD[j] * s.dn[j];
    return 1 / (1 + Math.exp(-z));
  };
  function cv(mode) {
    const d = X.slice();
    for (let k = d.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0;[d[k], d[j]] = [d[j], d[k]]; }
    let c = 0, t = 0, tp = 0, fp = 0, fn = 0; const K = 5;
    for (let f = 0; f < K; f++) {
      const te = d.filter((_, i) => i % K === f), tr = d.filter((_, i) => i % K !== f);
      const m = train(tr, mode);
      for (const s of te) {
        const p = predLR(m, s) >= 0.5 ? 1 : 0;
        if (p === s.y) c++; t++;
        if (s.y && p) tp++; else if (!s.y && p) fp++; else if (s.y && !p) fn++;
      }
    }
    return { acc: c / t, prec: tp / Math.max(1, tp + fp), rec: tp / Math.max(1, tp + fn) };
  }
  const cvResults = {};
  console.log('\n=== ABLATION (5-fold CV) ===');
  for (const mode of ['bow', 'dense', 'combined']) {
    const r = cv(mode); cvResults[mode] = r;
    console.log(mode.padEnd(10) + 'acc ' + (100 * r.acc).toFixed(1) + '%   precAI ' + (100 * r.prec).toFixed(1) + '%  recAI ' + (100 * r.rec).toFixed(1) + '%');
  }
  const full = train(X, 'combined');
  const dRanked = denseNames.map((k, j) => [k, full.wD[j]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  console.log('\n=== TOP 20 DENSE FEATURES (|weight|) ===');
  dRanked.slice(0, 20).forEach(([k, w]) =>
    console.log('  ' + k.padEnd(24) + (w > 0 ? '+' : '') + w.toFixed(2) + (w > 0 ? '  (AI)' : '  (human)')));
  const wRanked = VOCAB.map((w, i) => [w, full.wB[i]]).sort((a, b) => b[1] - a[1]);
  console.log('\n=== TOP 15 AI / TOP 15 human words ===');
  console.log('AI:    ' + wRanked.slice(0, 15).map(x => x[0]).join(', '));
  console.log('human: ' + wRanked.slice(-15).reverse().map(x => x[0]).join(', '));
  fs.writeFileSync(path.join(ROOT, 'corpus/combined_model.json'),
    JSON.stringify({
      note: 'combined BoW+dense logistic-regression (pipeline_tier3)',
      vocab: VOCAB,
      wBow: Array.from(full.wB),
      denseNames,
      wDense: Array.from(full.wD),
      denseMean: Array.from(denseMean),
      denseStd: Array.from(denseStd),
      bias: full.b,
    }));
  console.log('\nwrote corpus/combined_model.json');
  console.log('=== pipeline_tier3 DONE ===');
})();
