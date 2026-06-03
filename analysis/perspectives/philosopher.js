/* perspectives/philosopher.js — the PHILOSOPHER lens: is there an IDEA being reasoned, and do the
 * lines follow each other in logical/temporal ORDER (vs a stack of standalone moods)?
 *
 * This is where the user's "Somebody to Love" coherence idea is tested as a better text-only proxy:
 * SEQUENTIAL CONNECTIVES — lines that begin with / contain logical-temporal links (but, so, because,
 * then, when, until) carry a thought forward, where AI mood-stacking drops standalone images.
 *
 *   Q                                  feature                      hyp.
 *   1 lines link in logical order?       t4_phil_sequentialFlow      human↑ (line-initial connectives)
 *   2 overall connective density         t4_phil_connectives         human↑
 *   3 argument markers (tension)         t4_phil_argMarkers          human↑ (reuse tier3)
 *   4 conditionals (if/when X then Y)    t4_phil_conditionals        human↑
 *   5 cause→effect chains                t4_phil_causal              human↑
 *   6 paradox / antithesis               t4_phil_paradox             human↑
 *   7 rhetorical questions               t4_phil_rhetoricalQ         human↑
 *   8 universals grounded in particulars t4_phil_groundedIdea        human↑ (idea + instance)
 *   9 bare universals (unanchored)       t4_phil_bareUniversal       AI↑ (everyone/always w/o instance)
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof require !== 'undefined' ? globalThis : this);
  const P = G.Prosody || (typeof require !== 'undefined' ? require('../prosody.js') : null);

  const CONNECT = new Set('but so because therefore then when after before until while since if though although yet however instead unless whereas once and or nor for'.split(/\s+/));
  const SEQ_START = new Set('but so because then when after before until while since though although yet however instead and now'.split(/\s+/)); // line-initial = continues a thought
  const CAUSAL = /\b(because|so that|therefore|so i|so we|that is why|that's why|which is why|so you|cause i|cause we)\b/gi;
  const COND = /\b(if|when|whenever|unless|as long as|once)\s+\w+/gi;
  const RQ = /\?/g;
  const PARADOX = /\b(the more .* the (more|less)|not .* but|more than .* less than|half .* half|both .* and)\b/i;
  const UNIVERSAL = new Set('everyone everybody everything always never nobody nothing none all every anyone forever everywhere nowhere anything'.split(/\s+/));

  function analyze(text){
    const L = P.lines(text), nL = Math.max(1, L.length);
    const toks = []; for (const l of L) for (const w of P.words(l)) toks.push(w);
    const nT = Math.max(1, toks.length);

    let seqStart = 0, connect = 0, universal = 0, grounded = 0, paradox = 0;
    for (const l of L){
      const ws = P.words(l);
      if (ws.length && SEQ_START.has(ws[0])) seqStart++;
      for (const w of ws){ if (CONNECT.has(w)) connect++; }
      // universal grounded if line also has a concrete referent (year/number/proper noun/specific)
      const hasUniv = ws.some(w => UNIVERSAL.has(w));
      const hasParticular = /\b(19[0-9]{2}|20[0-2][0-9]|\d{1,4})\b/.test(l) || /(^|\s)[A-Z][a-z]{2,}/.test(l.replace(/^[A-Z]/,''));
      if (hasUniv){ universal++; if (hasParticular) grounded++; }
      if (PARADOX.test(l)) paradox++;
    }
    const argMarkers = (text.match(/\b(but|however|though|although|yet|still|nevertheless|instead|whereas|except|even though|despite|while)\b/gi)||[]).length;
    const causal = (text.match(CAUSAL)||[]).length;
    const cond = (text.match(COND)||[]).length;
    const rq = (text.match(RQ)||[]).length;

    const f = {
      t4_phil_sequentialFlow: seqStart / nL,
      t4_phil_connectives: connect / nT,
      t4_phil_argMarkers: argMarkers / nL,
      t4_phil_conditionals: cond / nL,
      t4_phil_causal: causal / nL,
      t4_phil_paradox: paradox / nL,
      t4_phil_rhetoricalQ: rq / nL,
      t4_phil_groundedIdea: grounded / nL,
      t4_phil_bareUniversal: (universal - grounded) / nL,
    };

    const bits = [];
    bits.push(f.t4_phil_sequentialFlow > 0.15 ? 'lines follow in logical order' : 'lines stand alone (little logical flow)');
    bits.push((f.t4_phil_argMarkers + f.t4_phil_causal) > 0.2 ? 'argues a tension/cause' : 'states without reasoning');
    if (paradox) bits.push('uses paradox');
    if (rq) bits.push('asks the listener something');
    let tip;
    if (f.t4_phil_sequentialFlow < 0.1) tip = 'connect two lines with a "but/so/because" so the verse reasons, not just lists';
    else if ((f.t4_phil_argMarkers + f.t4_phil_causal) < 0.1) tip = 'add a turn of logic — a contradiction or a consequence';
    else if (f.t4_phil_bareUniversal > 0.1) tip = 'ground a big claim ("everyone/always") in one specific instance';
    else tip = 'the thinking is there — try posing it as a question or paradox';

    return { features: f, report: `Philosopher: ${bits.join(', ')}. ${tip}.`,
      score: clamp01(0.5 + 0.2*(f.t4_phil_bareUniversal*3 - f.t4_phil_sequentialFlow*2 - f.t4_phil_argMarkers - f.t4_phil_causal*2 - f.t4_phil_paradox*3)) };
  }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  const api = { analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.PerspPhil = api;
})();
