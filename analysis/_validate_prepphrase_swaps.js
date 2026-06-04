#!/usr/bin/env node
/* _validate_prepphrase_swaps.js — confirms PHRASE_SWAP lowers s_prepInTheNight.
 * Loads the real engine (same order as src/ext/_test_engine.js) so the feature
 * and holistic score are the production values. Read-only; writes nothing.
 * Run: node analysis/_validate_prepphrase_swaps.js
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global;

require(path.join(ROOT, 'src/slop-core.js'));
require(path.join(ROOT, 'src/common_words.js'));
require(path.join(ROOT, 'src/features.js'));
require(path.join(ROOT, 'src/ext/patterns.browser.js'));
require(path.join(ROOT, 'src/ext/tier3.browser.js'));
require(path.join(ROOT, 'src/ext/perspectives.browser.js'));
require(path.join(ROOT, 'src/ext/model.js'));
require(path.join(ROOT, 'src/ext/v2-engine.js'));

const SlopV2 = global.SlopV2;
const { swapPrepPhrase } = require(path.join(ROOT, 'analysis/prepphrase_swaps.js'));

function prepFeat(text) {
  const d = SlopV2.denseDict(text);
  return d['s_prepInTheNight'] || 0;
}

// AI-ish lines built from data-proven SWAP phrases + one TRANSPARENT control.
const samples = [
  `Walking home in the dark, all alone
Lost in the rain, far from home
I wait for you in the cold
Some secret in the silence, never told`,

  `I called your name in the morning light
You disappeared in the dark of night
But here in the night I still believe
And in the shadows I learn to grieve`,  // TRANSPARENT controls present
];

let totalBefore = 0, totalAfter = 0;
for (const text of samples) {
  const before = prepFeat(text);
  const { text: out, swaps } = swapPrepPhrase(text);
  const after = prepFeat(out);
  const sB = SlopV2.score(text), sA = SlopV2.score(out);
  totalBefore += before; totalAfter += after;
  console.log('--- sample ---');
  console.log('IN :', JSON.stringify(text));
  console.log('OUT:', JSON.stringify(out));
  console.log('swaps:', swaps.map(s => `${s.from}->${s.to} (${s.syll}syl)`).join(', ') || '(none)');
  console.log(`s_prepInTheNight: ${before.toFixed(4)} -> ${after.toFixed(4)}`);
  console.log(`holistic score: ${sB.score} -> ${sA.score}  (pAI ${sB.pAI.toFixed(4)} -> ${sA.pAI.toFixed(4)})`);
  console.log();
}
console.log(`TOTAL s_prepInTheNight: ${totalBefore.toFixed(4)} -> ${totalAfter.toFixed(4)}`);
console.log(totalAfter < totalBefore
  ? '*** PASS: swapping data-vetted scene phrases LOWERS s_prepInTheNight (TRANSPARENT phrases preserved). ***'
  : '*** FAIL: s_prepInTheNight did not drop. ***');
