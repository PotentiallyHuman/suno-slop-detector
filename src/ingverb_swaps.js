/*
 * ingverb_swaps.js — DATA-VETTED "-ing emotional verb" replacement table
 * for the Suno Slop Detector Humanize plan.
 *
 * PURPOSE: feature `t3_ingVerbAbstract` / `s_ingEmotionVerb`
 * (src/ext/tier3.browser.js) flags "<-ing verb> + <abstract noun>" cadences
 * ("burning desire", "falling apart", "fading away", "drowning in sorrow").
 * The detector counts an -ing verb from ING_VERB when an abstract/stock noun
 * (STACK_NOUN) appears within ~4 tokens. Humanize swaps the -ing VERB for a
 * more concrete / human-reading alternative.
 *
 * KEY DIFFERENCE FROM adjstack_swaps: the replacement MAY CHANGE GRAMMATICAL
 * FORM (adjective / past participle / plain verb), not just -ing -> -ing. It is
 * a reversible SUGGESTION, so occasional imperfect grammar-fit is acceptable;
 * we still prefer alternatives that read naturally in the slot.
 *
 * THE CORPUS DECIDED. Every -ing verb below was measured against:
 *   - AI corpus  : 2056 songs (corpus/models/*.json, excl. .heldout & .bak)
 *   - Human corpus: 4402 real-human lyric docs (/tmp/human_lyrics_cache.json)
 *   - wBow model weight (corpus/combined_model.json; +ve = AI-leaning word)
 * See analysis/ingverb_swaps.README.md for the full evidence table.
 *
 * RULE: an -ing verb is in ING_SWAP only if AI doc-rate >= ~2x human rate
 *       AND (positive wBow OR absent-from-vocab & freq-proven rare-in-humans).
 *       -ing verbs that AI over-uses but whose model weight is <= 0 (the model
 *       says they read HUMAN) go in TRANSPARENT_ING: they still trip the
 *       structural flag but the data says DO NOT swap them.
 *
 * Replacements are all data-vetted: they appear in human lyrics and/or have
 * low/negative/absent wBow (data says they read human), and are NOT in the
 * cliche / VAGUE_EMOTION / STACK_ADJ sets (so they don't re-trip a flag).
 *
 * Dual-mode: works as a CommonJS module (Node) and as a browser global.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.INGVERB_SWAPS = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- SWAP-FROM table: data-proven AI-tell -ing verbs -> human-reading
  //      replacements (any grammatical form). Each replacement appears in human
  //      lyrics and/or has low/neg/absent wBow, and is outside the cliche /
  //      VAGUE / STACK_ADJ sets. Format hint per verb noted in comments. ----
  // Lists are ordered MOST-HUMAN-FIRST (lowest/absent wBow leads) so the
  // deterministic first-pick nudges the holistic score the right way; the
  // user's vetted seeds are retained throughout.
  const ING_SWAP = {
    // chasing   AI 7.34% / HU 0.82% (8.98x), wBow +0.933  (verb forms)
    chasing:    ['trailing', 'racing', 'grabbing', 'catching', 'after', 'running'],
    // fading    AI 6.91% / HU 0.84% (8.22x), wBow +0.549  (mix: ptcp/verb/adj)
    //   user seed "washed" KEPT & LEADS (clean); "left"/"gone" are themselves
    //   mildly AI-skewed (+wBow) so kept only deep in the tail.
    fading:     ['washed', 'dimmed', 'bleached', 'peeling', 'faded', 'left'],
    // echoing   AI 0.73% / HU 0.14% (5.35x), wBow absent (freq-proven)  (verb)
    echoing:    ['ringing', 'bouncing', 'rattling', 'repeating', 'humming'],
    // holding   AI 9.00% / HU 2.32% (3.88x), wBow +0.616  (verb)
    holding:    ['keeping', 'gripping', 'clutching', 'pressing', 'squeezing', 'cradling'],
    // rising    AI 2.63% / HU 0.68% (3.85x), wBow +0.211  (verb)
    rising:     ['growing', 'climbing', 'lifting', 'swelling', 'cresting', 'standing'],
    // dancing   AI 5.93% / HU 1.86% (3.19x), wBow +1.365  (verb)
    dancing:    ['swaying', 'stomping', 'shuffling', 'kicking', 'spinning', 'stepping'],
    // whispering AI 1.12% / HU 0.39% (2.90x), wBow absent (freq-proven)  (verb)
    whispering: ['mumbling', 'muttering', 'murmuring', 'hissing', 'mouthing', 'breathing'],
    // breaking  AI 4.13% / HU 1.59% (2.60x), wBow +0.890  (verb)
    breaking:   ['snapping', 'cracking', 'splitting', 'tearing', 'crumbling', 'ripping'],
    // burning   AI 6.03% / HU 2.68% (2.25x), wBow +1.110  (adj/ptcp)
    //   all three user seeds (fiery, ignited, flaming) VETTED CLEAN; "hot"
    //   leads on wBow (-1.39, strongly human) but seeds kept up front.
    burning:    ['fiery', 'ignited', 'flaming', 'searing', 'scorched', 'hot'],
  };

  // ---- TRANSPARENT: AI uses these MORE than humans (so they still trip the
  //      structural t3_ingVerbAbstract flag) but the wBow model says they read
  //      human. The DATA says do NOT swap them. ----
  const TRANSPARENT_ING = new Set([
    'reaching',  // AI 1.90% / HU 0.73% (2.61x) but wBow -0.420 (human-leaning)
    'bleeding',  // AI 1.41% / HU 0.64% (2.22x) but wBow -0.020 (neutral)
  ]);

  // ---- EXCLUDED entirely (data = NOT an AI tell; humans use it as much or
  //      more, ratio < ~2). Listed for transparency; not actioned. NOTE the
  //      user-seed verb "falling" lands HERE (AI 5.06% / HU 2.98% = 1.70x,
  //      wBow -0.418): humans say "falling" naturally, so swapping it would
  //      make lyrics LESS human. Its seed replacements are kept in
  //      EXCLUDED_SEED_NOTE below for the record, not in the active table. ----
  const EXCLUDED_NORMAL = new Set([
    'falling', 'fighting', 'drowning', 'losing', 'shining',
    'crying', 'aching', 'dying', 'searching', 'wandering',
  ]);

  // For transparency: the user's "falling" seed picks, vetted. NOT active
  // because the verb itself is excluded. ('broken' is itself in VAGUE/STACK_ADJ
  // and would re-trip the adjStack flag; 'cracked' is strongly AI-skewed 58x.)
  const EXCLUDED_SEED_NOTE = {
    falling: { kept: ['picked', 'struck', 'slipping', 'dropping'],
               rejected: ['broken (self-flags adjStack)', 'cracked (AI 58x +0.780)'] },
  };

  // STACK_NOUN mirror (from src/ext/tier3.browser.js) — the detector only
  // counts an -ing verb as a hit when one of these abstract/stock nouns is
  // within ~4 tokens, so the helper targets the same windows.
  const STACK_NOUN = new Set([
    'dreams', 'heart', 'soul', 'love', 'memory', 'memories', 'night', 'days',
    'tears', 'whispers', 'echoes', 'shadow', 'shadows', 'light', 'lights',
    'road', 'roads', 'sky', 'fire', 'flames', 'streets', 'silence', 'embers',
    'ashes', 'horizon', 'voice', 'eyes', 'hands', 'kiss', 'song',
  ]);

  // Preserve original casing of the word we replace.
  function matchCase(repl, orig) {
    if (orig === orig.toUpperCase() && orig.length > 1) return repl.toUpperCase();
    if (orig[0] === orig[0].toUpperCase()) return repl[0].toUpperCase() + repl.slice(1);
    return repl;
  }

  /**
   * swapIngVerb(text, opts) — SKETCH of the Humanize action.
   * Walks each line; when it sees an ING_SWAP verb with a STACK_NOUN within the
   * next 4 word-tokens (mirroring the detector's ~4-token window), replaces the
   * -ing verb with one of its data-vetted alternatives. TRANSPARENT_ING verbs
   * are deliberately left untouched.
   *
   * Because a replacement may change grammatical form (adj / past participle /
   * plain verb), this is a reversible SUGGESTION; surrounding words are not
   * re-conjugated. Deterministic by default (first replacement) so the same
   * input maps to the same output; pass opts.pick to vary.
   *
   * Set opts.requireNoun = false to swap any ING_SWAP verb regardless of a
   * nearby abstract noun (looser humanize mode).
   *
   * @param {string} text
   * @param {{pick?:(cands:string[],verb:string,noun:string)=>string, requireNoun?:boolean}} [opts]
   * @returns {{text:string, swaps:Array<{from:string,to:string,noun:string|null}>}}
   */
  function swapIngVerb(text, opts) {
    opts = opts || {};
    const pick = opts.pick || ((cands) => cands[0]);
    const requireNoun = opts.requireNoun !== false; // default true
    const swaps = [];
    const WORD = /[A-Za-z']+/g;
    const out = String(text).split('\n').map((line) => {
      const toks = [];
      let m;
      WORD.lastIndex = 0;
      while ((m = WORD.exec(line))) toks.push({ w: m[0], start: m.index, end: m.index + m[0].length });
      const edits = [];
      for (let i = 0; i < toks.length; i++) {
        const vl = toks[i].w.toLowerCase();
        if (!ING_SWAP[vl]) continue;
        let noun = null;
        if (requireNoun) {
          for (let j = i + 1; j < Math.min(toks.length, i + 5); j++) {
            if (STACK_NOUN.has(toks[j].w.toLowerCase())) { noun = toks[j].w.toLowerCase(); break; }
          }
          if (!noun) continue;
        }
        const repl = pick(ING_SWAP[vl], vl, noun);
        swaps.push({ from: vl, to: repl, noun: noun });
        edits.push({ start: toks[i].start, end: toks[i].end, repl: matchCase(repl, toks[i].w) });
      }
      if (!edits.length) return line;
      let res = '', cur = 0;
      for (const e of edits) { res += line.slice(cur, e.start) + e.repl; cur = e.end; }
      res += line.slice(cur);
      return res;
    }).join('\n');
    return { text: out, swaps };
  }

  return {
    ING_SWAP,
    TRANSPARENT_ING,
    EXCLUDED_NORMAL,
    EXCLUDED_SEED_NOTE,
    STACK_NOUN,
    swapIngVerb,
  };
});
