#!/usr/bin/env node
/* _validate_ingverb_swaps.js — confirms ING_SWAP lowers t3_ingVerbAbstract.
 * Loads the real engine (same order as src/ext/_test_engine.js) so
 * t3_ingVerbAbstract and the holistic score are production values.
 * Read-only; writes nothing. Run: node analysis/_validate_ingverb_swaps.js
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
const t3 = require(path.join(ROOT, 'analysis/tier3_detectors.js'));
const { swapIngVerb } = require(path.join(ROOT, 'analysis/ingverb_swaps.js'));

function ingAbstract(text) { return t3.analyze(text).t3_ingVerbAbstract; }

// AI-ish lines built ONLY from data-proven SWAP -ing verbs + STACK nouns.
const samples = [
  `Burning desire in my heart tonight
Fading memory, the dying light
Chasing shadows where the road meets sky
Holding tears as the night goes by`,

  `Breaking dreams in the silent night
Dancing shadows in the fading light
Rising echoes, the whispering soul
Echoing voices, the heart made whole`,
];

let totalBefore = 0, totalAfter = 0;
for (const text of samples) {
  const before = ingAbstract(text);
  const { text: out, swaps } = swapIngVerb(text);
  const after = ingAbstract(out);
  const scoreBefore = SlopV2.score(text);
  const scoreAfter = SlopV2.score(out);
  totalBefore += before; totalAfter += after;
  console.log('--- sample ---');
  console.log('IN :', JSON.stringify(text));
  console.log('OUT:', JSON.stringify(out));
  console.log('swaps:', swaps.map(s => `${s.from}->${s.to} (${s.noun})`).join(', '));
  console.log(`t3_ingVerbAbstract: ${before.toFixed(4)} -> ${after.toFixed(4)}`);
  console.log(`holistic score: ${scoreBefore.score} -> ${scoreAfter.score}  (pAI ${scoreBefore.pAI.toFixed(4)} -> ${scoreAfter.pAI.toFixed(4)})`);
  console.log();
}
console.log(`TOTAL t3_ingVerbAbstract: ${totalBefore.toFixed(4)} -> ${totalAfter.toFixed(4)}`);
console.log(totalAfter < totalBefore
  ? '*** PASS: swapping data-vetted -ing verbs LOWERS t3_ingVerbAbstract. ***'
  : '*** FAIL: t3_ingVerbAbstract did not drop. ***');
