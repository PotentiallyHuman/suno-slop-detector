/* perspectives/psychologist.js — the PSYCHOLOGIST lens: is there a real mind, and does the song
 * build ONE coherent thought, or stack disconnected moods?
 *
 * Centerpiece (user's "Somebody to Love" insight): a human delivers sentences IN ORDER, each line
 * carrying the last into one complete thought, talking to the listener — while AI mood-stacks
 * pretty but disconnected lines. Text-only proxy (no embeddings): LEXICAL COHESION between adjacent
 * lines (shared content stems / carried referent) = the narrative thread.
 *
 *   Q                                    feature                    hyp.
 *   1 do adjacent lines connect (thread)?  t4_psy_cohesion           human↑ (AI = non-sequitur stack)
 *   2 subject/pronoun continuity?          t4_psy_subjectContinuity  human↑
 *   3 interiority (a modeled mind)?         t4_psy_interiority        ~ (mental-state verbs)
 *   4 specific vs placeholder emotion?      t4_psy_emoGranularity     human↑
 *   5 ambivalence / mixed feeling?          t4_psy_ambivalence        human↑ (psych realism)
 *   6 direct address to a listener?         t4_psy_directAddress      human↑ ("talking to the audience")
 *   7 agency (I-did active verbs)?          t4_psy_agency             human↑
 *   8 placeholder-emotion density           t4_psy_placeholder        AI↑
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof require !== 'undefined' ? globalThis : this);
  const P = G.Prosody || (typeof require !== 'undefined' ? require('../prosody.js') : null);
  const T3 = G.SlopTier3 || (typeof require !== 'undefined' ? safeReq('../tier3_detectors.js') : null);
  function safeReq(p){ try { return require(p); } catch(_) { return null; } }

  const MENTAL = new Set(('think thought thinking know knew knowing feel felt realize realized realise wonder wondered '+
    'remember remembered forget forgot forgotten want wanted wish wished hope hoped fear feared believe believed doubt '+
    'doubted understand understood regret regretted imagine imagined suppose decide decided meant pretend pretended '+
    'notice noticed assume guess used wonder consider learned learn').split(/\s+/));
  const SPECIFIC_EMO = new Set(('ashamed shame jealous jealousy relieved relief embarrassed proud pride lonely loneliness '+
    'anxious bitter bitterness grateful gratitude nostalgic guilty guilt resentful envious content restless homesick '+
    'furious terrified hopeful disappointed humiliated betrayed insecure awkward reluctant tender vengeful smug').split(/\s+/));
  const PLACEHOLDER_EMO = new Set(('broken shattered lost empty hollow numb pain painful hurt aching ache torn falling '+
    'drowning breaking fading cold dark darkness alone lonely tears crying').split(/\s+/));
  const FIRST = new Set('i me my mine myself we us our ours ourselves'.split(/\s+/));
  const SECOND = new Set('you your yours yourself yourselves'.split(/\s+/));
  const THIRD = new Set('he she they him her them his their hers theirs it its'.split(/\s+/));
  const VOCATIVE = new Set('baby babe darling honey sweetheart girl boy love dear man brother sister mama mister'.split(/\s+/));

  function contentStems(line){
    const s = new Set();
    for (const w of P.words(line)) if (w.length > 2 && P.posLite(w) !== 'F') s.add(stem(w));
    return s;
  }
  function stem(w){ return w.replace(/(ing|edly|ed|ly|ers|er|est|s|tion|ness|ment)$/,''); }
  function jacc(a,b){ if(!a.size||!b.size) return 0; let i=0; for(const x of a) if(b.has(x)) i++; return i/(a.size+b.size-i); }

  function analyze(text){
    const L = P.lines(text), nL = Math.max(1, L.length);
    const toks = []; for (const l of L) for (const w of P.words(l)) toks.push(w);
    const nT = Math.max(1, toks.length);

    // (1) adjacent-line lexical cohesion = the carried thread
    let cohes = 0, pairs = 0;
    const sets = L.map(contentStems);
    for (let i=1;i<L.length;i++){ cohes += jacc(sets[i], sets[i-1]); pairs++; }
    const cohesion = pairs ? cohes/pairs : 0;

    // (2) subject/pronoun continuity: dominant person carried line-to-line
    function person(line){ let f=0,s=0,t=0; for(const w of P.words(line)){ if(FIRST.has(w))f++; if(SECOND.has(w))s++; if(THIRD.has(w))t++; } return f>=s&&f>=t&&f>0?'1':s>=t&&s>0?'2':t>0?'3':''; }
    const persons = L.map(person).filter(Boolean);
    let same=0; for(let i=1;i<persons.length;i++) if(persons[i]===persons[i-1]) same++;
    const subjectContinuity = persons.length>1 ? same/(persons.length-1) : 0;

    let mental=0, spec=0, place=0, first=0, second=0, agency=0;
    for (let i=0;i<toks.length;i++){ const w=toks[i];
      if (MENTAL.has(w)) mental++;
      if (SPECIFIC_EMO.has(w)) spec++;
      if (PLACEHOLDER_EMO.has(w)) place++;
      if (FIRST.has(w)) first++;
      if (SECOND.has(w)) second++;
      // agency: "I/we" immediately followed by an action verb
      if ((w==='i'||w==='we') && i+1<toks.length){ const nx=toks[i+1]; if (P.posLite(nx)==='V' && !MENTAL.has(nx)) agency++; }
    }

    // (5) ambivalence: mixed feeling — both a positive and negative emotion word in one line, or a contradiction marker
    let ambiv=0; const POSW=/\b(love|happy|smile|joy|warm|hope|alive|free|together)\b/i, NEGW=/\b(hate|sad|cry|pain|cold|alone|lost|fear|hurt|broken)\b/i;
    for (const l of L){ if ((POSW.test(l)&&NEGW.test(l)) || /\b(but|yet|still|though|even though)\b/i.test(l)) ambiv++; }

    // (6) direct address: 2nd-person density + vocatives + questions
    let voc=0, q=0; for (const l of L){ const ws=P.words(l); if (ws.some(w=>VOCATIVE.has(w))) voc++; if (/\?/.test(l)) q++; }
    const directAddress = (second/nT) + (voc/nL)*0.5 + (q/nL)*0.5;

    const f = {
      t4_psy_cohesion: cohesion,
      t4_psy_subjectContinuity: subjectContinuity,
      t4_psy_interiority: mental/nT,
      t4_psy_emoGranularity: spec/Math.max(1, spec+place),
      t4_psy_ambivalence: ambiv/nL,
      t4_psy_directAddress: directAddress,
      t4_psy_agency: agency/nL,
      t4_psy_placeholder: place/nT,
    };

    const bits = [];
    bits.push(cohesion > 0.12 ? 'lines build on each other (a real thread)' : 'lines feel like separate images');
    bits.push(f.t4_psy_emoGranularity > 0.4 ? 'names specific feelings' : 'leans on placeholder emotions');
    if (f.t4_psy_directAddress > 0.08) bits.push('talks directly to someone');
    if (f.t4_psy_ambivalence > 0.15) bits.push('holds mixed feelings');
    let tip;
    if (cohesion < 0.08) tip = 'let each line answer the one before it, so the verse tells one moving thought';
    else if (f.t4_psy_emoGranularity < 0.3) tip = 'name the exact feeling (ashamed, relieved, jealous) instead of "broken/lost"';
    else if (f.t4_psy_agency < 0.1) tip = 'put yourself in motion — "I did X" beats "everything was Y"';
    else tip = 'the interior life is there — add one contradictory feeling to make it human';

    return { features: f, report: `Psychologist: ${bits.join(', ')}. ${tip}.`,
      score: clamp01(0.5 + 0.2*(f.t4_psy_placeholder*4 - cohesion*3 - f.t4_psy_emoGranularity - f.t4_psy_directAddress*2)) };
  }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  const api = { analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.PerspPsych = api;
})();
