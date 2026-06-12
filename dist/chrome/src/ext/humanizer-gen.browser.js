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
      for (j = 0; j < cs.length; j++) { var w = Math.max(0.02, 1 + 2.5 * Math.max(0, onTheme(cs[j], theme)) + 0.15 * humanness(cs[j])); if (cs[j].length <= 3) w *= 0.6; wt.push(w); tot += w; }   // bias the walk toward content words
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
    // The old rule demanded the EXACT whole-line POS template be known. The 2000-song cross-corpus
    // study killed that: exact templates are corpus one-offs (15% coverage on independent humans),
    // and the demand made 13+ syllable lines unbuildable. What replicates across independent
    // corpora (0.85-0.92 overlap): how lines OPEN, how they CLOSE, and the transition inventory.
    // Known template stays as a fast-path accept.
    if (TEMPLATES.has(pos.join("|"))) return true;
    if (!STARTBG.has(pos[0] + " " + pos[1])) return false;                            // opens like a real line
    if (!ENDBG.has(pos[pos.length - 2] + " " + pos[pos.length - 1])) return false;    // closes like a real line
    if (DANGLE.has(pos[pos.length - 1])) return false;                                // never end on a hanging word
    if (pos.length >= 2 && pos[pos.length - 2] === "MD" && pos[pos.length - 1] !== "VB") return false;   // "will always" dangles; "can add" is fine
    for (var b = 0; b < pos.length - 1; b++) if (!VALIDBG.has(pos[b] + " " + pos[b + 1])) return false;
    // content quota: without the exact-template constraint the walk drifts into pronoun soup
    // ("and i like it but i know what they are") — demand the human minimum of substance
    var content = {}, nc = 0;
    for (var c = 0; c < arr.length; c++) if (arr[c].length > 3 && !content[arr[c]]) { content[arr[c]] = 1; nc++; }
    return nc >= 2 && nc / arr.length >= 0.25;
  }
  var DANGLE = new Set(["IN", "TO", "CC", "DT", "MD", "PRP$", "WDT", "WP", "WRB"]);
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
  // ---- best-of-10 per press: make several DISTINCT finished lines, judge each one through the
  // trained line score, the cliché count, and the 6 craft lenses (lens score > 0.5 = AI-leaning,
  // same calibration the craft panel uses), and hand back the suggestions best-first. ----
  function judgeLine(l, scoreFn) {
    var j = scoreFn(l) + 200 * clicheCount(l);                 // AI% dominates; clichés are near-fatal
    // anti-soup: the loosened professor admits fluent-but-empty pronoun runs
    // ("you know what you like it") — penalize repeated content words and thin lines
    var ws = words(l), content = {}, short_ = 0, i;
    for (i = 0; i < ws.length; i++) {
      if (ws[i].length <= 3) short_++;
      else { if (content[ws[i]]) j += 30; content[ws[i]] = 1; }   // same content word twice in one line
    }
    var shortShare = ws.length ? short_ / ws.length : 0;
    if (shortShare > 0.58) j += (shortShare - 0.58) * 80;          // mostly function words = filler
    try {
      if (globalThis.SlopPerspectives) {
        var pr = globalThis.SlopPerspectives.analyze(l), s = 0, n = 0;
        for (var k in pr.perspectives) { var v = pr.perspectives[k].score; if (typeof v === "number") { s += v; n++; } }
        if (n) j += 40 * (s / n - 0.5);                        // craft lenses break ties among low-AI lines
      }
    } catch (e) {}
    return j;
  }
  // ---- TIER 0: word-level surgery. If a line is the user's own (reads human) but carries
  // cliché words, swap ONLY those words from the hand-curated table (CLICHE_SWAPS) and keep
  // their sentence. Substitute choice: closest syllable count, not already in the song,
  // never a blocklist word. This is the edit that can't break meaning — the sentence stays.
  // idioms a noun-swap would destroy ("the trumpet caught FURNACE") — never touch the word inside these
  var IDIOMS = ["caught fire", "on fire", "set fire", "in love", "fall in love", "falling in love", "fell in love", "make love", "made love", "my love", "first light", "light up"];
  // words that are often VERBS ("i love you" -> "i devotion you") — swap only in clear noun position
  var VERBY = { love: 1, kiss: 1, whisper: 1, whispers: 1, echo: 1, echoes: 1, flicker: 1, shimmer: 1, glimmer: 1, surrender: 1, fire: 1, light: 1, storm: 1, scar: 1, mist: 1, voice: 1, dust: 1 };
  var NOUN_CTX = { the: 1, a: 1, an: 1, my: 1, our: 1, your: 1, his: 1, her: 1, their: 1, this: 1, that: 1, of: 1, "in": 1, with: 1, through: 1, like: 1, every: 1, no: 1, some: 1 };
  function swapCliches(line, songText) {
    var SW = globalThis.CLICHE_SWAPS; if (!SW) return null;
    var swapTheme = null; try { swapTheme = themeVec(songText); } catch (e) {}
    var songWords = {}; words(songText).forEach(function (w) { songWords[w] = 1; });
    var lineWords = words(line), counts = {}, i;
    for (i = 0; i < lineWords.length; i++) counts[lineWords[i]] = (counts[lineWords[i]] || 0) + 1;
    var low = " " + words(line).join(" ") + " ";               // punctuation-free, so "My love," still matches the idiom
    var changed = 0, prevTok = "";
    var raw = String(line);
    var out = raw.replace(/[A-Za-z']+/g, function (tok, off) {
      var lw = tok.toLowerCase(), prev = prevTok; prevTok = lw;
      if (!CLICHE.has(lw) || !SW[lw]) return tok;
      if (counts[lw] > 1) return tok;                            // repeated on purpose ("Who your love, Who your love")
      if (raw[off - 1] === "-" || raw[off + tok.length] === "-") return tok;   // hyphen compound ("heart-breaker")
      for (var x = 0; x < IDIOMS.length; x++) { if (IDIOMS[x].indexOf(lw) >= 0 && low.indexOf(" " + IDIOMS[x] + " ") >= 0) return tok; }
      // verb position? use the verb-form substitutes ("echoes"->"repeats"), never the noun ones
      var subs = SW[lw];
      var nxt = raw.slice(off + tok.length).match(/[A-Za-z']+/);
      var nxtL = nxt ? nxt[0].toLowerCase() : "";
      if (VERBY[lw]) {
        if (NOUN_CTX[prev]) {
          if (nxtL.length > 3 && !NOUN_CTX[nxtL]) return tok;    // "your love momma" — ambiguous dialect: leave it
        } else {
          subs = (globalThis.CLICHE_SWAPS_VERB || {})[lw]; if (!subs) return tok;   // clear verb position
        }
      }
      // role split: a verb with an object plays a different role than a bare one
      // ("echoes your name" = tells/carries; "footsteps echo" = rings)
      if (subs && !subs.length && (subs.obj || subs.noobj)) {
        var hasObj = !!NOUN_CTX[nxtL] || /^(me|you|us|it|him|her|them)$/.test(nxtL);
        subs = hasObj ? (subs.obj || subs.noobj) : (subs.noobj || subs.obj);
      }
      if (!subs || !subs.length) return tok;
      // choose by: meter (closest syllables) -> THEME FIT (the song's own embedding picks the
      // "environmental synonym": a percussive song picks "drums", a confession picks "tells")
      // -> curation order as the last tiebreak.
      var best = null, bd = 1e9;
      for (var k = 0; k < subs.length; k++) {
        var s = subs[k];
        if (CLICHE.has(s) || songWords[s]) continue;             // never re-slop, never duplicate the song
        var fit = (swapTheme && emb(s)) ? dot(emb(s), swapTheme) : 0;
        var d = Math.abs(nsyl(s) - nsyl(lw)) * 10 + k * 0.5 - fit * 4;
        if (d < bd) { bd = d; best = s; }                        // (number agreement is curated INTO the table)
      }
      if (!best) return tok;
      changed++;
      songWords[best] = 1;
      return tok[0] === tok[0].toUpperCase() ? best.charAt(0).toUpperCase() + best.slice(1) : best;
    });
    if (!changed) return null;
    // article agreement: "a affection" -> "an affection", "an furnace" -> "a furnace"
    out = out.replace(/\b([Aa])n? ([a-z])/g, function (m, a, c) {
      var an = "aeiou".indexOf(c) >= 0;
      return (a === "A" ? (an ? "An" : "A") : (an ? "an" : "a")) + " " + c;
    });
    return out;
  }
  function genSuggestions(rhymeWord, theme, targetSyl, want, scoreFn) {
    var seen = {}, out = [], t;
    for (t = 0; t < want * 6 && out.length < want; t++) {
      var l = genLine(rhymeWord, theme, targetSyl, 100);
      if (l && !seen[l]) { seen[l] = 1; out.push(l); }
    }
    if (scoreFn) out.sort(function (a, b) { return judgeLine(a, scoreFn) - judgeLine(b, scoreFn); });
    return out;
  }
  function humanizeOne(text, scoreFn) {
    var theme = themeVec(text); if (!theme) return null;
    var lines = String(text).split("\n"), songScore = scoreFn(text), ranked = [], i;
    // Hooks/choruses are STRUCTURE: a line repeated verbatim is there on purpose — never rebuild it.
    var freq = {};
    for (i = 0; i < lines.length; i++) { var fk = lines[i].trim().toLowerCase(); if (fk) freq[fk] = (freq[fk] || 0) + 1; }
    // Candidates = ONLY lines carrying their own AI evidence: blocklist clichés, or a high line-level
    // AI score. A line that reads human is never touched, no matter how AI the whole song scores —
    // on a good song the song-level % is the STRUCTURE (repeated chorus, uniform stanzas), and
    // "fixing" that by rewriting innocent lines destroys the song to please the meter (the Hydrogen
    // lesson: clichéd verse lines failed to regenerate, so the walk fell through and ate the hook).
    for (i = 0; i < lines.length; i++) {
      var wn = words(lines[i]).length;
      if (wn < 3 || wn > 16) continue;                         // not a lyric line (prose blob / fragment)
      if (freq[lines[i].trim().toLowerCase()] > 1) continue;   // hook immunity
      // Evidence = cliché words ONLY. The line-level AI score false-flags specific human-style
      // lines ("Keys in my teeth, engine coughing black") — it may rank candidates, never condemn.
      var cc = clicheCount(lines[i]);
      if (cc === 0) continue;
      ranked.push({ i: i, r: cc * 1000 + scoreFn(lines[i]) });
    }
    if (!ranked.length) return null;
    ranked.sort(function (a, b) { return b.r - a.r; });
    // Walk the evidence-bearing candidates worst-first. If the generator can't make a clean line for a
    // candidate, try the next CANDIDATE — and if none works, return null. Doing nothing is honest;
    // wandering into human-reading lines is not.
    for (var k = 0; k < ranked.length; k++) {
      var idx = ranked[k].i, orig = lines[idx], rw = lastWord(orig); if (!rw) continue;
      // TIER 0 — the line carries cliché words: swap the words, keep the user's sentence.
      // Gate on the cliché count itself (the song % is provably blind to word swaps) plus never-worsen.
      if (clicheCount(orig) > 0) {
        var swapped = swapCliches(orig, text);
        if (swapped && clicheCount(swapped) < clicheCount(orig)) {
          var trialS = lines.slice(); trialS[idx] = swapped;
          var nsS = scoreFn(trialS.join("\n"));
          if (nsS <= songScore + 1) {
            return { text: trialS.join("\n"), lineIndex: idx, from: orig, to: swapped, before: Math.round(songScore), after: Math.round(nsS), mode: "swap" };
          }
        }
      }
      // TIER 1 — full rebuild, ONLY for deep-mold lines: 2+ cliché words AND the line still reads
      // hard-AI even after the word swap (the sentence frame itself is the slop, e.g.
      // "___ dancing in the rain"). Single-cliché lines get word surgery or nothing.
      if (clicheCount(orig) < 2) continue;
      var sw2 = swapCliches(orig, text);
      if (scoreFn(sw2 || orig) < 80) continue;
      // 10 distinct suggestions, judged best-first (line AI + clichés + craft lenses) —
      // then the first one that survives the end-word dedup and the song gate wins.
      var sugs = genSuggestions(rw, theme, nsylLine(orig), 10, scoreFn);
      for (var s = 0; s < sugs.length; s++) {
        var repl = sugs[s];
        // a replacement may not duplicate another line's end word ("...airport / ...airport")
        // nor open with another line's first 3 words ("When you mean it..." twice)
        var rend = lastWord(repl), rstart = words(repl).slice(0, 3).join(" "), dup = false;
        for (var j = 0; j < lines.length; j++) {
          if (j === idx) continue;
          if (lastWord(lines[j]) === rend || words(lines[j]).slice(0, 3).join(" ") === rstart) { dup = true; break; }
        }
        if (dup) continue;
        var trial = lines.slice(); trial[idx] = cap(repl);
        var newSong = scoreFn(trial.join("\n"));
        if (newSong > songScore + 1) continue;                // would worsen the song — try next suggestion
        return { text: trial.join("\n"), lineIndex: idx, from: orig, to: trial[idx], before: Math.round(songScore), after: Math.round(newSong) };
      }
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
  globalThis.HumanizeFreestyle = { humanizeOne: humanizeOne, humanizeHalf: humanizeHalf, humanize: humanize, genLine: genLine, genSuggestions: genSuggestions, judgeLine: judgeLine, themeVec: themeVec };
})();
