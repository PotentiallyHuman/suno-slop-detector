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
  // MOLD LINES — sentence frames proven guilty by leave-one-out ablation over 300 AI songs
  // (48/100 most-implicating lines open with "Every..."; the rest of the top molds below).
  // The frame itself is the cliché — no word swap can fix "Every X is a Y".
  var MOLD = [
    /^\W*every\b/i,                                                            // the universalizing inventory line
    /\bmaybe\b.*\bmaybe\b/i,                                                   // maybe X, maybe Y
    /\b(not|nah|never|don't|won't|ain't|isn't|can't)\b.*\b(not|nah|never|don't|won't|ain't|isn't|can't)\b.*\b(just|only|still)\b/i,
    /\btoo \w+ to \w+.*\btoo \w+ to \w+/i,                                     // too X to A, too Y to B
  ];
  function moldLine(l) { for (var i = 0; i < MOLD.length; i++) if (MOLD[i].test(l)) return true; return false; }
  // Auto-rebuild of mold lines is OFF until the generator writes well enough for the 95% bar
  // (rolls like "Every shaky start" -> "When you thought it was bronze" fail human review).
  // Molds still surface via the craft panel (move 14) and the honest stop message.
  var MOLD_AUTOREBUILD = false;
  // ---- STRUCTURAL TRANSFORMS (user-designed): rearrange the mold FRAME, keep 100% of the
  // user's own words. The mold IS the structure, so only the structure changes:
  //   "Maybe I stay broke, maybe I stay small"  -> "I stay broke, I stay small"   (commit)
  //   "Every heart in this room is breaking"    -> "The last heart in this room is breaking"
  //   "Too young to A, too young to B"          -> "Too young to A — or to B"
  // everyAlt rotates within a song so three every-lines don't become three "The last" lines.
  // Every variant below is CORPUS-VALIDATED as a line opener (AI-vs-human rate): the first
  // designs ("The last", "One more") turned out to be AI's own openers (3.9x/12x AI-leaning)
  // and were replaced. "Perhaps" is the most human uncertainty word in lyrics (AI says
  // "maybe" 17x more); "That/This/Some" are the neutral-to-human de-universalizers.
  function restructure(line, rotIdx) {
    var l = String(line), m;
    var r = rotIdx || 0;
    if (/\bmaybe\b[\s\S]*\bmaybe\b/i.test(l)) {
      var mv = r % 4;
      if (mv === 1) return l.replace(/\b[Mm]aybe\b/g, function (t) { return t[0] === "M" ? "Perhaps" : "perhaps"; });
      if (mv === 2) return l.replace(/\b[Mm]aybe\b/g, function (t) { return t[0] === "M" ? "Could be" : "could be"; });
      var parts = l.split(/,\s*[Mm]aybe\s+/);
      if (mv === 3 || parts.length !== 2) {                      // or-join; also the safe fallback for
        var p2 = parts.length === 2 ? parts : l.split(/\s+[Mm]aybe\s+/);   // comma-less pairs ("maybe A maybe B")
        if (p2.length === 2) {
          var head = p2[0].replace(/^\s*[Mm]aybe\s+/, "").replace(/[\s,]+(and|but|or)\s*$/, "");   // "A and maybe B" -> "A — or B"
          return head.charAt(0).toUpperCase() + head.slice(1) + " — or " + p2[1];
        }
        if (parts.length !== 2) return null;                     // 3+ maybes: leave for the panel
      }
      var out = l.replace(/\b[Mm]aybe,?\s+/g, "");
      out = out.charAt(0).toUpperCase() + out.slice(1);
      return out !== l ? out : null;
    }
    m = l.match(/^(.*?\btoo\s+\w+\s+to\b.*?),\s*too\s+\w+\s+to\s+(.*)$/i);
    if (m) return r % 2 ? m[1] + ", can't even " + m[2] : m[1] + " — or to " + m[2];
    m = l.match(/^I (?:don't|won't|never) (.*?), I (?:don't|won't|never) (.*?), I (?:just|only) (.*)$/i);
    if (m) return "Forget " + m[1] + ", forget " + m[2] + " — I " + m[3];
    if ((l.match(/\bevery\b/gi) || []).length > 1) return null;      // double-every parallel: a half-fix reads broken
    m = l.match(/^(\W*)[Ee]very\s+single\s+(.*)$/);                  // "every single X" is a unit
    if (m) return m[1] + "This one " + m[2];
    m = l.match(/^(\W*)[Ee]very\s+(.*)$/);
    if (m) {
      var alts = ["That ", "This ", "Some "];
      var pickA = alts[r % 3];
      if (pickA === "That " && /^\w+([^.]*?)\bthat\b/i.test(m[2])) pickA = "This ";   // avoid "That turn that I take"
      return m[1] + pickA + m[2];
    }
    return null;
  }
  // idioms a noun-swap would destroy ("the trumpet caught FURNACE") — never touch the word inside these
  var IDIOMS = ["caught fire", "on fire", "set fire", "in love", "fall in love", "falling in love", "fell in love", "make love", "made love", "my love", "first light", "light up",
    "for the night", "the night of", "all night", "spend the night", "through the night", "tonight", "lights camera", "lights cameras", "flame of fire", "night and day", "day and night", "holding hands", "hold hands", "held hands", "lot of soul", "heart and soul", "body and soul", "good night", "goodnight", "out of your hands", "out of my hands", "in your hands", "in my hands", "love you so", "love me so", "love her so", "love him so"];
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
    // rhyme map: last words of all lines (a swap may never break the song's rhyme scheme)
    var allLines = String(songText).split("\n");
    var lineLast = lastWord(line), rhymesWithNeighbor = false;
    if (lineLast && VK[lineLast]) {
      for (var ri = 0; ri < allLines.length; ri++) {
        var ll = lastWord(allLines[ri]);
        if (allLines[ri].trim() !== String(line).trim() && ll && ll !== lineLast && VK[ll] === VK[lineLast]) { rhymesWithNeighbor = true; break; }
      }
    }
    var changed = 0, prevTok = "", lastSwapEnd = -1;
    var raw = String(line);
    var out = raw.replace(/[A-Za-z']+/g, function (tok, off) {
      var lw = tok.toLowerCase(), prev = prevTok; prevTok = lw;
      if (!CLICHE.has(lw) || !SW[lw]) return tok;
      if (counts[lw] > 1) return tok;                            // repeated on purpose ("Who your love, Who your love")
      // clichés joined into ONE phrase ("flame of fire") get a single swap; separate phrases
      // in the same line ("heartbeat ... echoes") both swap — the user requires the full clean
      if (lastSwapEnd >= 0 && /^[\s,]*(of|and|or)\s*$/.test(raw.slice(lastSwapEnd, off))) return tok;
      if (raw[off - 1] === "-" || raw[off + tok.length] === "-") return tok;   // hyphen compound ("heart-breaker")
      // never break the rhyme scheme: the line-final word only swaps to a SAME-VOWEL substitute
      var mustRhyme = rhymesWithNeighbor && lw === lineLast && off + tok.length >= raw.replace(/\W+$/, "").length;
      for (var x = 0; x < IDIOMS.length; x++) { if (IDIOMS[x].indexOf(lw) >= 0 && low.indexOf(" " + IDIOMS[x] + " ") >= 0) return tok; }
      // verb position? use the verb-form substitutes ("echoes"->"repeats"), never the noun ones
      var subs = SW[lw];
      var nxt = raw.slice(off + tok.length).match(/[A-Za-z']+/);
      var nxtL = nxt ? nxt[0].toLowerCase() : "";
      // "lost" is adjectival at line starts ("Lost in the moment" -> Stranded) but a VERB after
      // a subject/auxiliary ("you've almost lost your will") — swap only the adjectival uses
      if (lw === "lost" && /^(i|you|we|they|he|she|i've|you've|we've|they've|have|has|had|almost|nearly|just|never|who)$/.test(prev)) return tok;
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
        // a following PREPOSITION means no object ("whisper IN my ear" is intransitive)
        var hasObj = (!!NOUN_CTX[nxtL] || /^(me|you|us|it|him|her|them)$/.test(nxtL)) && !/^(in|on|of|with|through|at|to|for|by|into)$/.test(nxtL);
        subs = hasObj ? (subs.obj || subs.noobj) : (subs.noobj || subs.obj);
      }
      if (!subs || !subs.length) return tok;
      // choose by: meter (closest syllables) -> THEME FIT (the song's own embedding picks the
      // "environmental synonym": a percussive song picks "drums", a confession picks "tells")
      // -> curation order as the last tiebreak.
      // plural slots ("two shadows", "these lights") demand a plural substitute — never a mass noun
      var needPlural = /^(two|three|four|five|six|seven|many|few|both|these|those|all)$/.test(prev) && lw.charAt(lw.length - 1) === "s";
      // vehicle/stage light compounds ("sheriff lights", "brake lights") are fixtures, not lamps
      if ((lw === "lights" || lw === "light") && /^(sheriff|police|cop|brake|traffic|city|stage|tail|street)$/.test(prev)) return tok;
      var best = null, bd = 1e9;
      for (var k = 0; k < subs.length; k++) {
        var s = subs[k];
        if (CLICHE.has(s) || songWords[s]) continue;             // never re-slop, never duplicate the song
        if (mustRhyme && VK[s] !== VK[lw]) continue;             // keep the song's rhyme vowel
        if (needPlural && s.charAt(s.length - 1) !== "s") continue;
        var fit = (swapTheme && emb(s)) ? dot(emb(s), swapTheme) : 0;
        var d = Math.abs(nsyl(s) - nsyl(lw)) * 10 + k * 0.5 - fit * 4;
        if (d < bd) { bd = d; best = s; }                        // (number agreement is curated INTO the table)
      }
      if (!best) return tok;
      changed++;
      songWords[best] = 1;
      lastSwapEnd = off + tok.length;
      if (tok === tok.toUpperCase() && tok.length > 1) return best.toUpperCase();   // ALL-CAPS lines stay ALL-CAPS
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
  var MAX_LINES = 200, MAX_CANDIDATES = 12;   // hard work caps: a press is bounded no matter the input
  function humanizeOne(text, scoreFn) {
    var theme = themeVec(text); if (!theme) return null;
    var lines = String(text).split("\n"), songScore = scoreFn(text), ranked = [], i;
    if (lines.length > MAX_LINES) lines.length = MAX_LINES;   // pathological paste: edit the first 200 lines only
    // Hooks/choruses are STRUCTURE: a line repeated verbatim is there on purpose — never rebuild it.
    var freq = {};
    for (i = 0; i < lines.length; i++) { var fk = words(lines[i]).join(" "); if (fk) freq[fk] = (freq[fk] || 0) + 1; }
    // Candidates = ONLY lines carrying their own AI evidence: blocklist clichés, or a high line-level
    // AI score. A line that reads human is never touched, no matter how AI the whole song scores —
    // on a good song the song-level % is the STRUCTURE (repeated chorus, uniform stanzas), and
    // "fixing" that by rewriting innocent lines destroys the song to please the meter (the Hydrogen
    // lesson: clichéd verse lines failed to regenerate, so the walk fell through and ate the hook).
    for (i = 0; i < lines.length; i++) {
      var wn = words(lines[i]).length;
      if (wn < 3 || wn > 16) continue;                         // not a lyric line (prose blob / fragment)
      if (freq[words(lines[i]).join(" ")] > 1) continue;   // hook immunity (punctuation-blind)
      // Evidence = cliché WORDS, or an ablation-proven MOLD frame (only when the song itself
      // reads AI). The line-level AI score false-flags specific human lines ("Keys in my
      // teeth, engine coughing black") — it may rank candidates, never condemn.
      var cc = clicheCount(lines[i]), mold = songScore >= 55 && moldLine(lines[i]);
      if (cc === 0 && !mold) continue;
      ranked.push({ i: i, mold: mold, r: (mold ? 2000 : 0) + cc * 1000 + scoreFn(lines[i]) });
    }
    if (!ranked.length) return null;
    ranked.sort(function (a, b) { return b.r - a.r; });
    if (ranked.length > MAX_CANDIDATES) ranked.length = MAX_CANDIDATES;
    // Walk the evidence-bearing candidates worst-first. If the generator can't make a clean line for a
    // candidate, try the next CANDIDATE — and if none works, return null. Doing nothing is honest;
    // wandering into human-reading lines is not.
    for (var k = 0; k < ranked.length; k++) {
      var idx = ranked[k].i, orig = lines[idx], rw = lastWord(orig); if (!rw) continue;
      // MOLD RESTRUCTURE — the sentence FRAME is the cliché ("Every X is a Y"); no word swap
      // helps, and the n-gram can't be trusted to rewrite it. So a DESIGNED structural transform
      // rearranges the frame and keeps 100% of the user's words. Runtime leave-one-out confirms
      // the line is load-bearing first (so "Every breath you take" in a human song stays).
      if (ranked[k].mold) {
        var ablate = lines.slice(0, idx).concat(lines.slice(idx + 1)).join("\n");
        if (songScore - scoreFn(ablate) >= 2) {
          var rotIdx = (text.match(/^(That|This|Some|Perhaps|Could be) /gmi) || []).length;   // rotate variants
          var rs = restructure(orig, rotIdx);
          if (rs && !moldLine(rs)) {
            var rtrial = lines.slice(); rtrial[idx] = rs;
            var rns = scoreFn(rtrial.join("\n"));
            if (rns <= songScore + 1) {
              return { text: rtrial.join("\n"), lineIndex: idx, from: orig, to: rs, before: Math.round(songScore), after: Math.round(rns), mode: "restructure" };
            }
          }
        }
        // restructure impossible — fall through to word swap if it also carries clichés
      }
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
      // TIER 1 — n-gram full rebuild. OFF with MOLD_AUTOREBUILD: the generator's rolls
      // ("I know what you anyways") fail the 95% human-review bar. With it off, every press
      // is DETERMINISTIC: word surgery + designed structural transforms only.
      if (!MOLD_AUTOREBUILD) continue;
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
  // diagnoseShape(text): measure the song's STRUCTURAL stamping — the corpus-mined AI
  // fingerprint is metric stamping (equal lengths + couplet rhyme: AI 26-29% vs human 20%)
  // WITHOUT verbal anaphora (humans repeat openers 1.4-2x MORE). Names the dominant tell
  // so the "it's the shape" message can be specific. Pure counting, runs in ~1ms.
  function diagnoseShape(text) {
    var rows = [];
    var ls = String(text).split("\n");
    for (var i = 0; i < ls.length; i++) {
      var w = words(ls[i]);
      if (w.length >= 3 && w.length <= 14 && !/^\s*\[.*\]\s*$/.test(ls[i])) rows.push({ w: w, syl: nsylLine(ls[i]) });
    }
    if (rows.length < 6) return null;
    var sylEq = 0, rhyme = 0, pairs = rows.length - 1;
    for (var j = 0; j + 1 < rows.length; j++) {
      if (rows[j].syl === rows[j + 1].syl) sylEq++;
      var a = rows[j].w[rows[j].w.length - 1], b = rows[j + 1].w[rows[j + 1].w.length - 1];
      if (a !== b && VK[a] && VK[a] === VK[b]) rhyme++;
    }
    var tips = [];
    if (sylEq / pairs > 0.24) tips.push("your line lengths are stamped (" + Math.round(100 * sylEq / pairs) + "% of neighbors match exactly — humans sit near 20%): stretch one line, cut another short");
    if (rhyme / pairs > 0.26) tips.push("almost every pair of lines rhymes (" + Math.round(100 * rhyme / pairs) + "% — humans sit near 20%): let a line end without its echo");
    if (!tips.length) return null;
    return tips.join("; ");
  }
  globalThis.HumanizeFreestyle = { humanizeOne: humanizeOne, humanizeHalf: humanizeHalf, humanize: humanize, genLine: genLine, genSuggestions: genSuggestions, judgeLine: judgeLine, themeVec: themeVec, diagnoseShape: diagnoseShape };
})();
