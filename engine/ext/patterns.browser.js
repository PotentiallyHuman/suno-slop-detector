/* AUTO-WRAPPED for browser content-script */
(function(){
 const module={exports:{}};
/* patterns.js — ~100 candidate AI-slop pattern detectors (lexical clichés,
 * predictable rhyme pairs, and STRUCTURAL/syntactic templates). Each returns a
 * raw count for a lyrics text; the miner normalises per-line or per-song and
 * compares AI vs human prevalence. No copyrighted text is stored — detectors run
 * on lyrics in memory and only the counts survive. Format-blind: strip markers first.
 */
const SlopScore = (typeof globalThis!=="undefined"?globalThis:window).SlopScore;

function lines(text) {
  return SlopScore.stripSectionLabels(String(text || ""))
    .split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}
const lc = s => s.toLowerCase();
const lastWord = l => { const m = lc(l).match(/[a-z']+/g); return m ? m[m.length - 1] : ""; };
const firstWord = l => { const m = lc(l).match(/[a-z']+/g); return m ? m[0] : ""; };

// ---- A. LEXICAL CLICHÉS / STOCK PHRASES (substring, per text) ----
const PHRASES = [
  "broken heart","tears fall","heart of gold","burning desire","dancing in the rain",
  "dancing in the dark","shining star","deep blue sea","fire in your eyes","fire in my eyes",
  "dark of night","light of day","against all odds","end of the line","weight of the world",
  "piece of my heart","story of my life","light the way","find my way","lose my mind",
  "hold my hand","take my breath","set the world on fire","reach for the stars","touch the sky",
  "chasing dreams","falling apart","fall to pieces","set me free","save me now",
  "lost without you","meant to be","written in the stars","one and only","heart and soul",
  "through the storm","light in the dark","wings to fly","tear us apart","never let you go",
  "hold you tight","close my eyes","deep inside","here we go","by your side",
  "all night long","under the moon","under the stars","like never before","forever and always",
];

// ---- B. PREDICTABLE / LAZY RHYME PAIRS (line-end a then line-end b within 3 lines) ----
const RHYME_PAIRS = [
  ["fire","desire"],["fire","higher"],["heart","apart"],["heart","start"],["night","light"],
  ["night","right"],["night","fight"],["eyes","lies"],["eyes","skies"],["love","above"],
  ["rain","pain"],["rain","again"],["fly","sky"],["sky","high"],["name","flame"],
  ["name","game"],["name","same"],["gold","cold"],["gold","hold"],["soul","whole"],
  ["soul","control"],["tears","fears"],["tears","years"],["dreams","seems"],["true","you"],
  ["blue","you"],["free","me"],["see","be"],["dark","spark"],["away","stay"],["alone","home"],
  ["blue","true"],
];

// ---- C. STRUCTURAL / SYNTACTIC TEMPLATES ----
const STRUCT = {
  firstPersonIOpener: t => { const L = lines(t); return L.length && firstWord(L[0]) === "i" ? 1 : 0; },
  iLineOpeners: t => lines(t).filter(l => firstWord(l) === "i").length,                  // lines that start with "I"
  youLineOpeners: t => lines(t).filter(l => firstWord(l) === "you").length,
  negNegPos: t => {                                                                       // "no X .. no/never Y .. [just/only/but] Z"
    let c = 0, L = lines(t);
    for (let i = 0; i < L.length - 2; i++) {
      const a = lc(L[i]), b = lc(L[i+1]), d = lc(L[i+2]);
      if (/\b(no|never|no more|without)\b/.test(a) && /\b(no|never|no more|without)\b/.test(b)
          && /\b(just|only|but|still|always|forever)\b/.test(d)) c++;
    }
    return c;
  },
  anaphora: t => {                                                                        // consecutive lines, same first word
    let c = 0, L = lines(t);
    for (let i = 1; i < L.length; i++) if (firstWord(L[i]) && firstWord(L[i]) === firstWord(L[i-1])) c++;
    return c;
  },
  everyEnum: t => lines(t).filter(l => /^every\b/i.test(l)).length,
  simileLikeA: t => (lc(t).match(/\blike an? \w+/g) || []).length,
  ohHeyOpener: t => lines(t).filter(l => /^(oh|hey|yeah|whoa|baby|girl|boy)\b/i.test(l)).length,
  tricolon: t => (lc(t).match(/\b\w+,\s*\w+,?\s+and\s+\w+\b/g) || []).length,             // "X, Y, and Z"
  antithesisNotBut: t => (lc(t).match(/\bnot\b[^,.\n]{1,30}\bbut\b/g) || []).length
                       + (lc(t).match(/it'?s not[^,.\n]{0,25}it'?s\b/g) || []).length,
  temporalAbsolute: t => (lc(t).match(/\b(tonight|forever|never|always|evermore|eternity)\b/g) || []).length,
  iFeelWantNeed: t => lines(t).filter(l => /^i (feel|want|need|know|wish|swear|believe)\b/i.test(l)).length,
  collectiveWe: t => (lc(t).match(/\bwe(?:'re| are)\b|\bwe could\b|\bwe'?ll\b/g) || []).length,
  youAndI: t => (lc(t).match(/\byou and i\b|\byou and me\b|\bme and you\b/g) || []).length,
  rhetoricalQ: t => lines(t).filter(l => /\?\s*$/.test(l)).length,
  prepInTheNight: t => (lc(t).match(/\bin the (dark|night|rain|cold|morning|silence|shadows)\b/g) || []).length,
  repeatedWordInLine: t => lines(t).filter(l => /\b(\w+)\b\s+\1\b/i.test(l)).length,       // "run run", "oh oh"
  vocables: t => (lc(t).match(/\b(na na|la la|oh oh|yeah yeah|whoa+|ooh+|ahh+)\b/g) || []).length,
  letItGo: t => (lc(t).match(/\blet (it|me|us|go|them)\b/g) || []).length,
  takeMe: t => (lc(t).match(/\btake me (home|away|higher|back|there|with)\b/g) || []).length,
  holdOnMe: t => (lc(t).match(/\bhold (on|me|you|tight|my hand)\b/g) || []).length,
  allINeed: t => (lc(t).match(/\ball i (need|want|have|ever)\b/g) || []).length,
  myHeart: t => (lc(t).match(/\bmy heart\b/g) || []).length,
  iWillVerb: t => lines(t).filter(l => /^i('?ll| will)\b/i.test(l)).length,
  thisIs: t => (lc(t).match(/\bthis is (the|my|our|how|where|love)\b/g) || []).length,
  causeOpener: t => lines(t).filter(l => /^('?cause|because)\b/i.test(l)).length,
  neverGonna: t => (lc(t).match(/\bnever (gonna|let|be|gonna give|gonna leave)\b/g) || []).length,
  abstractEnding: t => lines(t).filter(l => /(love|pain|heart|tears|fears|fire|light|night|sky|time|dreams?|soul|gold|rain|home|free|alone|forever)$/.test(lastWord(l))).length,
  ingEmotionVerb: t => (lc(t).match(/\b(burning|falling|rising|crying|dying|breaking|fading|shining|aching|bleeding|drowning)\b/g) || []).length,
  titleDropRepeat: t => { const L = lines(t).map(lc); const f = {}; let m = 0; for (const l of L){ f[l]=(f[l]||0)+1; m=Math.max(m,f[l]); } return m >= 3 ? 1 : 0; },
  secondPersonDensity: t => (lc(t).match(/\byou\b|\byour\b|\byou'?re\b/g) || []).length,
  exclaimInterjection: t => lines(t).filter(l => /^(oh|yeah|whoa|hey|woah|ohh|uh)\b/i.test(l)).length,
  endStoppedRatio: t => { const L = lines(t); return L.filter(l => /[.!?,]$/.test(l) || /\b(you|me|now|night|away|tonight|alone)$/.test(lc(l))).length; },
  // ---- ROUND-DISCOVERED SURVIVORS (the strongest tells from close-reading) ----
  maxConsecDup: t => { const L = lines(t).map(lc); let best=1,run=1; for(let i=1;i<L.length;i++){ if(L[i]===L[i-1]){run++;best=Math.max(best,run);} else run=1; } return L.length?best:0; },
  consecDupLines: t => { const L = lines(t).map(lc); let c=0; for(let i=1;i<L.length;i++) if(L[i]===L[i-1]) c++; return c; },              // back-to-back identical lines
  immediateWordDouble: t => { let c=0; for(const l of lines(t)){ const m=lc(l).match(/[a-z']+/g)||[]; for(let i=1;i<m.length;i++) if(m[i]===m[i-1]) c++; } return c; }, // "this this", "without without"
  vocableLines: t => lines(t).filter(l => { const m=lc(l).match(/[a-z']+/g)||[]; if(!m.length) return false; const voc=m.filter(w=>/^(na+|la+|oh+|ooh+|ahh*|yeah+|whoa+|woah+|hey+|mm+|hmm+|da+|ba+)$/.test(w)).length; return voc/m.length >= 0.6; }).length,
  hookMaxRepeat: t => { const L=lines(t).map(lc); const f={}; let m=0; for(const l of L){f[l]=(f[l]||0)+1; m=Math.max(m,f[l]);} return m; },
  contentDensity: t => { const toks=(lc(t).match(/[a-z']+/g)||[]); if(!toks.length) return 0; return +(new Set(toks).size/toks.length).toFixed(3); }, // uniq/total — AI pads (low), humans compress (high)
  // ---- audited-missing templates (REPORT §3 / CLICHES_50) — text-only, extension-reproducible ----
  imNotImB: t => (lc(t).match(/\bi'?m not\b[^.\n]{1,30}\bi'?m\b/g) || []).length,             // "I'm not X, I'm Y"
  idkButOpener: t => (lc(t).match(/\bi (don'?t|do not) know (why|where|how|what|who|when)\b[^.\n]{0,32}\bbut\b/g) || []).length, // "I don't know why, but..."
  maybeMaybe: t => (lc(t).match(/\bmaybe\b[^.\n]{1,30}\bmaybe\b/g) || []).length,              // "maybe X, maybe Y"
  tooXtoY: t => (lc(t).match(/\btoo \w+ to \w+/g) || []).length,                              // "too vast to miss"
  halfXHalfY: t => (lc(t).match(/\bhalf\b[^.\n]{1,22}\bhalf\b/g) || []).length,                // "half light, half shade"
  tracePattern: t => (lc(t).match(/\b(fingers?|fingertips?|hands?) trace\b/g) || []).length + (lc(t).match(/\btrace the \w+/g) || []).length,
  dupLinesTotal: t => { const Lx=lines(t).map(lc).filter(Boolean); const f={}; for(const l of Lx) f[l]=(f[l]||0)+1; return Lx.filter(l=>f[l]>1).length; }, // whole-song repeated-line count
};

function analyze(text) {
  const out = {};
  const L = lines(text);
  const nLines = Math.max(1, L.length);
  // lexical
  const low = lc(text);
  for (const p of PHRASES) out["cliche::" + p] = (low.split(p).length - 1);
  // rhyme pairs
  const ends = L.map(lastWord);
  for (const [a, b] of RHYME_PAIRS) {
    let c = 0;
    for (let i = 0; i < ends.length; i++)
      if (ends[i] === a) for (let j = i + 1; j <= Math.min(ends.length - 1, i + 3); j++)
        if (ends[j] === b) { c++; break; }
    out["rhyme::" + a + "/" + b] = c;
  }
  // structural
  for (const [name, fn] of Object.entries(STRUCT)) out["struct::" + name] = fn(text);
  out.__nLines = nLines;
  return out;
}

module.exports = { analyze, PHRASES, RHYME_PAIRS, STRUCT_NAMES: Object.keys(STRUCT) };

 (typeof globalThis!=="undefined"?globalThis:window).SlopPatterns = module.exports;
})();
