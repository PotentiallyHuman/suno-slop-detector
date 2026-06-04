/* rhyme_index.js — PHONETIC rhyme index for rhyme-PRESERVING end-of-line replacement.
 *
 * Purpose (see analysis/REPLACEMENT_CATALOG_DESIGN.md §6): when an abstract/feeling word ends a
 * line (pain, soul, heart, free, fire, dreams, alone, tonight…), suggest an ENDING that
 *   (1) rhymes BY SOUND with the line's rhyme partner (so the scheme is preserved),
 *   (2) matches the original ending's syllable count (±0; ±1 only on explicit request),
 *   (3) is itself CONCRETE — not a feeling/abstract word and not in the cliché lexicon.
 * Supports single-word endings AND common 1-2 word endings ("in vain", "to blame", "by name",
 * "on my own", "in the rain", "down the line").
 *
 * Uses the existing prosody primitives ONLY (no new phonetics): Prosody.rhymeKey() (which already
 * folds the eye-rhyme overrides from eye_rhymes.js), Prosody.syllables() / syllCount().
 * IMPORTANT: rhymeKey is the engine's authoritative grouping. It is an orthographic *rime*
 * (vowel-class + coda), so e.g. pain/rain/brain/train group ("An") but blame/name group separately
 * ("Am"). We build the index on whatever rhymeKey returns — we never re-define rhyme.
 *
 * Dual-mode: module.exports (Node) AND globalThis.RhymeIndex (browser build).
 * Pure-JS, text-only, offline. No copyrighted text, no proper nouns.
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);
  function safeReq(p){ try { return require(p); } catch (_) { return null; } }
  const Prosody = G.Prosody || (typeof require !== 'undefined' ? safeReq('./prosody.js') : null);
  if (!Prosody) throw new Error('rhyme_index.js requires prosody.js (Prosody primitives) to be loaded first');

  const rhymeKey  = Prosody.rhymeKey;
  const syllables = Prosody.syllables;
  const syllCount = Prosody.syllCount;
  const wordsOf   = Prosody.words;
  const orthoRime = Prosody.orthoRime;
  const eyeRhyme  = Prosody.eyeRhyme;

  // -- tail compatibility guard ----------------------------------------------------------------
  // rhymeKey is the engine's authoritative bucket, but its silent-e stripping makes a few weak
  // "consonant+le" / unstressed-schwa words (apple, bottle, ankle, city) collide with stressed
  // monosyllables (free, tree) under bare-vowel keys ("E","I"). These are NOT real rhymes for the
  // ear. We screen them out using prosody primitives only (no new phonetics): a candidate is
  // tail-compatible with the anchor when (a) they are not an eye-rhyme (sounds actually match) and
  // (b) they share the same orthographic coda, and weak syllabic-L / open-schwa artifacts are not
  // matched against a true vowel rime.
  function _coda(o){ return String(o).replace(/^[aeiouy]+/, ''); }                       // consonants after the vowel run
  function _vowelRunLen(o){ const m = String(o).match(/^[aeiouy]+/); return m ? m[0].length : 0; }
  function _isWeakLe(w){ return /[^aeiou]le$/.test(w) || /[^aeiou]les$/.test(w); }        // apple, bottle, ankles
  function _isWeakSchwaY(w){ return /[^aeiou]y$/.test(w) && !/[aeiou]y$/.test(w); }       // city, barley->no(ey), happy
  function _tailCompatible(anchor, cand){
    anchor = String(anchor).toLowerCase().replace(/[^a-z]/g,'');
    cand   = String(cand).toLowerCase().replace(/[^a-z]/g,'');
    if (!anchor || !cand) return false;
    if (eyeRhyme(anchor, cand)) return false;                 // looks like a rhyme but SOUNDS different
    const oa = orthoRime(anchor), oc = orthoRime(cand);
    // silent-e / syllabic-L artifact: orthoRime collapses to the bare letter "e" (apple, mile, bale,
    // hole, scale, table…). Such a word must NOT match a true vowel rime (free="ee", say="ay").
    const aArt = (oa === 'e'), cArt = (oc === 'e');
    if (aArt !== cArt) return false;
    const aWeak = _isWeakLe(anchor) || _isWeakSchwaY(anchor);
    const cWeak = _isWeakLe(cand)   || _isWeakSchwaY(cand);
    if (aWeak !== cWeak) return false;                        // don't rhyme "apple" with "free"
    if (_coda(oa) !== _coda(oc)) return false;                // same trailing consonants
    return true;
  }

  // ----------------------------------------------------------------------------------------------
  // FEELING / ABSTRACT word set + cliché lexicon — mirrored from the live engine so we can FLAG
  // (never SUGGEST) entries that are themselves abstract/cliché. Sourced from:
  //   src/ext/tier3.browser.js  : VAGUE_EMOTION, STACK_ADJ, STACK_NOUN
  //   src/ext/patterns.browser.js : abstractEnding regex, PHRASES (cliché phrases), AI_CLICHE words
  // Kept as a literal copy (engine files are not imported here to keep this analysis-only & decoupled).
  // ----------------------------------------------------------------------------------------------
  const ABSTRACT = new Set([
    // patterns.browser.js abstractEnding regex targets
    'love','pain','heart','tears','fears','fire','light','night','sky','time','dream','dreams',
    'soul','gold','rain','home','free','alone','forever',
    // tier3 VAGUE_EMOTION
    'broken','shattered','lost','fading','endless','forgotten','distant','silent','silence',
    'whispered','whisper','whispers','echo','echoes','echoing','shadow','shadows','shadowed',
    'embers','ember','ashes','phoenix','silhouette','silhouettes','flame','flames','flickering',
    'dust','mist','crimson','amber','golden','ethereal',
    // tier3 STACK_NOUN (the abstract/feeling nouns AI stacks adjectives onto)
    'memory','memories','days','horizon','voice','eyes','hands','kiss','song',
    // common feeling/abstract endings not already covered
    'hope','fate','grace','peace','glory','sorrow','desire','passion','emotion','feeling','feelings',
    'eternity','destiny','infinity','heaven','paradise','heartbreak','heartache','loneliness',
    'darkness','brightness','sadness','madness','happiness','emptiness','tenderness','forever',
    'beauty','truth','lie','lies','wonder','magic','miracle','spirit','angel','angels','sin','sins',
    'pride','shame','blame','regret','memory','wishes','prayers','prayer','believe','belief',
    'misery','agony','ecstasy','euphoria','serenity','melancholy','nostalgia','yearning','longing',
  ]);
  // STACK_ADJ — vague adjectives; used to flag adjective endings as cliché-ish
  const VAGUE_ADJ = new Set([
    'broken','shattered','endless','fading','forgotten','silent','whispered','lost','distant',
    'lonely','empty','eternal','burning','flickering','crimson','golden','silver','midnight',
    'restless','tender','crystal','sacred','fragile','velvet','ethereal','timeless','beautiful',
  ]);
  // cliché last-words harvested from PHRASES / RHYME_PAIRS / AI_CLICHE_PHRASES (single tokens that
  // most strongly read as AI-cliché line-enders)
  const CLICHE_END = new Set([
    'desire','higher','apart','start','fight','right','lies','skies','above','again','flame',
    'game','same','cold','hold','whole','control','years','seems','true','you','blue','spark',
    'stay','rain','pain','fire','heart','soul','dreams','tears','fears','night','light','sky',
    'eyes','away','home','alone','forever','gold','free','desire','sea','dark','stars','star',
  ]);

  function isAbstractWord(w){ w = String(w).toLowerCase().replace(/[^a-z]/g,''); return ABSTRACT.has(w) || VAGUE_ADJ.has(w); }
  function isClicheWord(w){ w = String(w).toLowerCase().replace(/[^a-z]/g,''); return CLICHE_END.has(w); }

  // ----------------------------------------------------------------------------------------------
  // (1) CURATED CONCRETE VOCABULARY — common, generic, non-cliché English line-ending words.
  // Nouns / verbs / places / objects. NO proper nouns, NO brands. A few thousand entries.
  // Grouped loosely by topic only for readability; topic has no effect on indexing.
  // ----------------------------------------------------------------------------------------------
  const CONCRETE_WORDS = `
    door doors floor floors wall walls window windows roof roofs gate gates fence fences
    porch porches stair stairs step steps hall halls room rooms kitchen attic basement cellar
    table tables chair chairs bed beds desk desks shelf shelves drawer drawers couch sofa
    lamp lamps candle candles match matches mirror mirrors clock clocks watch picture frame
    cup cups mug mugs glass glasses plate plates bowl bowls spoon spoons fork forks knife knives
    pot pots pan pans kettle kettles bottle bottles jar jars can cans box boxes bag bags
    coat coats jacket jackets shirt shirts dress sleeve sleeves collar collars button buttons
    boot boots shoe shoes sock socks glove gloves hat hats scarf scarves belt belts pocket pockets
    key keys lock locks chain chains rope ropes wire wires nail nails hook hooks hammer hammers
    car cars truck trucks bus buses train trains plane planes boat boats ship ships bike bikes
    wheel wheels engine engines motor motors road roads street streets lane lanes path paths
    bridge bridges tunnel tunnels track tracks station stations platform platforms corner corners
    town towns city cities village villages farm farms field fields barn barns shed sheds
    house houses cabin cabins shack shacks tower towers church churches school schools store stores
    shop shops market markets bar bars cafe diner diners motel motels hotel hotels
    river rivers creek creeks stream streams lake lakes pond ponds sea seas shore shores beach beaches
    hill hills mountain mountains valley valleys cliff cliffs cave caves rock rocks stone stones
    sand sands mud clay dirt soil grass weeds moss fern ferns vine vines root roots
    tree trees oak oaks pine pines branch branches leaf leaves bark twig twigs log logs
    flower flowers rose roses daisy weed bloom blooms petal petals thorn thorns seed seeds
    bird birds crow crows hawk hawks owl owls dove doves sparrow wing wings nest nests feather feathers
    dog dogs cat cats fox foxes wolf wolves deer horse horses cow cows sheep goat goats pig pigs
    fish fishes frog frogs snake snakes bee bees ant ants moth moths fly flies bug bugs
    rain rains snow snows wind winds storm storms cloud clouds fog frost ice hail thunder
    sun suns moon moons star stars sky skies dawn dusk noon shade shadow
    light lights lamp glow spark flame fire smoke ash coal ember stove
    bread loaf crumbs flour salt sugar honey milk cream butter cheese egg eggs
    apple apples plum plums pear pears peach cherry berry grape grapes lemon lime
    coffee tea wine beer water juice soup stew meat bone bones rice corn bean beans
    money coin coins cash bill bills wage wages debt rent loan loans price prices
    work job jobs shift shifts task tasks chore chores trade trades craft skill skills
    tool tools saw saws drill drills brush brushes paint paints pen pens pencil chalk
    paper pages page book books note notes letter letters card cards stamp stamps
    phone phones screen screens cable wires plug switch button dial radio
    clock hour hours minute minutes day days week weeks month months year years
    morning evening night noon midnight weekend autumn winter summer spring season seasons
    hand hands finger fingers thumb thumbs palm palms wrist wrists arm arms elbow shoulder shoulders
    foot feet toe toes knee knees leg legs hip hips ankle ankles heel heels
    head heads hair eye ear ears nose mouth lip lips tooth teeth chin cheek cheeks
    skin bone blood breath voice throat neck back chest spine
    smile smiles laugh laughs cry cries shout shouts whistle whistles cough sigh sighs
    walk walks run runs jump jumps climb climbs crawl swim swims dance dances
    wave waves nod nods bow bows kneel reach reaches grab grabs hold holds
    push pull lift carry drop drops throw throws catch toss kick kicks
    open close shut shuts lock unlock knock knocks ring rings tap taps slam slams
    drive drove ride rode steer turn turns brake stop stops park parks crash crashes
    build builds dig digs plant plants water sweep mop scrub wash washes wipe wipes
    cook cooks bake bakes boil fry stir pour pours fill fills spill spills
    sew sews knit weave mend fix fixes nail glue tape tie ties knot knots
    burn burns freeze melt melts boil cool dry dries soak soaks rinse
    sing sings hum hums play plays strum drum drums clap claps stomp
    write writes read reads spell speak speaks talk talks call calls answer
    look looks watch watches stare stares blink wink glance peer
    listen hears hear sound sounds noise echo ring bell bells horn horns
    sleep sleeps wake wakes dream rest yawn yawns rise rises stand stands sit sits
    fall falls slip slips trip trips stumble lean leans bend bends kneel
    smoke drink drinks eat eats chew bite bites taste tastes lick licks sip sips
    dawn dusk tide tides flood floods drought wave shore current
    coin nickel dime quarter penny wallet purse pocket change spare
    map maps road sign signs route routes mile miles step trail trails fork
    boat oar oars sail sails anchor mast deck dock docks pier piers harbor
    bridge rail rails fence post posts beam beams plank planks board boards
    brick bricks tile tiles plank slate shingle shingles concrete cement steel iron
    glass mirror pane panes frame frames sill sash blind blinds curtain curtains
    chair stool bench benches couch cushion pillow pillows blanket quilt sheet sheets
    floor carpet rug rugs mat mats tile broom dustpan bucket buckets mop
    yard yards garden gardens lawn hedge hedges bush bushes patch patches plot plots
    well wells pump pumps tap faucet pipe pipes drain drains gutter gutters
    chimney smoke vent vents furnace boiler heater fan fans cooler
    knife blade edge point tip handle grip hilt sheath
    string strings rope cord cords thread threads yarn knot loop loops
    needle pin pins clip clips peg pegs hook nail screw screws bolt bolts
    wagon cart carts cartwheel sled sleds wheel axle spoke spokes
    candle wick wax lantern flame torch torches match lighter sparks
    bottle cork cap lid lids jar jug jugs pail pails barrel barrels keg kegs
    ladder rungs rope chain pulley crane hoist lift winch
    saw axe axes hatchet chisel plane plier pliers wrench wrenches clamp
    hammer mallet anvil forge bellows tongs file files
    seed soil spade spades shovel shovels hoe hoes rake rakes plow plows
    crop crops harvest grain grains wheat barley oats hay straw bale bales
    sheep flock herd herds barn stable stall stalls pen pens trough troughs
    rooster hen hens chick chicks duck ducks geese goose calf calves foal
    cat kitten kittens pup pups paw paws claw claws tail tails whisker whiskers
    saddle reins bridle stirrup harness collar leash leashes muzzle
    apple orchard grove vine vineyard berry bramble thicket hedgerow
    mushroom moss lichen pinecone acorn acorns chestnut walnut hazelnut
    pebble pebbles gravel boulder ledge ridge ridges slope slopes peak peaks
    canyon gorge ravine gully ditch ditches trench trenches pit pits hole holes
    spring well fountain fountains pool pools puddle puddles marsh swamp swamps
    snowflake icicle frost slush sleet drizzle downpour puddle
    suitcase trunk trunks crate crates carton cartons parcel parcels package packages
    ticket tickets receipt receipts ledger ledgers invoice register registers
    map atlas compass needle dial gauge gauges meter meters scale scales
    glasses lens lenses goggles binocular telescope microscope
    flashlight torch beam beacon signal lantern bulb bulbs fuse fuses
    button switch lever levers knob knobs handle crank cranks pedal pedals
    drum cymbal cymbals horn flute fiddle banjo guitar string keys piano
    record records tape tapes reel reels speaker speakers wire amp amps
    photo photos album albums frame negative negatives reel film reels
    suitcase backpack satchel pouch pouches knapsack duffel
    umbrella raincoat poncho boots wellies galoshes
    teapot kettle saucer saucers tray trays platter platters dish dishes
    napkin tablecloth apron oven stove burner burners grill grills skillet
    spice pepper salt herb herbs onion garlic potato potatoes carrot carrots
    tomato tomatoes pepper cabbage lettuce bean pea peas radish turnip
    nut nuts shell shells husk husks pit core peel peels rind rinds
  `.trim().split(/\s+/).filter(Boolean);

  // ----------------------------------------------------------------------------------------------
  // (2) COMMON 1-2 WORD ENDINGS — natural concrete line-tails. Each rhymes on its LAST word.
  // These give multi-syllable matches without needing single-word multisyllabic vocab.
  // ----------------------------------------------------------------------------------------------
  const PHRASE_ENDINGS = [
    // /An/ family (pain, rain, train…)
    'in vain','in the rain','on the train','down the lane','on the plane','through the pane',
    'in the lane','by the drain','on the chain','in the grain',
    // /Am/ family (blame, name, game…)
    'to blame','by name','in the game','to the frame','in the flame',
    // /E/ family (free, sea, tree…)
    'by the sea','to the sea','up a tree','on one knee','for the fee','to the key','in the tea',
    // /Or/ family (door, floor…)
    'at the door','on the floor','to the shore','out the door','near the shore','from the store',
    'down to the floor','behind the door',
    // /Ight/ family (night, light…)
    'through the night','in the light','out of sight','holding tight','into the night','by candlelight',
    // /Ir/ family (fire, wire, hire…)
    'by the fire','on the wire','for hire','to the spire','near the fire',
    // /Ark/ family (dark, spark…)
    'in the dark','in the park','past the bark','leaving a mark','after dark',
    // /Old/ family (cold, gold, hold…)
    'in the cold','out in the cold','do as told','years of old','left to mold',
    // /Own/ family (own, stone, alone-rhyme via Own)
    'on my own','all on my own','to the bone','left alone at home','by the stone',
    // /In/ family (line, etc — orthographic)
    'down the line','on the line','past the line','across the line','out of line',
    // /Od/ family (road…)
    'on the road','down the road','up the road','along the road','back on the road',
    // /El/ family (wheel, etc)
    'at the wheel','behind the wheel','breaking the seal','sealing the deal','part of the deal',
    // /Ol/ family (soul, goal, control via Ol)
    'reaching the goal','out of control','paying the toll','down the hole','out for a stroll',
    // /Art/ family (start, part…) — partner for heart-scheme lines
    'from the start','playing the part','off the chart','pulling apart','right from the start',
    // /Ous/, /Ound/, /Own/ etc misc concrete tails
    'all around','to the ground','underground','off the ground','flat on the ground',
    'out of town','across the town','heading downtown','up and down',
    'down the hall','against the wall','over the wall','up the wall','behind the wall',
    'across the bay','out of the way','far away from the bay','end of the day','start of the day',
    'into the deep','fast asleep','counting sheep','climbing the steep',
    'closing the gate','running late','out of date','clean off the plate',
    'into the well','ringing the bell','hard to tell','cast off the spell',
    'over the hill','sitting still','paying the bill','up on the hill',
    'driving the truck','out of luck','stuck in the muck','passing the buck',
    'into the woods','hauling the goods','under the hood',
    'across the room','sweeping the broom','into the gloom','room by room',
    'onto the train','pouring rain','windowpane','panes of the windowpane',
    'tying the rope','down the slope','end of the rope','out of soap',
  ];

  // ----------------------------------------------------------------------------------------------
  // Build entries. Each entry: { ending, words(1|2), key, syll, abstract, cliche }
  // ending = the surface text; key = rhymeKey of the LAST word; syll = total syllable count.
  // ----------------------------------------------------------------------------------------------
  function lastTokenOf(ending){ const w = wordsOf(ending); return w.length ? w[w.length - 1] : ''; }
  function makeEntry(ending){
    const ending2 = String(ending).trim();
    const last = lastTokenOf(ending2);
    if (!last) return null;
    const key = rhymeKey(last);
    if (!key) return null;
    const wcount = wordsOf(ending2).length;
    const syll = wcount === 1 ? syllables(last) : syllCount(ending2);
    // an ending is "abstract" if ANY of its content words (esp. the last) is abstract/feeling
    const abstract = wordsOf(ending2).some(isAbstractWord);
    const cliche   = wordsOf(ending2).some(isClicheWord);
    return { ending: ending2, words: wcount, key, syll, abstract, cliche };
  }

  const byRhyme = Object.create(null);           // rhymeKey -> [entry, ...]
  const _seen = new Set();
  function addEntry(ending){
    const e = makeEntry(ending);
    if (!e) return;
    const dedupe = e.ending.toLowerCase();
    if (_seen.has(dedupe)) return;
    _seen.add(dedupe);
    (byRhyme[e.key] || (byRhyme[e.key] = [])).push(e);
  }
  for (const w of CONCRETE_WORDS) addEntry(w);
  for (const p of PHRASE_ENDINGS) addEntry(p);

  // stable sort each bucket: concrete-non-cliché first, then by syllable count, then alpha
  for (const k in byRhyme){
    byRhyme[k].sort((a, b) => {
      const ascore = (a.abstract ? 2 : 0) + (a.cliche ? 1 : 0);
      const bscore = (b.abstract ? 2 : 0) + (b.cliche ? 1 : 0);
      if (ascore !== bscore) return ascore - bscore;
      if (a.syll !== b.syll) return a.syll - b.syll;
      return a.ending < b.ending ? -1 : a.ending > b.ending ? 1 : 0;
    });
  }

  // ----------------------------------------------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------------------------------------------

  /** All entries that rhyme (same rhymeKey) with `word`.
   *  opts: { syllables: N (exact match; null = any), tolerance: 0|1 (default 0),
   *          excludeAbstract: true, excludeCliche: true, includeWord: false }
   */
  function rhymesFor(word, opts){
    opts = opts || {};
    const exAbs    = opts.excludeAbstract !== false;   // default true
    const exCli    = opts.excludeCliche   !== false;   // default true
    const tol      = (opts.tolerance != null) ? opts.tolerance : 0;
    const target   = (opts.syllables != null) ? opts.syllables : null;
    const includeW = !!opts.includeWord;
    const looseTail = !!opts.looseTail;               // default: apply the tail-compatibility guard
    const wclean   = String(word).toLowerCase().replace(/[^a-z]/g,'');
    const key      = rhymeKey(wclean);
    const bucket   = byRhyme[key] || [];
    return bucket.filter(e => {
      const last = lastTokenOf(e.ending);
      if (!includeW && last === wclean) return false;   // don't echo the word itself
      if (exAbs && e.abstract) return false;
      if (exCli && e.cliche)   return false;
      if (target != null && Math.abs(e.syll - target) > tol) return false;
      if (!looseTail && !_tailCompatible(wclean, last)) return false;  // screen silent-e collisions
      return true;
    });
  }

  /** Suggest ONE concrete, non-abstract ending that:
   *   - rhymes with `partnerEndWord` (preserves the song's scheme) — falls back to rhyming with
   *     `endWord` itself when no partner is given / no partner-rhyme exists,
   *   - matches `endWord`'s syllable count (so meter is preserved),
   *   - is not a feeling/abstract word and not a cliché.
   *  Returns the ending string, or null if no suitable option exists (caller leaves the line).
   *  Pass {all:true} to get the ranked array instead of just the top pick.
   */
  function suggestConcreteRhyme(endWord, partnerEndWord, opts){
    opts = opts || {};
    const eClean   = String(endWord || '').toLowerCase().replace(/[^a-z]/g,'');
    if (!eClean) return opts.all ? [] : null;
    const targetSyll = syllables(eClean);
    const tol = (opts.tolerance != null) ? opts.tolerance : 0;

    function pool(anchorWord){
      if (!anchorWord) return [];
      return rhymesFor(anchorWord, {
        syllables: targetSyll, tolerance: tol,
        excludeAbstract: true, excludeCliche: opts.excludeCliche !== false,
      }).filter(e => lastTokenOf(e.ending) !== eClean);   // never suggest the original word
    }

    // 1) rhyme with the PARTNER (keeps the scheme intact)
    let cands = pool(partnerEndWord && String(partnerEndWord).toLowerCase().replace(/[^a-z]/g,''));
    // 2) fallback: rhyme with the END WORD itself
    if (!cands.length) cands = pool(eClean);

    if (opts.all) return cands.map(e => e.ending);
    return cands.length ? cands[0].ending : null;
  }

  // ---- small diagnostics ----
  function stats(){
    let entries = 0, groups = 0, concrete = 0;
    for (const k in byRhyme){ groups++; entries += byRhyme[k].length;
      for (const e of byRhyme[k]) if (!e.abstract && !e.cliche) concrete++; }
    return { entries, groups, concrete, words: CONCRETE_WORDS.length, phrases: PHRASE_ENDINGS.length };
  }

  const api = {
    byRhyme, rhymesFor, suggestConcreteRhyme, stats,
    isAbstractWord, isClicheWord, tailCompatible: _tailCompatible,
    ABSTRACT, VAGUE_ADJ, CLICHE_END,
    CONCRETE_WORDS, PHRASE_ENDINGS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.RhymeIndex = api;
})();
