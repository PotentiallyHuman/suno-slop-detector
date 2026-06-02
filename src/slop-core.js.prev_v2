/*
 * slop-core.js — Suno AI Slop Detector scoring engine
 *
 * Pure, dependency-free. Works in the browser (attaches to globalThis.SlopScore)
 * and in Node (module.exports) so the same code powers the extension AND the
 * calibration tests in /test.
 *
 * The score is a tongue-in-cheek HEURISTIC, not a detector of ground truth.
 * Humans use these words too. See README "Honesty" section.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SlopScore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // 1. LEXICON — overused single words. weight 1 (mild) .. 3 (flashing red).
  //    These are words that show up in Suno/LLM lyrics at wildly higher rates
  //    than in human songwriting corpora. Tune freely.
  // ---------------------------------------------------------------------------
  const WORD_WEIGHTS = {
    // tier 3 — the giveaways
    neon: 3, horizon: 3, shadows: 3, shadow: 3, echoes: 3, echo: 3,
    whisper: 3, whispers: 3, whispering: 3, ember: 3, embers: 3, ashes: 3,
    abyss: 3, paradise: 3, wildfire: 3, silhouette: 3, crimson: 3, velvet: 3,
    ethereal: 3, cascade: 3, cascading: 3, surrender: 3, infinity: 3,
    eternity: 3, serenade: 3, kaleidoscope: 3, labyrinth: 3, tapestry: 3,
    symphony: 3, luminous: 3, celestial: 3, cosmic: 3, radiant: 3,
    // tier 2 — common AI texture
    flame: 2, flames: 2, storm: 2, thunder: 2, lightning: 2, midnight: 2,
    moonlight: 2, starlight: 2, stardust: 2, chains: 2, scars: 2, scar: 2,
    ghost: 2, ghosts: 2, phantom: 2, veins: 2, bones: 2, soul: 2, souls: 2,
    heartbeat: 2, concrete: 2, shattered: 2, fragments: 2, fading: 2,
    faded: 2, rising: 2, burning: 2, electric: 2, frozen: 2, golden: 2,
    diamond: 2, fragile: 2, hollow: 2, drowning: 2, endless: 2, eternal: 2,
    demons: 2, demon: 2, angels: 2, void: 2, flicker: 2, flickering: 2,
    horizons: 2, glimmer: 2, shimmer: 2, eternal: 2, unbreakable: 2,
    // tier 1 — pop-lyric staples (everyone uses these; mild signal)
    fire: 1, heart: 1, night: 1, light: 1, sky: 1, stars: 1, ocean: 1,
    sea: 1, river: 1, dream: 1, dreams: 1, lost: 1, alone: 1, pain: 1,
    tears: 1, cold: 1, dark: 1, darkness: 1, free: 1, alive: 1, breathe: 1,
    wings: 1, fight: 1, forever: 1, rain: 1, dust: 1, broken: 1, pieces: 1,
  };

  // ---------------------------------------------------------------------------
  // 2. PHRASES — cliché multi-word stock phrases. Higher weight; a phrase hit
  //    is much more diagnostic than a single word.
  // ---------------------------------------------------------------------------
  const PHRASES = [
    { p: "in the dead of night", w: 4 },
    { p: "break of dawn", w: 4 },
    { p: "moth to a flame", w: 4 },
    { p: "rise from the ashes", w: 4 },
    { p: "from the ashes", w: 3 },
    { p: "like a phoenix", w: 4 },
    { p: "concrete jungle", w: 4 },
    { p: "neon lights", w: 4 },
    { p: "city lights", w: 3 },
    { p: "painted skies", w: 4 },
    { p: "painted sky", w: 4 },
    { p: "dancing in the rain", w: 3 },
    { p: "dancing in the dark", w: 3 },
    { p: "we won't back down", w: 3 },
    { p: "we are the ones", w: 3 },
    { p: "chasing the horizon", w: 4 },
    { p: "shadows on the wall", w: 4 },
    { p: "whisper in the wind", w: 4 },
    { p: "calm before the storm", w: 4 },
    { p: "weight of the world", w: 3 },
    { p: "fire in my veins", w: 4 },
    { p: "fire in your veins", w: 4 },
    { p: "ghost of you", w: 3 },
    { p: "pieces of me", w: 3 },
    { p: "tear me apart", w: 3 },
    { p: "save me from myself", w: 4 },
    { p: "demons in my head", w: 4 },
    { p: "light in the darkness", w: 3 },
    { p: "into the night", w: 2 },
    { p: "till the morning light", w: 3 },
    { p: "shattered glass", w: 3 },
    { p: "broken pieces", w: 3 },
    { p: "burning like a", w: 2 },
    { p: "shining like a", w: 2 },
    { p: "lost in the moment", w: 3 },
    { p: "frozen in time", w: 3 },
    { p: "against all odds", w: 2 },
  ];

  // ---------------------------------------------------------------------------
  // 3. LAZY RHYME PAIRS — predictable end-rhymes. Each unordered pair found at
  //    consecutive-ish line ends scores. These are the rhymes a rhyming
  //    dictionary (or an LLM) reaches for first.
  // ---------------------------------------------------------------------------
  const LAZY_RHYMES = [
    ["fire", "desire"], ["fire", "higher"], ["night", "light"], ["night", "fight"],
    ["night", "right"], ["heart", "apart"], ["heart", "start"], ["pain", "rain"],
    ["rain", "again"], ["sky", "fly"], ["sky", "high"], ["fly", "high"],
    ["eyes", "lies"], ["eyes", "skies"], ["love", "above"], ["away", "stay"],
    ["fall", "all"], ["alone", "home"], ["soul", "control"], ["soul", "whole"],
    ["name", "flame"], ["name", "same"], ["free", "me"], ["see", "be"],
    ["dream", "seem"], ["around", "found"], ["ground", "sound"], ["gold", "cold"],
    ["gold", "hold"], ["cry", "why"], ["true", "you"], ["blue", "you"],
    ["dark", "spark"], ["name", "game"], ["tears", "years"], ["fears", "tears"],
    ["arms", "harm"], ["heart", "dark"], ["alive", "survive"], ["believe", "free"],
  ];
  // index rhyme words -> set of partners
  const RHYME_MAP = {};
  for (const [a, b] of LAZY_RHYMES) {
    (RHYME_MAP[a] = RHYME_MAP[a] || new Set()).add(b);
    (RHYME_MAP[b] = RHYME_MAP[b] || new Set()).add(a);
  }

  // ---------------------------------------------------------------------------
  // 4. SECTION TAGS — Suno emits [Verse 1] / [Chorus] / [Bridge] etc. literally
  //    in the lyric text. Strong tell when present (most human-pasted lyrics
  //    don't carry them).
  // ---------------------------------------------------------------------------
  const SECTION_TAG_RE =
    /\[\s*(verse|chorus|pre-?chorus|post-?chorus|bridge|outro|intro|hook|refrain|interlude|drop|breakdown|build-?up|verse\s*\d+)[^\]]*\]/gi;

  const STOPWORDS = new Set(
    ("a an the and or but if then of to in on at for with from by as is are was " +
     "were be been being i you he she it we they me my your his her its our their " +
     "this that these those so just like dont don't im i'm cant can't wont won't " +
     "ill i'll ive i've youre you're its it's all up down out no not yeah oh ooh " +
     "la na hey yo uh mmm").split(/\s+/)
  );

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  // Convert bare section headers ("Verse 1", "Pre-Chorus", "Final Chorus") that
  // sit alone on a line into Suno-style [Verse 1] brackets, so ChatGPT/Qwen/
  // human-pasted lyrics are scored on the same footing as Suno's bracket tags.
  const BARE_HEADER_RE =
    /^[\s>*_~`#()-]*((?:final\s+)?(?:pre[\s-]?chorus|post[\s-]?chorus|verse|chorus|bridge|intro|outro|hook|refrain|interlude))\s*(\d*)\s*[:.)]?[\s*_~`#()-]*$/i;
  const TITLE_RE = /^[#*\s]*(?:song\s+)?title\s*:.*$/i;
  function normalizeStructure(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => {
        if (TITLE_RE.test(line)) return ""; // drop "Song Title: …" meta lines
        const m = line.match(BARE_HEADER_RE);
        if (!m) return line;
        const w = m[1].toLowerCase().replace(/\s+/g, " ");
        let canon;
        if (w.includes("pre")) canon = "Pre-Chorus";
        else if (w.includes("post")) canon = "Post-Chorus";
        else if (w.includes("chorus")) canon = "Chorus";
        else if (w.startsWith("verse")) canon = "Verse";
        else if (w.startsWith("bridge")) canon = "Bridge";
        else canon = w.charAt(0).toUpperCase() + w.slice(1);
        const num = m[2] && (canon === "Verse" || canon === "Bridge") ? " " + m[2] : "";
        return "[" + canon + num + "]";
      })
      .join("\n");
  }

  // Remove ALL section labels entirely, leaving plain lyric lines in blank-line
  // separated segments (used to normalise stored corpus files to one format).
  function stripSectionLabels(text) {
    return normalizeStructure(text)
      .split(/\r?\n/)
      .filter((l) => !/^\s*\[[^\]]*\]\s*$/.test(l))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function normalize(text) {
    return (text || "").toLowerCase();
  }

  function tokenize(text) {
    const m = normalize(text).match(/[a-z']+/g);
    return m || [];
  }

  function logistic(x) {
    return 1 / (1 + Math.exp(-x));
  }

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  // last word of a line, stripped of punctuation
  function lineEndWord(line) {
    const m = normalize(line).match(/[a-z']+/g);
    return m && m.length ? m[m.length - 1] : null;
  }

  // ---------------------------------------------------------------------------
  // weights for combining sub-signals into the final logit. Calibrated in
  // /test/calibrate.js so human classics land low and Suno slop lands high.
  // ---------------------------------------------------------------------------
  // Sub-signals are passed through saturating (diminishing-returns) curves so a
  // pile-up of clichés doesn't instantly slam the score to a flat 100% — the
  // top end stays expressive (88 vs 96 means something). Tuned in calibrate.js.
  const W = {
    bias: -2.3,
    wordDensity: 4.6,    // × tanh(density / 0.13)
    phrase: 1.05,        // × sqrt(weighted phrase mass)
    rhyme: 0.62,         // × sqrt(lazy rhyme pair count)
    repetition: 2.6,     // × (1 - lexical diversity), length-corrected
    sectionTag: 0.45,    // × min(6, section tag count)
  };

  function scoreLyrics(rawText) {
    const text = normalizeStructure(rawText || "");
    const lines = text.split(/\r?\n/);
    const tokens = tokenize(text);
    const contentTokens = tokens.filter((t) => !STOPWORDS.has(t));
    const nTokens = tokens.length;
    const nContent = Math.max(1, contentTokens.length);

    // --- signal A: weighted cliché word density -----------------------------
    let clicheMass = 0;
    const wordHits = {}; // word -> {count, weight}
    for (const t of tokens) {
      const w = WORD_WEIGHTS[t];
      if (w) {
        clicheMass += w;
        if (!wordHits[t]) wordHits[t] = { count: 0, weight: w };
        wordHits[t].count++;
      }
    }
    const wordDensity = clicheMass / nContent; // typically 0..0.5

    // --- signal B: phrase hits ----------------------------------------------
    const flat = normalize(text).replace(/\s+/g, " ");
    let phraseMass = 0;
    const phraseHits = [];
    for (const { p, w } of PHRASES) {
      let idx = 0,
        count = 0;
      while ((idx = flat.indexOf(p, idx)) !== -1) {
        count++;
        idx += p.length;
      }
      if (count) {
        phraseMass += w * count;
        phraseHits.push({ phrase: p, count, weight: w });
      }
    }

    // --- signal C: lazy rhyme pairs at line ends ----------------------------
    const endWords = lines.map(lineEndWord).filter(Boolean);
    let rhymeCount = 0;
    const rhymeHits = [];
    for (let i = 0; i < endWords.length; i++) {
      // look at the next 2 lines (couplet / alternating)
      for (let j = i + 1; j <= i + 2 && j < endWords.length; j++) {
        const a = endWords[i],
          b = endWords[j];
        if (RHYME_MAP[a] && RHYME_MAP[a].has(b)) {
          rhymeCount++;
          rhymeHits.push([a, b]);
        }
      }
    }

    // --- signal D: lexical repetition (length-corrected) --------------------
    const uniqueContent = new Set(contentTokens).size;
    let ttr = uniqueContent / nContent; // 0..1, higher = more varied
    // short lyrics are naturally higher-TTR; correct toward a 200-word baseline
    const lengthFactor = Math.min(1, nContent / 200);
    const correctedTtr = ttr * (0.6 + 0.4 * lengthFactor);
    const repetition = clamp01(1 - correctedTtr); // higher = more repetitive

    // --- signal E: section tags ---------------------------------------------
    const tagMatches = text.match(SECTION_TAG_RE) || [];
    const sectionTags = Math.min(6, tagMatches.length);

    // --- combine (each signal through a saturating curve) --------------------
    const sWords = W.wordDensity * Math.tanh(wordDensity / 0.35);
    const sPhrase = W.phrase * Math.sqrt(phraseMass);
    const sRhyme = W.rhyme * Math.sqrt(rhymeCount);
    const sRepeat = W.repetition * repetition;
    const sTags = W.sectionTag * sectionTags;

    const logit = W.bias + sWords + sPhrase + sRhyme + sRepeat + sTags;
    const probability = logistic(logit);
    const score = Math.round(probability * 100);

    return {
      score, // 0..100  "% AI slop"
      label: verdict(score),
      breakdown: {
        words: +sWords.toFixed(2),
        phrases: +sPhrase.toFixed(2),
        rhymes: +sRhyme.toFixed(2),
        repetition: +sRepeat.toFixed(2),
        sectionTags: +sTags.toFixed(2),
      },
      stats: {
        totalWords: nTokens,
        contentWords: nContent,
        clicheMass,
        wordDensity: +wordDensity.toFixed(3),
        phraseMass,
        rhymeCount,
        ttr: +ttr.toFixed(3),
        repetition: +repetition.toFixed(3),
        sectionTags,
      },
      hits: {
        words: Object.entries(wordHits)
          .map(([word, v]) => ({ word, count: v.count, weight: v.weight }))
          .sort((a, b) => b.weight * b.count - a.weight * a.count),
        phrases: phraseHits,
        rhymes: rhymeHits,
      },
    };
  }

  function verdict(score) {
    if (score >= 80) return "Reeks of slop 🤖";
    if (score >= 60) return "Heavy AI seasoning";
    if (score >= 40) return "Suspiciously seasoned";
    if (score >= 20) return "Mostly human-ish";
    return "Refreshingly original";
  }

  // regex to highlight flagged words/phrases in the DOM (longest first)
  function buildHighlightRegex() {
    const words = Object.keys(WORD_WEIGHTS);
    const phrases = PHRASES.map((x) => x.p);
    const all = [...phrases, ...words]
      .sort((a, b) => b.length - a.length)
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp("\\b(" + all.join("|") + ")\\b", "gi");
  }

  return {
    scoreLyrics,
    verdict,
    normalizeStructure,
    stripSectionLabels,
    buildHighlightRegex,
    WORD_WEIGHTS,
    PHRASES,
    LAZY_RHYMES,
    WEIGHTS: W,
  };
});
