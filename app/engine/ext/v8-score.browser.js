/* v8-score.browser.js — scoreV8, mirrors node analysis/score_v8.js EXACTLY.
 * Reuses SlopV2.denseDict (f_/s_/lex_) + SLOP_PX methods (px_) + CraftFeatures (cf_) +
 * direct typ_ai over the v8 aiBank. Model = globalThis.SLOP_MODEL_V8 (format-stripped + craft).
 * NOTE: matches TRAINING basis — raw text, own tokenizer (NO stop-word filter, unlike bowToks). */
(function () {
  var G = (typeof globalThis !== "undefined") ? globalThis : this;
  function toks(t) {
    var s = String(t == null ? "" : t).replace(/^\s*\[.*\]\s*$/gm, " ");   // strip [Section] labels
    return (s.toLowerCase().match(/[a-z']+/g) || []).filter(function (w) { return w.length > 1 || w === "i"; });
  }
  function tri(t) { var w = toks(t), s = {}; for (var i = 0; i + 2 < w.length; i++) s[w[i] + " " + w[i + 1] + " " + w[i + 2]] = 1; return Object.keys(s); }
  function typ(t, bank) { var g = tri(t); if (!g.length) return 0; var c = 0; for (var i = 0; i < g.length; i++) if (bank.has(g[i])) c++; return c / g.length; }

  function scoreV8(text) {
    var M = G.SLOP_MODEL_V8; if (!M) throw new Error("SLOP_MODEL_V8 not loaded");
    var t = String(text == null ? "" : text);
    var raw = G.SlopV2.denseDict(t);                                   // f_/s_/lex_ (+unused t3_/persp)
    if (G.SLOP_PX) {                                                   // px_ (match train_v8 dense())
      try { var sq = G.SLOP_PX.selfQualify(t), ta = G.SLOP_PX.templateAnaphora(t), hj = G.SLOP_PX.hedgeJust(t);
        raw.px_just = hj.justRate; raw.px_negAnaphora = ta.negAnaphoraRate; raw.px_resolvedNot = ta.resolvedNotRate;
        raw.px_correction = sq.correctionRate; raw.px_denyRun = sq.denyRunRate; raw.px_selfQualify = sq.selfQualifyScore; } catch (e) {}
    }
    if (G.CraftFeatures) { var cfv = G.CraftFeatures.extract(t); for (var ck in cfv) raw[ck] = cfv[ck]; }  // cf_
    var aiBank = M._aiSet || (M._aiSet = new Set(M.aiBank));
    var DN = M.denseNames.length, dnz = new Array(DN);
    for (var j = 0; j < DN; j++) {
      var name = M.denseNames[j], v;
      if (name === "typ_ai") v = typ(t, aiBank);
      else if (name.indexOf("typ_") === 0) v = 0;
      else v = +raw[name] || 0;
      dnz[j] = (v - M.zmean[j]) / (M.zstd[j] || 1);
    }
    var tk = toks(t), nTok = Math.max(1, tk.length), idx = M._idx;
    if (!idx) { idx = {}; for (var vi = 0; vi < M.vocab.length; vi++) idx[M.vocab[vi]] = vi; M._idx = idx; }
    var bow = {}; for (var ti = 0; ti < tk.length; ti++) { var bi = idx[tk[ti]]; if (bi !== undefined) bow[bi] = (bow[bi] || 0) + 1; }
    var z = M.bias;
    for (var jj = 0; jj < DN; jj++) z += M.wDense[jj] * dnz[jj];
    for (var bk in bow) z += (M.wBow[bk] || 0) * (bow[bk] / nTok);
    var pAI = 1 / (1 + Math.exp(-z));
    return { pAI: pAI, score: Math.round(pAI * 100), verdict: pAI >= (M.threshold || 0.5) ? "AI" : "human" };
  }
  var api = { scoreV8: scoreV8 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  G.SlopV8 = api;
})();
