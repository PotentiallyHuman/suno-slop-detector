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
    horizon: "distance", horizons: "distances",
    echoes: "sounds", echo: "sound", whisper: "mutter", whispers: "mutters", whispering: "muttering",
    ember: "coal", embers: "coals", ashes: "remains", abyss: "pit", paradise: "haven", wildfire: "brushfire",
    silhouette: "outline", crimson: "red", velvet: "smooth", ethereal: "faint", cascade: "spill",
    cascading: "spilling", surrender: "yield", infinity: "space", eternity: "ages", serenade: "tune",
    kaleidoscope: "pattern", labyrinth: "maze", tapestry: "weave", symphony: "melody", luminous: "bright",
    celestial: "distant", cosmic: "huge", radiant: "bright", flame: "torch", flames: "torches",
    thunder: "rumble", lightning: "flash", midnight: "late", moonlight: "evening", starlight: "evening",
    stardust: "specks", scars: "marks", scar: "mark", phantom: "figure", veins: "wrists", bones: "ribs",
    heartbeat: "pulse", shattered: "cracked", fragments: "shards",
    // NOTE: neon / shadow(s) / soul(s) are TRANSPARENT-ONLY too (survey item 6 names them
    // alongside heart as "too normal to disallow") — flagged in the panel, never auto-swapped.
    fading: "dimming", faded: "dimmed", rising: "climbing", burning: "smoking", electric: "buzzing",
    frozen: "icy", golden: "yellow", diamond: "crystal", fragile: "brittle", hollow: "empty",
    drowning: "sinking", endless: "long", eternal: "lasting", demons: "ghouls", demon: "beast",
    angels: "spirits", void: "gap", flicker: "blink", flickering: "blinking", glimmer: "shine",
    shimmer: "shine", unbreakable: "solid", beneath: "under", skyline: "rooftops",
    streetlight: "lamppost", streetlights: "lampposts",
    // common AI-lyric clichés -> plainer words (runAll only applies the ones that lower the score)
    dreams: "plans", dream: "plan", pale: "dim", broken: "cracked", desire: "want",
    chasing: "following", chase: "follow", wings: "arms", storm: "squall", storms: "squalls",
    tears: "crying", whispered: "muttered",
    // NOTE: "heart"/"hearts" (survey item 6) and "forever" (item 10) are intentionally
    // TRANSPARENT-ONLY — too normal to auto-edit; the panel still flags them, but Humanize
    // must not rewrite them. Do NOT re-add them here.
    glow: "light", dawn: "morning", dusk: "evening", ocean: "sea", oceans: "seas",
    fire: "heat", desperate: "anxious", chains: "ropes", lost: "adrift",
    shining: "glinting", endlessly: "on and on", breathe: "inhale", aching: "sore", ache: "soreness"
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

  // ===========================================================================
  // v4.x DATA-VETTED CATALOG TRANSFORMS — WORD/PHRASE swaps only (survey items 5,7,8,9,11).
  //   Per the survey's final RULE OF THUMB ("never inject/replace CONTENT into a user's song;
  //   only swap a flagged word/phrase for a data-vetted equivalent, or be transparent"), we do
  //   NOT replace whole lines. Vague/personification/cliché-LINE/simile features (items 1-4)
  //   are therefore TRANSPARENT-ONLY: flagged in the panel, never auto-edited. (replacement_catalog.js
  //   stays in analysis/ for a future opt-in suggestion mode; it is intentionally not shipped/wired.)
  //   Each transform guards on its catalog global; the caller keeps an edit only when it lowers pAI.
  // ===========================================================================

  // (item 5) abstract/feeling line-ending -> a CONCRETE single-word ending that RHYMES with
  //   the line's partner (preserves the scheme) and matches syllables, via RhymeIndex.
  function swapAbstractEnding(text) {
    var RI = G.RhymeIndex, P = G.Prosody;
    if (!RI || !RI.suggestConcreteRhyme || !RI.isAbstractWord || !P || !P.rhymeKey) return null;
    var S = structure(text), idxs = S.lyric;
    for (var i = 0; i < idxs.length; i++) {
      var ew = lastWord(S.lines[idxs[i]]); if (!ew || !RI.isAbstractWord(ew)) continue;
      var ak = P.rhymeKey(ew), partner = null;
      for (var d = 1; d <= 4 && !partner; d++) {
        var a = (i - d >= 0) ? idxs[i - d] : null, b = (i + d < idxs.length) ? idxs[i + d] : null;
        if (a != null) { var w1 = lastWord(S.lines[a]); if (w1 && w1 !== ew && P.rhymeKey(w1) === ak) partner = w1; }
        if (!partner && b != null) { var w2 = lastWord(S.lines[b]); if (w2 && w2 !== ew && P.rhymeKey(w2) === ak) partner = w2; }
      }
      var all; try { all = RI.suggestConcreteRhyme(ew, partner, { all: true }) || []; } catch (e) { all = []; }
      var sugg = null;
      for (var s2 = 0; s2 < all.length; s2++) if (all[s2].indexOf(" ") === -1) { sugg = all[s2]; break; }
      if (!sugg) continue;
      var lines = String(text).split("\n");
      lines[idxs[i]] = replaceEndWord(lines[idxs[i]], sugg);
      if (lines[idxs[i]] === S.lines[idxs[i]]) continue;
      return { text: lines.join("\n"), detail: "concrete ending (“" + ew + "” → “" + sugg + "”)" };
    }
    return null;
  }

  // (items 7,8,9) thin wrappers over the data-vetted swap tables. Each applies its
  //   table's swaps; TRANSPARENT/EXCLUDED words are left alone inside the table itself.
  function moreTail(n) { return n > 1 ? " (+" + (n - 1) + " more)" : ""; }
  function swapAdjStackCat(text) {
    var M = G.ADJSTACK_SWAPS; if (!M || !M.swapAdjStack) return null;
    var r; try { r = M.swapAdjStack(text); } catch (e) { return null; }
    if (!r || !r.swaps || !r.swaps.length || r.text === text) return null;
    var s = r.swaps[0];
    return { text: r.text, detail: "“" + s.from + " " + s.noun + "” → “" + s.to + " " + s.noun + "”" + moreTail(r.swaps.length) };
  }
  function swapIngVerbCat(text) {
    var M = G.INGVERB_SWAPS; if (!M || !M.swapIngVerb) return null;
    var r; try { r = M.swapIngVerb(text); } catch (e) { return null; }
    if (!r || !r.swaps || !r.swaps.length || r.text === text) return null;
    return { text: r.text, detail: "“" + r.swaps[0].from + "” → “" + r.swaps[0].to + "”" + moreTail(r.swaps.length) };
  }
  function swapPrepPhraseCat(text) {
    var M = G.PREPPHRASE_SWAPS; if (!M || !M.swapPrepPhrase) return null;
    var r; try { r = M.swapPrepPhrase(text); } catch (e) { return null; }
    if (!r || !r.swaps || !r.swaps.length || r.text === text) return null;
    return { text: r.text, detail: "“" + r.swaps[0].from + "” → “" + r.swaps[0].to + "”" + moreTail(r.swaps.length) };
  }

  // ---- feature -> transform dispatch (matches the dense feature ids the panel reports) ----
  // V5-RETARGETED + STRUCTURE-PRESERVING. The line-deleting transforms (removeDuplicateLine,
  // deleteFillerLine) are intentionally NOT dispatched any more — a 4-line segment stays 4 lines.
  // modelScore() = what the model LEARNED from the data drives every accept/reject: an edit is
  // kept only if it lowers the V5 score (falls back to the old model only if v5 isn't loaded).
  function modelScore(t) {
    try { if (G.SLOP_MODEL_V5 && G.SlopV2 && G.SlopV2.scoreV5) { var v = G.SlopV2.scoreV5(t); if (v && typeof v.pAI === "number") return v; } } catch (e) {}
    try { return G.SlopV2.score(t); } catch (e) { return null; }
  }
  var DISPATCH = {
    lex_cliche: replaceStockWord, f_clicheDensity: replaceStockWord, t4_poet_stockImagery: replaceStockWord,
    lex_rhyme: breakRhyme, f_perfectRhymeRatio: breakRhyme, f_endRhymeRate: breakRhyme,
    // data-vetted WORD/PHRASE swaps (survey items 5, 7, 8, 9)
    s_abstractEnding: swapAbstractEnding,
    t3_adjStack: swapAdjStackCat,
    t3_ingVerbAbstract: swapIngVerbCat, s_ingEmotionVerb: swapIngVerbCat,
    s_prepInTheNight: swapPrepPhraseCat,
    // TRANSPARENT-ONLY (flagged in panel, NO auto-edit): vague/personification/cliché-line/simile
    // content features (items 1-4, never replace a whole line) and wall-to-wall imagery /
    // image density (item 12, deleting an image line removes the user's own content).
    s_ohHeyOpener: stripFillerOpener
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
    try { sc = G.SlopV2.score(text); } catch (e) { return null; }   // old-model panel PICKS candidate fixes
    if (!sc || sc.instrumental || !sc.contributions) return null;
    var mb = modelScore(text); if (!mb || typeof mb.pAI !== "number") return null;  // V5 ACCEPTS/REJECTS
    var before = mb.score, beforeP = mb.pAI;

    var panel;
    try { panel = G.SlopPanel.build(text, sc); } catch (e) { return null; }
    if (!panel || !panel.bad || !panel.bad.length) return null;

    for (var i = 0; i < panel.bad.length; i++) {
      var b = panel.bad[i], fn = DISPATCH[b.feature];
      if (!fn) continue;                              // creative-only feature -> skip
      var out;
      try { out = fn(text); } catch (e) { out = null; }
      if (!out || out.text == null || out.text === text) continue;  // transform didn't apply
      var asc = modelScore(out.text);
      if (!asc || typeof asc.pAI !== "number" || asc.pAI >= beforeP) continue;  // must read more human to V5
      return { text: out.text, label: b.label, feature: b.feature,
               before: before, after: asc.score, detail: out.detail };
    }
    return null;
  }

  // runAll — GREEDY multi-edit pass for one click. Each round it tries every safe
  // transform and applies whichever lowers the AI score the most, repeating until no
  // edit helps, a step cap is hit, or the score is already low. Each edit still
  // addresses a real cliché/structure issue the panel flags — it just keeps going past
  // the top-5 window that next() is limited to, so the box visibly transforms.
  // (6) trim a throwaway "oh / hey / baby / yeah" opener off a line (keeps the real words)
  var OPENER = /^(oh+|hey+|baby|yeah+|whoa+|ooh+|na+|la+)\b[\s,!.-]*/i;
  function stripFillerOpener(text) {
    var S = structure(text);
    for (var k = 0; k < S.lyric.length; k++) {
      var idx = S.lyric[k], line = S.lines[idx];
      if (!OPENER.test(line.trim())) continue;
      var stripped = line.replace(OPENER, "");
      stripped = stripped.charAt(0).toUpperCase() + stripped.slice(1);
      if (stripped.trim().length >= 4 && stripped !== line) {
        var lines = String(text).split("\n"); lines[idx] = stripped;
        return { text: lines.join("\n"), detail: "trimmed a throwaway opener" };
      }
    }
    return null;
  }

  // cutImageStackedLine is intentionally ABSENT (survey item 12: transparent-only — never
  // delete the user's image lines). The data-vetted catalog swaps run first; the generic
  // proxies (replaceStockWord/breakRhyme) cover the lexical features the catalogs don't.
  // STRUCTURE-PRESERVING set: NO removeDuplicateLine / deleteFillerLine (keep the line count).
  // Only word/phrase swaps that the v5 model accepts as more-human.
  var ALL_TRANSFORMS = [swapAdjStackCat, swapIngVerbCat, swapPrepPhraseCat, swapAbstractEnding,
                        replaceStockWord, breakRhyme, stripFillerOpener];
  function runAll(text, opts) {
    opts = opts || {};
    var max = opts.max || 8, floor = (typeof opts.floor === "number") ? opts.floor : 18;
    if (!G.SlopV2) return null;
    var cur = text, curSc;
    try { curSc = modelScore(cur); } catch (e) { return null; }   // V5-retargeted guard
    if (!curSc || curSc.instrumental || typeof curSc.pAI !== "number") return null;
    var before = curSc.score, curP = curSc.pAI, steps = [], after = before;
    for (var k = 0; k < max; k++) {
      var best = null;
      for (var t = 0; t < ALL_TRANSFORMS.length; t++) {
        var out;
        try { out = ALL_TRANSFORMS[t](cur); } catch (e) { out = null; }
        if (!out || out.text == null || out.text === cur) continue;
        var asc;
        try { asc = modelScore(out.text); } catch (e) { continue; }   // re-score on V5
        if (!asc || typeof asc.pAI !== "number" || asc.pAI >= curP - 1e-4) continue; // must read more human to V5
        if (!best || asc.pAI < best.pAI) best = { text: out.text, pAI: asc.pAI, score: asc.score, detail: out.detail };
      }
      if (!best) break;
      steps.push({ detail: best.detail, after: best.score });
      cur = best.text; curP = best.pAI; after = best.score;
      if (after <= floor) break;          // reads human enough — stop
    }
    if (!steps.length) return null;
    return { text: cur, steps: steps, before: before, after: after, count: steps.length };
  }

  // ---- CONTENT-HUMANIZE (rung 2): replace generic/typical lines with SPECIFIC + ATYPICAL lines
  // from the mined human-corpus pool (G.HUMAN_POOL), matched by syllable for meter, keeping only
  // swaps that lower the CONTENT score (structure-discounted). This is the rung that actually moves
  // a saturated song (groove 100->0) because pool lines carry numerals/proper-nouns/low-typicality.
  function _syl(line){ return Math.max(1, (String(line).toLowerCase().match(/[aeiouy]+/g) || []).length); }
  var _pbs = null, _prot = 0;
  function _poolBySyl(){ if (_pbs) return _pbs; _pbs = {}; var p = G.HUMAN_POOL || []; for (var i = 0; i < p.length; i++){ var s = p[i].syl; (_pbs[s] = _pbs[s] || []).push(p[i].line); } return _pbs; }
  function _poolCands(syl){ var by = _poolBySyl(), o = []; var ds = [0,1,-1,2,-2]; for (var d = 0; d < ds.length; d++){ if (by[syl+ds[d]]) o = o.concat(by[syl+ds[d]]); } return o.length ? o : null; }
  function _cScore(t){ try { if (G.SlopV2 && G.SlopV2.scoreContent){ var r = G.SlopV2.scoreContent(t); if (r && typeof r.pAI === "number") return r; } } catch (e) {} return null; }
  function humanizeContent(text){
    if (!G.HUMAN_POOL || !G.SlopV2 || !G.SlopV2.scoreContent) return null;
    var cur = text, sc = _cScore(cur); if (!sc) return null;
    var before = sc.score, base = sc.pAI, steps = [];
    for (var round = 0; round < 5; round++){
      var imp = false, lines = cur.split("\n");
      for (var i = 0; i < lines.length; i++){
        var ln = lines[i]; if (/^\s*\[/.test(ln) || !ln.trim()) continue;
        var opts = _poolCands(_syl(ln)); if (!opts) continue;
        var best = null, bp = base;
        for (var k = 0; k < 6; k++){ var c = opts[(_prot++) % opts.length]; if (c === ln) continue; var cc = lines.slice(); cc[i] = c; var s = _cScore(cc.join("\n")); if (s && s.pAI < bp - 1e-4){ bp = s.pAI; best = c; } }
        if (best){ steps.push({ detail: "“" + ln.trim().slice(0,22) + "…” → a sharper line" }); lines[i] = best; cur = lines.join("\n"); base = bp; imp = true; }
      }
      if (!imp) break;
    }
    if (!steps.length) return null;
    var aft = _cScore(cur);
    return { text: cur, before: before, after: aft ? aft.score : before, count: steps.length, steps: steps };
  }

  var api = {
    next: next,
    runAll: runAll,
    humanizeContent: humanizeContent,
    // exposed for tests / reuse
    transforms: {
      removeDuplicateLine: removeDuplicateLine,
      deleteFillerLine: deleteFillerLine,
      replaceStockWord: replaceStockWord,
      breakRhyme: breakRhyme,
      cutImageStackedLine: cutImageStackedLine,
      swapAbstractEnding: swapAbstractEnding,
      swapAdjStackCat: swapAdjStackCat,
      swapIngVerbCat: swapIngVerbCat,
      swapPrepPhraseCat: swapPrepPhraseCat
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  G.Humanize = api;
})();
