/*
 * portability_tells.js — catch the structural AI tells the lexicon-based
 * detector misses. Three measures, each a per-song RATE (count / line), all
 * text-only and offline. Reuses the project's ABSTRACT/CONCRETE word sets.
 *
 * The unifying idea (the "portability test"): AI lyrics manufacture the FEELING
 * of depth while avoiding the COST of a concrete, committed claim. The three
 * tells below are the grammatical molds that absence-of-content sets into:
 *
 *   T1  hedgeJust       — filler "just/only/merely/simply" (empty-calorie beat)
 *   T2  negTemplate     — "it's not X, it's not Y, it's Z" / "I'm not X, I'm Y"
 *   T3  floatingLine    — a line carrying abstract/emotion load with NO concrete
 *                         anchor (no object, no proper noun, no number) =
 *                         "could be in a thousand other songs"
 *
 * Each function returns a rate so songs of different length compare fairly.
 */
'use strict';
const slop = require('../src/slop-core.js');

// ---- lexicons (consistent with src/features.js, extended) -------------------
const ABSTRACT = new Set((
  "love heart hearts soul souls pain dream dreams hope hopes fear fears faith fate destiny freedom truth lies " +
  "time forever eternity eternal memory memories feeling feelings emotion desire passion longing loneliness " +
  "lonely sadness sorrow grief joy happiness peace silence infinity beauty magic miracle glory spirit hate " +
  "anger darkness light shadows shadow soulmate hopelessness emptiness void chaos heaven hell paradise " +
  "thoughts mind heartache heartbreak strength weakness courage doubt regret shame pride guilt"
).split(/\s+/));

const CONCRETE = new Set((
  "see saw look looking watched eyes hear heard listen sound loud smell scent taste sweet bitter sour salt " +
  "touch skin hands fingers cold warm hot rough smooth car truck road street door window kitchen table chair " +
  "coffee cigarette phone dress shirt shoes rain snow dog cat money beer wine whiskey bed floor wall key keys " +
  "clock radio train bus knife glass bottle hair dust dirt mud blood sweat bread porch yard fence cup plate " +
  "boots jacket pocket sidewalk diner counter mirror photograph letter stairs curb gravel engine seat hook " +
  "lighter receipt mailbox driveway couch sink towel ashtray screen keyboard"
).split(/\s+/));

// "anybody's song" generic phrases — portability machines. High-frequency mood
// frames that fit any song because they name no specific thing.
const GENERIC_PHRASES = [
  "deep inside", "deep down", "inside of me", "inside my", "all alone", "on my own",
  "in my mind", "in my head", "in my heart", "in my soul", "in the dark", "in the night",
  "these walls", "all the pain", "all the tears", "all this time", "all i need", "all i have",
  "all i know", "all i am", "all i ever", "nothing left", "nothing more", "nothing at all",
  "no one knows", "no one understands", "the emptiness", "the silence", "the void",
  "broken heart", "tears i cry", "my demons", "darkest", "lost inside", "lost in the",
  "falling apart", "fading away", "holding on", "letting go", "set me free", "save me",
  "feel alive", "come alive", "burning inside", "screaming inside", "empty inside",
  "buried deep", "hold me", "make it stop", "fill the void", "endless night", "the abyss",
];

// words that, after "just", make it temporal/literal rather than a hedge
const JUST_LITERAL_NEXT = /^(now|then|because|about|as|once|a\s+(moment|second|minute)|in\s+time|like\s+that)\b/;

function lines(text) {
  return slop.stripSectionLabels(String(text))
    .split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
}
const lc = s => s.toLowerCase();
function words(s) { return lc(s).match(/[a-z']+/g) || []; }

// --- T1: filler "just" + sibling minimizers ---------------------------------
function hedgeJust(text) {
  const L = lines(text);
  let just = 0, minim = 0;
  for (const line of L) {
    const low = lc(line);
    // all "just" minus the temporal/literal uses (counts multiple per line)
    const allJust = (low.match(/\bjust\b/g) || []).length;
    const literal = (low.match(/\bjust\s+(now|then|because|about|as|once|a (?:moment|second|minute)|in time|like that)\b/g) || []).length;
    just += Math.max(0, allJust - literal);
    minim += (low.match(/\b(only|merely|simply|barely)\b/g) || []).length;
  }
  const n = Math.max(1, L.length);
  return { justRate: just / n, minimRate: minim / n, hedgeRate: (just + 0.5 * minim) / n,
           justCount: just };
}

// --- T2: TEMPLATED ANAPHORA (the real tell) ----------------------------------
// Not "negation" — humans negate constantly ("I'm not afraid"). The tell is the
// SAME opening frame fired 2-3+ times in a row with DIFFERENT fill-ins, like a
// list-generator: "I'm not A, I'm not B, I'm not C" / "not A, not B, just C".
// A human refrain repeats the WHOLE line identically; an AI template repeats the
// FRAME and swaps the ending. So we require the remainders to DIFFER.
const NEG_FRAME = /^(i'?m |i am |it'?s |that'?s |this is |there'?s |we'?re |you'?re |we are |you are |you'?re )?(not|no|never|neither|ain'?t|nothing|no more)\b/;

function clauses(text) {
  return lines(text).flatMap(l => l.split(/[,;]+| - /).map(s => s.trim()).filter(Boolean));
}
function frameInfo(clause) {
  const w = lc(clause).match(/[a-z']+/g) || [];
  if (!w.length) return { f: null, rem: '' };
  const j = w.join(' ');
  if (NEG_FRAME.test(j)) return { f: 'NEG', rem: j.replace(NEG_FRAME, '').trim() };
  return { f: w.slice(0, 2).join(' '), rem: w.slice(2).join(' ') };
}
function templateAnaphora(text) {
  const cls = clauses(text);
  const F = cls.map(frameInfo);
  let negScore = 0, frameScore = 0, tripleNeg = 0, resolvedNot = 0, negRuns = 0;
  let i = 0;
  while (i < F.length) {
    const cur = F[i].f;
    if (cur == null) { i++; continue; }
    let j = i + 1;
    while (j < F.length && F[j].f === cur) j++;
    const runLen = j - i;
    if (runLen >= 2 && new Set(F.slice(i, j).map(x => x.rem)).size >= 2) {
      if (cur === 'NEG') {
        negScore += runLen - 1; negRuns++;
        if (runLen >= 3) tripleNeg++;
        // "...just/but C" resolution right after a negation run
        if (j < F.length && /^(just|but|it'?s|i'?m|only)\b/.test((cls[j] || '').toLowerCase())) resolvedNot++;
      } else frameScore += runLen - 1;
    }
    i = j;
  }
  const n = Math.max(1, lines(text).length);
  return {
    negAnaphoraRate: negScore / n,      // "I'm not A, I'm not B" run-weighted
    frameAnaphoraRate: frameScore / n,  // any "every X, every Y" fill-in run
    resolvedNotRate: resolvedNot / n,   // "not A, not B, JUST C"
    tripleNegCount: tripleNeg, negRuns,
    anaphoraRate: (negScore + frameScore) / n,
  };
}

// --- T2b: the SELF-QUALIFYING EMOTIONAL TEMPLATE (the real specimen tell) -----
// The move that grates: deny a feeling and replace it with an adjacent one
// ("I'm not lonely, I'm just awake"), define wants by negation
// ("I don't want X, I don't want Y, I just want Z"), and concede
// ("I know it's dumb, but..."). Catches contracted "don't" (which the anaphora
// detector misses) and weights up when the fill-ins are abstract feelings.
const FEELING = new Set((
  "lonely awake broken alone tired empty numb hollow fine okay fooled angry sad happy mad scared afraid " +
  "hurt lost found whole free replaced pretending sure here gone done over fading falling drowning " +
  "different better worse same enough ready strong weak right wrong real fake bitter cold blind awake " +
  "love pain fear hope dream feeling feelings dumb late strange normal harder"
).split(/\s+/));
const DENY_LINE = /^(i\s+)?(do ?n'?t|don'?t|can'?t|won'?t|did ?n'?t|ai ?n'?t|i'?m not|it'?s not|you'?re not|we'?re not|there'?s no|i never|i'?ll never|i don'?t want|i don'?t miss|i don'?t need)\b/i;

function selfQualify(text) {
  const L = lines(text);
  let deny = 0, correction = 0, concessive = 0, abstractTemplate = 0, denyRun = 0, run = 0;
  for (const raw of L) {
    const low = lc(raw.trim());
    const isDeny = DENY_LINE.test(low);
    if (isDeny) { deny++; run++; } else { if (run >= 2) denyRun += run - 1; run = 0; }
    // feeling-correction: "I'm not X (...) just/I'm Y"  or  "not X, just/it's Y"
    if (/\b(i'?m|it'?s|you'?re) not\b/.test(low) && /\bjust\b/.test(low)) correction++;
    else if (/\bnot\b[^,.]{0,25},\s*(just|i'?m|it'?s|but)\b/.test(low)) correction++;
    // concessive hedge: "I know it's X" / "I know ... but"
    if (/\bi know it'?s\b/.test(low) || /\bi know\b[^.]*\bbut\b/.test(low)) concessive++;
    // abstract feeling in a deny/just line
    if (isDeny || /\bjust\b/.test(low)) {
      if ((low.match(/[a-z']+/g) || []).some(w => FEELING.has(w))) abstractTemplate++;
    }
  }
  if (run >= 2) denyRun += run - 1;
  const n = Math.max(1, L.length);
  return {
    denyLineRate: deny / n, denyRunRate: denyRun / n, correctionRate: correction / n,
    concessiveRate: concessive / n, abstractTemplateRate: abstractTemplate / n,
    selfQualifyScore: (2 * correction + 1.5 * denyRun + concessive + abstractTemplate) / n,
  };
}

// --- T3: floating (portable) lines + generic-phrase density ------------------
function portability(text) {
  const L = lines(text);
  let floating = 0, genericHits = 0, withAbstract = 0;
  for (const line of L) {
    const low = lc(line);
    const ws = words(line);
    const abstractLoad = ws.filter(w => ABSTRACT.has(w)).length;
    const concreteWord = ws.some(w => CONCRETE.has(w));
    // proper noun: a capitalized word NOT at line start (skip word 0 — every
    // lyric line is sentence-cap'd) and not the pronoun "I"/"I'll" etc.
    const toks = line.split(/\s+/);
    let properNoun = false;
    for (let i = 1; i < toks.length; i++) {
      const w = toks[i].replace(/[^A-Za-z']/g, '');
      if (/^[A-Z][a-z]{2,}$/.test(w) && w !== 'I') { properNoun = true; break; }
    }
    const number = /\b\d+\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand)\b/.test(low);
    const hasConcreteAnchor = concreteWord || properNoun || number;
    const genericPhrase = GENERIC_PHRASES.some(p => low.includes(p));
    if (genericPhrase) genericHits++;
    if (abstractLoad >= 1) withAbstract++;
    // FLOATING: emotional/generic load with no concrete thing to hold it down
    if ((abstractLoad >= 1 || genericPhrase) && !hasConcreteAnchor) floating++;
  }
  const n = Math.max(1, L.length);
  return { floatingRate: floating / n, genericPhraseRate: genericHits / n,
           abstractLineRate: withAbstract / n, nLines: n };
}

// --- combined per-song report -----------------------------------------------
function analyze(text) {
  const t1 = hedgeJust(text), t2 = templateAnaphora(text), t3 = portability(text);
  // single "genericness" index for ranking (the sub-rates are the real signal)
  const genericness = 2.0 * t2.negAnaphoraRate + 1.0 * t2.frameAnaphoraRate +
                      1.0 * t1.hedgeRate + 1.0 * t3.floatingRate + 0.8 * t3.genericPhraseRate;
  return { ...t1, ...t2, ...t3, genericness };
}

module.exports = { analyze, hedgeJust, templateAnaphora, selfQualify, portability, lines };

// --- CLI: node portability_tells.js <file>  → per-song breakdown -------------
if (require.main === module) {
  const fs = require('fs');
  const f = process.argv[2];
  const text = f ? fs.readFileSync(f, 'utf8') : fs.readFileSync(0, 'utf8');
  console.log(JSON.stringify(analyze(text), null, 2));
}
