/* humanize.js — the detector used as its own critic.
 *
 * Humanize.next(text) picks the single highest-impact MECHANICAL transform that
 * makes the lyrics read less AI, applies it, and reports the score drop. It never
 * writes new lines or invents content — every edit is a deletion or a swap from a
 * small built-in table, so it can't produce gibberish, and the caller stashes the
 * prior text for Undo. Creative fixes (name a place, add a turn) are intentionally
 * NOT done here — those need real words from the writer.
 *
 * It walks the SAME craft panel the user sees (SlopPanel.build), highest-AI-contributor
 * first, and applies the first mapped transform that BOTH changes the text AND lowers
 * the score. Pure JS, offline, no network/eval/innerHTML. Also require()-able for tests.
 */
(function () {
  "use strict";
  var G = (typeof globalThis !== "undefined") ? globalThis : (typeof window !== "undefined" ? window : this);

  // ---- line model: edit only "lyric" lines; pass section labels / blanks through untouched ----
  function isLabel(line) {
    var t = String(line).trim();
    return t === "" || /^\[[^\]]*\]$/.test(t) || /^\([^)]*\)$/.test(t);
  }
  function norm(line) { return String(line).trim().toLowerCase().replace(/[^a-z0-9'\s]/g, "").replace(/\s+/g, " "); }
  function words(line) { return String(line).toLowerCase().match(/[a-z']+/g) || []; }
  function lastWord(line) { var w = words(line); return w.length ? w[w.length - 1] : ""; }

  // replace the final alphabetic token of a line, preserving its trailing punctuation + capitalization
  function replaceEndWord(line, repl) {
    return String(line).replace(/([A-Za-z][A-Za-z']*)(\W*)$/, function (_, w, tail) {
      return matchCase(w, repl) + tail;
    });
  }
  // replace the first whole-word occurrence of `target` (case-insensitive), preserving capitalization
  function replaceWord(line, target, repl) {
    var re = new RegExp("\\b" + target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    return String(line).replace(re, function (m) { return matchCase(m, repl); });
  }
  function matchCase(orig, repl) {
    if (/^[A-Z]/.test(orig)) return repl.charAt(0).toUpperCase() + repl.slice(1);
    return repl;
  }

  // split into structural lines; return {lines, idxOfLyric:[...indices...]}
  function structure(text) {
    var lines = String(text == null ? "" : text).split("\n");
    var lyric = [];
    for (var i = 0; i < lines.length; i++) if (!isLabel(lines[i])) lyric.push(i);
    return { lines: lines, lyric: lyric };
  }
  function dropLine(text, lineIdx) {
    var lines = String(text).split("\n");
    lines.splice(lineIdx, 1);
    return lines.join("\n");
  }

  // ---- vocable / filler detection (mirrors v2-panel firstVocableLine) ----
  var VOCABLE = /^(na+|la+|oh+|ooh+|ahh*|yeah+|whoa+|woah+|hey+|mm+|hmm+|da+|ba+|uh+|huh+|yo+)$/;
  function vocableShare(line) {
    var w = words(line); if (!w.length) return 0;
    var voc = 0; for (var i = 0; i < w.length; i++) if (VOCABLE.test(w[i])) voc++;
    return voc / w.length;
  }

  // ===========================================================================
  // TRANSFORMS  — each takes the raw textarea text, returns new text or null.
  // ===========================================================================

  // (1) remove ONE verbatim duplicate lyric line. Prefer a back-to-back repeat;
  //     otherwise drop the LAST occurrence of the most-repeated line.
  function removeDuplicateLine(text) {
    var S = structure(text), counts = {}, byKey = {};
    for (var k = 0; k < S.lyric.length; k++) {
      var key = norm(S.lines[S.lyric[k]]); if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
      (byKey[key] = byKey[key] || []).push(S.lyric[k]);
    }
    // back-to-back identical lyric lines first (most jarring, safest to cut)
    for (var i = 1; i < S.lyric.length; i++) {
      var a = norm(S.lines[S.lyric[i - 1]]), b = norm(S.lines[S.lyric[i]]);
      if (a && a === b) return { text: dropLine(text, S.lyric[i]), detail: "removed a repeated line" };
    }
    // else the most-repeated line; drop its last occurrence
    var bestKey = "", bestN = 1;
    for (var key2 in counts) if (counts[key2] > bestN) { bestN = counts[key2]; bestKey = key2; }
    if (bestKey) { var occ = byKey[bestKey]; return { text: dropLine(text, occ[occ.length - 1]), detail: "removed a repeated line" }; }
    return null;
  }

  // (2) delete a mostly-filler line (≥60% na-na / oh-oh / la-la …)
  function deleteFillerLine(text) {
    var S = structure(text);
    for (var k = 0; k < S.lyric.length; k++) {
      if (vocableShare(S.lines[S.lyric[k]]) >= 0.6) return { text: dropLine(text, S.lyric[k]), detail: "cut a filler line" };
    }
    return null;
  }

  // (3) swap the highest-weight stock/cliché word present for a plainer synonym.
  //     Only swaps words the model itself flags (WORD_WEIGHTS), and only to a
  //     replacement that is NOT itself flagged — so the cliché mass strictly drops.
  var STOCK_SWAP = {
    neon: "bright", horizon: "distance", horizons: "distances", shadows: "corners", shadow: "corner",
    echoes: "sounds", echo: "sound", whisper: "mutter", whispers: "mutters", whispering: "muttering",
    ember: "coal", embers: "coals", ashes: "remains", abyss: "pit", paradise: "haven", wildfire: "brushfire",
    silhouette: "outline", crimson: "red", velvet: "smooth", ethereal: "faint", cascade: "spill",
    cascading: "spilling", surrender: "yield", infinity: "space", eternity: "ages", serenade: "tune",
    kaleidoscope: "pattern", labyrinth: "maze", tapestry: "weave", symphony: "melody", luminous: "bright",
    celestial: "distant", cosmic: "huge", radiant: "bright", flame: "torch", flames: "torches",
    thunder: "rumble", lightning: "flash", midnight: "late", moonlight: "evening", starlight: "evening",
    stardust: "specks", scars: "marks", scar: "mark", phantom: "figure", veins: "wrists", bones: "ribs",
    soul: "spirit", souls: "spirits", heartbeat: "pulse", shattered: "cracked", fragments: "shards",
    fading: "dimming", faded: "dimmed", rising: "climbing", burning: "smoking", electric: "buzzing",
    frozen: "icy", golden: "yellow", diamond: "crystal", fragile: "brittle", hollow: "empty",
    drowning: "sinking", endless: "long", eternal: "lasting", demons: "ghouls", demon: "beast",
    angels: "spirits", void: "gap", flicker: "blink", flickering: "blinking", glimmer: "shine",
    shimmer: "shine", unbreakable: "solid", beneath: "under", skyline: "rooftops",
    streetlight: "lamppost", streetlights: "lampposts"
  };
  function replaceStockWord(text) {
    var WW = (G.SlopScore && G.SlopScore.WORD_WEIGHTS) || {};
    var S = structure(text), best = null;
    for (var k = 0; k < S.lyric.length; k++) {
      var idx = S.lyric[k], w = words(S.lines[idx]);
      for (var j = 0; j < w.length; j++) {
        var word = w[j], repl = STOCK_SWAP[word];
        if (!repl) continue;
        if (WW[repl]) continue;                       // replacement must not itself be flagged
        var weight = WW[word] || 1;
        if (!best || weight > best.weight) best = { idx: idx, word: word, repl: repl, weight: weight };
      }
    }
    if (!best) return null;
    var lines = String(text).split("\n");
    lines[best.idx] = replaceWord(lines[best.idx], best.word, best.repl);
    return { text: lines.join("\n"), detail: "“" + best.word + "” → “" + best.repl + "”" };
  }

  // (4) break ONE too-perfect end rhyme via a slant near-synonym, using Prosody.rhymeKey.
  //     Replaces the later line's end word so the pair no longer rhymes, meaning intact.
  var RHYME_SYN = {
    light: "glow", night: "dark", sight: "view", bright: "vivid", flight: "escape", fight: "struggle",
    fire: "blaze", desire: "want", higher: "above", eyes: "gaze", lies: "deceit", skies: "clouds",
    cries: "sobs", rise: "climb", pain: "ache", rain: "drizzle", sky: "air", fly: "soar", high: "tall",
    heart: "chest", apart: "away", start: "begin", true: "real", blue: "sad", away: "gone", stay: "remain",
    fall: "drop", alone: "apart", home: "house", soul: "spirit", control: "grip", whole: "entire",
    name: "word", flame: "spark", same: "alike", game: "play", free: "loose", see: "watch",
    dream: "hope", seem: "feel", around: "nearby", ground: "earth", sound: "noise", gold: "amber",
    cold: "chill", hold: "grasp", cry: "weep", why: "how", tears: "sobs", years: "decades",
    fears: "worries", arms: "elbows", alive: "awake", survive: "endure", believe: "trust"
  };
  function breakRhyme(text) {
    var P = G.Prosody; if (!P || !P.rhymeKey) return null;
    var S = structure(text), idxs = S.lyric;
    for (var i = 0; i < idxs.length; i++) {
      var aw = lastWord(S.lines[idxs[i]]); if (!aw) continue;
      var ak = P.rhymeKey(aw);
      for (var d = 1; d <= 4 && i + d < idxs.length; d++) {
        var jIdx = idxs[i + d], bw = lastWord(S.lines[jIdx]); if (!bw || bw === aw) continue;
        if (P.rhymeKey(bw) !== ak) continue;          // not a perfect rhyme — skip
        // try to slant the LATER line's end word, else the earlier one
        var cand = trySlant(bw, ak, P) || trySlant(aw, P.rhymeKey(bw), P);
        if (!cand) continue;
        var lines = String(text).split("\n");
        var target = (cand.word === bw) ? jIdx : idxs[i];
        lines[target] = replaceEndWord(lines[target], cand.repl);
        return { text: lines.join("\n"), detail: "loosened the rhyme (“" + cand.word + "” → “" + cand.repl + "”)" };
      }
    }
    return null;
  }
  function trySlant(word, partnerKey, P) {
    var repl = RHYME_SYN[word]; if (!repl) return null;
    if (P.rhymeKey(repl) === partnerKey) return null; // synonym must actually break the rhyme
    return { word: word, repl: repl };
  }

  // (5) cut the most image-stacked line (over-stuffed sensory imagery / image overload).
  var IMAGE_WORDS = (function () {
    var s = {};
    ("neon shadow shadows ember embers ash ashes abyss silhouette crimson velvet ethereal cascade " +
     "stardust moonlight starlight whisper whispers echo echoes horizon skyline streetlight flame " +
     "flames flicker glimmer shimmer veins light lights glow shine gleam gaze stare flash sound voice " +
     "rain storm fire sky stars ocean sea river dark cold gold silver smoke rose roses wind clouds " +
     "tears flames mist fog dusk dawn frost").split(/\s+/).forEach(function (w) { s[w] = 1; });
    return s;
  })();
  function cutImageStackedLine(text) {
    var S = structure(text), best = null;
    for (var k = 0; k < S.lyric.length; k++) {
      var w = words(S.lines[S.lyric[k]]), n = 0, distinct = {};
      for (var j = 0; j < w.length; j++) if (IMAGE_WORDS[w[j]]) { n++; distinct[w[j]] = 1; }
      var nd = Object.keys(distinct).length;
      if (nd >= 2 && n >= 3 && (!best || n > best.n)) best = { idx: S.lyric[k], n: n };
    }
    return best ? { text: dropLine(text, best.idx), detail: "trimmed an image-stacked line" } : null;
  }

  // ---- feature -> transform dispatch (matches the dense feature ids the panel reports) ----
  var DISPATCH = {
    s_dupLinesTotal: removeDuplicateLine, s_consecDupLines: removeDuplicateLine,
    s_maxConsecDup: removeDuplicateLine, s_hookMaxRepeat: removeDuplicateLine,
    s_titleDropRepeat: removeDuplicateLine, f_repetition: removeDuplicateLine,
    s_vocableLines: deleteFillerLine, s_vocables: deleteFillerLine,
    lex_cliche: replaceStockWord, f_clicheDensity: replaceStockWord, t4_poet_stockImagery: replaceStockWord,
    lex_rhyme: breakRhyme, f_perfectRhymeRatio: breakRhyme, f_endRhymeRate: breakRhyme,
    t4_poet_imageDensity: cutImageStackedLine, t4_poet_senseDiversity: cutImageStackedLine
  };

  // ===========================================================================
  // next(text) — score, build the panel, walk bad[] highest-contrib first, and
  // apply the first mapped transform that changes the text AND lowers the model's
  // confidence. The guard is on the raw probability (pAI), not the rounded %, so a
  // genuine cliché removal still counts even when the displayed integer ties — and
  // because the % is monotonic in pAI, the displayed score can only fall or hold,
  // never rise. Returns { text, label, feature, before, after, detail } or null.
  // ===========================================================================
  function next(text) {
    if (!G.SlopV2 || !G.SlopPanel) return null;
    var sc;
    try { sc = G.SlopV2.score(text); } catch (e) { return null; }
    if (!sc || sc.instrumental || !sc.contributions) return null;
    var before = sc.score, beforeP = sc.pAI;

    var panel;
    try { panel = G.SlopPanel.build(text, sc); } catch (e) { return null; }
    if (!panel || !panel.bad || !panel.bad.length) return null;

    for (var i = 0; i < panel.bad.length; i++) {
      var b = panel.bad[i], fn = DISPATCH[b.feature];
      if (!fn) continue;                              // creative-only feature -> skip
      var out;
      try { out = fn(text); } catch (e) { out = null; }
      if (!out || out.text == null || out.text === text) continue;  // transform didn't apply
      var asc;
      try { asc = G.SlopV2.score(out.text); } catch (e) { continue; }
      if (!asc || typeof asc.pAI !== "number" || asc.pAI >= beforeP) continue;  // must read more human
      return { text: out.text, label: b.label, feature: b.feature,
               before: before, after: asc.score, detail: out.detail };
    }
    return null;
  }

  var api = {
    next: next,
    // exposed for tests / reuse
    transforms: {
      removeDuplicateLine: removeDuplicateLine,
      deleteFillerLine: deleteFillerLine,
      replaceStockWord: replaceStockWord,
      breakRhyme: breakRhyme,
      cutImageStackedLine: cutImageStackedLine
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  G.Humanize = api;
})();
