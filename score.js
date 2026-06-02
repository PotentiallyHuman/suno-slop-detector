#!/usr/bin/env node
/* score.js — interactive song scorer.
 *
 *   node score.js <path-to-lyric-file>      # score a file
 *   node score.js < song.txt                # score from stdin
 *
 * Runs all 3 model heads (BoW / dense / combined) on the song, shows which
 * detectors fired strongest, and prints a verdict + interpretable breakdown.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const { predict } = require('./predict.js');
const slop  = require(path.join(ROOT, 'src/slop-core.js'));
const feats = require(path.join(ROOT, 'src/features.js'));
const pat   = require(path.join(ROOT, 'analysis/patterns.js'));
const aiSummaries = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/ai_summaries.json')));
const OVERUSED = new Set(aiSummaries.overusedWords || []);

const filePath = process.argv[2];
let text;
if (filePath && fs.existsSync(filePath)) {
  text = fs.readFileSync(filePath, 'utf8');
} else {
  text = fs.readFileSync(0, 'utf8');
}
if (!text || text.trim().length < 30) {
  console.error('Need at least 30 chars of lyrics. Usage: node score.js <file> OR pipe via stdin.');
  process.exit(1);
}

const pBow      = predict(text, 'bow');
const pDense    = predict(text, 'dense');
const pCombined = predict(text, 'combined');
const verdict = [pBow, pDense, pCombined].filter(p => p >= 0.5).length >= 2 ? 'AI' : 'HUMAN';

const bar = (p) => {
  const n = Math.round(p * 40);
  return '['.padEnd(1) + '█'.repeat(n) + '·'.repeat(40 - n) + ']  ' + (p * 100).toFixed(1) + '%';
};

console.log('\n' + '═'.repeat(60));
console.log(`  SCORE   verdict: ${verdict}`);
console.log('═'.repeat(60));
console.log(`  BoW head      ${bar(pBow)}`);
console.log(`  Dense head    ${bar(pDense)}`);
console.log(`  Combined head ${bar(pCombined)}`);
console.log(`  (>= 50% means "looks AI")`);
console.log('═'.repeat(60));

// ---- interpretable breakdown ----
const STOP = new Set("a an the and or but if then so as of to in on at by for with from into about over under up down out off i you he she it we they me him her us them my your his its our their this that these those is am are was were be been being do does did have has had will would can could should may might must shall not no n't oh yeah la na ooh".split(/\s+/));
const contentTokens = t => (slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || []).filter(w => !STOP.has(w) && w.length > 2);

const a = pat.analyze(text);
const f = feats.extract(text);

// AI-overused words that fired in this song
const ov = {};
for (const w of contentTokens(text)) if (OVERUSED.has(w)) ov[w] = (ov[w] || 0) + 1;
const overusedHits = Object.entries(ov).sort((x, y) => y[1] - x[1]);

// Clichés that fired
const cliches = Object.entries(a).filter(([k, v]) => k.startsWith('cliche::') && v > 0).map(([k, v]) => [k.slice(8), v]);
// Predictable rhymes that fired
const rhymes  = Object.entries(a).filter(([k, v]) => k.startsWith('rhyme::')  && v > 0).map(([k, v]) => [k.slice(7), v]);
// Structural detectors (per-line rates)
const nL = Math.max(1, a.__nLines);
const structRates = Object.entries(a).filter(([k]) => k.startsWith('struct::')).map(([k, v]) => [k.slice(8), k === 'struct::contentDensity' ? v : v / nL]);
structRates.sort((x, y) => y[1] - x[1]);

console.log('\n── Why ──');
console.log(`  lines: ${a.__nLines}   content words: ${contentTokens(text).length}`);
console.log(`  clichéDensity: ${f.named.clicheDensity.toFixed(3)}   properNounDensity: ${f.named.properNounDensity.toFixed(3)}`);
console.log(`  hapaxRatio: ${f.named.hapaxRatio.toFixed(3)}   lineLenCV: ${f.named.lineLenCV.toFixed(3)}`);
console.log(`  positivityBias: ${f.named.positivityBias.toFixed(3)}`);

if (overusedHits.length) {
  console.log('\n  AI-overused words this song hit:');
  console.log('    ' + overusedHits.slice(0, 10).map(([w, n]) => `${w}×${n}`).join(', '));
}
if (cliches.length) {
  console.log('\n  Cliché phrases that fired:');
  console.log('    ' + cliches.slice(0, 8).map(([p, n]) => `"${p}"×${n}`).join(', '));
}
if (rhymes.length) {
  console.log('\n  Predictable rhyme pairs that fired:');
  console.log('    ' + rhymes.slice(0, 8).map(([p, n]) => `${p}×${n}`).join(', '));
}
console.log('\n  Top structural detectors (per-line rate):');
structRates.slice(0, 8).forEach(([k, v]) => console.log('    ' + k.padEnd(22) + v.toFixed(3)));
console.log('');
