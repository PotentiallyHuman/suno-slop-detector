/*
 * adjstack_swaps.js — DATA-VETTED adjective-stack replacement table
 * for the Suno Slop Detector Humanize plan.
 *
 * PURPOSE: feature `t3_adjStack` (src/ext/tier3.browser.js) flags stock
 * "<adj> + <noun>" clichés ("shattered dreams", "endless night",
 * "silent tears"). Humanize swaps the ADJECTIVE for a plainer/more concrete
 * one that breaks the cliché while staying grammatical.
 *
 * THE CORPUS DECIDED. Every adjective below was measured against:
 *   - AI corpus  : 2056 songs (corpus/models/*.json, excl. .heldout)
 *   - Human corpus: 4215 real-human lyric docs (/tmp/human_lyrics_cache.json)
 *   - wBow model weight (corpus/combined_model.json; +ve = AI-leaning word)
 * See analysis/adjstack_swaps.README.md for the full evidence table.
 *
 * RULE: an adjective is in ADJ_SWAP only if AI doc-rate >= ~2x human rate
 *       AND (positive wBow OR proven-rare-in-humans & absent from model vocab).
 *       Adjectives humans use about as much (data = neutral/human-leaning
 *       wBow) go in TRANSPARENT_ADJ: they still trip the structural flag but
 *       the data says they read HUMAN, so DO NOT swap them.
 *
 * Replacements are all: valid adjectives, NOT in STACK_ADJ / cliché / VAGUE
 * sets, with low/negative or absent wBow (data says they read human), and
 * concrete/sensory where possible.
 *
 * Dual-mode: works as a CommonJS module (Node) and as a browser global.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ADJSTACK_SWAPS = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- SWAP-FROM table: data-proven AI-tell adjectives -> human-reading
  //      plain/concrete replacements (all low/neg/absent wBow, all grammatical
  //      with the STACK_NOUN set). ----
  const ADJ_SWAP = {
    // fading   AI 6.91% / HU 0.88% (7.9x), wBow +0.549
    fading:     ['worn', 'tired', 'gray', 'old', 'cold', 'dim'],
    // forgotten AI 2.38% / HU 1.00% (2.4x), wBow +0.297
    forgotten:  ['old', 'used', 'spare', 'plain', 'half', 'cold'],
    // silent    AI 3.21% / HU 0.97% (3.3x), wBow +0.902
    silent:     ['quiet', 'still', 'shut', 'numb', 'plain', 'cold'],
    // whispered AI 2.58% / HU 0.26% (9.9x), wBow +0.982
    whispered:  ['quiet', 'low', 'plain', 'half', 'soft', 'small'],
    // lost      AI 16.20% / HU 7.78% (2.1x), wBow +0.362
    lost:       ['old', 'spare', 'plain', 'wrong', 'tired', 'half'],
    // distant   AI 2.33% / HU 0.71% (3.3x), wBow +0.630
    distant:    ['far', 'near', 'cold', 'tall', 'wide', 'gray'],
    // empty     AI 16.39% / HU 3.08% (5.3x), wBow +0.909
    empty:      ['bare', 'open', 'plain', 'wide', 'half', 'spare'],
    // burning   AI 6.03% / HU 2.73% (2.2x), wBow +1.110
    burning:    ['warm', 'dry', 'hot', 'bright', 'red', 'bare'],
    // flickering AI 0.92% / HU 0.12% (7.8x), wBow absent (freq-proven)
    flickering: ['dim', 'gray', 'bright', 'faint', 'cold', 'bare'],
    // midnight  AI 7.39% / HU 1.52% (4.9x), wBow +1.034
    midnight:   ['late', 'cold', 'gray', 'long', 'dark', 'quiet'],
    // fragile   AI 0.83% / HU 0.14% (5.8x), wBow absent (freq-proven)
    fragile:    ['thin', 'small', 'worn', 'bare', 'plain', 'tired'],
    // velvet    AI 0.97% / HU 0.26% (3.7x), wBow absent (freq-proven)
    velvet:     ['plain', 'worn', 'soft', 'thin', 'gray', 'old'],
  };

  // ---- TRANSPARENT: AI uses these MORE than humans (so they still trip the
  //      structural t3_adjStack flag) but the wBow model says they read
  //      human/neutral. The DATA says do NOT swap — leave them alone. ----
  const TRANSPARENT_ADJ = new Set([
    'broken',   // AI 13.62% / HU 4.29% but wBow -0.320 (human-leaning word)
    'endless',  // AI  4.72% / HU 1.04% but wBow -0.323
    'silver',   // AI  6.08% / HU 2.47% but wBow -0.060 (neutral)
    'restless', // AI  1.61% / HU 0.33% but wBow -0.180
  ]);

  // ---- EXCLUDED entirely (data = NOT an AI tell; humans use >= as much).
  //      Listed for transparency; not actioned. ----
  const EXCLUDED_NORMAL = new Set([
    'shattered', 'lonely', 'eternal', 'crimson', 'golden',
    'tender', 'crystal', 'sacred',
  ]);

  // STACK_NOUN mirror (from src/ext/tier3.browser.js) so the helper can
  // target only true adj+noun stacks, matching the detector's own logic.
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
   * swapAdjStack(text, opts) — SKETCH of the Humanize action.
   * Walks each line; when it sees a SWAP-FROM adjective immediately before a
   * STACK_NOUN, replaces the adjective with one of its data-vetted plain
   * replacements. TRANSPARENT_ADJ are deliberately left untouched.
   *
   * Deterministic by default (picks first replacement) so the same input maps
   * to the same output; pass opts.pick to vary (e.g. rotate / random).
   *
   * @param {string} text
   * @param {{pick?: (cands:string[], adj:string, noun:string)=>string}} [opts]
   * @returns {{text:string, swaps:Array<{from:string,to:string,noun:string}>}}
   */
  function swapAdjStack(text, opts) {
    opts = opts || {};
    const pick = opts.pick || ((cands) => cands[0]);
    const swaps = [];
    // Walk every word token in order (with its span) so adjacent stacks are all
    // caught. A token is the adjective if it's a SWAP-FROM word AND the next
    // word token (mirroring the detector, which uses [a-z'] tokens) is a
    // STACK_NOUN. Rewrites only the adjective span; punctuation/space untouched.
    const WORD = /[A-Za-z']+/g;
    const out = String(text).split('\n').map((line) => {
      const toks = [];
      let m;
      WORD.lastIndex = 0;
      while ((m = WORD.exec(line))) toks.push({ w: m[0], start: m.index, end: m.index + m[0].length });
      // collect edits (start,end,replacement) so spans stay valid
      const edits = [];
      for (let i = 0; i < toks.length - 1; i++) {
        const al = toks[i].w.toLowerCase();
        const bl = toks[i + 1].w.toLowerCase();
        if (ADJ_SWAP[al] && STACK_NOUN.has(bl)) {
          const repl = pick(ADJ_SWAP[al], al, bl);
          swaps.push({ from: al, to: repl, noun: bl });
          edits.push({ start: toks[i].start, end: toks[i].end, repl: matchCase(repl, toks[i].w) });
        }
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
    ADJ_SWAP,
    TRANSPARENT_ADJ,
    EXCLUDED_NORMAL,
    STACK_NOUN,
    swapAdjStack,
  };
});
