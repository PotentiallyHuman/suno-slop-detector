/*
 * features.js — turn a lyric into a fixed numeric feature vector.
 * Pure JS, browser + node. Reuses the heuristic signals from slop-core and
 * adds language-robust stylometric features. These vectors are what the
 * data-driven baseline classifier compares against (see build/build_baseline.js).
 */
(function (root, factory) {
  const core =
    typeof module !== "undefined" && module.exports
      ? require("./slop-core.js")
      : root.SlopScore;
  const api = factory(core);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SlopFeatures = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (SlopScore) {
  "use strict";

  const FN_WORDS = new Set(
    ("the a an and or but of to in on at for with from by as is are was were be " +
     "been being i you he she it we they me my your this that these those so it's " +
     "im i'm ive i've all up down out not no").split(/\s+/)
  );

  const FEATURE_NAMES = [
    "clicheDensity",   // weighted cliché words / content word
    "phrasePerLine",   // stock-phrase mass / line
    "rhymePerLine",    // lazy canned-rhyme pairs / line
    "repetition",      // 1 - length-corrected type/token
    "sectionTags",     // [Verse]/[Chorus] markers (capped)
    "endRhymeRate",    // fraction of lines that rhyme with a neighbour
    "avgLineLen",      // words per line
    "fnWordRatio",     // function words / total (stylometric)
    "avgWordLen",      // characters per word
    "hapaxRatio",      // once-only words / unique words (vocab richness)
  ];

  function tokenize(t) {
    return (String(t).toLowerCase().match(/[a-z']+/g) || []).filter((w) => w !== "'");
  }

  // crude language-agnostic rhyme: do two end-words share a rhyming tail?
  function rhymeTail(w) {
    if (!w || w.length < 2) return w || "";
    const m = w.match(/[aeiouy][a-z']*$/); // from last vowel cluster on
    return m ? m[0] : w.slice(-2);
  }
  function rhymes(a, b) {
    if (!a || !b || a === b) return false;
    const ta = rhymeTail(a),
      tb = rhymeTail(b);
    return ta.length >= 2 && (ta === tb || ta.slice(-2) === tb.slice(-2));
  }

  function extract(rawText) {
    const text = String(rawText || "");
    const s = SlopScore.scoreLyrics(text).stats;

    // strip section tags for line/word stylometrics
    const clean = text.replace(/\[[^\]]*\]/g, " ");
    const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length);
    const nLines = Math.max(1, lines.length);

    const tokens = tokenize(clean);
    const nTok = Math.max(1, tokens.length);

    const fn = tokens.filter((w) => FN_WORDS.has(w)).length;
    const avgWordLen = tokens.reduce((a, w) => a + w.length, 0) / nTok;

    const freq = {};
    for (const w of tokens) freq[w] = (freq[w] || 0) + 1;
    const uniq = Object.keys(freq);
    const hapax = uniq.filter((w) => freq[w] === 1).length;

    const endWords = lines.map((l) => {
      const m = l.toLowerCase().match(/[a-z']+/g);
      return m ? m[m.length - 1] : null;
    });
    let rhymed = 0;
    for (let i = 0; i < endWords.length; i++) {
      for (let j = i + 1; j <= i + 2 && j < endWords.length; j++) {
        if (rhymes(endWords[i], endWords[j])) {
          rhymed++;
          break;
        }
      }
    }

    const named = {
      clicheDensity: s.wordDensity,
      phrasePerLine: s.phraseMass / nLines,
      rhymePerLine: s.rhymeCount / nLines,
      repetition: s.repetition,
      sectionTags: s.sectionTags,
      endRhymeRate: rhymed / nLines,
      avgLineLen: nTok / nLines,
      fnWordRatio: fn / nTok,
      avgWordLen: avgWordLen,
      hapaxRatio: hapax / Math.max(1, uniq.length),
    };
    return { names: FEATURE_NAMES, values: FEATURE_NAMES.map((k) => named[k]), named };
  }

  // Classify a lyric against a baked baseline (build/build_baseline.js).
  // Returns P(AI) 0..100 = which centroid the song sits closer to.
  function classify(text, baseline) {
    if (!baseline || !baseline.centroids) return null;
    const { mean, std } = baseline.scaler;
    const v = extract(text).values;
    const zv = v.map((x, i) => (x - mean[i]) / (std[i] || 1));
    const d = (c) => Math.sqrt(c.reduce((s, x, i) => s + (x - zv[i]) ** 2, 0));
    const dAI = d(baseline.centroids.ai);
    const dHuman = d(baseline.centroids.human);
    const T = baseline.temperature || 1.0;
    // softmax over negative distances -> probability of the AI class
    const pAI = 1 / (1 + Math.exp(-(dHuman - dAI) / T));
    return {
      pAI: Math.round(pAI * 100),
      dAI: +dAI.toFixed(3),
      dHuman: +dHuman.toFixed(3),
      named: extract(text).named,
    };
  }

  return { extract, classify, FEATURE_NAMES };
});
