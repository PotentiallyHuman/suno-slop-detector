#!/usr/bin/env node
/* _test_engine.js — proves src/ext/v2-engine.js reproduces corpus/combined_model.json.
 *
 * Loads the browser globals in content-script order (window=global shim), then
 * scores 3 sample lyrics with SlopV2.score(), AND independently replicates the
 * pipeline (denseDict/bowToks) straight against combined_model.json. Asserts the
 * two pAI match to ~1e-6. Run: node src/ext/_test_engine.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

// --- browser-global shim: content scripts share one global object ---
global.window = global;

// Load deps in the exact content_scripts order.
require(path.join(ROOT, 'src/slop-core.js'));      // -> globalThis.SlopScore
require(path.join(ROOT, 'src/common_words.js'));   // -> globalThis.SlopCommon
require(path.join(ROOT, 'src/features.js'));        // -> globalThis.SlopFeatures
require(path.join(ROOT, 'src/ext/patterns.browser.js')); // -> globalThis.SlopPatterns
require(path.join(ROOT, 'src/ext/tier3.browser.js'));     // -> globalThis.SlopTier3
require(path.join(ROOT, 'src/ext/model.js'));        // -> globalThis.SLOP_MODEL
require(path.join(ROOT, 'src/ext/v2-engine.js'));    // -> globalThis.SlopV2

const SlopV2 = global.SlopV2;
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/combined_model.json')));

// ---- independent reference replica (mirrors score_v3.js exactly) ----
const slop  = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat   = require(path.join(ROOT, 'analysis/patterns.js'));
const t3    = require(path.join(ROOT, 'analysis/tier3_detectors.js'));

const SECTION_BLACKLIST = new Set(['verse','verses','chorus','choruses','bridge','bridges','intro','outro','hook','hooks','refrain','refrains','breakdown','coda','interlude','prechorus','postchorus','reprise','vamp','tag','vers','omkvad','omkvaed','verso','estribillo','puente','couplet','pont','ritornello']);
const NONEN_STOP = new Set('el la los las un una que en por con para pero se mi tu lo del como esta este eso esa ese nada todo soy eres muy sin cuando porque donde je les des une est dans pour avec che gli della sono non il elle ich und der die das ist nicht'.split(/\s+/));
const bowToks = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => !SECTION_BLACKLIST.has(w) && !NONEN_STOP.has(w) && (w.length > 1 || w === 'i'));

function denseDict(text) {
  const d = {};
  try { const f = feats.extract(text); f.names.forEach((k, i) => d['f_' + k] = f.values[i]); } catch (e) {}
  const a = pat.analyze(text), nL = Math.max(1, a.__nLines), RATE = new Set(['contentDensity']);
  let cl = 0, rh = 0;
  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith('struct::')) { const n = k.slice(8); d['s_' + n] = RATE.has(n) ? v : v / nL; }
    else if (k.startsWith('cliche::')) cl += v; else if (k.startsWith('rhyme::')) rh += v;
  }
  d['lex_cliche'] = cl / nL; d['lex_rhyme'] = rh / nL;
  const tf = t3.analyze(text); for (const k in tf) d[k] = tf[k];
  return d; // no-embed
}

function refPAI(text) {
  const IDX = new Map(M.vocab.map((w, i) => [w, i]));
  const tk = bowToks(text), bow = {};
  for (const w of tk) { const i = IDX.get(w); if (i !== undefined) bow[i] = (bow[i] || 0) + 1; }
  const n = Math.max(1, tk.length); for (const i in bow) bow[i] /= n;
  const d = denseDict(text);
  const dn = new Float64Array(M.denseNames.length);
  M.denseNames.forEach((k, j) => { dn[j] = ((+d[k] || 0) - M.denseMean[j]) / (M.denseStd[j] || 1); });
  let z = M.bias;
  for (const i in bow) z += M.wBow[i] * bow[i];
  for (let j = 0; j < dn.length; j++) z += M.wDense[j] * dn[j];
  return 1 / (1 + Math.exp(-z));
}

// ---- 3 sample lyrics ----
const samples = {
  'AI-cliché-heavy': `[Verse 1]
Broken heart beneath the endless night
Shattered dreams are fading from the light
Whispers in the dark, I lose my mind
Chasing dreams I'll never leave behind

[Chorus]
Take me higher, set me free
You and I were meant to be
Written in the stars above
All I need is your sweet love`,

  'human-specific': `Got off the 4 train at Borough Hall at a quarter past nine
Your jacket's still hanging on the hook by the door
I made the coffee but I drank it cold this morning
Forty-two and I still don't know what I'm waiting for
The landlord raised the rent again in March
We argued about the dishes, not the things that mattered`,

  'short-mixed': `Neon hums against the glass tonight
I keep your number though I never call
We said forever like it cost us nothing
Maybe that's the part I can't recall`
};

let allPass = true;
console.log('=== v2-engine self-test (engine pAI vs independent replica) ===\n');
for (const [name, text] of Object.entries(samples)) {
  const r = SlopV2.score(text);
  const ref = refPAI(text);
  const diff = Math.abs(r.pAI - ref);
  const ok = diff < 1e-6;
  if (!ok) allPass = false;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`);
  console.log(`   engine pAI = ${r.pAI.toFixed(9)}   score = ${r.score}`);
  console.log(`   replica pAI = ${ref.toFixed(9)}   |diff| = ${diff.toExponential(3)}\n`);
}

console.log(allPass ? '*** ALL SAMPLES MATCH to <1e-6 — engine reproduces the model. ***'
                    : '*** MISMATCH — v2-engine does NOT reproduce the model. ***');
if (!allPass) process.exit(1);
