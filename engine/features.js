/*
 * features.js — turn a lyric into a numeric feature vector + nearest-centroid
 * classifier. Pure JS, browser + node. Features are grounded in (a) AI-text
 * detection research (perplexity ≈ word-commonness, burstiness ≈ line-length
 * variance, lexical repetition), (b) songwriting craft (concrete/sensory vs
 * abstract, slant vs perfect rhyme, specificity), and (c) the "human vs LLM
 * perspective" lens (collective vs personal voice, uplifting vs ambivalent).
 *
 * Section-tag COUNT is intentionally excluded — every Suno song has [Verse]/
 * [Chorus] but API-sourced human lyrics don't, so it's a format artifact.
 */
(function (root, factory) {
  const isNode = typeof module !== "undefined" && module.exports;
  const core = isNode ? require("./slop-core.js") : root.SlopScore;
  const common = isNode ? require("./common_words.js") : root.SlopCommon;
  const api = factory(core, common);
  if (isNode) module.exports = api;
  root.SlopFeatures = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (SlopScore, SlopCommon) {
  "use strict";

  const TOP1000 = (SlopCommon && SlopCommon.TOP1000) || new Set();

  const FN_WORDS = new Set(
    ("the a an and or but of to in on at for with from by as is are was were be been being i you he she it we " +
     "they me my your this that these those so it's im i'm ive i've all up down out not no").split(/\s+/)
  );
  const ABSTRACT = new Set(
    ("love heart hearts soul souls pain dream dreams hope hopes fear fears faith fate destiny freedom truth lies " +
     "time forever eternity eternal memory memories feeling feelings emotion desire passion longing loneliness " +
     "lonely sadness sorrow grief joy happiness peace silence infinity beauty magic miracle glory spirit hate " +
     "anger darkness light shadows shadow soulmate hopelessness emptiness").split(/\s+/)
  );
  const CONCRETE = new Set(
    ("see saw look looking watched eyes hear heard listen sound loud smell scent taste sweet bitter sour salt " +
     "touch skin hands fingers cold warm hot rough smooth car truck road street door window kitchen table chair " +
     "coffee cigarette phone dress shirt shoes rain snow dog cat money beer wine whiskey bed floor wall key keys " +
     "clock radio train bus knife glass bottle hair dust dirt mud blood sweat bread porch yard fence cup plate " +
     "boots jacket pocket sidewalk diner counter mirror photograph letter").split(/\s+/)
  );
  const POS = new Set(
    ("love joy happy hope shine bright free freedom rise alive smile laugh warm glow heaven beautiful peace " +
     "believe strong gold golden together sweet light dream").split(/\s+/)
  );
  const NEG = new Set(
    ("pain hurt cry tears sad lonely alone fear afraid dark broken lost grief sorrow cold die death gone goodbye " +
     "empty hollow scream blood war hate angry shadow ache bleed").split(/\s+/)
  );
  const COLLECTIVE = new Set("we us our ours everybody everyone everyones world together".split(/\s+/));
  const PERSONAL = new Set("i me my mine myself".split(/\s+/));
  const NUMWORDS = new Set("two three four five six seven eight nine ten eleven twelve hundred thousand million".split(/\s+/));

  const FEATURE_NAMES = [
    "clicheDensity",      // weighted cliché words / content word
    "phrasePerLine",      // stock-phrase mass / line
    "rhymePerLine",       // lazy canned-rhyme pairs / line
    "perfectRhymeRatio",  // perfect (vs slant) share of end-rhymes — AI higher
    "endRhymeRate",       // fraction of lines that rhyme with a neighbour
    "repetition",         // 1 - length-corrected type/token
    "hapaxRatio",         // once-only words / unique (vocab richness)
    "commonWordRatio",    // content words in top-1000 English — perplexity proxy
    "abstractRatio",      // abstract emotional words / content
    "concreteRatio",      // concrete/sensory words / content
    "lineLenCV",          // burstiness: stdev/mean of line lengths — human higher
    "avgLineLen",         // words per line
    "avgWordLen",         // characters per word
    "fnWordRatio",        // function words / total (stylometric)
    "properNounDensity",  // mid-line capitalised tokens / line — specificity
    "numeralDensity",     // numbers per 100 words — specificity
    "collectivePronoun",  // we/us vs I/me — universal vs personal voice
    "positivityBias",     // positive / (positive+negative) emotion words
  ];

  function rhymeTail(w) {
    if (!w || w.length < 2) return w || "";
    const m = w.match(/[aeiouy][a-z']*$/);
    return m ? m[0] : w.slice(-2);
  }
  function rhymeKind(a, b) {
    if (!a || !b || a === b) return null;
    const ta = rhymeTail(a), tb = rhymeTail(b);
    if (ta.length >= 2 && ta === tb) return "perfect";
    if (ta.length >= 2 && tb.length >= 2 && ta.slice(-2) === tb.slice(-2)) return "slant";
    return null;
  }

  function extract(rawText) {
    const text = SlopScore.normalizeStructure(String(rawText || ""));
    const s = SlopScore.scoreLyrics(text).stats;

    const clean = text.replace(/\[[^\]]*\]/g, " ");
    const rawLines = clean.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length);
    const nLines = Math.max(1, rawLines.length);

    const tokens = (clean.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length > 1 || w === "i");
    const nTok = Math.max(1, tokens.length);
    const content = tokens.filter((w) => !FN_WORDS.has(w));
    const nContent = Math.max(1, content.length);

    // vocabulary
    const freq = {};
    for (const w of tokens) freq[w] = (freq[w] || 0) + 1;
    const uniq = Object.keys(freq);
    const hapax = uniq.filter((w) => freq[w] === 1).length;

    // line lengths (burstiness)
    const lineLens = rawLines.map((l) => (l.toLowerCase().match(/[a-z']+/g) || []).length).filter((n) => n > 0);
    const meanLL = lineLens.reduce((a, b) => a + b, 0) / Math.max(1, lineLens.length);
    const varLL = lineLens.reduce((a, b) => a + (b - meanLL) ** 2, 0) / Math.max(1, lineLens.length);
    const lineLenCV = meanLL ? Math.sqrt(varLL) / meanLL : 0;

    // rhyme: perfect vs slant on line ends
    const endWords = rawLines.map((l) => {
      const m = l.toLowerCase().match(/[a-z']+/g);
      return m ? m[m.length - 1] : null;
    });
    let rhymed = 0, perfect = 0, totalRhyme = 0;
    for (let i = 0; i < endWords.length; i++) {
      let any = false;
      for (let j = i + 1; j <= i + 2 && j < endWords.length; j++) {
        const k = rhymeKind(endWords[i], endWords[j]);
        if (k) { any = true; totalRhyme++; if (k === "perfect") perfect++; }
      }
      if (any) rhymed++;
    }

    // lexical category counts
    let abs = 0, con = 0, pos = 0, neg = 0, coll = 0, pers = 0, common = 0;
    for (const w of content) {
      if (ABSTRACT.has(w)) abs++;
      if (CONCRETE.has(w)) con++;
      if (POS.has(w)) pos++;
      if (NEG.has(w)) neg++;
      if (TOP1000.has(w)) common++;
    }
    for (const w of tokens) {
      if (COLLECTIVE.has(w)) coll++;
      if (PERSONAL.has(w)) pers++;
    }

    // specificity: proper nouns (mid-line capitalised) + numerals
    let proper = 0;
    for (const line of rawLines) {
      const toks = line.match(/[A-Za-z']+/g) || [];
      for (let i = 1; i < toks.length; i++) {
        if (/^[A-Z][a-z]+/.test(toks[i]) && toks[i] !== "I") proper++;
      }
    }
    const numerals =
      (clean.match(/\b\d+\b/g) || []).length +
      tokens.filter((w) => NUMWORDS.has(w)).length;

    const fn = tokens.filter((w) => FN_WORDS.has(w)).length;
    const avgWordLen = tokens.reduce((a, w) => a + w.length, 0) / nTok;

    const named = {
      clicheDensity: s.wordDensity,
      phrasePerLine: s.phraseMass / nLines,
      rhymePerLine: s.rhymeCount / nLines,
      perfectRhymeRatio: totalRhyme ? perfect / totalRhyme : 0,
      endRhymeRate: rhymed / nLines,
      repetition: s.repetition,
      hapaxRatio: hapax / Math.max(1, uniq.length),
      commonWordRatio: common / nContent,
      abstractRatio: abs / nContent,
      concreteRatio: con / nContent,
      lineLenCV: lineLenCV,
      avgLineLen: nTok / nLines,
      avgWordLen: avgWordLen,
      fnWordRatio: fn / nTok,
      properNounDensity: proper / nLines,
      numeralDensity: (numerals / nTok) * 100,
      collectivePronoun: coll + pers ? coll / (coll + pers) : 0,
      positivityBias: pos + neg ? pos / (pos + neg) : 0.5,
    };
    return { names: FEATURE_NAMES, values: FEATURE_NAMES.map((k) => named[k]), named };
  }

  // Classify a lyric against a baked baseline (build/build_baseline.js).
  function classify(text, baseline) {
    if (!baseline || !baseline.centroids) return null;
    const { mean, std } = baseline.scaler;
    const names = baseline.featureNames || FEATURE_NAMES;
    const f = extract(text);
    const v = names.map((k) => f.named[k]);
    const zv = v.map((x, i) => (x - mean[i]) / (std[i] || 1));
    const d = (c) => Math.sqrt(c.reduce((s, x, i) => s + (x - zv[i]) ** 2, 0));
    const dAI = d(baseline.centroids.ai);
    const dHuman = d(baseline.centroids.human);
    const T = baseline.temperature || 1.0;
    const pAI = 1 / (1 + Math.exp(-(dHuman - dAI) / T));
    return { pAI: Math.round(pAI * 100), dAI: +dAI.toFixed(3), dHuman: +dHuman.toFixed(3), named: f.named };
  }

  return { extract, classify, FEATURE_NAMES };
});
