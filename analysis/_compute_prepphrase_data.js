#!/usr/bin/env node
/* _compute_prepphrase_data.js — DATA pass for the prepositional/scene-phrase swap table.
 * Read-only. Computes AI vs HUMAN doc-frequency for each phrase matched by the
 * s_prepInTheNight feature, plus the user's seed replacements and candidate pool.
 * AI corpus  : corpus/models/*.json (excl. .heldout / .bak) = 2056 songs
 * Human corpus: /tmp/human_lyrics_cache.json (skip empty-string misses)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { syllables } = require(path.join(ROOT, 'analysis/prosody.js'));

function syllPhrase(p){ return p.split(/\s+/).reduce((a,w)=>a+syllables(w),0); }

// ---- load AI corpus ----
const aiDocs = [];
for (const f of fs.readdirSync(path.join(ROOT, 'corpus/models'))) {
  if (!f.endsWith('.json')) continue;
  if (f.endsWith('.heldout') || f.endsWith('.bak')) continue;
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/models', f)));
  for (const s of d.songs) {
    const t = (s.lyrics_en || s.lyrics || '').toLowerCase();
    if (t.trim()) aiDocs.push(t);
  }
}

// ---- load human corpus ----
const human = JSON.parse(fs.readFileSync('/tmp/human_lyrics_cache.json'));
const huDocs = [];
for (const k of Object.keys(human)) {
  const t = String(human[k] || '').toLowerCase();
  if (t.trim()) huDocs.push(t);
}

console.log(`AI corpus N=${aiDocs.length}  Human corpus N=${huDocs.length}\n`);

// doc-rate: fraction of docs containing the literal phrase (as substring, word-bounded)
function docRate(docs, phrase) {
  const re = new RegExp('\\b' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  let n = 0;
  for (const t of docs) if (re.test(t)) n++;
  return n / docs.length;
}

function row(phrase) {
  const ai = docRate(aiDocs, phrase);
  const hu = docRate(huDocs, phrase);
  const ratio = hu > 0 ? ai / hu : (ai > 0 ? Infinity : 0);
  return { phrase, ai, hu, ratio, syll: syllPhrase(phrase) };
}

// ---- STEP 1/2: the flagged phrases (exact regex alternatives) ----
const FLAGGED = [
  'in the dark', 'in the night', 'in the rain', 'in the cold',
  'in the morning', 'in the silence', 'in the shadows',
];

console.log('=== FLAGGED PHRASES (s_prepInTheNight) ===');
console.log('phrase           | AI%    | HU%    | ratio  | syll');
const flaggedRows = FLAGGED.map(row);
for (const r of flaggedRows) {
  console.log(
    r.phrase.padEnd(16), '|',
    (r.ai*100).toFixed(2).padStart(5)+'%', '|',
    (r.hu*100).toFixed(2).padStart(5)+'%', '|',
    (isFinite(r.ratio)?r.ratio.toFixed(2):'inf').padStart(5), ' |',
    r.syll
  );
}

// ---- STEP 3: user's seed replacements + a vetted candidate pool ----
const SEEDS = {
  // night-family (replace "in the night" / "in the dark" / "in the cold" etc, ~3 syll)
  'through the night': 'night',
  'dead of night':     'night',
  'pitch black night': 'night',
  'passing dark':      'night',
  "12 o'clock":        'night',
  // rain-family (replace "in the rain", ~3 syll)
  'washing down':      'rain',
  'pouring down':      'rain',
  'washed away':       'rain',
  'while it rains':    'rain',
  'raining on':        'rain',
};
// extra candidate phrases to expand the pool (vet against data)
const EXTRA = {
  'late at night':   'night', 'all night long': 'night', 'half past three':'night',
  'lights gone out': 'night', 'cold out here':  'night', 'down the block':'night',
  'pouring rain':    'rain',  'soaking wet':    'rain',   'out in the rain':'rain',
  'caught in rain':  'rain',  'rain comes down':'rain',   'cold and wet':  'rain',
};

console.log('\n=== USER SEED REPLACEMENTS (vetted) ===');
console.log('phrase             | AI%   | HU%   | ratio | syll | fam');
function printRepl(map){
  const rows = Object.keys(map).map(p => ({ ...row(p), fam: map[p] }));
  for (const r of rows) {
    console.log(
      r.phrase.padEnd(18), '|',
      (r.ai*100).toFixed(2).padStart(4)+'%', '|',
      (r.hu*100).toFixed(2).padStart(4)+'%', '|',
      (isFinite(r.ratio)?r.ratio.toFixed(2):'inf').padStart(4), '|',
      String(r.syll).padStart(2), '  |', r.fam
    );
  }
  return rows;
}
const seedRows = printRepl(SEEDS);
console.log('\n=== EXTRA CANDIDATE POOL (vetted) ===');
const extraRows = printRepl(EXTRA);

// ---- dump JSON for the README/table builder ----
fs.writeFileSync('/tmp/prepphrase_data.json', JSON.stringify({
  N_AI: aiDocs.length, N_HU: huDocs.length,
  flagged: flaggedRows, seeds: seedRows, extra: extraRows,
}, null, 2));
console.log('\nwrote /tmp/prepphrase_data.json');
