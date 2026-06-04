/* replacement_catalog.js — meter-matched, context-safe line REPLACEMENT pool for the
 * Suno Slop Detector "Humanize" feature.
 *
 * When a content-substitution feature flags a vague / cliché / personified / simile /
 * abstract-ending / adj-stack line, we offer a CONCRETE, cliché-free line of the SAME
 * syllable count whose context-tags are allowed by the detected song context.
 *
 * Every line in `bySyllable` was machine-vetted (analysis/_vet_candidates.js) to contain
 * ZERO words/phrases from the engine's cliché-lexicon (analysis/patterns.js PHRASES),
 * vague-emotion set, adjective-stack pairs, ing-emotion verbs, inanimate→animate
 * personification, abstract line-endings, and to carry no proper nouns/brands/digits.
 * Syllable counts were computed with analysis/prosody.js `syllCount()` (not guessed).
 *
 * Design + hard rules: analysis/REPLACEMENT_CATALOG_DESIGN.md
 *
 * Dual-mode: module.exports (Node) + globalThis.ReplacementCatalog (browser).
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis
          : (typeof window !== 'undefined') ? window : this;

  // ---------------------------------------------------------------------------
  // 1. The vetted pool, bucketed by EXACT syllable count (prosody.syllCount).
  //    tags ⊆ { ENV, PLACE, OBJECT, DOMESTIC, URBAN, PERSON, BODY }
  // ---------------------------------------------------------------------------
  const bySyllable = {
    5: [
      { line: "rain on the tin roof", tags: ["ENV"] },
      { line: "frost on the windscreen", tags: ["ENV"] },
      { line: "steam off the kettle", tags: ["ENV","DOMESTIC"] },
      { line: "mud on the doorstep", tags: ["ENV","PLACE"] },
      { line: "snow on the back step", tags: ["ENV","PLACE"] },
      { line: "fog down the valley", tags: ["ENV","PLACE"] },
      { line: "ice on the bucket", tags: ["ENV","OBJECT"] },
      { line: "smoke off the chimney", tags: ["ENV"] },
      { line: "dew on the long grass", tags: ["ENV"] },
      { line: "leaves in the gutter", tags: ["ENV","URBAN"] },
      { line: "a moth at the lamp", tags: ["ENV"] },
      { line: "rust on the railing", tags: ["ENV","OBJECT"] },
      { line: "a tap left to drip", tags: ["ENV","OBJECT","DOMESTIC"] },
      { line: "boots by the back door", tags: ["DOMESTIC","OBJECT"] },
      { line: "plates left in the sink", tags: ["DOMESTIC"] },
      { line: "a coat on the hook", tags: ["DOMESTIC","OBJECT"] },
      { line: "a clock with no hands", tags: ["OBJECT"] },
      { line: "a streetlight gone out", tags: ["URBAN","ENV"] },
      { line: "gulls over the dock", tags: ["ENV","PLACE"] },
      { line: "a gate off its hinge", tags: ["PLACE","OBJECT"] },
      { line: "cold tea in the mug", tags: ["OBJECT","DOMESTIC"] },
      { line: "her hands on the wheel", tags: ["BODY","PERSON","OBJECT"] },
    ],
    6: [
      { line: "a kettle on the boil", tags: ["DOMESTIC","OBJECT"] },
      { line: "the rain on the tin roof", tags: ["ENV"] },
      { line: "cold frost on the windscreen", tags: ["ENV"] },
      { line: "wind down the long valley", tags: ["ENV","PLACE"] },
      { line: "ice cracked on the bucket", tags: ["ENV","OBJECT"] },
      { line: "a moth at the lamp glass", tags: ["ENV"] },
      { line: "smoke up from the chimney", tags: ["ENV"] },
      { line: "boots dry by the back door", tags: ["DOMESTIC","OBJECT"] },
      { line: "a clock with no hands left", tags: ["OBJECT"] },
      { line: "dew thick on the long grass", tags: ["ENV"] },
      { line: "mud caked on the doorstep", tags: ["ENV","PLACE"] },
      { line: "rust deep in the railing", tags: ["ENV","OBJECT"] },
      { line: "cold tea in the cracked mug", tags: ["OBJECT","DOMESTIC"] },
      { line: "a gull on the harbour", tags: ["ENV","PLACE"] },
      { line: "her hands flat on the wheel", tags: ["BODY","PERSON","OBJECT"] },
      { line: "leaves packed in the gutter", tags: ["ENV","URBAN"] },
      { line: "a kettle left to boil", tags: ["DOMESTIC","OBJECT"] },
    ],
    7: [
      { line: "frost had bitten every pane", tags: ["ENV"] },
      { line: "gulls were arguing over bread", tags: ["ENV"] },
      { line: "rust had eaten through the hinge", tags: ["ENV"] },
      { line: "the radiator hissed and knocked", tags: ["ENV","DOMESTIC"] },
      { line: "the milk had soured in the heat", tags: ["ENV","OBJECT","DOMESTIC"] },
      { line: "the chapel stood with boarded doors", tags: ["PLACE"] },
      { line: "the back lot flooded by the bins", tags: ["PLACE","URBAN"] },
      { line: "the stadium sat dark and locked", tags: ["PLACE","URBAN"] },
      { line: "the dishes stacked up by the sink", tags: ["DOMESTIC"] },
      { line: "the kettle waited on the hob", tags: ["DOMESTIC","OBJECT"] },
      { line: "a siren faded down the road", tags: ["URBAN"] },
      { line: "she counted out the change in coins", tags: ["PERSON","OBJECT"] },
      { line: "he taped the boxes shut for good", tags: ["PERSON","OBJECT"] },
      { line: "mud caked thick along the shins", tags: ["BODY","ENV"] },
      { line: "the ferry waited out the fog", tags: ["PLACE","ENV"] },
      { line: "you didn't call me back at all", tags: ["PERSON"] },
    ],
    8: [
      { line: "the gutter caught the runoff fast", tags: ["ENV"] },
      { line: "a sparrow picked the gravel clean", tags: ["ENV"] },
      { line: "the porch light buzzed and would not quit", tags: ["ENV"] },
      { line: "a magpie clattered on the roof", tags: ["ENV"] },
      { line: "the wind kept slamming the back gate", tags: ["ENV"] },
      { line: "the puddle froze along the kerb", tags: ["ENV"] },
      { line: "steam rolled off the boiling pot", tags: ["ENV"] },
      { line: "the apples bruised against the bowl", tags: ["ENV"] },
      { line: "snow piled up against the shed", tags: ["ENV"] },
      { line: "the awning dripped onto the step", tags: ["ENV"] },
      { line: "a moth kept knocking at the bulb", tags: ["ENV"] },
      { line: "the heater clicked on after dark", tags: ["ENV","DOMESTIC"] },
      { line: "a wasp got trapped behind the blind", tags: ["ENV"] },
      { line: "the laundry stiffened on the line", tags: ["ENV"] },
      { line: "hail rattled down the metal roof", tags: ["ENV"] },
      { line: "the fog sat low above the fields", tags: ["ENV","PLACE"] },
      { line: "a crow walked slow across the lot", tags: ["ENV"] },
      { line: "the bonfire popped and threw a spark", tags: ["ENV"] },
      { line: "the tide went out and left the weed", tags: ["ENV"] },
      { line: "leaves clogged the drain beside the path", tags: ["ENV","PLACE"] },
      { line: "the fan turned slowly in the heat", tags: ["ENV","OBJECT"] },
      { line: "ice cracked along the water trough", tags: ["ENV"] },
      { line: "the chimney smoked against the grey", tags: ["ENV"] },
      { line: "a beetle flipped onto its back", tags: ["ENV"] },
      { line: "the snowmelt ran beneath the porch", tags: ["ENV","PLACE"] },
      { line: "a hen kept scratching at the dirt", tags: ["ENV"] },
      { line: "wet leaves stuck flat against the screen", tags: ["ENV"] },
      { line: "the rain kept tapping on the glass", tags: ["ENV"] },
      { line: "wind dragged the leaves across the lot", tags: ["ENV"] },
      { line: "a beetle crossed the warm cement", tags: ["ENV"] },
      { line: "the orchard dropped its fruit unpicked", tags: ["ENV","PLACE"] },
      { line: "a kettle steamed the window up", tags: ["ENV","DOMESTIC"] },
      { line: "the bathwater had gone stone cold", tags: ["ENV","DOMESTIC"] },
      { line: "the swallows lined the power wire", tags: ["ENV","URBAN"] },
      { line: "the muddy track had froze to ruts", tags: ["ENV","PLACE"] },
      { line: "a single moth burned at the lamp", tags: ["ENV"] },
      { line: "the dripping tap kept up its beat", tags: ["ENV","OBJECT","DOMESTIC"] },
      { line: "wind worried at the rotten fence", tags: ["ENV","PLACE"] },
      { line: "the bread had gone to crust and mould", tags: ["ENV","OBJECT"] },
      { line: "the river carried off the bridge", tags: ["ENV","PLACE"] },
      { line: "a damp wind pushed beneath the door", tags: ["ENV","DOMESTIC"] },
      { line: "the gate hung open in the wind", tags: ["PLACE","ENV"] },
      { line: "the platform emptied after eight", tags: ["PLACE","URBAN"] },
      { line: "the cul-de-sac had one lit house", tags: ["PLACE","URBAN"] },
      { line: "the harbour wall was slick with weed", tags: ["PLACE"] },
      { line: "the orchard fence had given way", tags: ["PLACE"] },
      { line: "the bus shelter had cracked its glass", tags: ["PLACE","URBAN"] },
      { line: "the stairwell echoed with the wind", tags: ["PLACE","ENV"] },
      { line: "the church car park was full of weeds", tags: ["PLACE","URBAN"] },
      { line: "the field went still before the storm", tags: ["PLACE","ENV"] },
      { line: "the towpath narrowed by the lock", tags: ["PLACE"] },
      { line: "the marshland swallowed up the path", tags: ["PLACE","ENV"] },
      { line: "the clock kept time it could not keep", tags: ["OBJECT"] },
      { line: "the bicycle chain had rusted stiff", tags: ["OBJECT"] },
      { line: "the matchbox rattled nearly bare", tags: ["OBJECT"] },
      { line: "the freezer hummed behind the shop", tags: ["OBJECT","URBAN"] },
      { line: "the wristwatch stopped at half past four", tags: ["OBJECT"] },
      { line: "the suitcase sat there packed for weeks", tags: ["OBJECT"] },
      { line: "the doorbell wire had come undone", tags: ["OBJECT","DOMESTIC"] },
      { line: "the lighter sparked but would not catch", tags: ["OBJECT"] },
      { line: "the radio hissed between the bands", tags: ["OBJECT","DOMESTIC"] },
      { line: "the teapot lid had cracked its knob", tags: ["OBJECT","DOMESTIC"] },
      { line: "the pocket knife had gone to rust", tags: ["OBJECT"] },
      { line: "the cracked mug held a cold black tea", tags: ["OBJECT","DOMESTIC"] },
      { line: "the kitchen tap had start to drip", tags: ["DOMESTIC","OBJECT"] },
      { line: "a coat still hung behind the door", tags: ["DOMESTIC"] },
      { line: "the fridge door stuck and then gave way", tags: ["DOMESTIC","OBJECT"] },
      { line: "the carpet kept the shape of feet", tags: ["DOMESTIC"] },
      { line: "the bedsheets bunched up at the wall", tags: ["DOMESTIC"] },
      { line: "the boots stood dripping by the mat", tags: ["DOMESTIC","OBJECT"] },
      { line: "the toaster only browned one side", tags: ["DOMESTIC","OBJECT"] },
      { line: "the stovetop crusted over black", tags: ["DOMESTIC"] },
      { line: "the curtains never quite would close", tags: ["DOMESTIC"] },
      { line: "the cupboard held one tin of beans", tags: ["DOMESTIC","OBJECT"] },
      { line: "the streetlight flickered down the block", tags: ["URBAN","ENV"] },
      { line: "a taxi idled at the kerb", tags: ["URBAN"] },
      { line: "the traffic backed up past the bridge", tags: ["URBAN"] },
      { line: "the late train rattled through the cut", tags: ["URBAN"] },
      { line: "the chip shop steamed the window up", tags: ["URBAN","ENV"] },
      { line: "the parking meter ate the coin", tags: ["URBAN","OBJECT"] },
      { line: "the bus was packed and ran ten late", tags: ["URBAN"] },
      { line: "the shutters dropped along the row", tags: ["URBAN","OBJECT"] },
      { line: "she left her cup beside the sink", tags: ["PERSON","DOMESTIC"] },
      { line: "he stacked the chairs and locked the door", tags: ["PERSON","DOMESTIC"] },
      { line: "she scraped the frost off both the cars", tags: ["PERSON","ENV"] },
      { line: "you left your boots out on the step", tags: ["PERSON","OBJECT","PLACE"] },
      { line: "he kept the ticket in his coat", tags: ["PERSON","OBJECT"] },
      { line: "he parked the van behind the shop", tags: ["PERSON","URBAN"] },
      { line: "she stubbed the cigarette half-smoked", tags: ["PERSON","OBJECT"] },
      { line: "she fed the cat and turned the lock", tags: ["PERSON","DOMESTIC"] },
      { line: "you read the paper front to back", tags: ["PERSON","OBJECT"] },
      { line: "he hung the washing in the dark", tags: ["PERSON","DOMESTIC","ENV"] },
      { line: "her knuckles cracked against the cold", tags: ["BODY"] },
      { line: "a scar ran white across the wrist", tags: ["BODY"] },
      { line: "her hair was wet against her neck", tags: ["BODY"] },
      { line: "his boots had worn the heels right down", tags: ["BODY","OBJECT"] },
      { line: "her palm had blistered from the spade", tags: ["BODY","OBJECT"] },
      { line: "his collar chafed against the sun", tags: ["BODY","ENV"] },
      { line: "a splinter sat beneath the nail", tags: ["BODY","OBJECT"] },
      { line: "her teeth chattered against the wind", tags: ["BODY","ENV"] },
      { line: "wet ash sat cold inside the grate", tags: ["ENV","DOMESTIC"] },
      { line: "the hedge had grown across the lane", tags: ["PLACE","ENV"] },
      { line: "a bucket caught the leaking roof", tags: ["OBJECT","DOMESTIC"] },
      { line: "the brambles took the garden wall", tags: ["ENV","PLACE"] },
      { line: "the postbox stood knee-deep in weeds", tags: ["URBAN","OBJECT"] },
      { line: "the bell tower kept the wrong hour", tags: ["PLACE","OBJECT"] },
      { line: "a rope swing hung above the creek", tags: ["PLACE","OBJECT"] },
      { line: "the chimney pot had cracked in two", tags: ["OBJECT","PLACE"] },
      { line: "a heron stood out in the reeds", tags: ["ENV","PLACE"] },
      { line: "the gravel held the day's last heat", tags: ["ENV"] },
    ],
    9: [
      { line: "the kettle ticked as it cooled down", tags: ["ENV"] },
      { line: "the kettle screamed and then went quiet", tags: ["ENV"] },
      { line: "a kettle whistle filled the flat", tags: ["ENV","DOMESTIC"] },
      { line: "the early bus pulled past the stop", tags: ["ENV","URBAN"] },
      { line: "the cellar smelled of damp and coal", tags: ["ENV","PLACE"] },
      { line: "the frost had curled the garden leaves", tags: ["ENV","PLACE"] },
      { line: "the quarry filled with rust-brown pools", tags: ["PLACE","ENV"] },
      { line: "the hallway smelled of bleach and damp", tags: ["PLACE","DOMESTIC"] },
      { line: "the allotment shed had blown apart", tags: ["PLACE"] },
      { line: "the launderette stayed lit till two", tags: ["PLACE","URBAN"] },
      { line: "the kettle scaled up white inside", tags: ["OBJECT","DOMESTIC"] },
      { line: "the ironing board still stood up there", tags: ["OBJECT","DOMESTIC"] },
      { line: "the wheelbarrow filled up with leaves", tags: ["OBJECT","ENV"] },
      { line: "last evening's plates still on the side", tags: ["DOMESTIC"] },
      { line: "the washing piled up on the chair", tags: ["DOMESTIC"] },
      { line: "the bin lorry woke the whole street", tags: ["URBAN"] },
      { line: "the underpass dripped on the tiles", tags: ["URBAN","ENV"] },
      { line: "you spilled the tea across the desk", tags: ["PERSON","DOMESTIC"] },
      { line: "you wore that jumper full of holes", tags: ["PERSON","OBJECT"] },
      { line: "his thumb still smelled of petrol then", tags: ["BODY","OBJECT"] },
      { line: "a tractor crawled along the ridge", tags: ["PLACE"] },
      { line: "the floorboards swelled up in the damp", tags: ["DOMESTIC","ENV"] },
      { line: "the pavement buckled by the roots", tags: ["URBAN","ENV"] },
      { line: "her coat still dripped onto the tiles", tags: ["BODY","PERSON","DOMESTIC"] },
    ],
    10: [
      { line: "the typewriter jammed on the same key", tags: ["OBJECT"] },
      { line: "the off-licence had pulled its grille", tags: ["URBAN","OBJECT"] },
      { line: "a crow walked slow across the cracked car park", tags: ["ENV","URBAN"] },
      { line: "the corner shop pulled down its grille", tags: ["URBAN","OBJECT"] },
      { line: "a heron stood out waiting in the reeds", tags: ["ENV","PLACE"] },
      { line: "the wristwatch on the table stopped at four", tags: ["OBJECT","DOMESTIC"] },
      { line: "the back gate banged against the rotten post", tags: ["ENV","PLACE"] },
      { line: "a moth kept knocking softly at the bulb", tags: ["ENV","OBJECT"] },
      { line: "she scraped the windscreen clear before the dawn", tags: ["PERSON","ENV"] },
      { line: "the orchard dropped its apples on the grass", tags: ["ENV","PLACE"] },
      { line: "the freezer in the corner shop still hummed", tags: ["OBJECT","URBAN"] },
      { line: "the muddy track had frozen into ruts", tags: ["ENV","PLACE"] },
    ],
    11: [
      { line: "the kettle scaled up white inside the spout", tags: ["OBJECT","DOMESTIC"] },
      { line: "a magpie clattered on the corrugated roof", tags: ["ENV"] },
      { line: "the bicycle had rusted to the iron rail", tags: ["OBJECT","URBAN"] },
      { line: "the kettle scaled up white along the spout", tags: ["OBJECT","DOMESTIC"] },
      { line: "the gutter ran and spilled across the kerb", tags: ["ENV","URBAN"] },
      { line: "the back gate banged against the post in the wind", tags: ["ENV","PLACE"] },
      { line: "a heron stood and waited in the frozen reeds", tags: ["ENV","PLACE"] },
    ],
    12: [
      { line: "the gutter overflowed and ran along the kerb", tags: ["ENV","URBAN"] },
      { line: "the back gate banged against the post in every gust", tags: ["ENV","PLACE"] },
      { line: "the freezer in the corner shop kept up its hum", tags: ["OBJECT","URBAN"] },
      { line: "the muddy track had frozen hard to ruts and stone", tags: ["ENV","PLACE"] },
      { line: "the kettle whistled twice before it boiled dry", tags: ["OBJECT","DOMESTIC"] },
      { line: "the porch bulb buzzed and flickered out and buzzed again", tags: ["ENV","OBJECT"] },
      { line: "a wasp got stuck behind the blind and would not leave", tags: ["ENV"] },
      { line: "the laundry stiffened hard as board out on the line", tags: ["ENV","DOMESTIC"] },
      { line: "the bin lorry came grinding up the narrow road", tags: ["URBAN"] },
      { line: "the chip shop window steamed and dripped onto the floor", tags: ["URBAN","ENV"] },
      { line: "the orchard dropped its fruit and left it on the ground", tags: ["ENV","PLACE"] },
      { line: "she scraped the frost from both the cars before it warmed", tags: ["PERSON","ENV"] },
      { line: "the radiator knocked and hissed the whole way through", tags: ["ENV","DOMESTIC"] },
      { line: "the cracked mug held a cold black tea since half past eight", tags: ["OBJECT","DOMESTIC"] },
      { line: "the wristwatch on the bedside stopped at half past four", tags: ["OBJECT"] },
      { line: "his thumb still carried petrol from the morning shift", tags: ["BODY","OBJECT","PERSON"] },
      { line: "the snowmelt ran in channels underneath the porch", tags: ["ENV","PLACE"] },
      { line: "the apples in the bowl had bruised and gone to brown", tags: ["ENV","OBJECT"] },
      { line: "the wristwatch on the table stopped at half past four", tags: ["OBJECT","DOMESTIC"] },
      { line: "the orchard dropped its apples on the wet black ground", tags: ["ENV","PLACE"] },
      { line: "she scraped the frost from off the windscreen at the dawn", tags: ["PERSON","ENV"] },
    ],
  };

  // ---------------------------------------------------------------------------
  // 2. Which tags each detected SONG CONTEXT permits (HARD RULE 1).
  //    A candidate is allowed only if EVERY one of its tags is in this set.
  // ---------------------------------------------------------------------------
  const CONTEXT_ALLOWED = {
    HUMAN:          ["ENV","PLACE","OBJECT","DOMESTIC","URBAN","PERSON","BODY"],
    SELF:           ["ENV","PLACE","OBJECT","DOMESTIC","URBAN","BODY"], // no PERSON-other
    CREATURE:       ["ENV","PLACE","OBJECT"],                          // no PERSON/DOMESTIC/BODY-human
    PLACE_NATURE:   ["ENV","PLACE"],                                   // no PERSON/DOMESTIC/OBJECT-modern
    OBJECT_ABSTRACT:["ENV","OBJECT"],
    UNKNOWN:        ["ENV"],                                           // lowest risk
  };

  // ---------------------------------------------------------------------------
  // 3. Cheap whole-lyric context detector (regex only, on-device).
  //    Order matters: HUMAN (relational) wins over SELF; CREATURE/NATURE before
  //    OBJECT_ABSTRACT; everything else -> UNKNOWN.
  // ---------------------------------------------------------------------------
  function _stripLabels(t) {
    // mirror slop-core.stripSectionLabels if present, else a light fallback
    const S = G.SlopScore;
    if (S && typeof S.stripSectionLabels === 'function') return S.stripSectionLabels(String(t || ''));
    return String(t || '').replace(/^\s*\[[^\]]*\]\s*$/gm, '');
  }

  const RX = {
    secondThird: /\b(you|your|you're|youre|she|he|her|him|hers|his|we|us|our|they|them)\b/i,
    relational:  /\b(love|loved|miss|missed|leave|leaving|left|call|called|kiss|kissed|hold|holding|held|heart|baby|honey|darling|together|goodbye|sorry|stay|stayed)\b/i,
    firstPerson: /\b(i|i'm|im|i've|ive|i'll|ill|i'd|id|me|my|mine|myself)\b/i,
    creature:    /\b(cat|cats|kitten|dog|dogs|puppy|pup|bird|birds|fox|foxes|wolf|wolves|horse|horses|hawk|owl|crow|deer|rabbit|hare|bear|bee|bees|sparrow|swan|hound|mare|stallion|fish|whale|lion|tiger|snake|mouse|rat)\b/i,
    placeNature: /\b(town|city|village|sea|seas|ocean|road|roads|mountain|mountains|hill|hills|river|rivers|forest|woods|valley|desert|field|fields|shore|coast|harbour|harbor|island|prairie|meadow|moor|cliff|canyon|lake)\b/i,
    weather:     /\b(rain|snow|wind|storm|sun|fog|frost|cloud|clouds|thunder|sky|tide|season|winter|summer|autumn|spring)\b/i,
    objectAbstract: /\b(clock|time|money|machine|engine|coin|coins|letter|letters|train|trains|wheel|wheels|key|keys|door|doors|mirror|radio|phone|photograph|photo|watch|book|books)\b/i,
  };

  function detectContext(lyrics) {
    const t = _stripLabels(lyrics);
    const has2or3 = RX.secondThird.test(t);
    const hasRel  = RX.relational.test(t);
    const has1    = RX.firstPerson.test(t);

    // HUMAN: a clear OTHER (2nd/3rd person) AND a relational cue.
    if (has2or3 && hasRel) return 'HUMAN';

    // CREATURE: an animal subject is present and it's not clearly a love-to-a-person song.
    if (RX.creature.test(t) && !(has2or3 && hasRel)) return 'CREATURE';

    // SELF: 1st-person introspection with no clear relational OTHER.
    if (has1 && !has2or3) return 'SELF';
    if (has1 && has2or3 && !hasRel) return 'SELF'; // "you" used loosely, no relationship verbs

    // PLACE_NATURE: about a place / nature (place words or weather), no people cues.
    if ((RX.placeNature.test(t) || RX.weather.test(t)) && !has1 && !has2or3) return 'PLACE_NATURE';

    // OBJECT_ABSTRACT: a thing/idea is the subject, no people cues.
    if (RX.objectAbstract.test(t) && !has1 && !has2or3) return 'OBJECT_ABSTRACT';

    return 'UNKNOWN';
  }

  // ---------------------------------------------------------------------------
  // 4. Pick a replacement.
  //    - matches removed-line syllable count (±1, HARD RULE 4)
  //    - tags ⊆ allowed-set for the detected context (HARD RULE 1)
  //    - PREFERS ENV (HARD RULE 6)
  //    - rotates to avoid repeats within a session
  //    - returns null when nothing is safe (HARD RULE 7)
  // ---------------------------------------------------------------------------
  const _used = new Set();      // session de-dup of returned lines
  function resetRotation() { _used.clear(); }

  function _syll(line) {
    const P = G.Prosody;
    if (P && typeof P.syllCount === 'function') return P.syllCount(line);
    // fallback: rough vowel-group count (should not normally run; engine ships Prosody)
    return (String(line).toLowerCase().match(/[aeiouy]+/g) || []).length;
  }

  function _allowed(tags, allowSet) {
    for (const t of tags) if (allowSet.indexOf(t) === -1) return false;
    return true;
  }

  function _collect(targetSyll, allowSet) {
    const out = [];
    for (const d of [0, -1, 1]) {              // exact first, then ±1
      const arr = bySyllable[targetSyll + d];
      if (!arr) continue;
      for (const item of arr) if (_allowed(item.tags, allowSet)) out.push(item);
    }
    return out;
  }

  function pickReplacement(removedLine, lyrics) {
    const target = _syll(removedLine);
    if (!target) return null;
    const ctx = detectContext(lyrics);
    const allowSet = CONTEXT_ALLOWED[ctx] || CONTEXT_ALLOWED.UNKNOWN;

    const pool = _collect(target, allowSet);
    if (!pool.length) return null;

    // Prefer ENV-only lines (lowest risk, HARD RULE 6), then any allowed line.
    const envPool = pool.filter(p => p.tags.length === 1 && p.tags[0] === 'ENV');
    const tiers = envPool.length ? [envPool, pool] : [pool];

    // Within each tier, take the first UNUSED line (rotation). Only fall back to a
    // used line if EVERY candidate across all tiers has already been served.
    for (const tier of tiers) {
      for (const p of tier) {
        if (!_used.has(p.line)) {
          _used.add(p.line);
          return { line: p.line, tags: p.tags.slice(), syllables: target, context: ctx };
        }
      }
    }
    // all exhausted — recycle the whole pool and serve the first.
    for (const p of pool) _used.delete(p.line);
    const p = (envPool.length ? envPool : pool)[0];
    _used.add(p.line);
    return { line: p.line, tags: p.tags.slice(), syllables: target, context: ctx };
  }

  // ---------------------------------------------------------------------------
  const api = { bySyllable, CONTEXT_ALLOWED, detectContext, pickReplacement, resetRotation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.ReplacementCatalog = api;
})();
