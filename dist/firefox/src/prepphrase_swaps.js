/*
 * prepphrase_swaps.js — DATA-VETTED, METER-MATCHED prepositional/scene-phrase
 * replacement table for the Suno Slop Detector Humanize plan.
 *
 * PURPOSE: feature `s_prepInTheNight` (src/ext/patterns.browser.js, exposed as
 * `s_prepInTheNight` = count / nLines by src/ext/v2-engine.js) flags stock
 * prepositional scene tags. The detector regex is exactly:
 *     /\bin the (dark|night|rain|cold|morning|silence|shadows)\b/
 * Humanize swaps a flagged phrase for a SAME-SYLLABLE-COUNT alternative that the
 * DATA says reads human, breaking the flag while preserving meter.
 *
 * THE CORPUS DECIDED. Every phrase was measured against:
 *   - AI corpus  : 2056 songs (corpus/models/*.json, excl. .heldout / .bak)
 *   - Human corpus: 4547 real-human lyric docs (/tmp/human_lyrics_cache.json,
 *                   skipping empty-string fetch-misses)
 * Doc-rate = fraction of songs that contain the phrase at all (what a reader
 * actually notices). AI/HU ratio = AI doc-rate / human doc-rate.
 * See analysis/prepphrase_swaps.README.md for the full evidence table.
 *
 * INCLUSION RULE (which flagged phrases get swapped):
 *   AI/HU ratio >= ~2          -> SWAP (genuinely AI-skewed scene tag)
 *   AI/HU ratio  < ~2          -> TRANSPARENT — still trips the structural flag,
 *                                 but humans use it as much, so DON'T swap.
 *
 * REPLACEMENT RULE (what we swap TO):
 *   - same syllable count as the flagged phrase (prosody.syllables); ±0 only,
 *     no ±1 fallback was needed (every family had enough exact matches).
 *   - NOT itself a flagged "in the X" phrase; NOT in the cliché/vague sets.
 *   - prefer human-ATTESTED phrases (HU% > 0) with AI/HU ratio <= ~2 (data says
 *     humans say it as much or more). A few plain, concrete, currently-unused
 *     phrases (0%/0%) are included as low-confidence novelty options and tagged.
 *
 * Dual-mode: works as a CommonJS module (Node) and as a browser global.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PREPPHRASE_SWAPS = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- SWAP table: data-proven AI-skewed scene tags -> meter-matched, human-
  //      reading alternatives, GROUPED BY SYLLABLE COUNT so the swap preserves
  //      meter. Each phrase carries its syllable count and an alts list whose
  //      every entry has the SAME syllable count. (Replacements flagged with a
  //      trailing "*" comment are low-confidence: plain/concrete but not yet
  //      attested in either corpus.) ----
  const PHRASE_SWAP = {
    // --- NIGHT/DARK/COLD family: 3 syllables -------------------------------
    // in the dark   AI 7.93% / HU 1.39% (5.72x)
    'in the dark': { syll: 3, alts: [
      'after dark',       // AI 0.24 / HU 0.11 (2.2x) attested
      'down the road',    // AI 0.44 / HU 0.44 (1.0x) attested, human-neutral
      'all night long',   // AI 0.54 / HU 0.66 (0.8x) attested, human-leaning
      'late at night',    // AI 0.58 / HU 0.33 (1.8x) attested
      'well past dark',   // 0/0 plain-concrete novelty *
    ] },
    // in the cold   AI 1.31% / HU 0.59% (2.21x)
    'in the cold': { syll: 3, alts: [
      'all night long',   // 0.8x attested human-leaning
      'down the road',    // 1.0x attested neutral
      'late at night',    // 1.8x attested
      'out past dark',    // 0/0 plain-concrete novelty *
      'well past dark',   // 0/0 plain-concrete novelty *
    ] },
    // --- RAIN family: 3 syllables ------------------------------------------
    // in the rain   AI 4.62% / HU 1.08% (4.29x)
    'in the rain': { syll: 3, alts: [
      'soaking wet',      // AI 0.05 / HU 0.07 (0.7x) attested, human-leaning
      'coming down',      // AI 0.49 / HU 0.44 (1.1x) attested, neutral
      'washed away',      // AI 0.19 / HU 0.09 (2.2x) attested
      'cold and wet',     // 0/0 plain-concrete novelty *
    ] },
    // --- MORNING/SILENCE family: 4 syllables -------------------------------
    // in the morning AI 4.09% / HU 1.98% (2.06x)
    'in the morning': { syll: 4, alts: [
      'when the lights go',  // AI 0.15 / HU 0.11 (1.3x) attested
      'out on the porch',    // AI 0.05 / HU 0.02 (2.2x) attested
      'quarter to three',    // AI 0.05 / HU 0.02 (2.2x) attested
      'out past midnight',   // 0/0 plain-concrete novelty *
    ] },
    // in the silence AI 1.26% / HU 0.22% (5.75x)
    'in the silence': { syll: 4, alts: [
      'out in the storm',    // AI 0.00 / HU 0.02 (humans only) attested
      'caught in the rain',  // AI 0.00 / HU 0.02 (humans only) attested
      'out in the rain',     // AI 0.24 / HU 0.13 (1.8x) attested
      'wet to the bone',     // 0/0 plain-concrete novelty *
    ] },
  };

  // ---- TRANSPARENT: matched by the s_prepInTheNight regex (so they trip the
  //      structural flag) but the DATA says humans use them as much or more —
  //      NOT an AI tell. Report them, but DON'T swap. ----
  const TRANSPARENT_PHRASE = new Set([
    'in the night',    // AI 1.75% / HU 1.54% (1.14x) — humans say it just as much
    'in the shadows',  // AI 0.24% / HU 0.35% (0.69x) — humans say it MORE
  ]);

  // ---- Replacement phrases that the data flagged as THEMSELVES AI-skewed
  //      (ratio >= ~3) and so were REJECTED from the swap pool, listed here for
  //      transparency (several were user seeds). ----
  const REJECTED_AS_AI = new Set([
    'dead of night',      // AI 0.34% / HU 0.07% (5.16x) — user seed, itself AI-ish
    'sun went down',      // 5.16x
    'pouring down',       // AI 0.15% / HU 0.04% (3.32x) — user seed, itself AI-ish
    'pouring rain',       // 5.41x
    'rain on the roof',   // 6.63x
    'rain comes down',    // humans-0, AI-only
    'two in the morning', // 48.65x — extreme AI tell
    'pitch black night',  // 0%/0% — user seed; NOT attested anywhere (can't claim human)
    'passing dark',       // 0%/0% — user seed; not attested
    'washing down',       // AI-only, humans 0
  ]);

  // Preserve capitalization of the original phrase's first letter.
  function matchCase(repl, orig) {
    if (orig[0] === orig[0].toUpperCase()) return repl[0].toUpperCase() + repl.slice(1);
    return repl;
  }

  /**
   * swapPrepPhrase(text, opts) — SKETCH of the Humanize action.
   * Finds each flagged "in the X" scene tag and, when it's a SWAP phrase (not a
   * TRANSPARENT one), replaces it with one of its meter-matched, data-vetted
   * alternatives. Deterministic by default (first alt) so the same input maps to
   * the same output; pass opts.pick to vary.
   *
   * @param {string} text
   * @param {{pick?:(alts:string[],phrase:string)=>string}} [opts]
   * @returns {{text:string, swaps:Array<{from:string,to:string,syll:number}>}}
   */
  function swapPrepPhrase(text, opts) {
    opts = opts || {};
    const pick = opts.pick || ((alts) => alts[0]);
    const swaps = [];
    // Mirror the detector regex exactly, but capture for case-aware replacement.
    const RE = /\bin the (dark|night|rain|cold|morning|silence|shadows)\b/gi;
    const out = String(text).replace(RE, (m) => {
      const key = m.toLowerCase();
      if (TRANSPARENT_PHRASE.has(key)) return m;      // data says leave it
      const entry = PHRASE_SWAP[key];
      if (!entry) return m;                            // not actioned (e.g. "in the shadows")
      const repl = pick(entry.alts, key);
      swaps.push({ from: key, to: repl, syll: entry.syll });
      return matchCase(repl, m);
    });
    return { text: out, swaps };
  }

  return {
    PHRASE_SWAP,
    TRANSPARENT_PHRASE,
    REJECTED_AS_AI,
    swapPrepPhrase,
  };
});
