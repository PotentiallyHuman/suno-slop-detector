#!/usr/bin/env node
/*
 * analyze.js — corpus analysis of the AI-lyrics baseline.
 * Focus: words, phrases, repetition, and segment structure, compared across
 * ChatGPT / Qwen / Claude. Emits:
 *   analysis/REPORT.md
 *   analysis/ai_words_top100.json
 *   analysis/cliches_top50.json
 */
const fs = require("fs");
const path = require("path");
const SlopScore = require("../src/slop-core.js");

const MODELS_DIR = path.join(__dirname, "..", "corpus", "models");
const OUT = path.join(__dirname, "..", "analysis");
fs.mkdirSync(OUT, { recursive: true });

const STOP = new Set(
  ("a an the and or but if then else of to in on at for with from by as is are was were be been being am " +
   "i you he she it we they me my mine your yours his her hers its our ours their theirs this that these those " +
   "so just like too very can could will would should may might must do does did done have has had not no nor " +
   "im i'm ive i've youre you're its it's dont don't cant can't wont won't aint ain't ill i'll were we're theyre " +
   "up down out in off over under again now here there when where what who how why all any some more most " +
   "oh ooh ohh yeah yea hey yo uh huh la na nah mmm hmm da doo gonna wanna gotta into onto upon than too about " +
   "got get got's let lets let's cause 'cause til till em 'em " +
   "verse chorus bridge intro outro prechorus postchorus hook refrain interlude title song").split(/\s+/)
);

function tokensOf(text) {
  // drop [section] lines, then words
  const body = SlopScore.normalizeStructure(text)
    .split(/\r?\n/)
    .filter((l) => !/^\s*\[[^\]]*\]\s*$/.test(l))
    .join("\n");
  return (body.toLowerCase().match(/[a-z][a-z']*[a-z]|[a-z]/g) || []).filter((w) => w.length > 1);
}
function linesOf(text) {
  return SlopScore.normalizeStructure(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\[[^\]]*\]$/.test(l));
}
function sectionsOf(text) {
  return (SlopScore.normalizeStructure(text).match(/\[[^\]]+\]/g) || []).map((s) =>
    s.replace(/\s*\d+\s*/g, "").toLowerCase()
  );
}

// ---- load AI corpora -------------------------------------------------------
const corpora = {}; // model -> [lyrics]
for (const f of fs.readdirSync(MODELS_DIR).filter((f) => /\.(js|json)$/.test(f))) {
  const mod = require(path.join(MODELS_DIR, f));
  for (const s of mod.songs || []) {
    const m = s.model || mod.model || f;
    const lyr = s.lyrics_en || s.lyrics;
    if ((lyr || "").trim().length > 30) (corpora[m] = corpora[m] || []).push(lyr);
  }
}
const MODELS = Object.keys(corpora).sort();
const ALL = [];
MODELS.forEach((m) => corpora[m].forEach((l) => ALL.push({ model: m, lyrics: l })));
const N = ALL.length;

// ---- human comparison ------------------------------------------------------
const human = require("../examples/human.js").map((h) => h.text);
function per1k(list) {
  const c = {};
  let tot = 0;
  for (const t of list) for (const w of tokensOf(t)) { c[w] = (c[w] || 0) + 1; tot++; }
  const r = {};
  for (const w in c) r[w] = (c[w] / tot) * 1000;
  return { rate: r, tot };
}
const aiRate = per1k(ALL.map((x) => x.lyrics));
const huRate = per1k(human);

// ---- word frequency + document frequency -----------------------------------
const wf = {}, wdoc = {}, wmodelDoc = {};
ALL.forEach((song, id) => {
  const seen = new Set();
  for (const w of tokensOf(song.lyrics)) {
    if (STOP.has(w)) continue;
    wf[w] = (wf[w] || 0) + 1;
    if (!seen.has(w)) {
      seen.add(w);
      wdoc[w] = (wdoc[w] || 0) + 1;
      (wmodelDoc[w] = wmodelDoc[w] || {})[song.model] = (wmodelDoc[w]?.[song.model] || 0) + 1;
    }
  }
});
const lift = (w) => (aiRate.rate[w] || 0) / ((huRate.rate[w] || 0) + 0.05);

const topWords = Object.keys(wf)
  .sort((a, b) => wdoc[b] - wdoc[a] || wf[b] - wf[a])
  .slice(0, 100)
  .map((w) => ({
    word: w, count: wf[w], songs: wdoc[w],
    models: Object.keys(wmodelDoc[w] || {}).length,
    perModel: MODELS.map((m) => (wmodelDoc[w] || {})[m] || 0),
    lift: +lift(w).toFixed(1),
  }));

// ---- n-grams (within a line) -----------------------------------------------
const ng = {}; // "n|gram" -> {count, docs:Set, models:Set}
ALL.forEach((song, id) => {
  for (const line of linesOf(song.lyrics)) {
    const toks = (line.toLowerCase().match(/[a-z][a-z']*[a-z]|[a-z]/g) || []);
    for (let n = 2; n <= 5; n++) {
      for (let i = 0; i + n <= toks.length; i++) {
        const g = toks.slice(i, i + n).join(" ");
        const k = n + "|" + g;
        const e = (ng[k] = ng[k] || { count: 0, docs: new Set(), models: new Set(), n, g });
        e.count++; e.docs.add(id); e.models.add(song.model);
      }
    }
  }
});
const allStop = (g) => g.split(" ").every((w) => STOP.has(w));
const topNgrams = Object.values(ng)
  .filter((e) => e.docs.size >= 3 && !allStop(e.g)) // recurring across >=3 songs, has content
  .sort((a, b) => b.models.size - a.models.size || b.docs.size - a.docs.size || b.count - a.count)
  .slice(0, 60)
  .map((e) => ({ gram: e.g, n: e.n, count: e.count, songs: e.docs.size, models: e.models.size }));

// ---- syntactic cliché patterns ---------------------------------------------
const PATTERNS = [
  { name: "not A, not B, just/but C", re: /\bnot\s+[\w']+(?:\s+[\w']+){0,3},?\s+not\s+[\w']+(?:\s+[\w']+){0,3},?\s+(?:just|but|only|still|yet)\b/gi },
  { name: "I'm not A, I'm (just) B", re: /\bi'?m\s+not\b[^\n.]{0,40}?\bi'?m\s+(?:just|only|still|the)?\b/gi },
  { name: "it's not A, it's B", re: /\bit'?s\s+not\b[^\n.]{0,40}?\bit'?s\b/gi },
  { name: "fingers/hands trace", re: /\b(?:fingers?|hands?)\s+(?:trace|tracing|traced|brush|graze)\b/gi },
  { name: "trace the <noun>", re: /\btrac(?:e|ing|ed)\s+the\b/gi },
  { name: "anaphora: 'carry the X, carry the Y'", re: /\b(\w+)\s+the\s+\w+[, ]+\1\s+the\b/gi },
  { name: "simile 'like a ...'", re: /\blike\s+a\b/gi },
  { name: "'maybe ... maybe ...'", re: /\bmaybe\b[^\n.]{0,40}?\bmaybe\b/gi },
  { name: "'every X, every Y'", re: /\bevery\s+\w+[^\n.]{0,30}?\bevery\s+\w+/gi },
  { name: "rhetorical 'I don't know where/why'", re: /\bi\s+(?:don'?t|do not)\s+know\s+(?:where|why|how|what)\b/gi },
  { name: "'I learned X from Y'", re: /\bi\s+learned\b[^\n.]{0,30}?\bfrom\b/gi },
  { name: "'half X, half Y'", re: /\bhalf\b[^\n.]{0,20}?\bhalf\b/gi },
  { name: "'too A to B'", re: /\btoo\s+\w+\s+to\s+\w+/gi },
  { name: "'in the dead/middle of the night'", re: /\bin the (?:dead|middle) of (?:the )?night\b/gi },
  { name: "'chasing/under the <sky-word>'", re: /\b(?:chasing|under|beneath|across)\s+(?:the\s+)?(?:horizon|skyline|stars?|moon|sky|neon|streetlights?)\b/gi },
];
const patternHits = PATTERNS.map((p) => {
  let total = 0, songs = 0;
  const examples = [];
  ALL.forEach((song) => {
    const flat = SlopScore.normalizeStructure(song.lyrics).replace(/\[[^\]]*\]/g, " ");
    const m = flat.match(p.re);
    if (m) {
      total += m.length; songs++;
      if (examples.length < 3) examples.push(m[0].replace(/\s+/g, " ").trim().slice(0, 60));
    }
  });
  return { name: p.name, total, songs, examples };
}).sort((a, b) => b.songs - a.songs || b.total - a.total);

// ---- distinctive single-word clichés (high AI-vs-human lift) ----------------
const imagery = topWords
  .filter((w) => w.songs >= 4 && w.lift >= 3)
  .sort((a, b) => b.lift - a.lift)
  .slice(0, 30);

// ---- structure -------------------------------------------------------------
function structureStats(lyrics) {
  const secs = sectionsOf(lyrics);
  const lines = linesOf(lyrics);
  const lc = {};
  for (const l of lines) lc[l.toLowerCase()] = (lc[l.toLowerCase()] || 0) + 1;
  const repeatedLines = Object.values(lc).filter((c) => c > 1).reduce((a, c) => a + c, 0);
  return { nSec: secs.length, secs, repeatLineRatio: repeatedLines / Math.max(1, lines.length) };
}
const structByModel = {};
for (const m of MODELS) {
  const ss = corpora[m].map(structureStats);
  const secCount = {};
  for (const s of ss) for (const x of s.secs) secCount[x] = (secCount[x] || 0) + 1;
  structByModel[m] = {
    avgSections: +(ss.reduce((a, s) => a + s.nSec, 0) / ss.length).toFixed(1),
    avgRepeatLineRatio: +(ss.reduce((a, s) => a + s.repeatLineRatio, 0) / ss.length).toFixed(2),
    sectionTagsPerSong: +(ss.reduce((a, s) => a + s.nSec, 0) / ss.length).toFixed(1),
    sectionTypes: Object.entries(secCount).sort((a, b) => b[1] - a[1]),
  };
}

// ---- per-model distinctive words -------------------------------------------
function modelTop(model) {
  const c = {}, tot = {};
  const inThis = per1k(corpora[model]).rate;
  const others = per1k(ALL.filter((x) => x.model !== model).map((x) => x.lyrics)).rate;
  return Object.keys(inThis)
    .filter((w) => !STOP.has(w) && (inThis[w] || 0) > 0.5)
    .map((w) => ({ w, ratio: +((inThis[w] || 0) / ((others[w] || 0) + 0.05)).toFixed(1), rate: +inThis[w].toFixed(2) }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 12);
}
const distinctive = {};
for (const m of MODELS) distinctive[m] = modelTop(m);

// ============================ WRITE OUTPUTS =================================
fs.writeFileSync(
  path.join(OUT, "ai_words_top100.json"),
  JSON.stringify({ corpusSize: N, models: MODELS, words: topWords }, null, 2)
);

const cliches = {
  syntacticPatterns: patternHits,
  recurringPhrases: topNgrams,
  imageryWords: imagery,
};
fs.writeFileSync(path.join(OUT, "cliches_top50.json"), JSON.stringify(cliches, null, 2));

// ---- markdown report -------------------------------------------------------
const md = [];
const P = (s) => md.push(s);
P(`# AI Lyrics Corpus Analysis\n`);
P(`Corpus: **${N} AI songs** across ${MODELS.length} models — ${MODELS.map((m) => `${m} (${corpora[m].length})`).join(", ")}. Human anchors: ${human.length}.\n`);
P(`Focus: vocabulary, recurring phrases, syntactic tics, and segment structure. All compared across models.\n`);

P(`## 1. Segment structure\n`);
P(`| model | avg sections/song | section types (most common) | repeated-line ratio |`);
P(`|---|---|---|---|`);
for (const m of MODELS) {
  const s = structByModel[m];
  P(`| ${m} | ${s.avgSections} | ${s.sectionTypes.slice(0, 5).map(([k, v]) => `${k.replace(/[\[\]]/g, "")}×${v}`).join(", ")} | ${s.avgRepeatLineRatio} |`);
}
P(``);

P(`## 2. Most overused AI words (top 30 of 100)\n`);
P(`Ranked by how many of the ${N} songs use them. "lift" = how much more often than in human anchors.\n`);
P(`| # | word | songs | models | lift | ${MODELS.join(" | ")} |`);
P(`|---|---|---|---|---|${MODELS.map(() => "---").join("|")}|`);
topWords.slice(0, 30).forEach((w, i) =>
  P(`| ${i + 1} | ${w.word} | ${w.songs}/${N} | ${w.models}/${MODELS.length} | ${w.lift}× | ${w.perModel.join(" | ")} |`)
);
P(`\n→ full 100 in \`analysis/ai_words_top100.json\`\n`);

P(`## 3. Syntactic cliché patterns\n`);
P(`| pattern | songs | hits | example |`);
P(`|---|---|---|---|`);
for (const p of patternHits) P(`| ${p.name} | ${p.songs}/${N} | ${p.total} | ${(p.examples[0] || "").replace(/\|/g, "/")} |`);
P(``);

P(`## 4. Recurring multi-word phrases (across ≥3 songs)\n`);
P(`| phrase | songs | models | count |`);
P(`|---|---|---|---|`);
for (const g of topNgrams.slice(0, 30)) P(`| ${g.gram} | ${g.songs} | ${g.models} | ${g.count} |`);
P(``);

P(`## 5. Distinctive imagery words (high AI-vs-human lift)\n`);
P(imagery.map((w) => `${w.word} (${w.lift}×)`).join(", ") + "\n");

P(`## 6. Per-model fingerprint (words each model over-uses vs the others)\n`);
for (const m of MODELS) P(`- **${m}**: ${distinctive[m].map((x) => x.w).slice(0, 10).join(", ")}`);
P(``);

fs.writeFileSync(path.join(OUT, "REPORT.md"), md.join("\n"));
console.log(`wrote analysis/REPORT.md, ai_words_top100.json, cliches_top50.json`);
console.log(`corpus: ${N} songs, models: ${MODELS.join(", ")}`);
