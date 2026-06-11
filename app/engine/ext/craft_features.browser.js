/* craft_features.browser.js — DETERMINISTIC, runtime-portable craft features.
 * NO LLM, NO spaCy, NO embeddings. Pure string/regex math so train-time (Node) and
 * run-time (browser/phone) compute byte-identical numbers. Each function reads the lyric
 * "through a lens" we found tonight; the trained model decides which weigh highest. */
(function () {
  var G = (typeof globalThis !== "undefined") ? globalThis : (typeof window !== "undefined" ? window : this);

  var NUMW = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|o'?clock|a\.?m|p\.?m|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
  var STOP = {};
  "the a an and or but if then of to in on at by for with from as is are was were be been i you he she it we they me my your his her our their this that".split(" ").forEach(function (w) { STOP[w] = 1; });

  function wordsOf(text) { return (String(text).toLowerCase().match(/[a-z']+/g) || []); }
  function lyricLines(text) { return String(text).split("\n").filter(function (l) { return l.trim() && !/^\s*\[/.test(l); }); }

  // crude, data-free rhyme key: last vowel-cluster + trailing consonants (suffix proxy for end-sound)
  function rhymeKey(w) { var m = w.toLowerCase().match(/[aeiouy]+[^aeiouy]*$/); return m ? m[0] : null; }
  function vowelKey(w) { var m = w.toLowerCase().match(/[aeiouy]+(?=[^aeiouy]*$)/); return m ? m[0] : null; }

  function craftFeatures(text) {
    var w = wordsOf(text), n = Math.max(1, w.length);
    var lines = lyricLines(text);

    // SPECIFICITY — digits + number/time words + capitalized mid-line proper nouns
    var spec = (String(text).match(/\d/g) || []).length + (String(text).match(NUMW) || []).length;
    for (var li = 0; li < lines.length; li++) {
      var t = lines[li].trim().split(/\s+/);
      for (var i = 1; i < t.length; i++) if (/^[A-Z][a-z]{2,}/.test(t[i]) && !/^(I|God|Lord|Oh|Hey|Yeah|Baby)$/.test(t[i])) spec++;
    }
    spec = spec / n;

    // VOCAB RICHNESS + HAPAX (lexical diversity)
    var counts = {}; for (var k = 0; k < w.length; k++) counts[w[k]] = (counts[w[k]] || 0) + 1;
    var uniq = Object.keys(counts).length;
    var hapax = 0; for (var c in counts) if (counts[c] === 1) hapax++;
    var vocab = uniq / n, hapaxR = hapax / n;

    // LINE REPETITION (1 = every line repeated, 0 = all unique)
    var norm = lines.map(function (l) { return l.toLowerCase().replace(/[^a-z ]/g, "").trim(); });
    var rep = 1 - (new Set(norm).size / Math.max(1, norm.length));

    // SELF-REFERENCE (the "I" presence — slop often has nobody home)
    var selfref = ((String(text).toLowerCase().match(/\b(i|me|my|mine)\b/g) || []).length) / n;

    // FUNCTION-WORD RATIO + AVG WORD LENGTH
    var fn = 0; for (var fi = 0; fi < w.length; fi++) if (STOP[w[fi]]) fn++;
    var fnRatio = fn / n;
    var awl = 0; for (var ai = 0; ai < w.length; ai++) awl += w[ai].length; awl = awl / n;

    // RHYME — window-based (format-robust, genre-neutral): within K words, count DISTINCT-word
    // matches. perfect = same rhymeKey; slant = same vowel but different rhymeKey (near-rhyme).
    var K = 8, rk = w.map(rhymeKey), vk = w.map(vowelKey), perfect = 0, slant = 0, denom = 0;
    for (var x = 0; x < w.length; x++) {
      if (!rk[x]) continue; denom++;
      for (var y = x + 1; y < Math.min(x + K + 1, w.length); y++) {
        if (w[y] === w[x]) continue;
        if (rk[y] === rk[x]) { perfect++; break; }
        if (vk[y] && vk[y] === vk[x]) { slant++; break; }
      }
    }
    denom = Math.max(1, denom);

    return {
      cf_spec: round(spec), cf_vocab: round(vocab), cf_hapax: round(hapaxR), cf_rep: round(rep),
      cf_selfref: round(selfref), cf_fnRatio: round(fnRatio), cf_awl: round(awl, 2),
      cf_rhymePerfect: round(perfect / denom), cf_rhymeSlant: round(slant / denom)
    };
  }
  function round(x, d) { var p = Math.pow(10, d || 3); return Math.round(x * p) / p; }

  var api = { extract: craftFeatures, names: ["cf_spec", "cf_vocab", "cf_hapax", "cf_rep", "cf_selfref", "cf_fnRatio", "cf_awl", "cf_rhymePerfect", "cf_rhymeSlant"] };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  G.CraftFeatures = api;
})();
