/* v8-rewrite.browser.js — the gated humanizer. Random-order sweep of deterministic humanizing
 * moves, each kept ONLY if SlopV8.scoreV8's AI% drops. Never worsens a song. No LLM. Preserves
 * [Section] labels. globalThis.RewriteV8.rewrite(text) -> {text, before, after}. */
(function () {
  var G = (typeof globalThis !== "undefined") ? globalThis : this;
  var FILLER = /\b(just|really|simply|truly|somehow|oh+|yeah+|baby|ooh+|woah+|na+)\b/gi;
  var DECLICHE = [
    [/\bdeep (down )?inside( my soul| my heart)?\b/gi, "down in my gut"],
    [/\b(in|under) the (pale )?moonlight\b/gi, "under the lot light"],
    [/\bchasing (all )?(my |the )?dreams?\b/gi, "chasing the last train"],
    [/\bforever (in my heart|and always|more)\b/gi, "stuck in my head"],
    [/\bthe endless (night|sky)\b/gi, "the 3 a.m. quiet"],
    [/\bhold(ing)? on (so )?tight\b/gi, "knuckles white"],
    [/\btears (fall(ing)? )?(down |like (the )?rain)\b/gi, "mascara down my chin"]
  ];
  function isLabel(l) { return /^\s*\[/.test(l); }
  function moveLine(l) {
    if (isLabel(l)) return l;
    var x = l.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");                 // "Down Down Down" -> "Down"
    for (var i = 0; i < DECLICHE.length; i++) x = x.replace(DECLICHE[i][0], DECLICHE[i][1]);
    x = x.replace(FILLER, "").replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
    return x;
  }
  function shuffle(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; } return a; }
  function norm(l) { return l.toLowerCase().replace(/[^a-z ]/g, "").trim(); }

  function rewrite(text) {
    var sc = function (s) { return G.SlopV8.scoreV8(s).pAI * 100; };
    var lines = String(text == null ? "" : text).split("\n").filter(function (l) { return l.trim(); });
    if (!lines.length) return { text: text, before: 0, after: 0 };
    var before = sc(lines.join("\n")), cur = before;
    // per-line gated sweep (random order, keep only real improvements)
    var order = shuffle(lines.length);
    for (var oi = 0; oi < order.length; oi++) {
      var idx = order[oi], cand = moveLine(lines[idx]);
      if (cand === lines[idx] || !cand) continue;
      var after = lines.slice(); after[idx] = cand;
      var ns = sc(after.join("\n"));
      if (ns < cur - 0.3) { lines = after; cur = ns; }
    }
    // gated dedup: drop a duplicate non-label line only if it helps
    for (var i = lines.length - 1; i > 0; i--) {
      if (isLabel(lines[i])) continue;
      var k = norm(lines[i]), dup = false;
      for (var p = 0; p < i; p++) { if (!isLabel(lines[p]) && norm(lines[p]) === k) { dup = true; break; } }
      if (k && dup) { var a2 = lines.slice(0, i).concat(lines.slice(i + 1)); var n2 = sc(a2.join("\n")); if (n2 < cur - 0.3) { lines = a2; cur = n2; } }
    }
    return { text: lines.join("\n"), before: Math.round(before), after: Math.round(cur) };
  }
  var api = { rewrite: rewrite };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  G.RewriteV8 = api;
})();
