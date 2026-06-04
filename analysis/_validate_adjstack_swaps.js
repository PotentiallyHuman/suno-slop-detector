#!/usr/bin/env node
/* _validate_adjstack_swaps.js — confirms ADJ_SWAP lowers t3_adjStack on AI lines.
 * Loads the real engine (same order as src/ext/_test_engine.js) so t3_adjStack
 * and the holistic score are the production values. Read-only; writes nothing.
 * Run: node analysis/_validate_adjstack_swaps.js
 */
'use strict';
const fs = require('fs');
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
const { swapAdjStack, ADJ_SWAP } = require(path.join(ROOT, 'analysis/adjstack_swaps.js'));

function adjStack(text) { return t3.analyze(text).t3_adjStack; }

// AI-ish lines built ONLY from data-proven SWAP adjectives + STACK nouns.
const samples = [
  `Fading dreams beneath the empty sky
Silent tears, the whispered goodbye
Burning embers in the midnight light
Lost in shadows, fragile through the night`,

  `Distant memories, the velvet night
Flickering flames, the forgotten light
Empty streets and silent eyes
Fading love beneath the skies`,
];

let totalBefore = 0, totalAfter = 0;
for (const text of samples) {
  const before = adjStack(text);
  const { text: out, swaps } = swapAdjStack(text);
  const after = adjStack(out);
  const sB = SlopV2.score(before === undefined ? text : text);
  const scoreBefore = SlopV2.score(text);
  const scoreAfter = SlopV2.score(out);
  totalBefore += before; totalAfter += after;
  console.log('--- sample ---');
  console.log('IN :', JSON.stringify(text));
  console.log('OUT:', JSON.stringify(out));
  console.log('swaps:', swaps.map(s => `${s.from}->${s.to} (${s.noun})`).join(', '));
  console.log(`t3_adjStack: ${before.toFixed(4)} -> ${after.toFixed(4)}  (raw stacks per line)`);
  console.log(`holistic score: ${scoreBefore.score} -> ${scoreAfter.score}  (pAI ${scoreBefore.pAI.toFixed(4)} -> ${scoreAfter.pAI.toFixed(4)})`);
  console.log();
}
console.log(`TOTAL t3_adjStack: ${totalBefore.toFixed(4)} -> ${totalAfter.toFixed(4)}`);
console.log(totalAfter < totalBefore
  ? '*** PASS: swapping data-vetted adjectives LOWERS t3_adjStack. ***'
  : '*** FAIL: t3_adjStack did not drop. ***');
