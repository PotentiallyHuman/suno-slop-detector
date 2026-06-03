/* perspectives/storyteller.js — the STORYTELLER lens: is this a STORY (who/where/when/what-happens)
 * or just atmosphere? AI excels at mood; it struggles to put named people in real places doing
 * things in sequence. All text-only.
 *
 *   Q                                  feature                    hyp.
 *   1 named people/places (proper nouns) t4_story_namedEntities    human↑
 *   2 concrete setting (rooms/streets…)  t4_story_setting          human↑
 *   3 things HAPPEN (action past-tense)  t4_story_action           human↑
 *   4 temporal sequence (then/that night)t4_story_temporalSeq      human↑
 *   5 dialogue / quoted speech           t4_story_dialogue         human↑
 *   6 other characters (he/she/they/name)t4_story_otherChars       human↑
 *   7 concrete time/date/age             t4_story_concreteTime     human↑ (reuse numericReferent)
 *   8 object density (things, not ideas) t4_story_objects          human↑
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof require !== 'undefined' ? globalThis : this);
  const P = G.Prosody || (typeof require !== 'undefined' ? require('../prosody.js') : null);
  const T3 = G.SlopTier3 || (typeof require !== 'undefined' ? safeReq('../tier3_detectors.js') : null);
  function safeReq(p){ try { return require(p); } catch(_) { return null; } }

  const SETTING = new Set(('room rooms street streets town city kitchen bar bars car cars road roads house houses home '+
    'door doors window windows station train trains bus church school yard porch field fields bridge highway diner motel '+
    'apartment bed table floor garden hill beach corner sidewalk gate fence barn store shop counter hallway basement '+
    'attic driveway parking alley curb pavement platform pew booth stool dashboard').split(/\s+/));
  const TEMPORAL = new Set('then after before next later finally suddenly meanwhile soon afterwards afterward yesterday tomorrow morning evening night noon dawn dusk midnight autumn winter summer spring monday tuesday wednesday thursday friday saturday sunday'.split(/\s+/));
  const DIALOGUE_V = new Set('said told asked replied whispered shouted called answered yelled cried screamed murmured muttered'.split(/\s+/));
  const THIRD_OTHER = new Set('he she they him her them his their hers'.split(/\s+/));
  const OBJECT = new Set(('cigarette cigarettes coffee bottle bottles glass keys phone letter letters photograph photo photos '+
    'guitar radio clock ring dress shirt coat shoes boots hat watch knife gun car truck money dollar cards card record '+
    'records suitcase bag jacket gloves scarf umbrella newspaper map ticket envelope').split(/\s+/));

  function analyze(text){
    const L = P.lines(text), nL = Math.max(1, L.length);
    const toks = []; for (const l of L) for (const w of P.words(l)) toks.push(w);
    const nT = Math.max(1, toks.length);

    let setting=0, temporal=0, dialogueV=0, third=0, object=0, past=0;
    for (const w of toks){
      if (SETTING.has(w)) setting++;
      if (TEMPORAL.has(w)) temporal++;
      if (DIALOGUE_V.has(w)) dialogueV++;
      if (THIRD_OTHER.has(w)) third++;
      if (OBJECT.has(w)) object++;
      if (/[a-z]ed$/.test(w) && w.length>3 && P.posLite(w)==='V') past++;   // action narration
    }
    // dialogue: quoted speech OR dialogue verbs
    const quotes = (text.match(/["“”]/g)||[]).length;
    const dialogue = (dialogueV + quotes/2) / nL;

    // named entities (mid-line proper nouns) + concrete time via tier3
    let named = 0;
    for (const l of L){ const raw=l.split(/\s+/); for (let i=1;i<raw.length;i++){ if (/^[A-Z][a-z]{2,}$/.test(raw[i]) && !/^(I|Im|Id|Ive|Ill)$/.test(raw[i])) named++; } }
    const concreteTime = T3 && T3.numericReferentCount ? T3.numericReferentCount(text)/nL : 0;

    const f = {
      t4_story_namedEntities: named / nL,
      t4_story_setting: setting / nT,
      t4_story_action: past / nT,
      t4_story_temporalSeq: temporal / nL,
      t4_story_dialogue: dialogue,
      t4_story_otherChars: third / nT,
      t4_story_concreteTime: concreteTime,
      t4_story_objects: object / nT,
    };

    const bits = [];
    bits.push(f.t4_story_setting > 0.03 || named > 0 ? 'has a place/people' : 'no real place or characters');
    bits.push(f.t4_story_action > 0.03 ? 'things happen (action)' : 'mostly states of being, little action');
    if (f.t4_story_dialogue > 0.1) bits.push('has voices/dialogue');
    if (f.t4_story_temporalSeq > 0.2) bits.push('moves through time');
    let tip;
    if (named === 0 && f.t4_story_setting < 0.02) tip = 'put it somewhere real — a named place, a specific room';
    else if (f.t4_story_action < 0.02) tip = 'let something HAPPEN — an action, not just a feeling';
    else if (f.t4_story_dialogue < 0.05) tip = 'add a line of what someone actually said';
    else tip = 'the scene is alive — give it one more concrete object to hold onto';

    return { features: f, report: `Storyteller: ${bits.join(', ')}. ${tip}.`,
      score: clamp01(0.5 - 0.18*(f.t4_story_namedEntities*2 + f.t4_story_setting*5 + f.t4_story_action*5 + f.t4_story_dialogue + f.t4_story_concreteTime*3 - 1)) };
  }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  const api = { analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.PerspStory = api;
})();
