#!/usr/bin/env node
/* test_holdout.js — score held-out songs against the trained combined model.
 *   1) human candidates fetched live from lrclib (filtered to NOT IN HUMAN_SONGLIST.json)
 *   2) AI candidates generated fresh by qwen2.5:7b (NOT used in training; corpus used 14b)
 *
 * Prints P(AI) for both `bow` head (the 83.3% one) and `combined` head.
 * Lyrics are held in memory only — never written to disk.
 */
const fs = require('fs');
const path = require('path');
const { predict } = require('./predict.js');

const ROOT = __dirname;
const SONGLIST = JSON.parse(fs.readFileSync(path.join(ROOT, 'HUMAN_SONGLIST.json')));
const seen = new Set(
  (SONGLIST.songs || SONGLIST).map(s => `${s.artist}|${s.title}`.toLowerCase())
);

const HUMAN_CANDIDATES = [
  // diverse classics — script filters those already in human_profiles.json
  ['Phoebe Bridgers', 'Kyoto'],
  ['Childish Gambino', 'Redbone'],
  ['Mitski', 'Nobody'],
  ['Frank Ocean', 'Thinking Bout You'],
  ['Big Thief', 'Not'],
  ['Sufjan Stevens', 'Casimir Pulaski Day'],
  ['The National', 'Bloodbuzz Ohio'],
  ['Bon Iver', 'Skinny Love'],
  ['Vampire Weekend', 'A-Punk'],
  ['Tame Impala', 'The Less I Know the Better'],
  ['Fleet Foxes', 'White Winter Hymnal'],
  ['Father John Misty', 'Real Love Baby'],
  ['Future Islands', 'Seasons (Waiting On You)'],
  ['Sharon Van Etten', 'Seventeen'],
  ['Weyes Blood', 'Movies'],
  ['Snail Mail', 'Pristine'],
  ['Soccer Mommy', 'circle the drain'],
  ['Beach House', 'Space Song'],
  ['Wilco', 'Jesus, Etc.'],
  ['Mac DeMarco', 'Chamber of Reflection'],
];

async function fetchLyrics(artist, title) {
  try {
    const r = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`);
    if (r.ok) { const j = await r.json(); if (j.plainLyrics && j.plainLyrics.length > 60) return j.plainLyrics; }
  } catch (e) {}
  try {
    const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (r.ok) { const j = await r.json(); if (j.lyrics && j.lyrics.length > 60) return j.lyrics; }
  } catch (e) {}
  return '';
}

// AI generation via ollama qwen2.5:7b (DIFFERENT model than the 14b in corpus)
const AI_PROMPTS = [
  // Generic prompts — none reference SUBJECTS-list tokens. Lets us see if BoW
  // generalizes beyond the trained-on wesley/linnea/sock vocabulary.
  'Write the full lyrics of a pop song about heartbreak in a big city.',
  'Write the full lyrics of an indie folk song about regret and growing older.',
  'Write the full lyrics of an electronic pop song about a feeling that keeps slipping away.',
  'Write the full lyrics of a singer-songwriter ballad about losing someone you loved.',
  'Write the full lyrics of an alt-rock song about insomnia and city sunrise.',
  'Write the full lyrics of a country song about a long drive across the country.',
  'Write the full lyrics of a soul song about resilience and rising above.',
  'Write the full lyrics of a hip-hop song about hustle, ambition, and family.',
  'Write the full lyrics of a punk song about boredom and a dead-end town.',
  'Write the full lyrics of an R&B song about late-night thoughts about your ex.',
];

async function ollamaGen(prompt) {
  const r = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:7b', prompt, stream: false,
      options: { temperature: 0.85, num_predict: 600 }
    }),
  });
  if (!r.ok) throw new Error('ollama ' + r.status);
  const j = await r.json();
  return j.response || '';
}

function row(label, text, expected) {
  const pBow      = predict(text, 'bow');
  const pDense    = predict(text, 'dense');
  const pCombined = predict(text, 'combined');
  // verdict by ensemble — majority vote of the three heads at 0.5
  const votes = [pBow, pDense, pCombined].filter(p => p >= 0.5).length;
  const verdict = votes >= 2 ? 'AI' : 'HUMAN';
  return {
    label, expected,
    bow: +pBow.toFixed(3), dense: +pDense.toFixed(3), combined: +pCombined.toFixed(3),
    verdict, ok: verdict === expected,
    bowOK: (pBow >= 0.5 ? 'AI' : 'HUMAN') === expected,
    denseOK: (pDense >= 0.5 ? 'AI' : 'HUMAN') === expected,
    combOK: (pCombined >= 0.5 ? 'AI' : 'HUMAN') === expected,
  };
}

(async () => {
  console.log('# Held-out test\n');
  const results = [];

  // ---- humans ----
  console.log('## Fetching held-out human candidates ...');
  for (const [a, t] of HUMAN_CANDIDATES) {
    const key = `${a}|${t}`.toLowerCase();
    if (seen.has(key)) { console.log(`  SKIP (in songlist): ${a} — ${t}`); continue; }
    const txt = await fetchLyrics(a, t);
    if (!txt) { console.log(`  no lyrics: ${a} — ${t}`); continue; }
    results.push(row(`${a} — ${t}`, txt, 'HUMAN'));
    if (results.filter(r => r.expected === 'HUMAN').length >= 7) break;
  }

  // ---- AI ----
  console.log('\n## Generating held-out AI candidates with qwen2.5:7b ...');
  for (let i = 0; i < AI_PROMPTS.length; i++) {
    try {
      const txt = await ollamaGen(AI_PROMPTS[i]);
      if (txt.length < 100) { console.log(`  qwen returned short on prompt ${i}`); continue; }
      results.push(row(`qwen2.5:7b #${i + 1}`, txt, 'AI'));
    } catch (e) { console.log(`  ollama err on prompt ${i}: ${e.message}`); }
  }

  // ---- report ----
  console.log('\n## Results — three heads side-by-side\n');
  const header = 'label'.padEnd(38) + 'expect  bow    dense  comb   B  D  C  ens';
  console.log(header);
  for (const r of results) {
    console.log(
      r.label.padEnd(38) +
      r.expected.padEnd(8) +
      r.bow.toFixed(2).padEnd(7) +
      r.dense.toFixed(2).padEnd(7) +
      r.combined.toFixed(2).padEnd(7) +
      (r.bowOK ? '✓' : '✗').padEnd(3) +
      (r.denseOK ? '✓' : '✗').padEnd(3) +
      (r.combOK ? '✓' : '✗').padEnd(3) +
      (r.ok ? '✓' : '✗')
    );
  }
  const acc = (pred) => {
    const ok = results.filter(pred).length;
    return `${ok}/${results.length} = ${(100 * ok / results.length).toFixed(0)}%`;
  };
  const accByClass = (cls, pred) => {
    const r = results.filter(x => x.expected === cls);
    const ok = r.filter(pred).length;
    return `${ok}/${r.length}`;
  };
  console.log(`\n=== Held-out accuracy per head ===`);
  console.log('BoW only   : ' + acc(r => r.bowOK)   + '   (HUMAN ' + accByClass('HUMAN', r => r.bowOK)   + '  AI ' + accByClass('AI', r => r.bowOK)   + ')');
  console.log('Dense only : ' + acc(r => r.denseOK) + '   (HUMAN ' + accByClass('HUMAN', r => r.denseOK) + '  AI ' + accByClass('AI', r => r.denseOK) + ')');
  console.log('Combined   : ' + acc(r => r.combOK)  + '   (HUMAN ' + accByClass('HUMAN', r => r.combOK)  + '  AI ' + accByClass('AI', r => r.combOK)  + ')');
  console.log('Ensemble   : ' + acc(r => r.ok)      + '   (HUMAN ' + accByClass('HUMAN', r => r.ok)      + '  AI ' + accByClass('AI', r => r.ok)      + ')');

  fs.writeFileSync(path.join(ROOT, 'HOLDOUT_REPORT.txt'),
    header + '\n' +
    results.map(r =>
      r.label.padEnd(38) +
      r.expected.padEnd(8) +
      r.bow.toFixed(2).padEnd(7) +
      r.dense.toFixed(2).padEnd(7) +
      r.combined.toFixed(2).padEnd(7) +
      (r.bowOK ? 'Y' : 'N').padEnd(3) +
      (r.denseOK ? 'Y' : 'N').padEnd(3) +
      (r.combOK ? 'Y' : 'N').padEnd(3) +
      (r.ok ? 'Y' : 'N')
    ).join('\n') +
    `\n\nBoW only   : ${acc(r => r.bowOK)}   HUMAN ${accByClass('HUMAN', r => r.bowOK)}  AI ${accByClass('AI', r => r.bowOK)}\n` +
    `Dense only : ${acc(r => r.denseOK)}   HUMAN ${accByClass('HUMAN', r => r.denseOK)}  AI ${accByClass('AI', r => r.denseOK)}\n` +
    `Combined   : ${acc(r => r.combOK)}   HUMAN ${accByClass('HUMAN', r => r.combOK)}  AI ${accByClass('AI', r => r.combOK)}\n` +
    `Ensemble   : ${acc(r => r.ok)}   HUMAN ${accByClass('HUMAN', r => r.ok)}  AI ${accByClass('AI', r => r.ok)}\n`
  );
  console.log('\nwrote HOLDOUT_REPORT.txt');
})();
