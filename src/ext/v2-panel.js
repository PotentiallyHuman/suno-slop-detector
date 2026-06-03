/* v2-panel.js — exposes globalThis.SlopPanel.build(text, scoreResult).
 *
 * Builds the "5 good (keep this) · 1 joker (do this) · 5 work-on" craft panel.
 * ALL text-computed, no LLM. Uses the trained weights in globalThis.SLOP_MODEL
 * and the dense feature values from SlopV2.score(...).
 *
 *   bad  (work-on, amber): strongest +weight (AI-leaning) dense features PRESENT
 *        (contrib > 0), top 5, each quoting the offending line/word + a fix.
 *   good (keep this, green): strongest -weight (human-leaning) features present,
 *        top 5, quoted as "keep this".
 *   joker (do-this, purple): the single top move from JOKER_STRATEGY_LIBRARY.md,
 *        selected by zscore(value vs AI-corpus mean) x |weight|, slots filled from
 *        the song. If nothing clears threshold -> Move 12 (pure experiment).
 *
 * Plain ES5-ish browser JS; also require()-able in Node. Returns plain data
 * (strings only) so the caller can render with DOM APIs (no innerHTML).
 */
(function () {
  "use strict";
  var G = (typeof globalThis !== "undefined") ? globalThis : (typeof window !== "undefined" ? window : this);
  var SlopScore = G.SlopScore;

  // ---------- small line/token helpers ----------
  function rawLines(text) {
    return SlopScore.stripSectionLabels(String(text || ""))
      .split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  }
  function lc(s) { return String(s).toLowerCase(); }
  function lastWord(l) { var m = lc(l).match(/[a-z']+/g); return m ? m[m.length - 1] : ""; }
  function firstWord(l) { var m = lc(l).match(/[a-z']+/g); return m ? m[0] : ""; }
  function clip(l, n) { l = String(l); n = n || 60; return l.length > n ? l.slice(0, n - 1) + "…" : l; }

  // ---------- slot extractors (small, regex-based, return "" if not found) ----------

  // first line that CONTAINS any of the given lowercase words/phrases
  function lineContaining(text, needles) {
    var L = rawLines(text);
    for (var i = 0; i < L.length; i++) {
      var lo = lc(L[i]);
      for (var j = 0; j < needles.length; j++) if (lo.indexOf(needles[j]) >= 0) return L[i];
    }
    return "";
  }
  // first line matching a regex
  function lineMatching(text, re) {
    var L = rawLines(text);
    for (var i = 0; i < L.length; i++) if (re.test(L[i])) return L[i];
    return "";
  }
  // the most-repeated verbatim line + its count
  function topRepeatedLine(text) {
    var L = rawLines(text), f = {}, best = "", bestN = 0;
    for (var i = 0; i < L.length; i++) {
      var key = lc(L[i]); f[key] = (f[key] || 0) + 1;
      if (f[key] > bestN) { bestN = f[key]; best = L[i]; }
    }
    return { line: best, count: bestN };
  }
  // find a predictable rhyme pair (line-end a then b within 3 lines) from the lexicon
  var RHYME_PAIRS = (G.SlopPatterns && G.SlopPatterns.RHYME_PAIRS) || [];
  function firstRhymePair(text) {
    var L = rawLines(text), ends = L.map(lastWord);
    for (var p = 0; p < RHYME_PAIRS.length; p++) {
      var a = RHYME_PAIRS[p][0], b = RHYME_PAIRS[p][1];
      for (var i = 0; i < ends.length; i++) {
        if (ends[i] === a) for (var k = i + 1; k <= Math.min(ends.length - 1, i + 3); k++)
          if (ends[k] === b) return { a: a, b: b };
      }
    }
    return null;
  }
  // first matching stock cliché phrase substring present in text
  var PHRASES = (G.SlopPatterns && G.SlopPatterns.PHRASES) || [];
  function firstClichePhrase(text) {
    var lo = lc(text);
    for (var i = 0; i < PHRASES.length; i++) if (lo.indexOf(PHRASES[i]) >= 0) return PHRASES[i];
    return "";
  }
  // function/closed-class words we must NEVER suggest swapping (the "change 'the' to…" bug)
  var STOP = {};
  ("a an the and or but if then so as of to in on at by for with from into about over under up down out off "
   + "i you he she it we they me him her us them my your his its our their this that these those is am are was "
   + "were be been being do does did have has had will would can could should may might must shall not no nt "
   + "oh yeah la na ooh ah mm hmm da ba uh huh yo hey just only very really too also still even when what who "
   + "how why where here there now back down all some any more most much many one two").split(/\s+/)
   .forEach(function (w) { STOP[w] = 1; });
  function isContentWord(w) { return w && w.length >= 3 && !STOP[w] && !/^(i'm|i'll|i've|i'd|you're|don't|can't|won't|it's|that's|we're|they're)$/.test(w); }

  // most-used overused/AI CONTENT word that is also a top +weight BoW word in the model
  function topAiWordPresent(text, model) {
    var idx = {}; for (var i = 0; i < model.vocab.length; i++) idx[model.vocab[i]] = i;
    var toks = lc(SlopScore.stripSectionLabels(text)).match(/[a-z']+/g) || [];
    var seen = {}, best = "", bestW = 0;
    for (var t = 0; t < toks.length; t++) {
      var w = toks[t]; if (seen[w]) continue; seen[w] = 1;
      if (!isContentWord(w)) continue;            // never target function words
      var bi = idx[w]; if (bi === undefined) continue;
      var wt = model.wBow[bi];
      if (wt > bestW) { bestW = wt; best = w; }
    }
    return bestW > 0 ? best : "";
  }
  // the most "abstract"-feeling line (ends on an emotion word) for show-don't-tell
  var ABSTRACT_END = /(love|pain|heart|tears|fears|fire|light|night|sky|time|dreams?|soul|gold|rain|home|free|alone|forever)$/;
  function abstractLine(text) { return lineMatching(text, new RegExp("\\b(love|pain|heart|soul|forever|dreams?|tears|fire|light|night)\\b", "i")); }
  function abstractEndWords(text) {
    var L = rawLines(text), out = [];
    for (var i = 0; i < L.length && out.length < 4; i++) { var w = lastWord(L[i]); if (ABSTRACT_END.test(w) && out.indexOf(w) < 0) out.push(w); }
    return out.join(", ");
  }
  function firstVocableLine(text) {
    var L = rawLines(text);
    for (var i = 0; i < L.length; i++) {
      var m = lc(L[i]).match(/[a-z']+/g) || []; if (!m.length) continue;
      var voc = m.filter(function (w) { return /^(na+|la+|oh+|ooh+|ahh*|yeah+|whoa+|woah+|hey+|mm+|hmm+|da+|ba+)$/.test(w); });
      if (voc.length / m.length >= 0.6) return { line: L[i], token: voc[0] };
    }
    return null;
  }
  function templatePhrase(text) {
    var m = lc(text).match(/\bnot\b[^,.\n]{1,30}\bbut\b/) ||
            lc(text).match(/i'?m not\b[^.\n]{1,30}i'?m\b/) ||
            lc(text).match(/\bno\b[^.\n]{1,25}\bno\b[^.\n]{1,25}\b(but|just|only)\b/);
    return m ? m[0].trim() : "";
  }

  // ---------- dense feature -> human-readable label + fix ----------
  var FEATURE_INFO = {
    f_clicheDensity:   { label: "cliché density", fix: "swap a stock phrase for one detail only your narrator would say." },
    lex_cliche:        { label: "stock clichés", fix: "trade the most common line for a private, specific one." },
    lex_rhyme:         { label: "predictable rhymes", fix: "let one perfect rhyme be a near-miss (slant) — it reads human." },
    f_perfectRhymeRatio:{ label: "all-perfect rhyme", fix: "loosen one rhyme to a slant rhyme so it doesn't feel machine-perfect." },
    f_endRhymeRate:    { label: "every line rhymes", fix: "leave one line unrhymed for a productive bit of tension." },
    f_repetition:      { label: "verbatim repetition", fix: "change one word in the final chorus so it lands harder." },
    f_abstractRatio:   { label: "abstract vocabulary", fix: "replace an abstract emotion word with something you can see or touch." },
    f_positivityBias:  { label: "uniformly positive tone", fix: "let one line complicate the mood instead of stacking sweetness." },
    f_commonWordRatio: { label: "very common words", fix: "drop in one concrete noun (a place, a brand, a time)." },
    s_hookMaxRepeat:   { label: "hook repeats verbatim", fix: "vary the hook once — change a single word the last time." },
    s_titleDropRepeat: { label: "title repeated a lot", fix: "earn the title by changing its context, not just repeating it." },
    s_consecDupLines:  { label: "back-to-back identical lines", fix: "cut one duplicate or vary it slightly." },
    s_maxConsecDup:    { label: "run of identical lines", fix: "break the run with a contrasting line." },
    s_abstractEnding:  { label: "lines end on feeling-words", fix: "land one ending on a concrete thing — that's where the ear rests." },
    s_vocableLines:    { label: "vocable filler (oohs/las)", fix: "trade a filler line for a real image." },
    s_vocables:        { label: "vocable padding", fix: "cut a 'na-na/oh-oh' and put a specific detail there." },
    s_ingEmotionVerb:  { label: "-ing emotion verbs (burning/falling)", fix: "name the actual action instead of a generic -ing mood." },
    s_prepInTheNight:  { label: "'in the night/dark' phrasing", fix: "place it somewhere specific instead of a generic mood-setting." },
    s_temporalAbsolute:{ label: "forever / never / always", fix: "make one absolute a particular moment instead." },
    s_myHeart:         { label: "'my heart' phrasing", fix: "show the feeling through a detail rather than naming the heart." },
    s_iLineOpeners:    { label: "every line opens with 'I'", fix: "try a verse from another point of view." },
    s_firstPersonIOpener:{ label: "opens on 'I'", fix: "open on an image or another voice instead." },
    s_anaphora:        { label: "repeated line-openers", fix: "vary how lines begin to avoid a template feel." },
    s_everyEnum:       { label: "'every…' enumeration", fix: "replace the list with one telling instance." },
    t3_vagueEmotion:   { label: "vague emotional placeholders", fix: "swap 'broken/fading/endless' for a concrete observable." },
    t3_aiClicheList:   { label: "documented AI clichés", fix: "these phrases show up in every AI song — write your own." },
    t3_adjStack:       { label: "adjective stacks (shattered dreams)", fix: "break the adj+noun cliché with a specific noun." },
    t3_ingVerbAbstract:{ label: "-ing verb + abstract noun", fix: "ground the image — what literally happens, to what?" },
    t3_emoSimile:      { label: "flat emotional similes", fix: "make the comparison strange-but-true, not generic." },
    t3_emoHomogeneity: { label: "same mood every stanza", fix: "give one section a turn — a shift in temperature." },
    t3_inanimateAnimate:{ label: "everything personified", fix: "let one object just be an object; over-personifying reads AI." },
    t3_argumentMarkers:{ label: "argument markers (but/though/yet)", fix: "keep the turn, but make sure it earns a real reversal." },
    t3_inlineContradict:{ label: "inline contradiction", fix: "good instinct — make the two halves genuinely collide." },
    t3_metaObservation:{ label: "self-observation", fix: "ground the realization in a concrete moment." },
    t3_whenConditionals:{ label: "'when…' conditionals", fix: "tie the 'when' to one specific scene." },
    t3_specificReferent:{ label: "specific named referents", fix: "great — name a few more real things." },
    t3_numericReferent:{ label: "specific numbers/dates", fix: "great — numbers give the song a body." },
    f_concreteRatio:  { label: "concrete imagery", fix: "lean further into things you can see/touch." },
    f_abstractRatio:  { label: "abstract vocabulary", fix: "replace an abstract emotion word with something you can see or touch." },
    f_numeralDensity: { label: "numbers present", fix: "specific figures read human — keep them." },
    f_properNounDensity:{ label: "proper nouns / names", fix: "names anchor a song — keep naming real things." },
    f_hapaxRatio:     { label: "varied vocabulary", fix: "good — avoid padding it back out." },
    f_fnWordRatio:    { label: "natural function-word flow", fix: "keep the conversational grammar." },
    f_collectivePronoun:{ label: "'we' collective voice", fix: "make the 'we' specific to two real people." },
    f_avgLineLen:     { label: "line length", fix: "vary line lengths to avoid a metronome feel." },
    f_avgWordLen:     { label: "word length", fix: "mix plain and vivid words." },
    f_lineLenCV:      { label: "line-length variety", fix: "uneven line lengths read more human." },
    f_phrasePerLine:  { label: "stock phrases per line", fix: "swap a stock phrase for a private one." },
    f_rhymePerLine:   { label: "rhymes per line", fix: "leave a line or two unrhymed." },
    s_contentDensity: { label: "content density (padding)", fix: "compress — say more with fewer filler words." },
    s_endStoppedRatio:{ label: "end-stopped lines", fix: "let a thought spill across the line-break sometimes." },
    s_secondPersonDensity:{ label: "'you' address", fix: "make the 'you' a specific person." },
    s_collectiveWe:   { label: "'we' phrasing", fix: "give the 'we' a concrete shared moment." },
    s_youAndI:        { label: "'you and I' phrasing", fix: "this pairing is a stock romantic move — make it specific." },
    s_takeMe:         { label: "'take me…' phrasing", fix: "where, exactly? Name the place." },
    s_allINeed:       { label: "'all I need…' phrasing", fix: "a stock declaration — what's the specific thing?" },
    s_holdOnMe:       { label: "'hold on/hold me' phrasing", fix: "show the gesture with a real detail." },
    s_letItGo:        { label: "'let it/me go' phrasing", fix: "a stock release line — make it yours." },
    s_thisIs:         { label: "'this is…' declaration", fix: "show it instead of announcing it." },
    s_neverGonna:     { label: "'never gonna…' phrasing", fix: "a stock vow — ground it in a scene." },
    s_iFeelWantNeed:  { label: "'I feel/want/need' openers", fix: "show the feeling rather than naming it." },
    s_iWillVerb:      { label: "'I will/I'll' openers", fix: "vary your line openers." },
    s_causeOpener:    { label: "''cause/because' openers", fix: "vary how lines begin." },
    s_ohHeyOpener:    { label: "'oh/hey/baby' openers", fix: "open on an image, not an interjection." },
    s_exclaimInterjection:{ label: "interjection openers", fix: "trade an 'oh/yeah' for a concrete line." },
    s_rhetoricalQ:    { label: "rhetorical questions", fix: "answer one with a specific image." },
    s_tricolon:       { label: "'X, Y, and Z' lists", fix: "replace the list with one telling instance." },
    s_simileLikeA:    { label: "'like a…' similes", fix: "make the comparison strange-but-true." },
    s_antithesisNotBut:{ label: "'not X but Y' template", fix: "say it plain, in your own grammar." },
    s_negNegPos:      { label: "'no X, no Y, but Z' template", fix: "a common AI scaffold — loosen it." },
    s_repeatedWordInLine:{ label: "repeated word in a line", fix: "vary the repeat or cut it." },
    s_immediateWordDouble:{ label: "doubled words", fix: "trim the stutter unless it's intentional." },
    s_youLineOpeners: { label: "lines opening with 'you'", fix: "vary your line openers." },
    s_everyEnum:      { label: "'every…' enumeration", fix: "replace the list with one telling instance." },

    // ---- tier-4 craft-perspective signals (rapper/poet/wit/psych/phil/story) ----
    // human-leaning (show up in "keep this"):
    t4_rap_internalRhyme:{ label: "internal rhyme", fix: "keep threading rhymes inside the line (e.g. “the bent nail / pay the bail”), not only at line-ends." },
    t4_rap_assonance:    { label: "vowel music (assonance)", fix: "keep the repeated vowel sounds — they make the line sing." },
    t4_rap_rhymeDensity: { label: "dense rhyming", fix: "keep packing the rhymes; sparse end-rhyme reads more machine-made." },
    t4_rap_multisyll:    { label: "multisyllabic rhyme", fix: "keep the two-word/compound rhymes — they're a human flex." },
    t4_poet_alliteration:{ label: "alliteration", fix: "nice sound-play (“cold coffee”, “feed store”) — keep it." },
    t4_wit_wordLength:   { label: "rich vocabulary", fix: "keep reaching for the precise, less-common word." },
    t4_wit_allusion:     { label: "real-world references", fix: "keep naming real people/places/brands — it's a strong human tell." },
    t4_wit_domainFusion: { label: "ideas across domains", fix: "keep colliding worlds (Queen's “two hundred degrees… Mr Fahrenheit”)." },
    t4_psy_directAddress:{ label: "talks to the listener", fix: "keep speaking to a real someone — it pulls the listener in." },
    t4_psy_interiority:  { label: "a real interior life", fix: "keep showing what the narrator thinks/realizes, not just feels." },
    t4_psy_emoGranularity:{ label: "specific feelings", fix: "keep naming exact emotions (ashamed, relieved) over “broken/lost”." },
    t4_phil_rhetoricalQ: { label: "questions to the listener", fix: "keep asking — questions invite the listener to answer." },
    t4_phil_causal:      { label: "cause-and-effect reasoning", fix: "keep the because/so logic — it builds one thought." },
    t4_phil_bareUniversal:{ label: "bold sweeping claims", fix: "keep the big claim — anchor one in a single real instance." },
    t4_story_namedEntities:{ label: "named people/places", fix: "keep naming real things — names give the song a body." },
    // AI-leaning (show up in "work on"):
    t4_poet_senseDiversity:{ label: "over-stuffed sensory imagery", fix: "you're piling on senses — cut to the one image that earns its place." },
    t4_poet_concreteRatio:{ label: "wall-to-wall imagery", fix: "let one plain, direct line breathe between the images." },
    t4_poet_imageDensity:{ label: "image overload", fix: "fewer, truer images beat many pretty ones." },
    t4_poet_stockImagery:{ label: "stock images (shadows/embers/neon)", fix: "swap a stock image for one only this song would use." },
    t4_story_setting:    { label: "generic settings (street/room/night)", fix: "name the specific place (a Texaco on Route 9), not a generic one." },
    t4_story_objects:    { label: "generic objects", fix: "make the object specific — whose, which one, what brand." },
    t4_rap_schemeEntropy:{ label: "scattered rhyme scheme", fix: "let a rhyme sound recur so the ear has something to latch onto." }
  };
  function infoFor(name) {
    if (FEATURE_INFO[name]) return FEATURE_INFO[name];
    var label = name.replace(/^f_|^s_|^t3_|^lex_/, "").replace(/([A-Z])/g, " $1").toLowerCase();
    return { label: label, fix: "consider easing this — the model reads it as AI-leaning." };
  }

  // quote the offending line/word for a given dense feature
  function quoteFor(name, text, model) {
    switch (name) {
      case "lex_cliche":
      case "f_clicheDensity": { var p = firstClichePhrase(text); return p ? '"' + p + '"' : ""; }
      case "t3_aiClicheList": { var l = lineContaining(text, ["echoes","whispers","shattered","fading","endless","broken dreams","silent","embers"]); return l ? '"' + clip(l) + '"' : ""; }
      case "lex_rhyme":
      case "f_perfectRhymeRatio":
      case "f_endRhymeRate": { var rp = firstRhymePair(text); return rp ? '"' + rp.a + " / " + rp.b + '"' : ""; }
      case "s_hookMaxRepeat":
      case "s_titleDropRepeat":
      case "s_consecDupLines":
      case "s_maxConsecDup":
      case "f_repetition": { var tr = topRepeatedLine(text); return tr.count > 1 ? '"' + clip(tr.line) + '" ×' + tr.count : ""; }
      case "s_abstractEnding": { var ew = abstractEndWords(text); return ew ? "ends on: " + ew : ""; }
      case "s_vocableLines":
      case "s_vocables": { var vl = firstVocableLine(text); return vl ? '"' + clip(vl.line) + '"' : ""; }
      case "t3_vagueEmotion":
      case "f_abstractRatio": { var al = lineContaining(text, ["broken","fading","endless","forgotten","distant","silent","whisper","shadow","ember"]); return al ? '"' + clip(al) + '"' : ""; }
      case "t3_adjStack": { var as = lineContaining(text, ["shattered dreams","broken heart","endless night","fading light","silent tears","whispered words"]); return as ? '"' + clip(as) + '"' : ""; }
      case "s_ingEmotionVerb":
      case "t3_ingVerbAbstract": { var il = lineMatching(text, /\b(burning|falling|rising|crying|dying|breaking|fading|shining|aching|bleeding|drowning)\b/i); return il ? '"' + clip(il) + '"' : ""; }
      case "s_prepInTheNight": { var pn = lineMatching(text, /\bin the (dark|night|rain|cold|morning|silence|shadows)\b/i); return pn ? '"' + clip(pn) + '"' : ""; }
      case "s_temporalAbsolute": { var ta = lineMatching(text, /\b(tonight|forever|never|always|evermore|eternity)\b/i); return ta ? '"' + clip(ta) + '"' : ""; }
      case "s_myHeart": { var mh = lineContaining(text, ["my heart"]); return mh ? '"' + clip(mh) + '"' : ""; }
      case "s_iLineOpeners":
      case "s_firstPersonIOpener": { var io = lineMatching(text, /^i\b/i); return io ? '"' + clip(io) + '"' : ""; }
      // tier-4 AI-leaning
      case "t4_poet_stockImagery": { var sp = firstClichePhrase(text); var sl = sp ? "" : lineContaining(text, ["shadow","ember","neon","crimson","velvet","silhouette","stardust"]); return sp ? '"' + sp + '"' : (sl ? '"' + clip(sl) + '"' : ""); }
      case "t4_poet_senseDiversity":
      case "t4_poet_concreteRatio":
      case "t4_poet_imageDensity": { var pl = lineContaining(text, ["shadow","light","fire","rain","sky","glow","cold","whisper","gold"]); return pl ? '"' + clip(pl) + '"' : ""; }
      case "t4_story_setting": { var st = lineMatching(text, /\b(street|streets|room|night|sky|road|city|rain|shadows?)\b/i); return st ? '"' + clip(st) + '"' : ""; }
      case "t4_story_objects": { var ob = lineMatching(text, /\b(bottle|glass|cigarette|fire|flame|chains?|wings?)\b/i); return ob ? '"' + clip(ob) + '"' : ""; }
      case "t4_rap_schemeEntropy": { var rp2 = firstRhymePair(text); return rp2 ? '"' + rp2.a + " / " + rp2.b + '"' : ""; }
      default: return "";
    }
  }
  // a "keep this" quote for human-leaning features
  function keepQuoteFor(name, text) {
    switch (name) {
      case "t3_specificReferent": { var sr = lineMatching(text, /\b[A-Z][a-z]{2,14}\b.*\b[A-Z][a-z]{2,14}\b/); return sr ? '"' + clip(sr) + '"' : lineMatching(text, /\b[A-Z][a-z]{2,14}\b/) ? '"' + clip(lineMatching(text, /\b[A-Z][a-z]{2,14}\b/)) + '"' : ""; }
      case "t3_numericReferent":
      case "f_numeralDensity": { var nr = lineMatching(text, /\b(\d{1,4}|nineteen|twenty|thirty)\b/i); return nr ? '"' + clip(nr) + '"' : ""; }
      case "t3_argumentMarkers":
      case "t3_inlineContradict": { var am = lineMatching(text, /\b(but|though|although|yet|still|however|instead|even though|despite)\b/i); return am ? '"' + clip(am) + '"' : ""; }
      case "t3_metaObservation": { var mo = lineMatching(text, /\b(i thought|i realized|i noticed|i used to|i can'?t|i won'?t|i refuse)\b/i); return mo ? '"' + clip(mo) + '"' : ""; }
      case "t3_whenConditionals": { var wc = lineMatching(text, /\bwhen\s+\w+/i); return wc ? '"' + clip(wc) + '"' : ""; }
      case "f_concreteRatio": { var cr = lineMatching(text, /\b(hands|table|door|window|street|coffee|jacket|train|car|road|kitchen|phone)\b/i); return cr ? '"' + clip(cr) + '"' : ""; }
      case "f_hapaxRatio":
      case "s_contentDensity": return "varied, non-padded vocabulary";
      case "f_properNounDensity": { var pn2 = lineMatching(text, /\b[A-Z][a-z]{2,14}\b/); return pn2 ? '"' + clip(pn2) + '"' : ""; }
      // tier-4 human-leaning
      case "t4_story_namedEntities":
      case "t4_wit_allusion": { var ne = lineMatching(text, /(^|\s)[A-Z][a-z]{2,14}\b/); return ne ? '"' + clip(ne) + '"' : ""; }
      case "t4_psy_directAddress": { var da = lineMatching(text, /\byou\b/i) || lineMatching(text, /\?/); return da ? '"' + clip(da) + '"' : ""; }
      case "t4_phil_rhetoricalQ": { var rq = lineMatching(text, /\?/); return rq ? '"' + clip(rq) + '"' : ""; }
      case "t4_phil_causal": { var ca = lineMatching(text, /\b(because|so|'?cause|that'?s why)\b/i); return ca ? '"' + clip(ca) + '"' : ""; }
      case "t4_psy_emoGranularity": { var eg = lineMatching(text, /\b(ashamed|jealous|relieved|embarrassed|proud|lonely|grateful|guilty|nostalgic|bitter)\b/i); return eg ? '"' + clip(eg) + '"' : ""; }
      case "t4_wit_wordLength": return "precise, less-common word choices";
      case "t4_rap_internalRhyme":
      case "t4_rap_assonance":
      case "t4_rap_multisyll":
      case "t4_poet_alliteration": return "sound-play in the lines";
      default: return "";
    }
  }

  // ---------- bad / good lists from contributions ----------
  function buildBad(scoreResult, text, model) {
    var out = [];
    var c = scoreResult.contributions;
    for (var i = 0; i < c.length && out.length < 5; i++) {
      var d = c[i];
      if (d.kind !== "dense") continue;
      if (d.weight <= 0) continue;       // AI-leaning weight
      if (d.contrib <= 0) continue;      // actually present / pushing toward AI
      var info = infoFor(d.name);
      out.push({
        feature: d.name,
        label: info.label,
        quote: quoteFor(d.name, text, model),
        fix: info.fix,
        weight: +d.weight.toFixed(3),
        contrib: +d.contrib.toFixed(4)
      });
    }
    return out;
  }
  function buildGood(scoreResult, text, model) {
    // strongest human-leaning (negative weight) features that are PRESENT.
    // "present" = the contribution is negative (raw value above the corpus mean
    // on a human-leaning feature pushes the score down).
    var arr = [];
    var c = scoreResult.contributions;
    for (var i = 0; i < c.length; i++) {
      var d = c[i];
      if (d.kind !== "dense") continue;
      if (d.weight >= 0) continue;
      if (d.contrib >= 0) continue;      // contributing toward human
      if (d.value === 0) continue;       // not actually present in this song
      arr.push(d);
    }
    arr.sort(function (x, y) { return x.contrib - y.contrib; }); // most negative first
    var out = [];
    for (var k = 0; k < arr.length && out.length < 5; k++) {
      var dd = arr[k];
      var info = infoFor(dd.name);
      out.push({
        feature: dd.name,
        label: info.label,
        quote: keepQuoteFor(dd.name, text),
        weight: +dd.weight.toFixed(3),
        contrib: +dd.contrib.toFixed(4)
      });
    }
    return out;
  }

  // ---------- joker: 12-move library ----------
  // zscore of a dense feature value vs the AI-corpus mean (from model.aiDenseMean).
  function aiZscore(model, name, value) {
    if (!model.aiDenseMean) return 0;
    var j = model.denseNames.indexOf(name);
    if (j < 0) return 0;
    var sd = (model.aiDenseStd && model.aiDenseStd[j]) || 1;
    return (value - model.aiDenseMean[j]) / (sd || 1);
  }
  function denseWeight(model, name) {
    var j = model.denseNames.indexOf(name);
    return j >= 0 ? model.wDense[j] : 0;
  }
  function denseVal(scoreResult, name) {
    var j = scoreResult.denseNames.indexOf(name);
    return j >= 0 ? scoreResult.dense[j] : 0;
  }

  function buildJoker(scoreResult, text, model) {
    var moves = [];

    // Move 1 — swap an overused image (top +weight BoW word present)
    (function () {
      var w = topAiWordPresent(text, model);
      if (!w) return;
      var idx = model.vocab.indexOf(w);
      var wt = idx >= 0 ? model.wBow[idx] : 0;
      // z proxy: tf of the word weighted by model BoW weight; score by |weight| only
      moves.push({ move: 1, score: Math.abs(wt) * 1.0, text:
        "Swap “" + w + "” for something only your narrator would notice right then — a brand, a smell, one small specific thing." });
    })();

    // Move 2 — concretize the vaguest line (low properNoun + low contentDensity)
    (function () {
      var pnZ = aiZscore(model, "f_properNounDensity", denseVal(scoreResult, "f_properNounDensity"));
      var cdZ = aiZscore(model, "s_contentDensity", denseVal(scoreResult, "s_contentDensity"));
      // lower than AI mean = more negative z; abstractness signal = -(pnZ+cdZ)
      var sig = Math.max(0, -(pnZ + cdZ) / 2);
      var line = abstractLine(text); if (!line) return;
      var w = Math.abs(denseWeight(model, "f_abstractRatio")) || 0.5;
      moves.push({ move: 2, score: sig * w, text:
        "“" + clip(line) + "” tells the feeling — show it: one thing we could see or touch (a jacket on the hook, the cold coffee)." });
    })();

    // Move 3 — break a too-perfect rhyme
    (function () {
      var rp = firstRhymePair(text); if (!rp) return;
      var v = denseVal(scoreResult, "f_perfectRhymeRatio");
      var z = aiZscore(model, "f_perfectRhymeRatio", v);
      var w = Math.abs(denseWeight(model, "f_perfectRhymeRatio")) || Math.abs(denseWeight(model, "lex_rhyme")) || 0.5;
      moves.push({ move: 3, score: (1 + Math.max(0, z)) * w, text:
        "Every rhyme lands exactly — let “" + rp.a + " / " + rp.b + "” be a near-miss; it'll sound human, not machine-perfect." });
    })();

    // Move 4 — shift point of view (all I, no you)
    (function () {
      var iV = denseVal(scoreResult, "s_iLineOpeners");
      var youV = denseVal(scoreResult, "s_secondPersonDensity");
      var z = aiZscore(model, "s_iLineOpeners", iV);
      if (iV <= 0) return;
      var w = Math.abs(denseWeight(model, "s_iLineOpeners")) || 0.4;
      var sig = Math.max(0, z) * (youV < 0.1 ? 1.3 : 1.0);
      moves.push({ move: 4, score: sig * w, text:
        "Almost every line is “I” — try the last verse from the other person's side, or pull back and watch yourself from across the room." });
    })();

    // Move 5 — vary the verbatim hook
    (function () {
      var tr = topRepeatedLine(text); if (tr.count < 3) return;
      var v = denseVal(scoreResult, "s_hookMaxRepeat");
      var z = aiZscore(model, "s_hookMaxRepeat", v);
      var w = Math.abs(denseWeight(model, "s_hookMaxRepeat")) || 0.4;
      moves.push({ move: 5, score: (1 + Math.max(0, z)) * w, text:
        "Your hook “" + clip(tr.line, 40) + "” repeats word-for-word ×" + tr.count + " — change one word the final time so it lands harder." });
    })();

    // Move 6 — cut the vocable padding
    (function () {
      var vl = firstVocableLine(text); if (!vl) return;
      var v = denseVal(scoreResult, "s_vocableLines");
      var z = aiZscore(model, "s_vocableLines", v);
      var w = Math.abs(denseWeight(model, "s_vocableLines")) || Math.abs(denseWeight(model, "s_vocables")) || 0.3;
      moves.push({ move: 6, score: (1 + Math.max(0, z)) * w, text:
        "Lines like “" + clip(vl.line, 40) + "” are mostly “" + vl.token + "” filler — trade one for a real image." });
    })();

    // Move 7 — add a real anchor (no proper nouns AND no numbers)
    (function () {
      var pn = denseVal(scoreResult, "f_properNounDensity");
      var nd = denseVal(scoreResult, "f_numeralDensity");
      if (pn > 0.001 || nd > 0.001) return;
      var w = Math.abs(denseWeight(model, "f_properNounDensity")) || Math.abs(denseWeight(model, "t3_specificReferent")) || 0.5;
      moves.push({ move: 7, score: 1.2 * w, text:
        "Nothing here is named — drop in one anchor (a street, a year, a time of day) and the whole song gets a body." });
    })();

    // Move 8 — land an ending on a thing (high abstractEnding)
    (function () {
      var ew = abstractEndWords(text); if (!ew) return;
      var v = denseVal(scoreResult, "s_abstractEnding");
      var z = aiZscore(model, "s_abstractEnding", v);
      var w = Math.abs(denseWeight(model, "s_abstractEnding")) || 0.3;
      moves.push({ move: 8, score: (1 + Math.max(0, z)) * w, text:
        "Most lines end on a feeling-word (" + ew + ") — land one on a thing instead; endings are where the ear rests." });
    })();

    // Move 9 — give it a turn / volta (flat + repetitive + no antithesis)
    (function () {
      var cvV = denseVal(scoreResult, "f_lineLenCV");
      var rep = denseVal(scoreResult, "f_repetition");
      var anti = denseVal(scoreResult, "s_antithesisNotBut");
      if (anti > 0) return;
      var sig = Math.max(0, aiZscore(model, "f_repetition", rep));
      var w = Math.abs(denseWeight(model, "f_repetition")) || 0.4;
      var theme = firstClichePhrase(text) || "the thing the song is about";
      moves.push({ move: 9, score: sig * w * 0.9, text:
        "It stays on one emotional note — give the bridge a turn: the moment the narrator realizes they were wrong about “" + theme + "”." });
    })();

    // Move 10 — trade a cliché for a private line
    (function () {
      var ph = firstClichePhrase(text); if (!ph) return;
      var v = denseVal(scoreResult, "lex_cliche");
      var z = aiZscore(model, "lex_cliche", v);
      var w = Math.abs(denseWeight(model, "lex_cliche")) || Math.abs(denseWeight(model, "f_clicheDensity")) || 0.5;
      moves.push({ move: 10, score: (1 + Math.max(0, z)) * w, text:
        "“" + ph + "” is everyone's line — what's yours? Replace it with the one detail only your narrator would say." });
    })();

    // Move 11 — loosen template syntax (negNegPos / antithesis present)
    (function () {
      var tp = templatePhrase(text); if (!tp) return;
      var v = denseVal(scoreResult, "s_negNegPos") + denseVal(scoreResult, "s_antithesisNotBut");
      var w = Math.abs(denseWeight(model, "s_negNegPos")) || Math.abs(denseWeight(model, "s_antithesisNotBut")) || 0.3;
      moves.push({ move: 11, score: (0.8 + v) * w, text:
        "The “" + clip(tp, 40) + "” construction is a common AI scaffold — say it plain, in your own grammar." });
    })();

    // Move 13 — perspective-lens move: the weakest craft lens supplies a dynamic, example-rich tip.
    (function () {
      if (!G.SlopPerspectives) return;
      var pr; try { pr = G.SlopPerspectives.analyze(text); } catch (e) { return; }
      var bestName = "", bestScore = 0;
      for (var n in pr.perspectives) {
        var s = pr.perspectives[n] && pr.perspectives[n].score;
        if (typeof s === "number" && s > bestScore) { bestScore = s; bestName = n; }
      }
      if (!bestName || bestScore <= 0.52) return;     // only when a lens flags something
      var rep = pr.perspectives[bestName].report || "";
      var parts = rep.split(/\.\s+/);                  // last sentence = the actionable tip
      var tip = (parts[parts.length - 1] || "").replace(/\.$/, "").trim();
      if (tip.length < 8) return;
      tip = tip.charAt(0).toUpperCase() + tip.slice(1);
      moves.push({ move: 13, score: (bestScore - 0.5) * 1.4, text: tip + "." });
    })();

    moves.sort(function (a, b) { return b.score - a.score; });

    var THRESHOLD = 0.02;  // small floor; below it, the track is clean -> Move 12
    if (moves.length && moves[0].score > THRESHOLD) {
      var m = moves[0];
      return { move: m.move, emoji: "🃏", score: +m.score.toFixed(4), text: m.text };
    }
    // Move 12 — pure experiment fallback
    return { move: 12, emoji: "🃏", score: 0, text:
      "Craft's already tight — for fun, run the whole thing from an unexpected narrator (the room, the phone, the dog) and see what it reveals." };
  }

  function build(text, scoreResult) {
    var model = G.SLOP_MODEL;
    if (!model) throw new Error("SLOP_MODEL not loaded");
    if (!scoreResult) scoreResult = G.SlopV2.score(text);
    return {
      good:  buildGood(scoreResult, text, model),
      joker: buildJoker(scoreResult, text, model),
      bad:   buildBad(scoreResult, text, model)
    };
  }

  var api = { build: build };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  G.SlopPanel = api;
})();
