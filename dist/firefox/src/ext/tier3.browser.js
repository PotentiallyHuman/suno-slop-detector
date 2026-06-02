/* AUTO-WRAPPED for browser content-script */
(function(){
 const module={exports:{}};
/* tier3_detectors.js — semantic-craft detectors that surface what counting can't see.
 *
 * These work on raw lyric text (no embedding model needed) and capture the
 * features that distinguish "human craft" (argument structure, specific
 * referents, meta-awareness, contradiction-holding) from "AI mood-stacking"
 * (inanimate-animate personification, non-sequitur juxtaposition).
 */
'use strict';
const SlopScore = (typeof globalThis!=="undefined"?globalThis:window).SlopScore;

function lines(text) {
  return SlopScore.stripSectionLabels(String(text || ''))
    .split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

// --- argument structure: contradiction-holding markers ---
const ARG_MARKERS = /\b(but|however|though|although|yet|still|nevertheless|instead|whereas|except|even though|despite|while)\b/gi;
function argumentMarkers(t) { return ((t.match(ARG_MARKERS) || []).length); }

// --- meta-awareness: narrator observing themselves or the partner observing themselves ---
const META_RE = /\b(i thought|i realize|i realized|i notice|i noticed|i see that|you say you|i know that|i understand that|i used to|i can'?t|i won'?t|i refuse|don'?t want to|will not|i can see)\b/gi;
function metaObservation(t) { return (t.match(META_RE) || []).length; }

// --- "when X" conditional structures — characteristic of argument-driven writing ---
const WHEN_RE = /\bwhen\s+\w+/gi;
function whenConditionals(t) { return (t.match(WHEN_RE) || []).length; }

// --- specific named referents: improved over properNounDensity ---
// Match capitalized words (length 3-15) that are NOT at the start of a line.
function specificReferentCount(text) {
  const L = lines(text); let c = 0;
  for (const l of L) {
    const m = l.match(/\b[A-Z][a-z]{2,14}\b/g) || [];
    // first word of a line gets a free pass (sentence-start capital)
    const firstCap = (l.match(/^[A-Z][a-z]+/) || [])[0];
    for (const w of m) {
      if (w === firstCap) continue;
      if (/^(I|I'm|I'd|I've|I'll|Im|Id|Ive|Ill)$/.test(w)) continue;
      c++;
    }
  }
  return c;
}

// --- years, dates, ages, specific numbers ---
const NUM_REFERENT_RE = /\b(19[0-9]{2}|20[0-2][0-9])\b/g;  // years 1900-2029
function numericReferentCount(t) {
  const years = (t.match(NUM_REFERENT_RE) || []).length;
  // "X-year-old", "at X", specific small numbers in pronoun context
  const ages = ((t.match(/\b(seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty)\s+(year|years|month|months|day|days)\b/gi)) || []).length;
  const digits = ((t.match(/\b\d{1,4}\b/g)) || []).filter(s => +s >= 5 && +s <= 9999).length;
  return years * 3 + ages * 2 + digits;
}

// --- INANIMATE-ANIMATE pairs: "pavement whispers", "steel remembers" ---
const INANIMATE = new Set([
  'pavement','asphalt','concrete','steel','wire','glass','metal','silence','shadow',
  'shadows','silhouette','silhouettes','street','streets','dust','mist','rain','storm',
  'cathedral','horizon','dawn','dusk','ember','embers','engine','wall','walls','road',
  'roads','door','doors','table','floor','ceiling','window','windows','sky','ocean',
  'river','rivers','sea','seas','stone','stones','wood','brick','bricks','dust','sand',
  'pavement','curtain','curtains','sidewalk','clock','radio','phone','mirror'
]);
const ANIMATE_VERBS = new Set([
  'whispers','whispered','remembers','remembered','speaks','spoke','sings','sang',
  'dances','danced','cries','cried','smiles','smiled','laughs','laughed','dreams','dreamed',
  'feels','felt','breathes','breathed','knows','knew','wonders','wondered','hopes','hoped',
  'aches','ached','yearns','yearned','prays','prayed','watches','watched','listens','listened',
  'forgives','forgave','holds','held','wants','wanted','needs','needed','tells','told',
  'reaches','reached','reaches','calls','called','asks','asked','answers','answered',
  'sleeps','slept','wakes','woke'
]);
function inanimateAnimatePairs(text) {
  // tokens by line; flag when an INANIMATE token is immediately followed within ~3 tokens
  // by an ANIMATE_VERB.
  const L = lines(text); let c = 0;
  for (const l of L) {
    const m = (l.toLowerCase().match(/[a-z']+/g) || []);
    for (let i = 0; i < m.length; i++) {
      if (!INANIMATE.has(m[i])) continue;
      for (let j = i + 1; j < Math.min(m.length, i + 4); j++) {
        if (ANIMATE_VERBS.has(m[j])) { c++; break; }
      }
    }
  }
  return c;
}

// --- "Y but X" / "X yet Y" within a single line — sign of inline contradiction ---
function inlineContradiction(t) {
  return ((t.toLowerCase().match(/[a-z][\w\s']{4,}\s+(but|yet|though|still|except)\s+[a-z][\w\s']{4,}/gi)) || []).length;
}

// --- AI-specific clichés documented across critique articles ---
// (jackrighteous.com, aisongfix.com, dev.to / "every AI lyrics generator")
const AI_CLICHE_PHRASES = [
  'echoes', 'stories untold', 'shattered dreams', 'endless night',
  'fading light', 'waves crashing', 'unseen tears', 'whispers in the dark',
  'lost in time', 'forgotten memories', 'endless road', 'burning bridges',
  'fading away', 'broken chains', 'empty streets', 'broken dreams',
  'broken heart like', 'heart is broken', 'silent tears', 'silent night',
  'whispered words', 'distant memory', 'forgotten dreams', 'distant horizon',
  'fading stars', 'lonely road', 'shattered glass', 'whispered prayers',
  'shadows falling', 'flickering light', 'echoes fade',
];
function aiClicheList(t) {
  const low = ' ' + String(t).toLowerCase().replace(/[\n,.!?;]/g, ' ').replace(/\s+/g, ' ') + ' ';
  let c = 0;
  for (const p of AI_CLICHE_PHRASES) c += (low.split(' ' + p + ' ').length - 1);
  return c;
}

// --- "vague emotional placeholders" (research-confirmed AI vocabulary collapse) ---
const VAGUE_EMOTION = new Set([
  'broken', 'shattered', 'lost', 'fading', 'endless', 'forgotten', 'distant',
  'silent', 'silence', 'whispered', 'whisper', 'whispers', 'echo', 'echoes',
  'echoing', 'shadow', 'shadows', 'shadowed', 'embers', 'ember', 'ashes',
  'phoenix', 'silhouette', 'silhouettes', 'flame', 'flames', 'flickering',
  'dust', 'mist', 'crimson', 'amber', 'golden', 'ethereal',
]);
function vagueEmotionRatio(t) {
  const tokens = (String(t).toLowerCase().match(/[a-z']+/g) || []);
  if (!tokens.length) return 0;
  let v = 0;
  for (const w of tokens) if (VAGUE_EMOTION.has(w)) v++;
  return v / tokens.length;
}

// --- "adjective stacks": <vague-adj> + <noun> like "shattered dreams" ---
const STACK_ADJ = new Set([
  'broken', 'shattered', 'endless', 'fading', 'forgotten', 'silent', 'whispered',
  'lost', 'distant', 'lonely', 'empty', 'eternal', 'burning', 'flickering',
  'crimson', 'golden', 'silver', 'midnight', 'restless', 'tender', 'crystal',
  'sacred', 'fragile', 'velvet',
]);
const STACK_NOUN = new Set([
  'dreams', 'heart', 'soul', 'love', 'memory', 'memories', 'night', 'days',
  'tears', 'whispers', 'echoes', 'shadow', 'shadows', 'light', 'lights',
  'road', 'roads', 'sky', 'fire', 'flames', 'streets', 'silence', 'embers',
  'ashes', 'horizon', 'voice', 'eyes', 'hands', 'soul', 'kiss', 'song',
]);
function adjectiveStackCount(t) {
  let c = 0;
  for (const line of lines(t)) {
    const m = (line.toLowerCase().match(/[a-z']+/g) || []);
    for (let i = 0; i < m.length - 1; i++)
      if (STACK_ADJ.has(m[i]) && STACK_NOUN.has(m[i + 1])) c++;
  }
  return c;
}

// --- "verb-ing + abstract noun" — recursive AI pattern ("burning embers", "falling stars") ---
const ING_VERB = /\b(burning|falling|rising|crying|dying|breaking|fading|shining|aching|bleeding|drowning|chasing|searching|wandering|whispering|echoing|dancing|fighting|reaching|holding|losing)\b/gi;
function ingVerbAbstractCount(t) {
  const lo = String(t).toLowerCase();
  const matches = lo.match(ING_VERB) || [];
  // count co-occurrence with abstract noun within 4 tokens
  let c = 0;
  const lines2 = lines(t);
  for (const l of lines2) {
    const m = (l.toLowerCase().match(/[a-z']+/g) || []);
    for (let i = 0; i < m.length - 1; i++) {
      if (/^(burning|falling|rising|crying|dying|breaking|fading|shining|aching|bleeding|drowning|chasing|whispering|echoing)$/.test(m[i])) {
        for (let j = i + 1; j < Math.min(m.length, i + 5); j++) {
          if (STACK_NOUN.has(m[j])) { c++; break; }
        }
      }
    }
  }
  return c;
}

// --- emotional homogeneity per stanza: does every block have the same mood-density? ---
// Low variance across blocks = AI's "four stanzas of the same emotional temperature"
function emotionalHomogeneity(t) {
  const blocks = String(t).split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (blocks.length < 2) return 0;
  const densities = blocks.map(b => vagueEmotionRatio(b));
  const m = densities.reduce((a, b) => a + b, 0) / densities.length;
  const sd = Math.sqrt(densities.reduce((a, b) => a + (b - m) ** 2, 0) / densities.length);
  // return INVERSE: high homogeneity (low sd) = AI signal
  // We return the (mean - sd) so high mean + low sd is highest
  return Math.max(0, m - sd);
}

// --- "broken X like Y" simile — flat AI emotional comparisons ---
function emotionalSimile(t) {
  const lo = String(t).toLowerCase();
  return ((lo.match(/\b(broken|shattered|fading|lost|empty|burning) (heart|soul|dreams?|love|memories|light) (like|as) \w+/g)) || []).length;
}

function analyze(text) {
  const nL = Math.max(1, lines(text).length);
  return {
    // human-craft signals
    t3_argumentMarkers:   argumentMarkers(text) / nL,
    t3_metaObservation:   metaObservation(text) / nL,
    t3_whenConditionals:  whenConditionals(text) / nL,
    t3_specificReferent:  specificReferentCount(text) / nL,
    t3_numericReferent:   numericReferentCount(text) / nL,
    t3_inlineContradict:  inlineContradiction(text) / nL,
    // AI-failure signals (research-confirmed)
    t3_inanimateAnimate:  inanimateAnimatePairs(text) / nL,
    t3_aiClicheList:      aiClicheList(text) / nL,
    t3_vagueEmotion:      vagueEmotionRatio(text),
    t3_adjStack:          adjectiveStackCount(text) / nL,
    t3_ingVerbAbstract:   ingVerbAbstractCount(text) / nL,
    t3_emoHomogeneity:    emotionalHomogeneity(text),
    t3_emoSimile:         emotionalSimile(text) / nL,
  };
}

module.exports = { analyze, argumentMarkers, metaObservation, whenConditionals,
  specificReferentCount, numericReferentCount, inanimateAnimatePairs, inlineContradiction };

 (typeof globalThis!=="undefined"?globalThis:window).SlopTier3 = module.exports;
})();
