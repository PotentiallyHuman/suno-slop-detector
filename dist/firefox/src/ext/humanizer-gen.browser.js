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
  // Words the v8 detector reads as clearly HUMAN (its own learned word-weight is strongly
  // negative). Built once from the loaded v8 model so the swap layer never replaces a word the
  // model already likes — that only launders human vocab out and risks splitting a fixed
  // compound. Threshold -0.5 keeps genuine clichés (whose AI-signal is structural, near-zero
  // word weight) swappable while catching diamond/-1.32, thunder/-1.78, fire/-0.69, etc.
  // Words the v8 detector reads as STRONGLY human (weight < -0.5) are never a swap source —
  // those weights are extreme enough to trust (diamond -1.32, thunder -1.78). We deliberately do
  // NOT gate substitutes on the finer word weights: collinearity makes mid-range weights noisy
  // (the model scores "lane"/+0.34 like "record"/+0.37 yet "lane" reads more human), so a per-word
  // substitute gate over-blocks good swaps. Substitute quality is curated in the table instead.
  var HUMAN_WORD = {};
  try {
    var VM = globalThis.SLOP_MODEL_V8;
    if (VM && VM.vocab && VM.wBow) for (var hi = 0; hi < VM.vocab.length; hi++) if (VM.wBow[hi] < -0.5) HUMAN_WORD[VM.vocab[hi]] = 1;
  } catch (e) { /* model optional — guard simply off if absent */ }
  function fnv(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h >>> 0; }
  function emb(w) { var r = EW[w]; if (r === undefined) return null; var v = new Float32Array(DIM); for (var k = 0; k < DIM; k++) v[k] = EMB[r * DIM + k] / 127; return v; }
  function dot(a, b) { var s = 0; for (var k = 0; k < a.length; k++) s += a[k] * b[k]; return s; }
  function unit(v) { var s = 0, k; for (k = 0; k < v.length; k++) s += v[k] * v[k]; s = Math.sqrt(s) || 1; for (k = 0; k < v.length; k++) v[k] /= s; return v; }
  function onTheme(w, th) { var v = emb(w); return v ? dot(v, th) : 0; }
  function humanness(w) { return HUM[w] || 0; }
  function allowed(w) { return true; }   // vocabulary is cliché-free by construction (blocklist at build time)
  function words(l) { return (String(l).toLowerCase().replace(/[’‘ʼ]/g, "'").match(/[a-z']+/g)) || []; }   // curly apostrophes = ASCII (pasted lyrics use ’)
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
  // CLAUSE GUARD (no-soup): only edit lines that are real clauses (>=4 words WITH a finite verb).
  // Gerund-fragment list lines ("Every shadow dancin'", "biscuits light as air") have no finite verb;
  // editing them produces fragments the eye reads as soup. Leave fragments alone.
  var FINITE_POS = { VB: 1, VBP: 1, VBZ: 1, VBD: 1, MD: 1 };
  function isFullClause(line) { var w = words(line); if (w.length < 4) return false; for (var i = 0; i < w.length; i++) { var p = WPOS[w[i]]; if (!p || !FINITE_POS[p]) continue; var pp = WPOS[w[i - 1]] || ""; if (pp === "DT" || pp === "VBG" || pp === "TO") continue; /* "the RAIN" / "a setting SAIL" = object noun; "to TRY" = infinitive — none is the clause's finite verb (cycle 19+21 fragment guard) */ return true; } return false; }
  // ---- SENTENCE-REPLACER (decision-tree branch 4 — the coverage path). When no swap/mold/dup fits a
  // line that reads AI (often pure typicality, no cliché to swap), replace the WHOLE line with a clean
  // library line: same rhyme-key (the song's scheme holds), syllable-matched (±1), best theme fit, with
  // a theme-fit FLOOR + anti-dup. The library (globalThis.REPLACE_LIB) is BUILD-TIME judge-cleaned, so
  // every candidate is coherent by construction. Refuse if nothing fits (REFUSE > SOUP). Indexed once.
  var REPLIDX = null;
  function buildReplaceIndex() {
    REPLIDX = [];
    var L = globalThis.REPLACE_LIB || [];
    for (var i = 0; i < L.length; i++) { var lw = lastWord(L[i]), rk = VK[lw]; if (!rk) continue; REPLIDX.push({ line: L[i], rk: rk, syl: nsylLine(L[i]), tv: themeVec(L[i]) }); }
  }
  // A library line may carry a cliché word ONLY if that word is cleanable — the Chaos word-swap
  // post-pass will replace it (shadows->dark). Reject a candidate only when it holds an UN-cleanable
  // cliché (no curated substitute, e.g. neon/echo/light) that the post-pass can't fix.
  function clicheCleanable(w) {
    var SWn = globalThis.CLICHE_SWAPS || {}, SWv = globalThis.CLICHE_SWAPS_VERB || {};
    if (SWn[w] && SWn[w].length) return true;
    var v = SWv[w]; if (v) { if (Array.isArray(v)) return v.length > 0; return !!((v.obj && v.obj.length) || (v.noobj && v.noobj.length)); }
    return false;
  }
  function lineHasUncleanableCliche(line) { var ws = words(line); for (var i = 0; i < ws.length; i++) if (CLICHE.has(ws[i]) && !clicheCleanable(ws[i])) return true; return false; }
  // Swap EVERY cliché WORD that has a curated substitute, across EVERY line — the user's
  // "Humanize Rewrite = all AI words", and the Chaos final pass that cleans any cliché a library
  // line left behind. A word swap keeps the sentence's structure, so there is no clause gate here —
  // only grammatical() on the output and a real cliché removed. Chorus-consistent (all copies match).
  function swapAllWords(text) {
    var lines = String(text).split("\n"), steps = [], done = {}, i, j;
    for (i = 0; i < lines.length; i++) {
      var orig = lines[i];
      if (done[orig] || /^\s*\[/.test(orig) || words(orig).length < 2 || clicheCount(orig) === 0) { done[orig] = 1; continue; }
      var sw = swapCliches(orig, text);
      if (sw && sw !== orig && clicheCount(sw) < clicheCount(orig) && grammatical(words(sw))) {
        for (j = 0; j < lines.length; j++) if (lines[j] === orig) lines[j] = sw;
        steps.push({ lineIndex: i, from: orig, to: sw, mode: "swap" });
      }
      done[orig] = 1;
    }
    return { text: lines.join("\n"), steps: steps };
  }
  function sentenceReplace(aiLine, theme, songLines) {
    if (!REPLIDX) buildReplaceIndex();
    if (!REPLIDX.length) return null;
    var rk = VK[lastWord(aiLine)]; if (!rk) return null;
    var syl = nsylLine(aiLine), used = {};
    for (var s = 0; s < songLines.length; s++) used[String(songLines[s]).toLowerCase()] = 1;   // never reuse a line already in the song
    var best = null, bs = 0.08;                                                                 // theme-fit FLOOR -> refuse a poor match (lines stay coherent; this only governs topical fit)
    for (var i = 0; i < REPLIDX.length; i++) {
      var c = REPLIDX[i];
      if (c.rk !== rk || Math.abs(c.syl - syl) > 1 || used[c.line.toLowerCase()]) continue;
      if (lineHasUncleanableCliche(c.line)) continue;                                           // allow a swappable cliché (post-pass cleans it); reject only un-fixable ones
      var fit = (theme && c.tv) ? dot(theme, c.tv) : 0;
      if (fit > bs) { bs = fit; best = c.line; }
    }
    return best;
  }
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
    /\b(not|nah|never|don['’]t|won['’]t|ain['’]t|isn['’]t|can['’]t)\b.*\b(not|nah|never|don['’]t|won['’]t|ain['’]t|isn['’]t|can['’]t)\b.*\b(just|only|still)\b/i,
    /\btoo \w+ to \w+.*\btoo \w+ to \w+/i,                                     // too X to A, too Y to B
    /^They (say|call) .+, but they (don['’]t|never|won['’]t)/i,                // the strawman-they couplet -> question frame
  ];
  function moldLine(l) { for (var i = 0; i < MOLD.length; i++) if (MOLD[i].test(l)) return true; return false; }

  // ---- REPEAT VARIATION: a verbatim-repeated line is a hook — the FIRST occurrence is
  // sacred, but humans vary the repeat (the model reads verbatim repetition as its single
  // strongest AI tell: ~5 logits on a typical chorus song). Deterministic, corpus-validated
  // ops, only ever applied to the 2nd+ occurrence:
  //   "we're burning bright, we're hydrogen." -> "Burning bright, still hydrogen."
  // (gerund opener = 0.83x human-leaning; mid-line ", still" appears ONLY in human lyrics)
  function dupVariant(line) {
    var l = String(line), out = l;
    var pm = l.match(/^\s*(we|i|you|they)(['’])(re|m)\b/i);
    if (pm) {
      // the SAME pronoun re-stated after a comma is the redundant copy: ", we're X" -> ", still X"
      var pronRe = pm[1] + "['’]" + pm[3];
      out = out.replace(new RegExp(",\\s*" + pronRe + "\\s+", "gi"), ", still ");
      // leading "We're Xing" -> gerund opener "Xing"; "We're the X" -> "Still the X"
      var m = out.match(/^(\s*)(we|i|you|they)['’](re|m)\s+(\w+ing\b.*)$/i);
      if (m) out = m[1] + m[4].charAt(0).toUpperCase() + m[4].slice(1);
      else { m = out.match(/^(\s*)(we|i|you|they)['’](re|m) (the\b.*)$/i); if (m) out = m[1] + "Still " + m[4]; }
    }
    // mid-line "every" in a repeat -> "each" (0.62x human-leaning, model weight negative)
    if (/\bevery\b/i.test(out) && !/^\s*every/i.test(out))
      out = out.replace(/\bevery\b/gi, function (w) { return w.charAt(0) === "E" ? "Each" : "each"; });
    if (out === l) return null;  // no validated op applies — leave the repeat verbatim (honest)
    return out;
  }
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
          return head.charAt(0).toUpperCase() + head.slice(1) + ", or " + p2[1];   // comma, not em-dash: "—" is 127x AI-leaning in lyric lines
        }
        if (parts.length !== 2) return null;                     // 3+ maybes: leave for the panel
      }
      var out = l.replace(/\b[Mm]aybe,?\s+/g, "");
      out = out.charAt(0).toUpperCase() + out.slice(1);
      return out !== l ? out : null;
    }
    // "They say X, but they don't Y" -> a question. AI never asks; "Why do" is a
    // human-only line opener (0.25/1000 human lines, 0 in the AI corpus), and the
    // model reads zero rhetorical questions as an AI tell.
    m = l.match(/^They (say|call) (.+?), but they (don['’]t|never|won['’]t) (.+?)[,.!]?$/i);
    if (m) return "Why do they " + m[1].toLowerCase() + " " + m[2] + " when they " + m[3].toLowerCase() + " " + m[4] + "?";
    m = l.match(/^(.*?\btoo\s+\w+\s+to\b.*?),\s*too\s+\w+\s+to\s+(.*)$/i);
    if (m) return r % 2 ? m[1] + ", can't even " + m[2] : m[1] + ", or to " + m[2];
    m = l.match(/^I (?:don't|won't|never) (.*?), I (?:don't|won't|never) (.*?), I (?:just|only) (.*)$/i);
    if (m) return "Forget " + m[1] + ", forget " + m[2] + ", I " + m[3];
    if ((l.match(/\bevery\b/gi) || []).length > 1)                   // double-every parallel ("Every pose, every pause"):
      return l.replace(/\bevery\b/gi, function (w) {                 // replacing ONE reads broken — replace BOTH with "each",
        return w.charAt(0) === "E" ? "Each" : "each";                // which keeps the parallelism (0.62x human-leaning)
      });
    // "Every X I ever Y" — the relative "ever" is a negative-polarity item LICENSED by
    // "every"/"any". Swapping the opener to This/That/Some strands it ("This fear I ever
    // carried" reads ungrammatical). Leave the whole line to the swap layer instead.
    if (/\b(every|any)\b[^.]*\bever\b/i.test(l)) return null;
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
    "for the night", "the night of", "all night", "spend the night", "through the night", "tonight", "lights camera", "lights cameras", "flame of fire", "night and day", "day and night", "holding hands", "hold hands", "held hands", "lot of soul", "heart and soul", "body and soul", "good night", "goodnight", "out of your hands", "out of my hands", "in your hands", "in my hands", "love you so", "love me so", "love her so", "love him so",
    "hands up", "hands down", "heads up", "heads down", "hand in hand", "hands in the air", "raise your hands", "shadow of", "shadow of a", "in the shadow", "fire away", "play with fire", "light of day", "see the light", "guiding light"];
  // words that are often VERBS ("i love you" -> "i devotion you") — swap only in clear noun position
  var VERBY = { love: 1, kiss: 1, whisper: 1, whispers: 1, echo: 1, echoes: 1, flicker: 1, shimmer: 1, glimmer: 1, surrender: 1, fire: 1, light: 1, storm: 1, scar: 1, mist: 1, voice: 1, dust: 1 };
  var NOUN_CTX = { the: 1, a: 1, an: 1, my: 1, our: 1, your: 1, his: 1, her: 1, their: 1, this: 1, that: 1, of: 1, "in": 1, with: 1, through: 1, like: 1, every: 1, no: 1, some: 1 };
  // prepositions: a prep->prep swap (beneath->under) never stilts a phrase, so it's exempt from the
  // collocation guard (which protects content-word phrases like "the night" / "my hands").
  var PREP = { beneath: 1, under: 1, below: 1, above: 1, beyond: 1, within: 1, without: 1, upon: 1, across: 1, against: 1, beside: 1, amid: 1, atop: 1 };
  // subjects/auxiliaries that put the following cliché word in VERB position ("I love", "you whisper",
  // "still love"). If neither this NOR a noun-marker precedes ("call it love", "is love"), the word is
  // a noun and must not get the verb substitute ("I call it love" -> "...choose" was the bug).
  var VERB_CTX = { i: 1, you: 1, we: 1, they: 1, he: 1, she: 1, "i'll": 1, "you'll": 1, "we'll": 1, "they'll": 1, "i've": 1, "you've": 1, "we've": 1, "they've": 1, "don't": 1, "won't": 1, "can't": 1, "didn't": 1, never: 1, still: 1, always: 1, gonna: 1, wanna: 1, gotta: 1, to: 1, can: 1, will: 1, would: 1, could: 1, should: 1, might: 1, must: 1, may: 1, "let's": 1, just: 1, only: 1, who: 1, "i'd": 1 };
  function swapCliches(line, songText) {
    var SW = globalThis.CLICHE_SWAPS; if (!SW) return null;
    var swapTheme = null; try { swapTheme = themeVec(songText); } catch (e) {}
    // deterministic per-song seed (stable for a given song, varies across songs) so substitute
    // selection is song-tailored, not globally fixed — two different songs humanize differently.
    var songSeed = 0, sgt = String(songText);
    for (var ss = 0; ss < sgt.length; ss++) songSeed = (songSeed * 31 + sgt.charCodeAt(ss)) % 100003;
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
    // include the curly apostrophe in the token so "love’s" stays ONE token (not "love"+"s"):
    // the split made "love’s a route" swap the bare "love" in verb position -> "choose’s a route".
    var out = raw.replace(/[A-Za-z'’‘]+/g, function (tok, off) {
      var lw = tok.toLowerCase().replace(/[’‘]/g, "'"), prev = prevTok; prevTok = lw;
      if (/'s?$/.test(lw) && lw.length > 2) return tok;          // possessive/contraction ("love's", "don't"): noun-ish, leave it
      if (!CLICHE.has(lw) || !SW[lw]) return tok;
      if (counts[lw] > 1) return tok;                            // repeated on purpose ("Who your love, Who your love")
      // NEVER swap a word the detector itself reads as HUMAN. Its cliché-ness lives in the
      // structural features, so the word-level signal is human — swapping it launders a human
      // word out AND risks a broken compound ("diamond ring" -> "jewel ring"). The score can be
      // fooled here (cliché-density drops) but coherence is the hard constraint. (test song 9)
      if (HUMAN_WORD[lw]) return tok;
      // PER-WORD frozen-phrase guard: only the collocation-ANCHOR words (love, hands — proven bad
      // pairs that live in frozen phrases) are protected inside a >=90x frozen phrase. A BLANKET
      // version was reverted (it killed "lost in"->"stranded in", a fine swap); the split is the
      // SOURCE WORD, not phrase frequency. (cycle 4, refining cycle 3's disproof)
      if (globalThis.FROZEN_ANCHOR && globalThis.FROZEN_ANCHOR[lw] && globalThis.FROZEN_PHRASE) {
        var fzn = raw.slice(off + tok.length).match(/[A-Za-z'’‘]+/);
        var fzw = fzn ? fzn[0].toLowerCase().replace(/[’‘]/g, "'") : "";
        if ((prev && globalThis.FROZEN_PHRASE.has(prev + " " + lw)) || (fzw && globalThis.FROZEN_PHRASE.has(lw + " " + fzw))) return tok;
      }
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
      // "shadows": swap only the "(in/from) the shadows" = darkness/place sense (prev is "the").
      // A bare-subject "Shadows dance and sway" is moving shapes; a mass-noun sub (dark/gloom)
      // breaks plural agreement, so leave it. (cycle 36 — restoring the catch the user expects.)
      if (lw === "shadows" && prev !== "the") return tok;
      if (VERBY[lw]) {
        if (NOUN_CTX[prev]) {
          if (nxtL.length > 3 && !NOUN_CTX[nxtL]) return tok;    // "your love momma" — ambiguous dialect: leave it
        } else if (VERB_CTX[prev]) {
          subs = (globalThis.CLICHE_SWAPS_VERB || {})[lw]; if (!subs) return tok;   // clear verb position (a subject/aux precedes)
        } else {
          // neither a noun-marker nor a subject precedes ("call it love", "is love", "it's love"):
          // the word is a NOUN here. Use noun subs; if there are none, leave it (don't verb-swap a noun).
          if (!SW[lw]) return tok;
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
      // Collect the acceptable substitutes ranked by QUALITY (meter match + theme fit; curation
      // order breaks ties — earlier = better). Curation order is a real quality signal, so we never
      // reach into the low-quality tail ("dimming" is a better "fading" than "bleaching").
      var cands = [];
      for (var k = 0; k < subs.length; k++) {
        var s = subs[k];
        if (CLICHE.has(s) || songWords[s]) continue;             // never re-slop, never duplicate the song
        if (mustRhyme && VK[s] !== VK[lw]) continue;             // keep the song's rhyme vowel
        if (needPlural && s.charAt(s.length - 1) !== "s") continue;
        var fit = (swapTheme && emb(s)) ? dot(emb(s), swapTheme) : 0;
        cands.push({ s: s, q: Math.abs(nsyl(s) - nsyl(lw)) * 10 + k * 0.5 - fit * 4 });
      }
      if (!cands.length) return tok;
      cands.sort(function (a, b) { return a.q - b.q; });
      // SONG-TAILORED variety WITHOUT quality loss: pick among only the TOP candidates (within 1.5
      // of the best), seeded by the song — so two songs vary their swap, but neither dips into the
      // weak tail. Expansive where safe (several good options), strict where risky (one good option).
      var topN = 1; while (topN < cands.length && cands[topN].q <= cands[0].q + 1.5) topN++;
      var best = cands[songSeed % topN].s;
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
  function humanizeOne(text, scoreFn, logitFn, allowReplace, skipSongGuard) {
    var theme = themeVec(text); if (!theme) return null;
    var lines = String(text).split("\n"), songScore = scoreFn(text), ranked = [], i;
    if (lines.length > MAX_LINES) lines.length = MAX_LINES;   // pathological paste: edit the first 200 lines only
    // logitFn (optional): log-odds scorer for the gates. The rounded % saturates — on a
    // 100% song NOTHING can "drop 2 points", so every %-gated structural edit was blocked
    // exactly where it mattered. Log-odds keep full resolution at both ends.
    var fineBase = logitFn ? logitFn(text) : null;
    // Hooks/choruses are STRUCTURE: a line repeated verbatim is there on purpose — the FIRST
    // occurrence is never touched. The REPEATS may be varied (dupVariant) when the song reads AI:
    // verbatim repetition is the model's strongest single AI tell, and varying the repeat is a
    // real songwriting move, not vandalism. NEAR-duplicate matching (word-set overlap), not
    // exact: once a repeat is varied, its root must STAY immune across the next presses —
    // exact matching let the root lose protection the moment its twin diverged.
    var sets = [];
    for (i = 0; i < lines.length; i++) sets.push(new Set(words(lines[i])));
    function jacc(a, b) {
      if (a.size < 3 || b.size < 3) return 0;
      var n = 0; a.forEach(function (w) { if (b.has(w)) n++; });
      // jaccard OR overlap-coefficient: short hooks stay kin after a one-word variation
      return Math.max(n / (a.size + b.size - n), n / Math.min(a.size, b.size) - 0.05);
    }
    // Candidates = ONLY lines carrying their own AI evidence: blocklist clichés, or a high line-level
    // AI score. A line that reads human is never touched, no matter how AI the whole song scores —
    // on a good song the song-level % is the STRUCTURE (repeated chorus, uniform stanzas), and
    // "fixing" that by rewriting innocent lines destroys the song to please the meter (the Hydrogen
    // lesson: clichéd verse lines failed to regenerate, so the walk fell through and ate the hook).
    for (i = 0; i < lines.length; i++) {
      var wn = words(lines[i]).length;
      if (wn < 3 || wn > 16) continue;                         // not a lyric line (prose blob / fragment)
      var earlierDup = -1, laterDup = false;
      for (var j2 = 0; j2 < lines.length; j2++) {
        if (j2 === i) continue;
        if (jacc(sets[i], sets[j2]) >= 0.6) { if (j2 < i) { earlierDup = j2; break; } laterDup = true; }
      }
      if (earlierDup >= 0) {                                   // a REPEAT of an earlier line
        if (skipSongGuard || songScore >= 30) ranked.push({ i: i, dup: true, r: 600 + scoreFn(lines[i]) });
        continue;
      }
      if (laterDup) continue;                                  // the hook's root occurrence: sacred
      // Evidence = cliché WORDS, or an ablation-proven MOLD frame (only when the song itself
      // reads AI). The line-level AI score false-flags specific human lines ("Keys in my
      // teeth, engine coughing black") — it may rank candidates, never condemn.
      var cc = clicheCount(lines[i]), mold = (skipSongGuard || songScore >= 30) && moldLine(lines[i]);
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
      // REPEAT VARIATION — vary the 2nd+ occurrence of a verbatim-repeated line. Accept only
      // if the log-odds actually drop (or, without a logitFn, the % doesn't rise).
      if (ranked[k].dup) {
        var dv = dupVariant(orig);
        if (dv) {
          var dtrial = lines.slice(); dtrial[idx] = dv;
          var dnew = dtrial.join("\n"), dns = scoreFn(dnew);
          var dok = logitFn ? (logitFn(dnew) <= fineBase - 0.15) : (dns <= songScore);
          if (dok) return { text: dnew, lineIndex: idx, from: orig, to: dv, before: Math.round(songScore), after: Math.round(dns), mode: "vary" };
        }
        continue;
      }
      // MOLD RESTRUCTURE — the sentence FRAME is the cliché ("Every X is a Y"); no word swap
      // helps, and the n-gram can't be trusted to rewrite it. So a DESIGNED structural transform
      // rearranges the frame and keeps 100% of the user's words. Runtime leave-one-out confirms
      // the line is load-bearing first (so "Every breath you take" in a human song stays).
      if (ranked[k].mold) {
        var ablate = lines.slice(0, idx).concat(lines.slice(idx + 1)).join("\n");
        var loaded = logitFn ? (fineBase - logitFn(ablate) >= 0.25)        // log-odds LOO: works at 100% too
                             : (songScore - scoreFn(ablate) >= 2);
        if (loaded) {
          var rotIdx = (text.match(/^(That|This|Some|Perhaps|Could be) /gmi) || []).length;   // rotate variants
          var rs = restructure(orig, rotIdx);
          if (rs && !moldLine(rs) && isFullClause(orig) && grammatical(words(rs)) && completeLine(words(rs))) {
            var rtrial = lines.slice(); rtrial[idx] = rs;
            var rnew = rtrial.join("\n"), rns = scoreFn(rnew);
            var rok = logitFn ? (logitFn(rnew) <= fineBase + 0.05) : (rns <= songScore + 1);
            if (rok) {
              return { text: rnew, lineIndex: idx, from: orig, to: rs, before: Math.round(songScore), after: Math.round(rns), mode: "restructure" };
            }
          }
        }
        // restructure impossible — fall through to word swap if it also carries clichés
      }
      // TIER 0 — the line carries cliché words: swap the words, keep the user's sentence.
      // Gate on the cliché count itself (the song % is provably blind to word swaps) plus never-worsen.
      // SONG-LEVEL AI GUARD (red-team fix): never mutate a clean song's words — a 0%-AI line like
      // "Whispers in the wind" must be left alone. Only swap when the song actually reads AI (>=50),
      // matching the dup/mold gates (55). Saturated AI songs still pass, so good swaps are unaffected.
      if (clicheCount(orig) > 0 && (skipSongGuard || songScore >= 30)) {
        var swapped = swapCliches(orig, text);
        // WORD SWAP needs NO isFullClause gate: substituting one cliché word for a same-POS curated
        // word keeps the sentence's structure intact, so it's safe even on a verbless fragment
        // ("a neutron in the shadows" -> "a neutron in the dark"). isFullClause stays on RESTRUCTURE
        // (line 519) where reshaping the clause CAN break grammar. grammatical(swapped) is the guard
        // here — it validates the OUTPUT's POS-bigrams. (Fixes the 300-word list silently skipping
        // every cliché that sits in an appositive/fragment line.)
        if (swapped && clicheCount(swapped) < clicheCount(orig) && grammatical(words(swapped))) {
          var trialS = lines.slice(); trialS[idx] = swapped;
          var snew = trialS.join("\n"), nsS = scoreFn(snew);
          var sok = logitFn ? (logitFn(snew) <= fineBase + 0.05) : (nsS <= songScore + 1);
          if (sok) {
            return { text: snew, lineIndex: idx, from: orig, to: swapped, before: Math.round(songScore), after: Math.round(nsS), mode: "swap" };
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
    // BRANCH 4 — SENTENCE-REPLACER (OPT-IN ONLY, gated by allowReplace). v1.0.0 = OPTION A: Line/Half do
    // NOT pass allowReplace, so they stay MEANING-PRESERVING (swap/mold only — every edit keeps the
    // user's own words). The replacer is coherent but OFF-TOPIC (retrieval can't fit, generation makes
    // soup — both disproven), so whole-line replacement is reserved for a future opt-in aggressive tier.
    if (allowReplace) {
    var repCand = [];
    for (var ri2 = 0; ri2 < lines.length; ri2++) { if (!isFullClause(lines[ri2])) continue; if (scoreFn(lines[ri2]) < 55) continue; repCand.push({ i: ri2, ai: scoreFn(lines[ri2]) }); }
    repCand.sort(function (a, b) { return b.ai - a.ai; });
    for (var rc = 0; rc < repCand.length; rc++) {
      var ridx = repCand[rc].i, rorig2 = lines[ridx];
      var rep = sentenceReplace(rorig2, theme, lines);
      if (!rep) continue;
      var rtrial2 = lines.slice(); rtrial2[ridx] = cap(rep);
      var rnew3 = rtrial2.join("\n"), rns3 = scoreFn(rnew3);
      if (logitFn ? (logitFn(rnew3) <= fineBase - 0.02) : (rns3 <= songScore)) {
        return { text: rnew3, lineIndex: ridx, from: rorig2, to: cap(rep), before: Math.round(songScore), after: Math.round(rns3), mode: "replace" };
      }
    }
    }
    return null;
  }
  // ---- "Humanize Rewrite": one press rebuilds the worst HALF of the song (ranked by cliché then AI),
  // leaving the better half the user's own words. Press again to rewrite the worst half of what now
  // remains — it converges, always sparing the cleaner half. Returns null when no line still reads AI. ----
  function humanizeHalf(text, scoreFn, logitFn) {
    var theme = themeVec(text); if (!theme) return null;
    if (scoreFn(text) < 30) return null;               // genuinely human songs (0-21% in corpus) — leave them alone
    var before = Math.round(scoreFn(text));
    // PASS 1 — Humanize Rewrite = swap EVERY cliché WORD in EVERY line (the user's "all AI words"),
    // not just the worst half. Word swaps are meaning-preserving and the song % is blind to them,
    // so doing them everywhere can only help; obvious clichés (shadows/silence/dreams) all go.
    var w = swapAllWords(text), cur = w.text, steps = w.steps.slice();
    // PASS 2 — meaning-preserving RESTRUCTURES (Every->This molds, chorus variation) on the worst
    // remaining lines. Words are already clean, so humanizeOne here returns mold/dup edits.
    var lines = cur.split("\n"), nb = 0, i;
    for (i = 0; i < lines.length; i++) if (words(lines[i]).length >= 3) nb++;
    var half = Math.ceil(nb / 2), k;
    for (k = steps.length; k < half; k++) {
      var res = humanizeOne(cur, scoreFn, logitFn, false, true);
      if (!res) break;
      cur = res.text;
      // CHORUS CONSISTENCY: a repeated line (chorus) must read the same everywhere.
      if (res.from && res.to && res.from !== res.to) cur = cur.split("\n").map(function (l) { return l === res.from ? res.to : l; }).join("\n");
      steps.push({ lineIndex: res.lineIndex, from: res.from, to: res.to, mode: res.mode });
    }
    if (!steps.length) return null;
    return { text: cur, count: steps.length, steps: steps, before: before, after: Math.round(scoreFn(cur)) };
  }
  // ---- "Humanize Chaos": the aggressive tier — offered only when Rewrite has nothing
  // safe left and the song still reads AI. MEANING may bend; RHYME and COHERENCE may not:
  // full-line rebuilds come from the freestyle generator, which writes BACKWARD from the
  // original line's end-rhyme word (rhyme kept by construction), themed to the song's own
  // vocabulary, and judged by the grammar professor + craft lenses. Evidence gates are
  // dropped (any AI-leaning line is fair game) but hook ROOTS stay sacred and every edit
  // must measurably lower the log-odds. Stops under CHAOS_TARGET or when nothing helps.
  var CHAOS_TARGET = 15, CHAOS_MAX_EDITS = 30;
  // NOTE: chaos has NO n-gram rebuild path. It was built and disproven (2026-06-13): across
  // 8 corpus songs + Hydrogen, ZERO generator rebuilds passed the strict whole-line POS
  // template — under a real coherence bar the walk produces soup or nothing. The chaos gain
  // is entirely the designed ops with the evidence/score gates dropped.
  function humanizeChaos(text, scoreFn, logitFn) {
    var theme = themeVec(text); if (!theme) return null;
    var before = Math.round(scoreFn(text));
    var cur = String(text).split("\n"), steps = [];
    if (cur.length > MAX_LINES) cur.length = MAX_LINES;
    function songNow() { return cur.join("\n"); }
    // jaccard OR overlap-coefficient: a 3-word line that lost one word to a variation
    // ("Breaking every law" vs "Breaking each law") scores 2/4=0.5 jaccard — below any
    // sane threshold — but 2/3=0.67 overlap. Short hooks must stay recognized as kin.
    function jacc2(a, b) {
      if (a.size < 3 || b.size < 3) return 0;
      var n = 0; a.forEach(function (w) { if (b.has(w)) n++; });
      return Math.max(n / (a.size + b.size - n), n / Math.min(a.size, b.size) - 0.05);
    }

    for (var pass = 0; pass < 3 && steps.length < CHAOS_MAX_EDITS; pass++) {
      var songScore = scoreFn(songNow());
      if (songScore < CHAOS_TARGET) break;
      var fineBase = logitFn ? logitFn(songNow()) : null;
      var sets = [], i;
      for (i = 0; i < cur.length; i++) sets.push(new Set(words(cur[i])));
      var cands = [];
      for (i = 0; i < cur.length; i++) {
        var wn = words(cur[i]).length;
        if (wn < 3 || wn > 16 || /^\s*\[/.test(cur[i])) continue;
        var earlier = -1, later = false;
        for (var j = 0; j < cur.length; j++) { if (j === i) continue; if (jacc2(sets[i], sets[j]) >= 0.6) { if (j < i) { earlier = j; break; } later = true; } }
        if (later && earlier < 0) continue;                     // hook root: sacred even in chaos
        cands.push({ i: i, dup: earlier >= 0, ai: scoreFn(cur[i]) });
      }
      cands.sort(function (a, b) { return b.ai - a.ai; });
      var improved = false;
      for (var c = 0; c < cands.length && steps.length < CHAOS_MAX_EDITS; c++) {
        var idx = cands[c].i, orig = cur[idx], tries = [];
        if (cands[c].dup) {
          var dv = dupVariant(orig); if (dv) tries.push({ to: dv, mode: "vary" });
        } else {
          var rot = (songNow().match(/^(That|This|Some|Perhaps|Could be|Why do) /gmi) || []).length;
          var rs = restructure(orig, rot); if (rs && !moldLine(rs)) tries.push({ to: rs, mode: "restructure" });
          var sw = swapCliches(orig, songNow()); if (sw && sw !== orig) tries.push({ to: sw, mode: "swap" });
          // LAST resort (Chaos only): the line carries no cliché/mold handle — it's pure
          // structural typicality, the kind that keeps Hydrogen pinned at ~100% no matter how
          // many words we swap. Replace it wholesale with a clean, rhyme-key+syllable-matched
          // line from the 3085-line judge-cleaned library. This is what actually drops the % on
          // structural songs; it is COHERENT (0 soup, build-time judged) but may go OFF-TOPIC —
          // the explicit "meaning may bend" contract of Chaos. Tried last, so cliché lines still
          // get a meaning-preserving swap first; only the unhandleable lines get replaced.
          var lr = sentenceReplace(orig, theme, cur); if (lr && lr !== orig) tries.push({ to: lr, mode: "replace" });
        }
        for (var t = 0; t < tries.length; t++) {
          var trial = cur.slice(); trial[idx] = tries[t].to;
          var tnew = trial.join("\n");
          var ok = logitFn ? (logitFn(tnew) <= fineBase - 0.1) : (scoreFn(tnew) < songScore);
          if (ok) {
            cur = trial; steps.push({ lineIndex: idx, from: orig, to: tries[t].to, mode: tries[t].mode });
            fineBase = logitFn ? logitFn(tnew) : null; songScore = scoreFn(tnew);
            improved = true;
            break;
          }
        }
        if (songScore < CHAOS_TARGET) break;
      }
      if (!improved) break;
    }
    // FINAL — Chaos = lines, THEN all AI words: clean every cliché WORD still in the song, including
    // any a library line introduced ("...in the shadows" -> "...in the dark"). swapAllWords keeps the
    // sentence structure (no soup) and runs even when no line was replaced above.
    var wp = swapAllWords(cur.join("\n"));
    if (wp.steps.length) { cur = wp.text.split("\n"); for (var wi = 0; wi < wp.steps.length; wi++) steps.push(wp.steps[wi]); }
    if (!steps.length) return null;
    var finalText = cur.join("\n");
    return { text: finalText, count: steps.length, steps: steps, before: before, after: Math.round(scoreFn(finalText)), target: CHAOS_TARGET };
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
    // SPECIFICITY (mirrors the model's cf_spec): digits + time/number words + mid-line
    // proper nouns. Zero anchors anywhere is itself an AI tell the model weighs — and
    // it's the one fix only the writer can make (we never invent content for them).
    var specRe = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|o'?clock|a\.?m|p\.?m|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
    var hasSpec = specRe.test(text);
    if (!hasSpec) {
      for (var si = 0; si < ls.length && !hasSpec; si++) {
        var st = ls[si].trim().split(/\s+/);
        for (var sj = 1; sj < st.length; sj++) if (/^[A-Z][a-z]{2,}/.test(st[sj]) && !/^(I|God|Lord|Oh|Hey|Yeah|Baby)$/.test(st[sj])) { hasSpec = true; break; }
      }
    }
    if (!hasSpec) tips.push("nothing in the song is SPECIFIC — no place, time, or name anywhere (the model reads zero real anchors as AI): plant one detail only you would know, like a street ('on 5th Avenue'), a time ('4 a.m.'), or a month");
    if (!tips.length) return null;
    return tips.join("; ");
  }
  // pressSummary(res): name the CONCRETE edit a press made ("swapped 'shadows' → 'doorways'"),
  // so the user sees what happened even when the 0-100 score is pinned and can't move
  // (a saturated song rounds to 100% before AND after a genuinely good edit).
  function wordSwap(from, to) {
    var A = String(from).toLowerCase().match(/[a-z']+/g) || [];
    var B = String(to).toLowerCase().match(/[a-z']+/g) || [];
    var inB = {}, inA = {}, i;
    for (i = 0; i < B.length; i++) inB[B[i]] = true;
    for (i = 0; i < A.length; i++) inA[A[i]] = true;
    var out = [], add = [];
    for (i = 0; i < A.length; i++) if (!inB[A[i]]) out.push(A[i]);
    for (i = 0; i < B.length; i++) if (!inA[B[i]]) add.push(B[i]);
    if (!out.length || out.length > 3 || add.length > 3) return null; // a reshape, not a swap
    if (!add.length) {                                                // pure deletion ("maybe X, maybe Y" -> "X, Y")
      var uniq = []; for (i = 0; i < out.length; i++) if (uniq.indexOf(out[i]) < 0) uniq.push(out[i]);
      return "dropped '" + uniq.join(" ") + "'";
    }
    return "'" + out.join(" ") + "' → '" + add.join(" ") + "'";
  }
  function pressSummary(res) {
    if (!res) return "";
    var steps = res.steps || [{ from: res.from, to: res.to }];
    var parts = [], i;
    for (i = 0; i < steps.length && parts.length < 3; i++) {
      var s = wordSwap(steps[i].from, steps[i].to);
      if (s) parts.push(s);
    }
    var more = steps.length - parts.length;
    if (!parts.length) return "reshaped " + steps.length + (steps.length === 1 ? " line" : " lines");
    var arrows = [], drops = [];
    for (i = 0; i < parts.length; i++) (parts[i].indexOf("dropped") === 0 ? drops : arrows).push(parts[i]);
    var bits = [];
    if (arrows.length) bits.push("swapped " + arrows.join(", "));
    if (drops.length) bits.push(drops.join(", "));
    return bits.join("; ") + (more > 0 ? " (+" + more + " more)" : "");
  }

  globalThis.HumanizeFreestyle = { humanizeOne: humanizeOne, humanizeHalf: humanizeHalf, humanizeChaos: humanizeChaos, humanize: humanize, genLine: genLine, genSuggestions: genSuggestions, judgeLine: judgeLine, themeVec: themeVec, diagnoseShape: diagnoseShape, pressSummary: pressSummary,
    // exposed for the sentence-replacer build + soup tests: the real shipped coherence gates
    _gates: { words: words, nsylLine: nsylLine, lastWord: lastWord, grammatical: grammatical, completeLine: completeLine, isFullClause: isFullClause, rhymeKey: function (l) { return VK[lastWord(l)] || null; } } };
})();
