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
  // Each entry: a plain-English label + a "fix" that says WHAT it means, WHAT to do, and a clean
  // EXAMPLE. Examples must be ordinary, specific things — never AI-cliché words (no neon/shadow/
  // ember/coffee as a "good" example; those only ever appear as the thing to REMOVE).
  var FEATURE_INFO = {
    // ===== AI-leaning signals (these show up under "Work on") =====
    f_clicheDensity:   { label: "leans on clichés", fix: "Too many stock phrases everyone uses. Swap one for a detail only you'd write — e.g. 'the 6:15 bus' instead of 'the night'." },
    lex_cliche:        { label: "stock clichés", fix: "Some lines are common song-clichés. Trade the most generic line for one that's specific to your story." },
    lex_rhyme:         { label: "rhymes are too predictable", fix: "The rhymes are easy ones. Make one an almost-rhyme (like 'around / down') so it sounds less automatic." },
    f_perfectRhymeRatio:{ label: "every rhyme is perfect", fix: "All-perfect rhyme sounds machine-made. Let one be an almost-rhyme, e.g. 'gone / home'." },
    f_endRhymeRate:    { label: "every line rhymes", fix: "When every line rhymes it feels mechanical. Leave one line unrhymed — the gap adds tension." },
    f_repetition:      { label: "repeats lines word-for-word", fix: "You repeat a line exactly. Change one word the last time, or cut a copy." },
    f_abstractRatio:   { label: "names feelings instead of showing them", fix: "Words like 'pain' or 'hope' tell the feeling. Show it with something you can see/hear — e.g. a slammed screen door." },
    f_positivityBias:  { label: "every line is sweet", fix: "The mood never shifts. Let one line complicate it — a doubt, a flaw, a small ugly truth." },
    f_commonWordRatio: { label: "words are very generic", fix: "Mostly common words. Drop in one concrete thing — a place name, a time, a number (e.g. 'aisle 5')." },
    s_hookMaxRepeat:   { label: "the hook repeats unchanged", fix: "Your hook repeats word-for-word. Change one word the final time so it lands harder." },
    s_titleDropRepeat: { label: "the title repeats a lot", fix: "Don't just say the title again — put it in a new situation each time so it earns the repeat." },
    s_consecDupLines:  { label: "two identical lines in a row", fix: "Back-to-back identical lines feel padded. Cut one, or change a word in the second." },
    s_maxConsecDup:    { label: "a run of identical lines", fix: "Several copies of the same line in a row. Break the run with one contrasting line." },
    s_abstractEnding:  { label: "lines end on feeling-words", fix: "Endings are where the ear rests — land one on a real object (a porch step, a name tag) instead of a feeling." },
    s_vocableLines:    { label: "filler-sound lines (na-na / oh-oh)", fix: "A whole line is filler sounds. Put a real image there instead." },
    s_vocables:        { label: "filler sounds padding it", fix: "Cut a 'na-na / oh-oh' and use the space for one specific detail." },
    s_ingEmotionVerb:  { label: "vague '-ing' moods (burning, falling)", fix: "These are generic moods. Say what literally happens, and to what — e.g. 'the brakes lock' not 'falling'." },
    s_prepInTheNight:  { label: "'in the night / in the dark'", fix: "That's a generic mood-setter. Put it in a specific place — e.g. 'in the parking lot'." },
    s_temporalAbsolute:{ label: "'forever / never / always'", fix: "These are big and vague. Pin one to a specific moment — e.g. 'until the 9 o'clock news'." },
    s_myHeart:         { label: "'my heart' phrasing", fix: "Naming the heart tells the feeling. Show it instead — shaking hands, a held breath." },
    s_iLineOpeners:    { label: "almost every line starts with 'I'", fix: "All-'I' gets samey. Try one verse from another person's view, or open a line on an image." },
    s_firstPersonIOpener:{ label: "opens on 'I'", fix: "Try opening on an image or another voice instead of 'I'." },
    s_anaphora:        { label: "many lines start the same way", fix: "Repeated openers feel templated. Vary how lines begin." },
    s_everyEnum:       { label: "'every…' list", fix: "A list of 'every…' feels generic. Replace it with one telling example." },
    t3_vagueEmotion:   { label: "vague placeholder feelings", fix: "Words like 'broken / fading / endless' are placeholders. Swap one for something you can actually see." },
    t3_aiClicheList:   { label: "phrases found in most AI songs", fix: "These exact phrases show up everywhere AI writes. Write your own version of the line." },
    t3_adjStack:       { label: "'adjective + noun' clichés (shattered dreams)", fix: "Replace the stock pair with a plain, specific noun — e.g. 'the unpaid rent'." },
    t3_ingVerbAbstract:{ label: "'-ing' verb + vague noun", fix: "Ground it: what literally happens, to what real thing?" },
    t3_emoSimile:      { label: "flat 'like a…' comparisons", fix: "Make the comparison surprising but true, not a generic one." },
    t3_emoHomogeneity: { label: "same mood the whole way", fix: "Every section feels the same. Give one part a turn — a shift in tone or stakes." },
    t3_inanimateAnimate:{ label: "everything is personified", fix: "When the city sighs and the walls cry, it reads AI. Let one thing just be itself." },
    t3_argumentMarkers:{ label: "uses but / though / yet", fix: "Good instinct to turn — just make sure the 'but' leads to a real reversal." },
    t3_inlineContradict:{ label: "holds a contradiction", fix: "Good — make the two halves genuinely clash, not just sound opposite." },
    t3_metaObservation:{ label: "narrator notices themselves", fix: "Good — tie the realization to one concrete moment so it lands." },
    t3_whenConditionals:{ label: "'when…' set-ups", fix: "Tie the 'when' to one specific scene rather than a general mood." },
    t3_specificReferent:{ label: "names real things", fix: "Great — naming real people/places reads human. Add a couple more." },
    t3_numericReferent:{ label: "specific numbers / dates", fix: "Great — numbers give a song a body. Keep them." },
    f_concreteRatio:  { label: "things you can see/touch", fix: "Great — concrete images read human. Keep leaning that way." },
    f_numeralDensity: { label: "uses numbers", fix: "Great — specific figures read human. Keep them." },
    f_properNounDensity:{ label: "uses names", fix: "Great — names anchor a song. Keep naming real things." },
    f_hapaxRatio:     { label: "varied word choice", fix: "Great — you avoid repeating the same words. Keep it varied." },
    f_fnWordRatio:    { label: "natural, spoken grammar", fix: "Great — it reads like real speech. Keep the conversational flow." },
    f_collectivePronoun:{ label: "'we' as a vague group", fix: "Make the 'we' two real people in a real moment, not a generic crowd." },
    f_avgLineLen:     { label: "line length", fix: "Vary line lengths so it doesn't tick like a metronome." },
    f_avgWordLen:     { label: "word length", fix: "Mix plain short words with a few sharp, vivid ones." },
    f_lineLenCV:      { label: "lines are all the same length", fix: "Even line lengths read mechanical. Let some lines run long and some stay short." },
    f_phrasePerLine:  { label: "stock phrases per line", fix: "Swap a stock phrase for one that's specific to you." },
    f_rhymePerLine:   { label: "rhymes per line", fix: "If most lines rhyme, leave one or two unrhymed for breathing room." },
    s_contentDensity: { label: "padded with filler words", fix: "Lots of filler. Say more with fewer words — cut what isn't pulling weight." },
    s_endStoppedRatio:{ label: "every line stops cleanly", fix: "Let one thought run past the line-break instead of stopping at every end." },
    s_secondPersonDensity:{ label: "addresses 'you'", fix: "Good — make the 'you' one specific person, not anyone." },
    s_collectiveWe:   { label: "'we' phrasing", fix: "Give the 'we' a concrete shared moment so it means something." },
    s_youAndI:        { label: "'you and I' phrasing", fix: "A stock romantic pairing. Make it specific — who, where, when." },
    s_takeMe:         { label: "'take me…' phrasing", fix: "Take you where, exactly? Name the place." },
    s_allINeed:       { label: "'all I need…' phrasing", fix: "A stock declaration. What's the one specific thing?" },
    s_holdOnMe:       { label: "'hold on / hold me' phrasing", fix: "Show the gesture with a real detail instead of saying it." },
    s_letItGo:        { label: "'let it / me go' phrasing", fix: "A stock release line. Make it yours with a concrete image." },
    s_thisIs:         { label: "'this is…' announcement", fix: "Show it instead of announcing it." },
    s_neverGonna:     { label: "'never gonna…' vow", fix: "A stock vow. Ground it in a real scene." },
    s_iFeelWantNeed:  { label: "'I feel / want / need' openers", fix: "Show the feeling through an action rather than naming it." },
    s_iWillVerb:      { label: "'I will / I'll' openers", fix: "Vary your line openers so they don't all start the same." },
    s_causeOpener:    { label: "''cause / because' openers", fix: "Vary how lines begin." },
    s_ohHeyOpener:    { label: "'oh / hey / baby' openers", fix: "Open on an image, not an interjection." },
    s_exclaimInterjection:{ label: "interjection openers", fix: "Trade an 'oh / yeah' for a concrete line." },
    s_rhetoricalQ:    { label: "rhetorical questions", fix: "Good — try answering one with a specific image." },
    s_tricolon:       { label: "'X, Y, and Z' lists", fix: "Replace the three-item list with one telling example." },
    s_simileLikeA:    { label: "'like a…' similes", fix: "Make the comparison surprising but true." },
    s_antithesisNotBut:{ label: "'not X but Y' template", fix: "A common scaffold. Say it plain, in your own grammar." },
    s_negNegPos:      { label: "'no X, no Y, but Z' template", fix: "A common AI scaffold. Loosen it into your own phrasing." },
    s_repeatedWordInLine:{ label: "a word repeats in one line", fix: "Vary the repeat or cut it, unless the echo is intentional." },
    s_immediateWordDouble:{ label: "doubled words (this this)", fix: "Trim the stutter unless you mean it." },
    s_youLineOpeners: { label: "many lines start with 'you'", fix: "Vary your line openers." },

    // ===== tier-4 craft-lens signals =====
    // Human-leaning (show up under "Keep this") — short affirmations, no AI-word examples:
    t4_rap_internalRhyme:{ label: "rhymes inside the line", fix: "Great — you rhyme mid-line, not just at line-ends (like 'the bent nail / pay the bail'). Keep it." },
    t4_rap_assonance:    { label: "repeated vowel sounds", fix: "Great — the matching vowel sounds make the lines sing. Keep it." },
    t4_rap_rhymeDensity: { label: "packs in the rhymes", fix: "Great — dense rhyming reads human (sparse end-rhyme feels machine-made). Keep it." },
    t4_rap_multisyll:    { label: "multi-syllable rhymes", fix: "Great — two-word / compound rhymes are a real human flex. Keep it." },
    t4_poet_alliteration:{ label: "sound-play (repeated first letters)", fix: "Great — repeated opening sounds (like 'screen door swings') add music. Keep it." },
    t4_wit_wordLength:   { label: "reaches for precise words", fix: "Great — you pick exact, less-common words. Keep it." },
    t4_wit_allusion:     { label: "names real people / places / brands", fix: "Great — real-world references read strongly human. Keep it." },
    t4_wit_domainFusion: { label: "mixes worlds in one image", fix: "Great — describing one thing in another's terms (a feeling in money- or weather-words) is clever. Keep it." },
    t4_psy_directAddress:{ label: "talks to a real listener", fix: "Great — speaking to someone specific pulls the listener in. Keep it." },
    t4_psy_interiority:  { label: "shows a thinking mind", fix: "Great — you show what the narrator thinks and realizes, not just feels. Keep it." },
    t4_psy_emoGranularity:{ label: "names exact feelings", fix: "Great — specific emotions (ashamed, relieved) beat placeholders like 'broken / lost'. Keep it." },
    t4_phil_rhetoricalQ: { label: "asks the listener", fix: "Great — questions invite the listener in. Keep it." },
    t4_phil_causal:      { label: "cause-and-effect logic", fix: "Great — your because/so logic builds one clear thought. Keep it." },
    t4_phil_bareUniversal:{ label: "a bold, sweeping line", fix: "Nice big claim — keep it, and anchor it in one real moment." },
    t4_story_namedEntities:{ label: "named people / places", fix: "Great — names give the song a body and place. Keep it." },
    // AI-leaning (show up under "Work on"):
    t4_poet_senseDiversity:{ label: "too many senses at once", fix: "You pile on sights, sounds, textures. Cut to the one image that matters most." },
    t4_poet_concreteRatio:{ label: "wall-to-wall imagery", fix: "Every line is a picture. Let one plain, direct line breathe between them." },
    t4_poet_imageDensity:{ label: "image overload", fix: "Fewer, truer images beat many pretty ones — trim one." },
    t4_poet_stockImagery:{ label: "stock images (shadows / embers / neon)", fix: "These show up in most AI songs. Swap one for an image only this song would use." },
    t4_story_setting:    { label: "generic setting (a street, a room)", fix: "Name the real place instead — e.g. 'a Texaco off Route 9'." },
    t4_story_objects:    { label: "generic objects", fix: "Make it specific — whose, which one (e.g. 'your mom's blue Corolla')." },
    t4_rap_schemeEntropy:{ label: "rhyme sounds rarely repeat", fix: "The ear can't latch on. Let a rhyme sound come back instead of a new one each line." },
    // prominent AI-leaning features that previously hit the generic fallback:
    s_dupLinesTotal:    { label: "lots of repeated lines", fix: "Many lines repeat across the song. Cut some copies, or change a word so each return earns its place." },
    t4_phil_sequentialFlow:{ label: "lines don't lead into each other", fix: "The lines feel like a list. Link two with a 'but / so / because' so the verse builds one thought." },
    t4_phil_connectives:{ label: "few connecting words", fix: "Add a 'but / so / because' so ideas connect instead of stacking." },
    t4_story_action:    { label: "little actually happens", fix: "It's mostly states of being. Let something happen — an action, a moment that turns." },
    t4_story_temporalSeq:{ label: "no sense of time passing", fix: "Add a 'then / later / that night' so the song moves through time, not just mood." },
    t4_story_dialogue:  { label: "no one speaks", fix: "Add a line of what someone actually said — quoted speech reads human." },
    t4_poet_volta:      { label: "no turn", fix: "The song stays on one note. Give it a turn — a moment the narrator sees it differently." },
    t4_poet_figurative: { label: "few fresh comparisons", fix: "Try one surprising-but-true comparison instead of stating the feeling." },
    t4_poet_ungrounded: { label: "abstract lines with no anchor", fix: "Some lines float free of anything real. Pin one to a concrete thing you could photograph." },
    t4_psy_ambivalence: { label: "feelings are one-note", fix: "Real people feel two things at once. Let one line hold a mixed feeling." },
    t4_wit_blendRate:   { label: "stays in one idea per line", fix: "Try a line that collides two worlds — describe a feeling in money-, weather-, or science-words." },
    t4_wit_domainPeak:  { label: "ideas stay in one lane", fix: "Mix in a surprising frame — e.g. describe heartbreak like a weather report." }
  };
  // Intended polarity: which features are genuine HUMAN strengths (only these may appear under
  // "Keep this"; everything else is an AI-tell and may only appear under "Work on"). This keeps the
  // two lists coherent even when the model's learned weight-sign for a feature disagrees with craft
  // intuition (otherwise an AI-tell like "vague -ing moods" could show up as a "keep this").
  var HUMAN_DIR = {};
  ("t4_rap_internalRhyme t4_rap_assonance t4_rap_rhymeDensity t4_rap_multisyll t4_poet_alliteration "
   + "t4_wit_wordLength t4_wit_allusion t4_wit_domainFusion t4_psy_directAddress t4_psy_interiority "
   + "t4_psy_emoGranularity t4_phil_rhetoricalQ t4_phil_causal t4_phil_bareUniversal t4_story_namedEntities "
   + "t3_specificReferent t3_numericReferent t3_argumentMarkers t3_inlineContradict t3_metaObservation "
   + "f_concreteRatio f_numeralDensity f_properNounDensity f_hapaxRatio f_fnWordRatio s_secondPersonDensity"
  ).split(/\s+/).forEach(function (n) { HUMAN_DIR[n] = 1; });

  function infoFor(name) {
    if (FEATURE_INFO[name]) return FEATURE_INFO[name];
    var label = name.replace(/^(f_|s_|t3_|t4_(rap|poet|wit|psy|phil|story)_|lex_)/, "")
                    .replace(/([A-Z])/g, " $1").toLowerCase().trim();
    return { label: label, fix: "The model reads this pattern as AI-leaning — ease off it a touch." };
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
      if (HUMAN_DIR[d.name]) continue;   // a human-strength feature never belongs under "Work on"
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
      if (!HUMAN_DIR[d.name]) continue;  // only genuine human strengths may show as "Keep this"
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
        "“" + w + "” is a word AI leans on. Swap it for one small, specific thing only your narrator would notice right then — an object, a place, a name (e.g. “the laundromat on 5th”)." });
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
        "“" + clip(line) + "” tells the feeling — show it instead with one thing we could see or touch (e.g. “a name tag still on”, “the screen door left open”)." });
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
        "Nothing here is named — drop in one real anchor (a street name, a year, a time like “6:15”) and the whole song gets a body." });
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
    // Defensive: instrumental / empty inputs have no contributions — return an empty panel, never crash.
    if (!scoreResult || scoreResult.instrumental || !scoreResult.contributions) {
      return { good: [], joker: null, bad: [] };
    }
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
