/* perspectives/wit.js — the INTELLECTUAL / WIT lens.
 *
 * Approximates "cleverness" without semantics/LLM, via computable proxies:
 *   - DOMAIN FUSION: a witty line pulls vocabulary from multiple distinct semantic DOMAINS at once.
 *     Queen, "burning(HEAT) through the sky(SPACE)… two hundred degrees(SCIENCE)… Mr Fahrenheit(SCI-name)"
 *     = a 3-domain blend. AI mood-stacks within ONE domain; wit fuses domains. (centerpiece)
 *   - HOMOPHONE density: pun POTENTIAL (their/there, sun/son, knight/night…).
 *   - POLYPTOTON: same root in different forms nearby ("call me / they call", "burn/burning") = play.
 *   - ALLUSION: named cultural entities (mid-line proper nouns) — wit references the world.
 *   - LEXICAL RARITY: share of words outside the common-1000 + word length = vocabulary reach.
 * Full pun/double-entendre detection needs semantics (out of scope) — these are honest proxies; the
 * model + calibration decide which earn their place.
 *
 *   Q                                   feature                  hyp.
 *   1 multiple domains fused per line     t4_wit_domainFusion      human/wit↑
 *   2 peak domain blend (best line)       t4_wit_domainPeak        human/wit↑
 *   3 lines blending >=3 domains          t4_wit_blendRate         human/wit↑
 *   4 homophone (pun-potential) density   t4_wit_homophone         human/wit↑
 *   5 polyptoton (root play)              t4_wit_polyptoton        human/wit↑
 *   6 allusion / named entities           t4_wit_allusion          human/wit↑
 *   7 rare-vocabulary share               t4_wit_lexRare           human/wit↑
 *   8 mean syllables / content word       t4_wit_wordLength        human/wit↑
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof require !== 'undefined' ? globalThis : this);
  const P = G.Prosody || (typeof require !== 'undefined' ? require('../prosody.js') : null);
  function safeReq(p){ try { return require(p); } catch(_) { return {}; } }
  const CW = G.SlopCommon || (typeof require !== 'undefined' ? safeReq('../../src/common_words.js') : {});
  const COMMON = (CW && CW.TOP1000 instanceof Set) ? CW.TOP1000 : new Set((CW && CW.TOP1000) || []);
  // stock/cliché imagery words — these inflate "domain fusion" without being witty, so EXCLUDE them.
  const STOCK = new Set(('neon shadow shadows ember embers ash ashes abyss silhouette crimson velvet ethereal '+
    'symphony luminous celestial cosmic radiant stardust moonlight starlight whisper whispers echo echoes horizon '+
    'skyline streetlight streetlights flame flames flicker glimmer shimmer veins phoenix demons angels void fragments '+
    'storm thunder lightning midnight rain tears soul heart heartbeat darkness').split(/\s+/));
  // "hard" / concrete-technical domains: where specificity & wit live; cliché lyrics avoid them.
  const HARD = new Set(['science','money','crime','tech','war','space','speed','royalty']);
  const SOFT = new Set(['love','body','time','light','heat','nature','water','cold','music','religion']);

  // ~18 semantic domains (compact, lyric-relevant). A word can sit in several.
  const DOMAINS = {
    heat:    'fire flame flames burn burning burned blaze heat hot scorch ember embers ash smoke degrees fahrenheit celsius melt inferno furnace spark sweat'.split(' '),
    cold:    'ice cold frost freeze frozen snow winter chill numb shiver glacier'.split(' '),
    space:   'sky star stars moon sun cosmos cosmic galaxy orbit planet comet meteor rocket heaven atmosphere gravity universe nebula astronaut'.split(' '),
    speed:   'fast speed run race fly rush dash bolt sprint accelerate velocity zoom chase racing engine highway'.split(' '),
    science: 'degrees temperature atom atoms chemical formula equation experiment data measure unit molecule physics gravity electric voltage element laboratory'.split(' '),
    money:   'money cash gold dollar dollars coin coins rich poor bank debt price cost diamond fortune wealth broke pay paid bill'.split(' '),
    war:     'war fight battle gun guns knife blood soldier weapon bomb attack kill army shield sword trigger trench enemy'.split(' '),
    body:    'heart blood bone bones skin veins hand hands eyes lips lungs breath pulse spine flesh teeth nerve'.split(' '),
    nature:  'river ocean sea mountain tree trees forest flower rain wind earth stone field garden leaf root soil valley'.split(' '),
    love:    'love kiss desire lover romance passion sweetheart embrace heartbreak crush affection'.split(' '),
    religion:'god heaven hell soul pray prayer church angel devil sin saint holy faith sacred gospel cross worship'.split(' '),
    royalty: 'king queen crown throne royal reign rule empire ruler prince princess castle palace kingdom'.split(' '),
    time:    'time clock hour hours day night year years moment forever yesterday tomorrow second minute past future midnight dawn'.split(' '),
    crime:   'crime law police jail prison court judge guilty steal thief bail handcuffs verdict felony'.split(' '),
    music:   'song sing music note melody rhythm beat drum guitar voice tune chord chorus stage'.split(' '),
    tech:    'machine wire circuit screen phone signal code wheel motor electric battery digital pixel network'.split(' '),
    water:   'water wave waves flood drown tide swim drip pour stream rain ocean sea'.split(' '),
    light:   'light dark shadow shadows bright shine glow dim lamp neon flicker glimmer beam'.split(' '),
  };
  const WORD2DOM = {};
  for (const d in DOMAINS) for (const w of DOMAINS[d]) (WORD2DOM[w] = WORD2DOM[w] || []).push(d);

  // common homophones (pun potential) — compact high-frequency set
  const HOMOPHONE = new Set(('their there theyre to too two sea see knight night write right wright flower flour sun son '+
    'hear here hour our by buy bye won one road rode rowed bear bare break brake cell sell deer dear eye i aye '+
    'fair fare for four fore great grate hole whole hour our knew new know no mail male meat meet peace piece '+
    'plane plain rain reign rein role roll sail sale scene seen steal steel tail tale tide tied wait weight '+
    'way weigh weak week wood would your youre maid made made pair pear pare red read blue blew threw through '+
    'die dye soul sole toe tow waste waist').split(/\s+/));

  function stem(w){ return w.replace(/(ing|edly|ed|ly|ers|er|est|s|tion|ness|ment)$/,''); }

  function analyze(text){
    const L = P.lines(text), nL = Math.max(1, L.length);
    const toks = []; for (const l of L) for (const w of P.words(l)) toks.push(w);
    const nT = Math.max(1, toks.length);

    // domain fusion per line — EXCLUDE stock/cliché words (so mood-stacking != wit)
    let fusionSum = 0, peak = 0, blendLines = 0, crossReg = 0, hardHits = 0;
    for (const l of L){
      const doms = new Set();
      for (const w of P.words(l)){ if (STOCK.has(w)) continue; if (WORD2DOM[w]) for (const d of WORD2DOM[w]){ doms.add(d); if (HARD.has(d)) hardHits++; } }
      fusionSum += doms.size; if (doms.size > peak) peak = doms.size; if (doms.size >= 3) blendLines++;
      // cross-register: a line that mixes a HARD/technical domain with a SOFT/emotional one
      let h=false, s=false; for (const d of doms){ if (HARD.has(d)) h=true; if (SOFT.has(d)) s=true; }
      if (h && s) crossReg++;
    }

    // homophones
    let homo = 0; for (const w of toks) if (HOMOPHONE.has(w)) homo++;

    // polyptoton: same stem, different surface form, anywhere
    const byStem = {}; for (const w of toks){ if (w.length < 3) continue; const s = stem(w); (byStem[s] = byStem[s] || new Set()).add(w); }
    let poly = 0; for (const s in byStem) if (byStem[s].size >= 2) poly += byStem[s].size - 1;

    // allusion: mid-line capitalized words (proper nouns), not line-start, not "I"
    let allusion = 0;
    for (const l of L){ const raw = l.split(/\s+/); for (let i=1;i<raw.length;i++){ const t=raw[i];
      if (/^[A-Z][a-z]{2,}$/.test(t) && !/^(I|Im|Id|Ive|Ill)$/.test(t)) allusion++; } }

    // lexical rarity + word length (content words only)
    let content=0, rare=0, syll=0;
    for (const w of toks){ if (P.posLite(w)==='F' || w.length<3) continue; content++; if (!COMMON.has(w)) rare++; syll += P.syllables(w); }

    const f = {
      t4_wit_domainFusion: fusionSum / nL,
      t4_wit_domainPeak: peak,
      t4_wit_blendRate: blendLines / nL,
      t4_wit_crossRegister: crossReg / nL,
      t4_wit_hardDomain: hardHits / nT,
      t4_wit_homophone: homo / nT,
      t4_wit_polyptoton: poly / nL,
      t4_wit_allusion: allusion / nL,
      t4_wit_lexRare: content ? rare / content : 0,
      t4_wit_wordLength: content ? syll / content : 0,
    };

    const bits = [];
    bits.push(f.t4_wit_domainFusion > 1.3 ? 'fuses ideas across domains' : 'stays in one idea-domain per line');
    if (peak >= 3) bits.push(`one line blends ${peak} domains`);
    if (f.t4_wit_polyptoton > 0.1) bits.push('plays with word roots');
    if (f.t4_wit_allusion > 0.05) bits.push('makes outside references');
    bits.push(f.t4_wit_lexRare > 0.45 ? 'reaches for less common words' : 'common vocabulary');
    let tip;
    if (f.t4_wit_domainFusion < 1.1) tip = 'try a line that collides two worlds (a feeling described in money, weather, or science terms)';
    else if (f.t4_wit_homophone < 0.01) tip = 'a pun or double-meaning would add a wink';
    else if (f.t4_wit_lexRare < 0.4) tip = 'one surprising, precise word can lift a whole line';
    else tip = 'the wordplay is live — push one image into a double meaning';

    return { features: f, report: `Wit: ${bits.join(', ')}. ${tip}.`,
      score: clamp01(0.5 - 0.15*(f.t4_wit_domainFusion - 1 + f.t4_wit_polyptoton*3 + f.t4_wit_homophone*10 + (f.t4_wit_lexRare-0.4))) };
  }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  const api = { analyze, DOMAINS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.PerspWit = api;
})();
