/* perspectives/rapper.js — the FREESTYLE RAPPER lens.
 *
 * Flowchart of computable questions a rapper asks of a lyric, each answered from text alone
 * (via prosody.js), each emitting a t4_rap_* feature + a fragment for the report string.
 * Rhyme is detected Hirjee&Brown-style: match VOWEL-CLASS sequences (ignore consonants) so
 * slant/internal/multisyllabic rhyme is caught, not just exact end rhyme.
 *
 * Direction column = our HYPOTHESIS of which way the signal leans; the trained model decides the
 * real weight. We log separation at calibration and keep only signals that earn their place.
 *
 *   Q (what a rapper notices)                 feature                 hypothesis
 *   1 How dense is the rhyming overall?        t4_rap_rhymeDensity     human↑ (rappers pack rhyme)
 *   2 Are there rhymes INSIDE lines?           t4_rap_internalRhyme    human↑
 *   3 Multisyllabic / compound rhymes?         t4_rap_multisyll        human↑ (rare in AI)
 *   4 Slant vs always-perfect rhyme?           t4_rap_slantRatio       human↑ (AI over-perfects)
 *   5 Is the end-rhyme scheme too regular?     t4_rap_schemeEntropy    human↑ (AI = rigid AABB)
 *   6 Does the flow/cadence vary?              t4_rap_flowVarianceCV   human↑ (AI = monotone lines)
 *   7 Stress/beat variance across lines?       t4_rap_stressVarCV      human↑
 *   8 Assonance play within lines?             t4_rap_assonance        human↑
 *   9 Lazy repeated END WORD as a "rhyme"?     t4_rap_repeatEndWord    AI↑ (cheap rhyme)
 *  10 Enjambment (run-on) vs end-stopped?      t4_rap_enjambment       human↑ (AI end-stops every line)
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);
  const P = G.Prosody || (typeof require !== 'undefined' ? require('../prosody.js') : null);

  const orthoRime = P.orthoRime;        // perfect (same letters) vs slant (same vowel-class only)
  const STOP_END = /[.!?,;:—–-]\s*$/;   // line ends on punctuation = end-stopped

  function analyze(text){
    const L = P.lines(text);
    const nL = Math.max(1, L.length);
    const ends = L.map(P.lastWord);
    const endKeys = ends.map(P.rhymeKey);
    const syll = L.map(P.syllCount);
    const stress = L.map(l => P.words(l).reduce((a,w)=>a + P.stressGuess(w).reduce((x,y)=>x+y,0), 0));

    let internal = 0, multi = 0, assonance = 0, perfectEnd = 0, slantEnd = 0, repeatEnd = 0, enjamb = 0, eye = 0;

    for (let i = 0; i < L.length; i++){
      const ws = P.words(L[i]);
      // (2) internal rhyme: non-final words that rhyme with another word or the end word in-line
      const keys = ws.map(P.rhymeKey);
      const seen = {};
      for (let k = 0; k < keys.length; k++){
        const key = keys[k]; if (!key) continue;
        if (seen[key] !== undefined && k !== keys.length - 1) internal++;
        seen[key] = k;
      }
      // (8) assonance: repeated vowel-class anywhere in the line beyond chance
      const vc = {}; let vhits = 0;
      for (const w of ws){ for (const v of (w.match(/[aeiouy]+/g)||[])){ const c = P.vowelClass(v); if (vc[c]) vhits++; vc[c] = 1; } }
      assonance += vhits / Math.max(1, ws.length);
      // (10) enjambment: line does NOT end on punctuation
      if (ws.length && !STOP_END.test(L[i])) enjamb++;
      // end-rhyme (or EYE-rhyme) vs the previous up-to-2 lines
      for (let j = Math.max(0, i-2); j < i; j++){
        // (11) EYE RHYME: looks like a rhyme (same spelling tail) but sounds different (love/move).
        // Hypothesis: AI that rhymes by spelling does this more than a human writing for the ear.
        if (P.eyeRhyme(ends[i], ends[j])) { eye++; break; }
        if (!endKeys[i] || endKeys[i] !== endKeys[j]) continue;
        if (ends[i] === ends[j]) { repeatEnd++; }                         // same word = lazy
        else if (orthoRime(ends[i]) === orthoRime(ends[j])) perfectEnd++; // same letters + sound = perfect
        else slantEnd++;                                                  // vowel-class only = slant
        if (P.multiRhymeLen(L[i], L[j]) >= 2) multi++;                    // multisyllabic
        break;
      }
    }

    const endRhymePairs = perfectEnd + slantEnd + repeatEnd;
    // (5) scheme regularity: entropy of the end-key sequence (low = rigid/repetitive = AI-ish)
    const keyCounts = {}; for (const k of endKeys) if (k) keyCounts[k] = (keyCounts[k]||0)+1;
    const schemeEntropy = P.entropy(Object.values(keyCounts));

    const f = {
      t4_rap_rhymeDensity: (endRhymePairs + internal) / nL,
      t4_rap_internalRhyme: internal / nL,
      t4_rap_multisyll: multi / nL,
      t4_rap_slantRatio: slantEnd / Math.max(1, perfectEnd + slantEnd),
      t4_rap_schemeEntropy: schemeEntropy,
      t4_rap_flowVarianceCV: P.mean(syll) ? P.stdev(syll) / P.mean(syll) : 0,
      t4_rap_stressVarCV: P.mean(stress) ? P.stdev(stress) / P.mean(stress) : 0,
      t4_rap_assonance: assonance / nL,
      t4_rap_repeatEndWord: repeatEnd / nL,
      t4_rap_enjambment: enjamb / nL,
      t4_rap_eyeRhyme: eye / nL,
    };

    // ---- report string (panel narrative; tendencies, never verdicts) ----
    const scheme = schemeEntropy < 1.6 ? 'a rigid, repetitive rhyme scheme'
                 : schemeEntropy > 2.6 ? 'a varied, unpredictable scheme' : 'a moderately varied scheme';
    const flow = f.t4_rap_flowVarianceCV < 0.10 ? 'near-identical line lengths (flat flow)'
               : f.t4_rap_flowVarianceCV > 0.25 ? 'shifting cadence (lively flow)' : 'some cadence variation';
    const bits = [];
    bits.push(`~${f.t4_rap_rhymeDensity.toFixed(1)} rhymes/line with ${scheme}`);
    bits.push(f.t4_rap_internalRhyme > 0.15 ? 'good internal rhyme' : 'little internal rhyme');
    if (f.t4_rap_multisyll > 0.1) bits.push('some multisyllabic rhyme');
    bits.push(flow);
    let tip;
    if (f.t4_rap_internalRhyme < 0.1) tip = 'try threading a rhyme inside the line, not only at the end';
    else if (f.t4_rap_flowVarianceCV < 0.1) tip = 'vary the line lengths to break the metronome feel';
    else if (f.t4_rap_slantRatio < 0.15 && endRhymePairs > 2) tip = 'swap a perfect rhyme for a slant rhyme to sound less sing-song';
    else if (f.t4_rap_repeatEndWord > 0.15) tip = 'you rhyme a word with itself — find a fresh rhyme';
    else tip = 'the flow has life — push one bar into a multisyllabic rhyme';

    return { features: f, report: `Rapper's ear: ${bits.join(', ')}. ${tip}.`,
      score: clamp01(0.5 + 0.25*(f.t4_rap_repeatEndWord*3 - f.t4_rap_internalRhyme*2 - f.t4_rap_flowVarianceCV - f.t4_rap_slantRatio)) };
  }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  const api = { analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.PerspRapper = api;
})();
