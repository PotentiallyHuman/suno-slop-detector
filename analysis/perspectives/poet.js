/* perspectives/poet.js — the POET lens: imagery, the senses, sound, and the turn.
 *
 * What a poet asks: Is this SEEN or just stated? Which senses? Fresh images or stock? Does the
 * sound do work (alliteration/assonance)? Is there a TURN (volta)? Pure-JS, text-only.
 *
 *   Q                                  feature                  hypothesis
 *   1 concrete vs abstract nouns        t4_poet_concreteRatio    human↑ (AI abstracts)
 *   2 how many of the 5 senses          t4_poet_senseDiversity   human↑ (AI sight-only)
 *   3 sight-share of sensory words      t4_poet_sightShare       AI↑
 *   4 figurative density (simile/metaphor) t4_poet_figurative     ~ (both; quality differs)
 *   5 stock/cliché imagery share        t4_poet_stockImagery     AI↑ (shadows/embers/neon)
 *   6 alliteration play                 t4_poet_alliteration     human↑
 *   7 abstraction w/o concrete anchor   t4_poet_ungrounded       AI↑
 *   8 a turn / volta                    t4_poet_volta            human↑ (AI rarely turns)
 *   9 imageable-noun density            t4_poet_imageDensity     human↑
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);
  const P = G.Prosody || (typeof require !== 'undefined' ? require('../prosody.js') : null);

  const ABSTRACT = new Set(('love hate pain joy sorrow soul soulmate spirit heart hearts dream dreams hope hopes fear fears '+
    'time life death destiny fate freedom truth lies memory memories eternity infinity forever peace war faith doubt desire '+
    'passion emotion emotions feeling feelings thought thoughts mind beauty darkness silence chaos heaven hell glory shame '+
    'pride grief loss longing yearning bliss agony despair wonder magic miracle fantasy reality dream serenity karma energy '+
    'essence existence meaning purpose courage strength weakness sin grace mercy wisdom').split(/\s+/));
  const STOCK = new Set(('neon shadow shadows ember embers ash ashes abyss silhouette crimson velvet ethereal cascade infinity '+
    'eternity symphony kaleidoscope labyrinth tapestry luminous celestial cosmic radiant stardust moonlight starlight '+
    'whisper whispers echo echoes horizon skyline streetlight streetlights flame flames flicker glimmer shimmer veins '+
    'phoenix demons angels void fragments').split(/\s+/));
  const SENSE = {
    sight:  new Set('see saw seen seeing look looked looking watch watched eyes eye light lights bright dim glow glowing shine shining gleam color colors red blue green gold golden gray grey dark sight stare gaze flash'.split(/\s+/)),
    sound:  new Set('hear heard hearing listen sound sounds voice voices whisper whispers sing sang singing song echo echoes loud quiet noise ring rang hum humming buzz music silence shout scream call rhythm beat drum'.split(/\s+/)),
    touch:  new Set('touch touched feel felt skin warm warmth cold cool soft hard rough smooth hold held hand hands grip press shiver tremble embrace kiss caress sting burn ache'.split(/\s+/)),
    taste:  new Set('taste tasted sweet bitter sour salt salty honey wine sugar sip drink swallow tongue lips'.split(/\s+/)),
    smell:  new Set('smell smelled scent perfume smoke rose roses fragrance breath incense'.split(/\s+/)),
  };
  const SIMILE = /\b(like|as)\s+(a|an|the)?\s*[a-z]/gi;
  const COPULA = /\b(is|are|was|were|am)\s+(a|an|the)\s+[a-z]+/gi;
  const POS = new Set('love hope light warm bright joy alive free smile shine gold beautiful peace home together rise dawn sun'.split(/\s+/));
  const NEG = new Set('pain cry tears dark cold alone lost broken fall fear empty gone die death goodbye rain grave hurt ache scar'.split(/\s+/));
  const TURN = /\b(but|yet|still|though|until|now|then|suddenly|instead|however)\b/i;

  function analyze(text){
    const L = P.lines(text), nL = Math.max(1, L.length);
    const toks = []; for (const l of L) for (const w of P.words(l)) toks.push(w);
    const nT = Math.max(1, toks.length);

    let nouns=0, concreteN=0, image=0, stock=0;
    const senseCount = {sight:0,sound:0,touch:0,taste:0,smell:0};
    for (const w of toks){
      if (P.posLite(w) === 'N'){ nouns++; if (!ABSTRACT.has(w)){ concreteN++; if (!STOCK.has(w)) image++; } }
      if (STOCK.has(w)) stock++;
      for (const s in SENSE) if (SENSE[s].has(w)) senseCount[s]++;
    }
    const sensesPresent = Object.values(senseCount).filter(c => c>0).length;
    const senseTotal = Object.values(senseCount).reduce((a,b)=>a+b,0);

    const similes = (text.match(SIMILE)||[]).length;
    const copulas = (text.match(COPULA)||[]).length;

    // alliteration: adjacent content words sharing first consonant
    let allit = 0;
    for (const l of L){ const ws = P.words(l).filter(w=>w.length>2); for (let i=1;i<ws.length;i++){
      const a=ws[i-1][0], b=ws[i][0]; if (a===b && !'aeiou'.includes(a)) allit++; } }

    // ungrounded: lines whose words are abstract-heavy with no concrete noun
    let ungrounded=0; for (const l of L){ const ws=P.words(l); let abs=0,con=0;
      for (const w of ws){ if (ABSTRACT.has(w)) abs++; else if (P.posLite(w)==='N') con++; }
      if (abs>=1 && con===0 && ws.length>=3) ungrounded++; }

    // volta: sentiment flip between first and second half, OR a turn-word starting a late line
    const half = Math.floor(L.length/2) || 1;
    const sent = seg => { let p=0,n=0; for (const w of P.words(seg.join(' '))){ if(POS.has(w))p++; if(NEG.has(w))n++; } return (p-n)/Math.max(1,p+n); };
    const flip = Math.abs(sent(L.slice(0,half)) - sent(L.slice(half))) > 0.5 ? 1 : 0;
    const lateTurn = L.slice(half).some(l => TURN.test(l.trim().split(/\s+/).slice(0,2).join(' '))) ? 1 : 0;
    const volta = Math.max(flip, lateTurn);

    const f = {
      t4_poet_concreteRatio: concreteN / Math.max(1, nouns),
      t4_poet_imageDensity: image / nT,
      t4_poet_senseDiversity: sensesPresent / 5,
      t4_poet_sightShare: senseTotal ? senseCount.sight / senseTotal : 0,
      t4_poet_figurative: (similes + copulas) / nL,
      t4_poet_stockImagery: stock / Math.max(1, image + stock),
      t4_poet_alliteration: allit / nL,
      t4_poet_ungrounded: ungrounded / nL,
      t4_poet_volta: volta,
    };

    const senseNames = Object.keys(senseCount).filter(s=>senseCount[s]>0);
    const bits = [];
    bits.push(f.t4_poet_concreteRatio > 0.6 ? 'grounded in concrete images' : 'leans abstract');
    bits.push(senseNames.length <= 1 ? `mostly ${senseNames[0]||'no'} imagery` : `${senseNames.length} senses (${senseNames.join('/')})`);
    if (f.t4_poet_stockImagery > 0.3) bits.push('relies on stock images');
    bits.push(volta ? 'has a turn' : 'no real turn');
    let tip;
    if (f.t4_poet_concreteRatio < 0.5) tip = 'replace one abstract feeling with a specific seen detail';
    else if (sensesPresent <= 1) tip = 'bring in another sense — a sound, a smell, a texture';
    else if (f.t4_poet_stockImagery > 0.3) tip = 'swap a stock image (shadows/embers) for something only this song would say';
    else if (!volta) tip = 'add a turn — let the last verse complicate the first';
    else tip = 'the imagery works — find one fresher metaphor to anchor it';

    return { features: f, report: `Poet's eye: ${bits.join(', ')}. ${tip}.`,
      score: clamp01(0.5 + 0.2*(f.t4_poet_stockImagery + f.t4_poet_ungrounded + f.t4_poet_sightShare - f.t4_poet_concreteRatio - f.t4_poet_senseDiversity - volta*0.5)) };
  }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  const api = { analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.PerspPoet = api;
})();
