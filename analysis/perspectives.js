/* perspectives.js — aggregator for the 6 craft-perspective lenses (tier-4).
 * Returns { features: {...all t4_*}, perspectives: { rapper:{report,score}, ... } }.
 * Works in Node (training: require) and browser (inference: globalThis.Persp*). The flat `features`
 * merge into denseDict (pipeline_tier3 + v2-engine) so the trained model weights them; the per-lens
 * report/score drive the craft panel.
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof require !== 'undefined' ? globalThis : this);
  function req(p){ try { return require(p); } catch(_) { return null; } }
  const NODE = (typeof require !== 'undefined');
  const LENS = {
    rapper:       G.PerspRapper || (NODE ? req('./perspectives/rapper.js') : null),
    poet:         G.PerspPoet   || (NODE ? req('./perspectives/poet.js') : null),
    wit:          G.PerspWit    || (NODE ? req('./perspectives/wit.js') : null),
    psychologist: G.PerspPsych  || (NODE ? req('./perspectives/psychologist.js') : null),
    philosopher:  G.PerspPhil   || (NODE ? req('./perspectives/philosopher.js') : null),
    storyteller:  G.PerspStory  || (NODE ? req('./perspectives/storyteller.js') : null),
  };

  function analyze(text){
    const features = {}; const perspectives = {};
    for (const name in LENS){
      const lens = LENS[name]; if (!lens || !lens.analyze) continue;
      let r; try { r = lens.analyze(text); } catch (e) { continue; }
      if (r && r.features) for (const k in r.features){ const v = r.features[k]; features[k] = (typeof v === 'number' && isFinite(v)) ? v : 0; }
      if (r) perspectives[name] = { report: r.report || '', score: r.score };
    }
    return { features, perspectives };
  }
  // just the flat feature dict (for denseDict)
  function features(text){ return analyze(text).features; }

  const api = { analyze, features, LENS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.SlopPerspectives = api;
})();
