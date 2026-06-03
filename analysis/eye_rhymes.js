/* eye_rhymes.js — archive of English "eye rhymes" (a.k.a. sight rhymes): words whose SPELLING
 * tails match but whose SOUNDS differ (love/move, though/through, good/blood…). Caused by the
 * Great Vowel Shift freezing spelling while pronunciation moved.
 *
 * Two jobs:
 *   1) PRONUNCIATION OVERRIDE — give the *real* rime-sound for tricky words so the rhyme engine
 *      stops false-positiving (love no longer "rhymes" with move).
 *   2) EYE-RHYME DETECTION — two end-words are an eye rhyme if their spelling tails match but their
 *      sound keys differ. Hypothesis (user's): a text-based AI that rhymes by spelling produces
 *      MORE eye rhymes than a human writing for the ear → an AI tell. (Validated at calibration.)
 *
 * SOUND keys are coarse rime labels (vowel-sound + coda), only needed to be internally consistent.
 * Organized by spelling family → {soundKey: [words]} for maintainability, then flattened.
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);

  // family -> { soundKey : [words sharing that family-spelling AND that sound] }
  const FAMILIES = {
    ove:  { UHV:['love','dove','glove','above','shove'], OOV:['move','prove','approve','improve','remove'], OHV:['cove','wove','grove','drove','stove','clove','rove','strove'] },
    ood:  { UUD:['good','wood','hood','stood','understood'], OOD:['food','mood','brood'], UHD:['blood','flood'] },
    ive:  { IV:['give','live','forgive'], EYEV:['five','drive','alive','hive','dive','strive','arrive','survive','thrive','deprive'] },
    ind:  { IND:['wind'], EYEND:['find','mind','kind','blind','behind','remind','grind','rewind','unwind'] },
    one:  { UHN:['one','done','none'], OHN:['bone','stone','alone','phone','throne','zone','cone','tone','clone','prone'], AWN:['gone'] },
    ost:  { AWST:['cost','lost','frost'], OHST:['most','post','host','ghost','almost'] },
    ull:  { UUL:['full','bull','pull'], UHL:['dull','gull','hull','skull','lull','null'] },
    oot:  { UUT:['foot','soot'], OOT:['boot','root','shoot','loot','toot','hoot'] },
    omb:  { OHM:['comb'], OOM:['tomb','womb'], AHM:['bomb'] },   // comb=/oʊm/, tomb/womb=/uːm/, bomb=/ɒm/
    ear:  { AIR:['bear','wear','pear','swear','tear'], EER:['hear','near','fear','year','dear','clear','rear','spear','gear','appear'], ER:['earth','earn','learn','heard','search','pearl','yearn'], AR:['heart'] },
    ead:  { ED:['head','dead','bread','spread','thread','dread','instead','ahead'], EED:['bead','read','lead','plead','knead'] },
    eak:  { AYK:['break','steak'], EEK:['speak','weak','peak','leak','sneak','freak','streak','beak','creak'] },
    eat:  { AYT:['great'], EET:['eat','beat','seat','heat','meat','treat','wheat','repeat','defeat','retreat'], ET:['sweat','threat'] },
    aid:  { AYD:['paid','maid','raid','braid','afraid','laid'], ED:['said'] },
    ow:   { OH:['low','show','grow','snow','know','blow','flow','glow','slow','throw','below','window','shadow','tomorrow','sorrow'], OW:['cow','now','how','bow','brow','vow','plow','allow','somehow'] },
    our:  { OR:['four','pour','your','court','fourth'], OWR:['our','sour','hour','flour','scour','devour'], UUR:['tour'] },
    ord:  { ER:['word','world','work','worm','worth','worse','worst'], ORD:['ford','lord','cord','sword','accord','record','afford'] },
    ome:  { UHM:['come','some','become','overcome'], OHM:['home','dome','roam','foam','chrome','gnome'] },
    ough: { OH:['though','dough','although','thorough'], OO:['through'], OFF:['cough','trough'], UFF:['rough','tough','enough'], OW:['bough','drought','plough'] },
    ought:{ AWT:['ought','bought','thought','sought','brought','fought','nought'] },
  };

  // flatten -> word : soundKey  (a word may appear in multiple families; first wins — fine, keys are unique enough)
  const OVERRIDE = {};
  for (const fam in FAMILIES) for (const sk in FAMILIES[fam]) for (const w of FAMILIES[fam][sk]) if (!(w in OVERRIDE)) OVERRIDE[w] = sk;

  // family lookup: the spelling-tail bucket a word belongs to (for eye-rhyme: same family, diff sound)
  const FAMILY_OF = {};
  for (const fam in FAMILIES) for (const sk in FAMILIES[fam]) for (const w of FAMILIES[fam][sk]) if (!(w in FAMILY_OF)) FAMILY_OF[w] = fam;

  function soundKey(w){ w = String(w).toLowerCase().replace(/[^a-z]/g,''); return OVERRIDE[w] || null; }

  const api = { OVERRIDE, FAMILY_OF, FAMILIES, soundKey,
    nWords: Object.keys(OVERRIDE).length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.EyeRhymes = api;
})();
