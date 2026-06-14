/* cliche_swaps.browser.js — hand-curated, meaning/ROLE-preserving substitutes for the
 * AI-cliché blocklist. TIER 0 of Humanize: swap only the cliché word, keep the sentence.
 * EVERY substitute is corpus-validated: it must not lean AI (full AI corpus + the
 * AI-overused-40 list) — naive "specific" words like quiet/salt/porch are MODERN AI slop
 * and were auto-rejected. Verb entries may split {obj, noobj}: a word's true synonym is
 * its ROLE ("echoes your name" = tells/spells/shouts; bare "echo" = rings).
 * Pure data — no network, no storage, nothing fetched. */
(function () {
  "use strict";
  // Deliberately ABSENT (not gaps): days (too functional - "no days off" broke), and
  // heart/eyes (humans own those words; swaps read clinical - "My chest and all it can give").
  globalThis.CLICHE_SWAPS = {
    abyss: ["chasm", "trench", "ravine"],
    amber: ["copper", "honey"],
    angels: ["saints", "guardians"],
    ashes: ["cinders"],
    beneath: ["under", "below"],
    bones: ["marrow", "ribs", "joints"],
    broken: ["busted", "wrecked", "ruined", "battered"],
    burning: ["boiling", "blistering"],
    cascade: ["torrent", "downpour", "spill"],
    cascading: ["spilling", "tumbling"],
    celestial: ["orbital", "planetary", "lunar"],
    chains: ["shackles", "handcuffs"],
    concrete: ["pavement", "asphalt", "sidewalk"],
    cosmic: ["galactic", "planetary", "orbital"],
    crimson: ["scarlet", "ruby", "cherry"],
    crystal: ["quartz"],
    demon: ["devil", "tormentor"],
    demons: ["devils", "vices", "habits"],
    diamond: ["jewel", "gemstone"],
    distant: ["faraway"],
    dreams: ["plans", "hopes", "wishes", "schemes", "visions", "tickets"],
    drowning: ["sinking", "gasping"],
    dust: ["powder", "sand", "ash", "grit"],
    echo: [],
    echoes: [],
    echoing: ["repeating", "ringing"],
    electric: ["wired"],
    ember: ["cinder", "coal"],
    embers: ["cinders", "coals"],
    empty: ["vacant", "bare", "blank", "barren"],
    endless: ["ceaseless", "constant", "nonstop", "unending"],
    eternal: ["lifelong", "permanent"],
    eternity: ["forever", "lifetimes", "centuries"],
    ethereal: ["airy"],
    faded: ["bleached", "washed"],
    fading: ["dimming", "thinning", "slipping", "dwindling"],
    fire: ["blaze", "furnace", "bonfire", "gasoline"],
    flame: ["torch"],
    flames: ["sparks", "torches"],
    flicker: ["sputter", "blink"],
    flickering: ["sputtering"],
    forgotten: ["misplaced", "overlooked"],
    fragile: ["brittle"],
    fragments: ["scraps", "splinters"],
    frozen: ["icy", "stiff", "numb"],
    ghost: ["trace", "imprint", "specter"],
    ghosts: ["spirits", "traces", "specters", "phantoms", "imprints"],
    glimmer: ["glint", "shine"],
    golden: ["gilded", "amber"],
    hands: [],   // humans OWN "hands" (like heart/eyes) — every swap reads clinical ("Grandmother's palms"). Leave it.
    heartbeat: ["drumbeat", "metronome"],
    hollow: ["vacant"],
    hum: ["drone", "buzz", "murmur", "thrum"],          // the ambient-noise sense ("the static hum", "echoes hum under streetlights") — user's most-hated AI word
    humming: ["droning", "buzzing"],
    hums: ["drones", "buzzes"],
    hummed: ["droned", "buzzed"],
    horizon: ["coastline", "treeline"],
    horizons: ["coastlines", "treelines"],
    infinity: ["forever"],
    kaleidoscope: ["pinwheel", "mosaic"],
    kiss: ["peck", "smooch"],
    labyrinth: ["maze", "warren"],
    light: [],
    lightning: ["voltage", "flash"],
    lights: ["lamps", "beams", "bulbs"],
    lonely: ["solo", "friendless"],
    lost: ["stranded", "adrift"],
    love: ["affection", "longing", "craving"],
    luminous: ["lamplit"],
    memories: ["keepsakes", "snapshots", "pictures", "mementos"],
    memory: ["keepsake"],
    midnight: ["nightfall", "curfew"],
    mist: ["fog", "drizzle", "exhaust"],
    moonlight: ["lamplight"],
    neon: [],
    paradise: ["eden", "utopia"],
    phantom: ["mirage", "specter"],
    phoenix: ["comeback", "rebirth"],
    radiant: ["beaming", "sunlit"],
    restless: ["sleepless", "uneasy"],
    rising: ["climbing", "swelling"],
    road: ["lane", "trail", "path", "highway", "gravel"],
    roads: ["lanes", "backroads", "highways"],
    scar: ["welt", "bruise", "scrape", "nick"],
    scars: ["welts", "bruises", "stitches"],
    sacred: ["hallowed", "godly", "burial"],
    serenade: ["ballad"],
    shadow: ["silhouette", "shape"],
    shadowed: ["shaded", "dimmed"],
    shadows: ["dark", "gloom", "distance", "dusk"],   // the DARKNESS/place sense ("a neutron in the shadows" -> "in the dark/distance"). Guarded in the engine to fire ONLY after "the" — the bare-subject moving sense ("Shadows dance and sway") is left alone (a mass-noun sub would break agreement).
    shattered: ["smashed", "splintered"],
    shimmer: ["glint", "sheen"],
    silence: ["stillness", "calm", "hush", "lull"],   // rotate (anti-mode-collapse): never the SAME sub every song. all low-AI, no-sound sense.
    silent: ["hushed", "soundless"],
    silhouette: ["outline", "profile"],
    silhouettes: ["outlines", "profiles"],
    silver: ["ash", "slate"],
    sky: ["clouds"],
    skyline: ["treeline"],
    soul: ["spirit"],   // "soul" is BOTH a person ("a single soul", "every soul" = nobody) and an essence ("my soul"). core/marrow/gut/spine break the person sense ("a single core who hears me"). "spirit" reads right in both (matches souls->spirits).
    souls: ["spirits"],
    stardust: ["glitter", "confetti"],
    starlight: [],   // context-ambiguous (like light/silver): "lamplight" wrecks a cosmic line ("a language only starlight hears"). Leave it.
    storm: ["downpour"],
    stranger: ["drifter", "outsider"],
    streetlight: ["lamppost"],
    streets: ["avenues", "sidewalks", "blocks"],
    surrender: ["retreat"],
    symphony: ["overture"],
    tapestry: ["quilt", "patchwork"],
    tears: ["sobs", "crying", "weeping", "sorrow", "teardrops"],
    tender: ["careful"],
    thunder: ["rumble", "growl"],
    unbreakable: ["ironclad"],
    veins: ["arteries", "bloodstream"],
    velvet: ["satin", "suede"],
    void: ["vacuum", "chasm"],
    whisper: [],
    whispered: [],   // "mutter" reads grumbly/annoyed — user-flagged. No neutral substitute for the soft/secret sense; leave the whole family.
    whispering: [],
    whispers: [],
    wildfire: ["brushfire", "bonfire"],
  };
  // FROZEN phrases (>=90x human corpus) + the collocation-ANCHOR words to protect inside them.
  // Cycle 3 proved a BLANKET frozen guard over-blocks (it killed 'lost in'->'stranded in', a fine
  // swap). The bad/fine split is the SOURCE WORD, not the phrase: only love & hands show up as bad
  // pairs (love->longing x8, hands->palms x11) AND live in many frozen phrases. lost/silence swap fine.
  globalThis.FROZEN_PHRASE = new Set(["a fire", "a kiss", "a love", "a stranger", "and love", "beneath the", "fire and", "for love", "hands on", "hands up", "i lost", "i love", "in love", "is love", "kiss me", "light of", "lost in", "lost my", "love again", "love and", "love can", "love for", "love her", "love i", "love i'm", "love in", "love is", "love it", "love it's", "love like", "love love", "love me", "love my", "love oh", "love so", "love that", "love the", "love to", "love was", "love will", "love with", "love you", "me love", "my dreams", "my hands", "my love", "my soul", "of love", "on fire", "our love", "the fire", "the light", "the lights", "the love", "the road", "the sky", "the streets", "the tears", "this love", "to love", "true love", "you love", "your hands", "your love", "your soul"]);
  globalThis.FROZEN_ANCHOR = { love: 1, hands: 1 };
  globalThis.CLICHE_SWAPS_VERB = {
    echo: { obj: ["repeat", "spell", "tell"], noobj: ["ring", "rebound"] },
    echoes: { obj: ["spells", "tells", "shouts", "owns", "haunts"], noobj: ["rings"] },
    echoing: { obj: ["repeating", "carrying", "spelling"], noobj: ["ringing", "rebounding"] },
    flicker: ["sputter", "blink"],
    flickering: ["sputtering"],
    glimmer: ["glint"],
    kiss: ["peck"],
    love: ["adore", "cherish", "choose"],
    scar: ["mark"],
    shimmer: ["glint"],
    surrender: ["yield"],
    whisper: { obj: [], noobj: [] },   // whisper is evocative/context-dependent (like light/starlight) — "mutter" reads grumbly, no universal substitute. Leave it.
    whispered: [],
    whispering: [],
    whispers: { obj: [], noobj: [] },   // dropped "mutters" (grumbly, user-flagged) — no neutral substitute. Leave it.
  };
})();
