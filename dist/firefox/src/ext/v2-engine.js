/* v2-engine.js — exposes globalThis.SlopV2.
 *
 * Reproduces the training pipeline (pipeline_tier3.js / score_v3.js) feature
 * pipeline EXACTLY so the trained weights in globalThis.SLOP_MODEL apply:
 *   - bowToks(): section-blacklist + non-English stop filtering, same regex.
 *   - denseDict(): f_ (features.js) + s_ (patterns struct, per-line except
 *     contentDensity) + lex_cliche/lex_rhyme (summed, per-line) + t3_ (tier3,
 *     as-is). NO emb_ features (browser is text-only / no-embed) — any emb_*
 *     name in the model gets a raw value of 0, standardized like score_v3 --noembed.
 *
 * score(text) returns { pAI, score: round(pAI*100), dense, contributions }.
 * The user-facing score = round(pAI*100) — pure model confidence P(AI). No blend.
 *
 * Plain ES5-ish browser JS, attaches to globalThis. Also require()-able in Node
 * for the self-test (module.exports at the bottom).
 */
(function () {
  "use strict";
  var G = (typeof globalThis !== "undefined") ? globalThis : (typeof window !== "undefined" ? window : this);

  var SlopScore    = G.SlopScore;
  var SlopFeatures = G.SlopFeatures;
  var SlopPatterns = G.SlopPatterns;
  var SlopTier3    = G.SlopTier3;

  // --- copied VERBATIM from pipeline_tier3.js (SECTION_BLACKLIST + NONEN_STOP) ---
  var SECTION_BLACKLIST = {};
  ("verse verses chorus choruses bridge bridges intro outro hook hooks refrain refrains " +
   "breakdown coda interlude prechorus postchorus reprise vamp tag vers omkvad omkvaed " +
   "verso estribillo puente couplet pont ritornello").split(/\s+/).forEach(function (w) { SECTION_BLACKLIST[w] = 1; });

  var NONEN_STOP = {};
  ("el la los las un una que en por con para pero se mi tu lo del como esta este eso esa ese " +
   "nada todo soy eres muy sin cuando porque donde je les des une est dans pour avec che gli " +
   "della sono non il elle ich und der die das ist nicht").split(/\s+/).forEach(function (w) { NONEN_STOP[w] = 1; });

  // bowToks(t) = stripSectionLabels -> lowercase -> [a-z']+ -> filter blacklist/nonen, keep len>1 or 'i'
  function bowToks(t) {
    var m = SlopScore.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g) || [];
    var out = [];
    for (var i = 0; i < m.length; i++) {
      var w = m[i];
      if (SECTION_BLACKLIST[w]) continue;
      if (NONEN_STOP[w]) continue;
      if (w.length > 1 || w === "i") out.push(w);
    }
    return out;
  }

  // denseDict(text) — mirrors pipeline_tier3.js denseDict (no embeddings).
  function denseDict(text) {
    var d = {};
    try {
      var f = SlopFeatures.extract(text);
      for (var i = 0; i < f.names.length; i++) d["f_" + f.names[i]] = f.values[i];
    } catch (e) { /* features optional */ }

    var a = SlopPatterns.analyze(text);
    var nL = Math.max(1, a.__nLines);
    var cl = 0, rh = 0;
    for (var k in a) {
      if (!a.hasOwnProperty(k)) continue;
      var v = a[k];
      if (k.indexOf("struct::") === 0) {
        var n = k.slice(8);
        d["s_" + n] = (n === "contentDensity") ? v : v / nL;
      } else if (k.indexOf("cliche::") === 0) {
        cl += v;
      } else if (k.indexOf("rhyme::") === 0) {
        rh += v;
      }
    }
    d["lex_cliche"] = cl / nL;
    d["lex_rhyme"]  = rh / nL;

    var tf = SlopTier3.analyze(text);
    for (var tk in tf) if (tf.hasOwnProperty(tk)) d[tk] = tf[tk];
    return d;
  }

  // nLines as used by denseDict (from the patterns analyzer).
  function nLinesOf(text) {
    return Math.max(1, SlopPatterns.analyze(text).__nLines);
  }

  function score(text) {
    var M = G.SLOP_MODEL;
    if (!M) throw new Error("SLOP_MODEL not loaded");

    // Clean input the SAME way the training corpus was cleaned (strip [..] tags + JSON;
    // detect instrumental) so inference features match the tag-free training data.
    var cleaned = (G.SlopClean ? G.SlopClean.clean(text) : { lyrics: String(text == null ? "" : text), instrumental: false });
    if (cleaned.instrumental) return { instrumental: true, pAI: null, score: null };
    text = cleaned.lyrics;

    var vocab = M.vocab, wBow = M.wBow, denseNames = M.denseNames,
        wDense = M.wDense, denseMean = M.denseMean, denseStd = M.denseStd, bias = M.bias;

    // --- BoW term-frequency vector (count / Ntokens), only known vocab words ---
    var idx = {};
    for (var vi = 0; vi < vocab.length; vi++) idx[vocab[vi]] = vi;
    var tk = bowToks(text);
    var nTok = Math.max(1, tk.length);
    var bowCount = {};                       // vocab-index -> raw count
    for (var ti = 0; ti < tk.length; ti++) {
      var bi = idx[tk[ti]];
      if (bi !== undefined) bowCount[bi] = (bowCount[bi] || 0) + 1;
    }

    // --- dense raw + standardized ---
    var raw = denseDict(text);
    var DN = denseNames.length;
    var denseRaw = new Array(DN);
    var denseStdz = new Array(DN);
    for (var j = 0; j < DN; j++) {
      var r = +raw[denseNames[j]] || 0;      // missing (e.g. emb_*) -> 0
      denseRaw[j] = r;
      denseStdz[j] = (r - denseMean[j]) / (denseStd[j] || 1);
    }

    // --- z = bias + sum wBow*bowTf + sum wDense*denseStdz ---
    var z = bias;
    var contributions = [];
    for (var bk in bowCount) {
      if (!bowCount.hasOwnProperty(bk)) continue;
      var tf = bowCount[bk] / nTok;
      var c = wBow[bk] * tf;
      z += c;
    }
    for (var dj = 0; dj < DN; dj++) {
      var contrib = wDense[dj] * denseStdz[dj];
      z += contrib;
      contributions.push({
        name: denseNames[dj],
        kind: "dense",
        value: denseRaw[dj],
        std: denseStdz[dj],
        weight: wDense[dj],
        contrib: contrib
      });
    }
    // top BoW word contributions (separate list, also folded into contributions)
    for (var bk2 in bowCount) {
      if (!bowCount.hasOwnProperty(bk2)) continue;
      var tf2 = bowCount[bk2] / nTok;
      var cc = wBow[bk2] * tf2;
      contributions.push({
        name: vocab[bk2],
        kind: "word",
        value: bowCount[bk2],
        std: tf2,
        weight: wBow[bk2],
        contrib: cc
      });
    }

    contributions.sort(function (x, y) { return Math.abs(y.contrib) - Math.abs(x.contrib); });

    // Temperature scaling: logistic-regression is overconfident on separable data, so the raw
    // sigmoid pins to 0/100. Dividing the logit by T calibrates toward true P(AI) and yields a
    // usable gradient (clear cases stay near the ends; borderline songs spread across the middle).
    var TEMP = 8;
    var pAI = 1 / (1 + Math.exp(-z / TEMP));

    return {
      pAI: pAI,
      score: Math.round(pAI * 100),
      z: z,
      dense: denseRaw,
      denseNames: denseNames,
      denseStdz: denseStdz,
      contributions: contributions,
      nLines: nLinesOf(text),
      nTokens: nTok
    };
  }

  var api = {
    score: score,
    denseDict: denseDict,
    bowToks: bowToks,
    nLinesOf: nLinesOf,
    SECTION_BLACKLIST: SECTION_BLACKLIST,
    NONEN_STOP: NONEN_STOP
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  G.SlopV2 = api;
})();
