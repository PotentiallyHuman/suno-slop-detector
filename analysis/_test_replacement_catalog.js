#!/usr/bin/env node
/* _test_replacement_catalog.js — proves the replacement catalog is gate-clean and that
 * substituting a vague AI line with a tag-compatible, same-syllable catalog line DROPS
 * the SlopV2 AI score.
 *
 * Run: node analysis/_test_replacement_catalog.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// --- load the engine in content-script order (mirror src/ext/_test_engine.js) ---
global.window = global;
require(path.join(ROOT, 'src/slop-core.js'));
require(path.join(ROOT, 'src/common_words.js'));
require(path.join(ROOT, 'src/features.js'));
require(path.join(ROOT, 'src/ext/patterns.browser.js'));
require(path.join(ROOT, 'src/ext/tier3.browser.js'));
require(path.join(ROOT, 'src/ext/perspectives.browser.js'));
require(path.join(ROOT, 'src/ext/model.js'));
require(path.join(ROOT, 'src/ext/v2-engine.js'));
require(path.join(ROOT, 'analysis/prosody.js'));           // -> globalThis.Prosody
const SlopV2 = global.SlopV2;

const Catalog = require(path.join(ROOT, 'analysis/replacement_catalog.js'));
const vet     = require(path.join(ROOT, 'analysis/_vet_candidates.js'));
const Prosody = require(path.join(ROOT, 'analysis/prosody.js'));

let failures = 0;

// === A. every catalog line is gate-clean, in-bucket, ASCII, no curly quote ===
console.log('=== A. catalog integrity ===');
let nLines = 0, gateBad = 0, bucketBad = 0, quoteBad = 0;
const seen = new Set();
for (const sKey of Object.keys(Catalog.bySyllable)) {
  const s = +sKey;
  for (const { line, tags } of Catalog.bySyllable[sKey]) {
    nLines++;
    if (seen.has(line)) { console.log('  DUP:', line); failures++; } else seen.add(line);
    if (/[‘’“”]/.test(line)) { quoteBad++; console.log('  CURLY QUOTE:', line); }
    const v = vet.violations(line);
    if (v.length) { gateBad++; console.log('  GATE FAIL', JSON.stringify(v), '|', line); }
    const real = Prosody.syllCount(line);
    if (real !== s) { bucketBad++; console.log(`  BUCKET MISMATCH bucket=${s} real=${real} | ${line}`); }
    if (!tags.length) { console.log('  NO TAGS:', line); failures++; }
  }
}
console.log(`  ${nLines} lines | gateFail=${gateBad} bucketMismatch=${bucketBad} curlyQuote=${quoteBad}`);
failures += gateBad + bucketBad + quoteBad;

// === B. detectContext sanity ===
console.log('\n=== B. detectContext ===');
const ctxCases = [
  ['you left and I still miss your voice tonight\nshe said goodbye out by the door', 'HUMAN'],
  ['I walk alone and I can\'t sleep\nmy mind keeps turning over things', 'SELF'],
  ['the old grey cat sat on the wall\nthe fox slipped past the henhouse door', 'CREATURE'],
  ['the mountain held the morning fog\nthe river ran below the pines', 'PLACE_NATURE'],
  ['the clock keeps ticking on the shelf\nthe machine just hums and never stops', 'OBJECT_ABSTRACT'],
  ['la la la, oh yeah, na na na', 'UNKNOWN'],
];
for (const [lyr, want] of ctxCases) {
  const got = Catalog.detectContext(lyr);
  const ok = got === want;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] want=${want} got=${got}`);
}

// === C. substitution lowers SlopV2 score ===
// The real "Humanize" workflow replaces the flagged vague lines ACROSS the song. We
// reproduce that: flag every line with a vague-emotion word, pick a tag-compatible,
// same-syllable replacement (rotated), and assert the WHOLE-SONG score drops.
// (The model is holistic / bag-of-words dominated; a single-line swap moves it little,
//  but rewriting the cliché lines as a set produces a large, reliable drop.)
console.log('\n=== C. whole-song vague-line rewrite (real Humanize workflow) ===');

const VAGUE_LINE = /\b(broken|shattered|endless|fading|whispers?|whispered|silent|silence|echoes?|echoing|burning|embers?|ember|forgotten|shadows?|shadow|empty|distant|crystal|velvet|fragile|crimson|golden|ethereal|ashes|lost|eternal|sacred|tender)\b/i;

const samples = {
  'AI-cliché ballad': `[Verse 1]
Broken heart beneath the endless night
Shattered dreams are fading from the light
Whispers in the dark begin to fall
The silent echoes answer to my call

[Chorus]
Burning embers of a love grown cold
Forgotten stories that were never told
Shadows dancing on the bedroom wall
The empty silence covers over all`,

  'AI-mood-stack': `[Verse]
Endless mountains underneath the grey
The shattered echoes slowly fade away
Forgotten whispers carried on the storm
The distant silence keeping me from warm`,

  'AI-simile/adjstack': `[Verse]
Crystal teardrops on a velvet rose
The fragile heartbeat only sorrow knows
Broken pieces of forgotten years
The silent shadows drowning out my fears`,
};

for (const [name, text] of Object.entries(samples)) {
  Catalog.resetRotation();
  const before = SlopV2.score(text);
  const lines = text.split('\n');
  let nSwap = 0;
  const rewritten = lines.map(L => {
    if (/^\s*\[/.test(L) || !L.trim()) return L;        // keep section labels / blanks
    if (!VAGUE_LINE.test(L)) return L;                  // only flagged lines
    const rep = Catalog.pickReplacement(L, text);
    if (!rep) return L;                                  // hard-rule 7: leave it
    nSwap++;
    return rep.line;
  }).join('\n');
  const after = SlopV2.score(rewritten);
  const drop = before.score - after.score;
  const ok = after.score < before.score;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}  (${nSwap} lines swapped)`);
  console.log(`     score ${before.score} -> ${after.score}   (drop ${drop})`);
}

console.log('\n' + (failures === 0
  ? '*** ALL CHECKS PASS ***'
  : `*** ${failures} FAILURE(S) ***`));
process.exit(failures === 0 ? 0 : 1);
