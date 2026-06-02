/* clean-lyrics.js — globalThis.SlopClean.clean(raw) -> { lyrics, instrumental }
 * Mirrors the corpus cleaner EXACTLY so inference text matches the tag-free training data:
 *  - remove every [..] square-bracket tag AND its contents (standalone tag -> blank stanza
 *    break so stanza structure survives; inline tag -> removed)
 *  - strip JSON blobs that can leak into a lyrics box ({...})
 *  - drop a leading title line and obvious model-reply scaffolding
 *  If nothing but whitespace remains -> instrumental (no score, no feedback). */
(function () {
  const SCAFFOLD = /^(\*\*|here (are|is) (the|your)|here'?s (the|your|a)|sure[,!]\s|certainly[,!]|of course[,!]|below (is|are)|i hope you|hope you enjoy|verse:|chorus:|title:)/i;
  function clean(raw) {
    let text = String(raw == null ? "" : raw);
    // 1) strip JSON objects that can leak into the box
    text = text.replace(/\{[^{}]*\}/g, " ");
    // 2) multi-line [..] brackets: short content = style tag (drop), long = wrapped lyric (keep inner)
    text = text.replace(/\[[^\]]*\n[\s\S]*?\]/g, function (m) {
      var inner = m.replace(/[\[\]]/g, "").replace(/\s+/g, " ").trim();
      return inner.split(/\s+/).length <= 5 ? "" : inner;
    });
    var lines = text.split("\n");
    // 3) leading title (short non-tag line whose next non-blank line is a [tag])
    var nb = [];
    for (var i = 0; i < lines.length; i++) if (lines[i].trim()) nb.push(i);
    if (nb.length >= 2) {
      var f0 = lines[nb[0]].trim(), f1 = lines[nb[1]].trim();
      if (f0[0] !== "[" && f0.split(/\s+/).length <= 6 && f1[0] === "[" && !/[.,!?]$/.test(f0))
        lines = lines.slice(nb[1]);
    }
    // 4) drop scaffolding
    lines = lines.filter(function (l) { return !SCAFFOLD.test(l.trim()); });
    // 5) standalone [tag] -> blank stanza break; inline [tag] -> remove
    var out = [];
    for (var j = 0; j < lines.length; j++) {
      var l = lines[j];
      if (/^\s*\[[^\]]*\]\s*$/.test(l)) { out.push(""); continue; }
      out.push(l.replace(/\[[^\]]*\]/g, "").replace(/\s{2,}/g, " ").trim());
    }
    // 6) collapse blank runs, trim ends
    var res = [];
    for (var k = 0; k < out.length; k++) {
      if (out[k] === "") { if (res.length && res[res.length - 1] !== "") res.push(""); }
      else res.push(out[k]);
    }
    while (res.length && res[0] === "") res.shift();
    while (res.length && res[res.length - 1] === "") res.pop();
    var lyrics = res.join("\n");
    var instrumental = lyrics.replace(/\s/g, "").length === 0;
    return { lyrics: lyrics, instrumental: instrumental };
  }
  (typeof globalThis !== "undefined" ? globalThis : window).SlopClean = { clean: clean };
})();
