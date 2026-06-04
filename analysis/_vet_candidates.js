#!/usr/bin/env node
/* _vet_candidates.js — gate raw replacement-line candidates against every forbidden
 * lexicon used by the engine, compute syllable counts via prosody.js, and emit a
 * report of passers bucketed 5..12 (±nothing — exact). NOT shipped; a build helper.
 *
 * Usage: node analysis/_vet_candidates.js
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Prosody = require(path.join(ROOT, 'analysis/prosody.js'));

// ---- forbidden lexicons (copied verbatim from the engine; single-token sets) ----
const VAGUE_EMOTION = new Set([
  'broken','shattered','lost','fading','endless','forgotten','distant',
  'silent','silence','whispered','whisper','whispers','echo','echoes',
  'echoing','shadow','shadows','shadowed','embers','ember','ashes',
  'phoenix','silhouette','silhouettes','flame','flames','flickering',
  'dust','mist','crimson','amber','golden','ethereal',
]);
const STACK_ADJ = new Set([
  'broken','shattered','endless','fading','forgotten','silent','whispered',
  'lost','distant','lonely','empty','eternal','burning','flickering',
  'crimson','golden','silver','midnight','restless','tender','crystal',
  'sacred','fragile','velvet',
]);
const STACK_NOUN = new Set([
  'dreams','heart','soul','love','memory','memories','night','days',
  'tears','whispers','echoes','shadow','shadows','light','lights',
  'road','roads','sky','fire','flames','streets','silence','embers',
  'ashes','horizon','voice','eyes','hands','kiss','song',
]);
const ING_VERB = new Set([
  'burning','falling','rising','crying','dying','breaking','fading','shining',
  'aching','bleeding','drowning','chasing','searching','wandering','whispering',
  'echoing','dancing','fighting','reaching','holding','losing',
]);
const INANIMATE = new Set([
  'pavement','asphalt','concrete','steel','wire','glass','metal','silence','shadow',
  'shadows','silhouette','silhouettes','street','streets','dust','mist','rain','storm',
  'cathedral','horizon','dawn','dusk','ember','embers','engine','wall','walls','road',
  'roads','door','doors','table','floor','ceiling','window','windows','sky','ocean',
  'river','rivers','sea','seas','stone','stones','wood','brick','bricks','sand',
  'curtain','curtains','sidewalk','clock','radio','phone','mirror',
]);
const ANIMATE_VERBS = new Set([
  'whispers','whispered','remembers','remembered','speaks','spoke','sings','sang',
  'dances','danced','cries','cried','smiles','smiled','laughs','laughed','dreams','dreamed',
  'feels','felt','breathes','breathed','knows','knew','wonders','wondered','hopes','hoped',
  'aches','ached','yearns','yearned','prays','prayed','watches','watched','listens','listened',
  'forgives','forgave','holds','held','wants','wanted','needs','needed','tells','told',
  'reaches','reached','calls','called','asks','asked','answers','answered',
  'sleeps','slept','wakes','woke',
]);

// cliché substring phrases (analysis/patterns.js PHRASES + tier3 AI_CLICHE_PHRASES)
const pat = require(path.join(ROOT, 'analysis/patterns.js'));
const PHRASES = pat.PHRASES.slice();
const AI_CLICHE_PHRASES = [
  'echoes','stories untold','shattered dreams','endless night',
  'fading light','waves crashing','unseen tears','whispers in the dark',
  'lost in time','forgotten memories','endless road','burning bridges',
  'fading away','broken chains','empty streets','broken dreams',
  'broken heart like','heart is broken','silent tears','silent night',
  'whispered words','distant memory','forgotten dreams','distant horizon',
  'fading stars','lonely road','shattered glass','whispered prayers',
  'shadows falling','flickering light','echoes fade',
];

// abstract-ending words (patterns STRUCT.abstractEnding) — disallow as the LAST word
const ABSTRACT_END = new Set(['love','pain','heart','tears','fears','fire','light','night','sky',
  'time','dreams','dream','soul','gold','rain','home','free','alone','forever']);
// ing-emotion verbs flagged regardless of noun (patterns STRUCT.ingEmotionVerb)
const ING_EMOTION = new Set(['burning','falling','rising','crying','dying','breaking','fading',
  'shining','aching','bleeding','drowning']);

const words = l => (String(l).toLowerCase().match(/[a-z']+/g) || []);

function violations(line) {
  const v = [];
  const w = words(line);
  const low = ' ' + line.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  for (const tok of w) {
    if (VAGUE_EMOTION.has(tok)) v.push('vague:' + tok);
    if (STACK_ADJ.has(tok)) v.push('stackAdj:' + tok);
    if (ING_VERB.has(tok)) v.push('ingVerb:' + tok);
    if (ING_EMOTION.has(tok)) v.push('ingEmo:' + tok);
  }
  // adjective-stack pair (adj immediately followed by stack-noun)
  for (let i = 0; i < w.length - 1; i++)
    if (STACK_ADJ.has(w[i]) && STACK_NOUN.has(w[i + 1])) v.push('adjStack:' + w[i] + ' ' + w[i + 1]);
  // inanimate -> animate-verb within 3 tokens (personification)
  for (let i = 0; i < w.length; i++) {
    if (!INANIMATE.has(w[i])) continue;
    for (let j = i + 1; j < Math.min(w.length, i + 4); j++)
      if (ANIMATE_VERBS.has(w[j])) { v.push('personif:' + w[i] + '..' + w[j]); break; }
  }
  // cliché substrings
  for (const p of PHRASES) if (low.includes(' ' + p + ' ') || low.includes(p)) v.push('cliche:' + p);
  for (const p of AI_CLICHE_PHRASES) if ((' ' + line.toLowerCase().replace(/[\n,.!?;]/g,' ').replace(/\s+/g,' ') + ' ').includes(' ' + p + ' ')) v.push('aiCliche:' + p);
  // abstract ending
  if (w.length && ABSTRACT_END.has(w[w.length - 1])) v.push('abstractEnd:' + w[w.length - 1]);
  // proper nouns / digits (no capitals mid-line beyond sentence start handled by author; reject any digit)
  if (/\d/.test(line)) v.push('digit');
  return v;
}

module.exports = { violations, syll: l => Prosody.syllCount(l), words };

if (require.main === module) {
  // self-check on a couple lines
  const tests = ['the rain kept tapping on the glass', 'she left her cup beside the sink',
    'shattered dreams are fading from the light'];
  for (const t of tests)
    console.log(Prosody.syllCount(t), JSON.stringify(violations(t)), '|', t);
}
