/* humanizer-gen.browser.js — on-device freestyle line-regenerator.
 * Rebuilds the most-AI lines as NEW lines, constructed from the distilled model
 * (word transitions + rhyme banks + theme embedding + anti-copy 4-grams) — themed to
 * the song, rhyme- and syllable-matched, never copied (no 4 consecutive corpus words).
 * Pure on-device: hash lookups + tiny dot-products. No network, no neural net. */
(function () {
  "use strict";
  var M = globalThis.HZ_MODEL;
  if (!M) { return; }
  function b64(s) { var x = atob(s), a = new Uint8Array(x.length); for (var i = 0; i < x.length; i++) a[i] = x.charCodeAt(i); return a; }
  var EMB = new Int8Array(b64(M.embB64).buffer), DIM = M.embDim, EW = {};
  for (var i = 0; i < M.embWords.length; i++) EW[M.embWords[i]] = i;
  var FG = new Set(new Uint32Array(b64(M.fourgB64).buffer));
  var rev2 = M.rev2, rev3 = M.rev3, slant = M.slant, VK = M.vkey, HUM = M.humanness;
  var WPOS = M.wordPOS || {}, VALIDBG = new Set(M.validBG || []), CLICHE = new Set(M.cliche || []);
  var STARTBG = new Set(M.startBG || []), ENDBG = new Set(M.endBG || []), TEMPLATES = new Set(M.templates || []);
  function fnv(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h >>> 0; }
  function emb(w) { var r = EW[w]; if (r === undefined) return null; var v = new Float32Array(DIM); for (var k = 0; k < DIM; k++) v[k] = EMB[r * DIM + k] / 127; return v; }
  function dot(a, b) { var s = 0; for (var k = 0; k < a.length; k++) s += a[k] * b[k]; return s; }
  function unit(v) { var s = 0, k; for (k = 0; k < v.length; k++) s += v[k] * v[k]; s = Math.sqrt(s) || 1; for (k = 0; k < v.length; k++) v[k] /= s; return v; }
  function onTheme(w, th) { var v = emb(w); return v ? dot(v, th) : 0; }
  function humanness(w) { return HUM[w] || 0; }
  function allowed(w) { return true; }   // vocabulary is cliché-free by construction (blocklist at build time)
  function words(l) { return (String(l).toLowerCase().match(/[a-z']+/g)) || []; }
  function nsyl(w) { w = w.toLowerCase().replace(/[^a-z]/g, ""); if (!w) return 1; var m = w.match(/[aeiouy]+/g), n = m ? m.length : 1; if (/e$/.test(w) && n > 1) n--; return Math.max(1, n); }
  function nsylLine(l) { var ws = words(l), s = 0, x; for (x = 0; x < ws.length; x++) s += nsyl(ws[x]); return s; }
  function lastWord(l) { var w = words(l); return w.length ? w[w.length - 1] : ""; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function themeVec(text) {
    var ws = words(text), acc = new Float32Array(DIM), n = 0, k;
    for (var i = 0; i < ws.length; i++) { var v = emb(ws[i]); if (v && ws[i].length > 3 && humanness(ws[i]) > -2) { for (k = 0; k < DIM; k++) acc[k] += v[k]; n++; } }
    return n ? unit(acc) : null;
  }
  function genBackward(end, theme, target) {
    var pres = (rev2[end] || []).filter(allowed); if (!pres.length) pres = rev2[end] || []; if (!pres.length) return null;
    var out = [pick(pres), end], syl = nsyl(out[0]) + nsyl(end), t;
    for (t = 0; t < 22 && syl < target; t++) {
      var cands = rev3[out[0] + "\t" + out[1]] || rev2[out[0]]; if (!cands || !cands.length) break;
      var cs = cands.filter(allowed); if (!cs.length) cs = cands;
      var wt = [], tot = 0, j;
      for (j = 0; j < cs.length; j++) { var w = Math.max(0.02, 1 + 2.5 * Math.max(0, onTheme(cs[j], theme)) + 0.15 * humanness(cs[j])); wt.push(w); tot += w; }
      var r = Math.random() * tot, p = cs[0];
      for (j = 0; j < cs.length; j++) { r -= wt[j]; if (r <= 0) { p = cs[j]; break; } }
      out.unshift(p); syl += nsyl(p);
    }
    return (syl >= target - 3 && syl <= target + 3) ? out : null;
  }
  function copies(arr) { for (var i = 0; i + 3 < arr.length; i++) { if (FG.has(fnv(arr[i] + " " + arr[i + 1] + " " + arr[i + 2] + " " + arr[i + 3]))) return true; } return false; }
  function score(arr, theme) { var th = 0, hu = 0, n = 0, i; for (i = 0; i < arr.length; i++) { if (emb(arr[i])) { th += onTheme(arr[i], theme); n++; } hu += humanness(arr[i]); } return (n ? th / n : 0) * 2.2 + (hu / arr.length) * 0.15; }
  // THE PROFESSOR: reject a line whose word-order uses a part-of-speech transition real human lines
  // almost never use (the 1000-line analysis showed 97% of candidates already pass this).
  function grammatical(arr) {
    for (var i = 0; i < arr.length - 1; i++) {
      var a = WPOS[arr[i]] || "NN", b = WPOS[arr[i + 1]] || "NN";
      if (!VALIDBG.has(a + " " + b)) return false;
    }
    return true;
  }
  // A standalone line must OPEN and CLOSE like a real line — not start mid-clause ("you but...")
  // or end dangling ("...will always", which wants a verb after it). Checks first-two + last-two POS.
  // A line is kept only if its WHOLE part-of-speech structure matches a real human line's structure
  // (the full "professor template") and no word repeats back-to-back. That is what makes it a complete,
  // standalone thought instead of a mid-clause fragment like "you but i know i will always".
  function completeLine(arr) {
    if (arr.length < 2) return false;
    if (arr[0] === "but" || arr[0] === "or") return false;                                // weak line-opener (keep "and")
    var seen = {};
    for (var r = 0; r < arr.length - 1; r++) {                                            // no adjacent repeat AND no
      if (arr[r] === arr[r + 1]) return false;                                            // word-pair that recurs in the
      var bg = arr[r] + "" + arr[r + 1]; if (seen[bg]) return false; seen[bg] = 1;  // line ("braff goodbye harry braff goodbye harry")
    }
    var pos = []; for (var i = 0; i < arr.length; i++) pos.push(WPOS[arr[i]] || "NN");
    return TEMPLATES.has(pos.join("|"));
  }
  function genLine(rhymeWord, theme, targetSyl, N) {
    var vk = VK[rhymeWord]; if (!vk) return null;
    var rhymes = (slant[vk] || []).filter(function (w) { return w !== rhymeWord && rev2[w]; });
    if (!rhymes.length) return null;
    var best = null, bsc = -1e9, k;
    for (k = 0; k < (N || 120); k++) { var l = genBackward(pick(rhymes), theme, targetSyl); if (!l || l.length < 5 || copies(l) || !grammatical(l) || !completeLine(l)) continue; var s = score(l, theme); if (s > bsc) { bsc = s; best = l; } }
    return best ? best.join(" ") : null;
  }
  // PUBLIC: regenerate the most-AI lines, gated so the song's AI% only ever drops.
  // scoreFn(text) -> %AI 0..100 (caller passes the v8 scorer).
  function humanize(text, scoreFn, maxReplace) {
    var theme = themeVec(text); if (!theme) return null;
    var lines = String(text).split("\n"), base = scoreFn(text), i;
    // Rank by each line's OWN AI score: the whole-song score saturates (100% for an all-AI song,
    // so blanking any one line moves it 0), but a single line's score is granular (AI line 100, human 0).
    var cand = [];
    for (i = 0; i < lines.length; i++) { if (words(lines[i]).length < 3) continue; cand.push({ i: i, ai: scoreFn(lines[i]) }); }
    cand.sort(function (a, b) { return b.ai - a.ai; });
    var cur = lines.slice(), changed = 0, steps = [], o;
    for (o = 0; o < cand.length && changed < (maxReplace || 8); o++) {
      var origAI = cand[o].ai; if (origAI < 40) break;   // the rest already read human
      var idx = cand[o].i, orig = cur[idx], rw = lastWord(orig); if (!rw) continue;
      var repl = null, rt; for (rt = 0; rt < 4 && !repl; rt++) repl = genLine(rw, theme, nsylLine(orig), 120); if (!repl) continue;
      var cr = cap(repl);
      if (scoreFn(cr) < origAI - 5) { cur[idx] = cr; changed++; steps.push({ from: orig, to: cr }); }   // new line reads less AI
    }
    if (!changed) return null;
    return { text: cur.join("\n"), before: Math.round(base), after: Math.round(scoreFn(cur.join("\n"))), count: changed, steps: steps };
  }
  // ---- per-click humanizer: rebuild the single WORST line (most clichés; AI score breaks ties) ----
  // One call = one line. The UI calls this on each "Humanize" click, so the user watches the song
  // clean up worst-line-first. Already-fixed lines are cliché-free, so they fall to the bottom of the
  // ranking and aren't touched again. Returns null when no line still reads AI.
  function clicheCount(line) { var ws = words(line), c = 0, i; for (i = 0; i < ws.length; i++) if (CLICHE.has(ws[i])) c++; return c; }
  function humanizeOne(text, scoreFn) {
    var theme = themeVec(text); if (!theme) return null;
    var lines = String(text).split("\n"), songScore = scoreFn(text), ranked = [], i;
    for (i = 0; i < lines.length; i++) {                       // rank EVERY line; clichés dominate, line-AI orders within
      if (words(lines[i]).length < 3) continue;
      ranked.push({ i: i, r: clicheCount(lines[i]) * 1000 + scoreFn(lines[i]) });
    }
    if (!ranked.length) return null;
    ranked.sort(function (a, b) { return b.r - a.r; });
    // Go worst-first. If the generator can't make a clean line for that rhyme, OR it would worsen the whole
    // song, move to the NEXT-worst line — never give up after one. A song reads AI in aggregate, so use the
    // SONG score (not the line) to decide when we're done.
    for (var k = 0; k < ranked.length; k++) {
      if (songScore < 45 && ranked[k].r < 45) break;          // the remaining lines all read human
      var idx = ranked[k].i, orig = lines[idx], rw = lastWord(orig); if (!rw) continue;
      var repl = genLine(rw, theme, nsylLine(orig), 200); if (!repl) continue;   // generator couldn't — try next line
      var trial = lines.slice(); trial[idx] = cap(repl);
      var newSong = scoreFn(trial.join("\n"));
      if (newSong > songScore + 1) continue;                  // would worsen the song — try next line
      return { text: trial.join("\n"), lineIndex: idx, from: orig, to: trial[idx], before: Math.round(songScore), after: Math.round(newSong) };
    }
    return null;
  }
  // ---- "Humanize Rewrite": one press rebuilds the worst HALF of the song (ranked by cliché then AI),
  // leaving the better half the user's own words. Press again to rewrite the worst half of what now
  // remains — it converges, always sparing the cleaner half. Returns null when no line still reads AI. ----
  function humanizeHalf(text, scoreFn) {
    var theme = themeVec(text); if (!theme) return null;
    var lines = String(text).split("\n"), nb = 0, i;
    for (i = 0; i < lines.length; i++) if (words(lines[i]).length >= 3) nb++;
    var half = Math.ceil(nb / 2), cur = text, before = Math.round(scoreFn(text)), steps = [], k;
    for (k = 0; k < half; k++) {                       // rebuild the worst HALF, each gated by humanizeOne (never worsens)
      var res = humanizeOne(cur, scoreFn);
      if (!res) break;
      cur = res.text; steps.push({ lineIndex: res.lineIndex, from: res.from, to: res.to });
    }
    if (!steps.length) return null;
    return { text: cur, count: steps.length, steps: steps, before: before, after: Math.round(scoreFn(cur)) };
  }
  globalThis.HumanizeFreestyle = { humanizeOne: humanizeOne, humanizeHalf: humanizeHalf, humanize: humanize, genLine: genLine, themeVec: themeVec };
})();
