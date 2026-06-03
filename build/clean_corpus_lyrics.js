#!/usr/bin/env node
/* clean_corpus_lyrics.js — SURGICAL removal of chat-assistant contamination from stored AI
 * lyrics, without harming real lyric lines or ad-libs.
 * Removes ONLY:
 *   - anchored section-header lines: "[Verse]", "Verse 1", "Chorus:", "Pre-Chorus", "[Bridge 2]"
 *     (a header is JUST the section word + optional number/colon/brackets — "Verse after verse" stays)
 *   - "Title: …" lines, and a leading bare-quoted short title line
 *   - leading model preamble ("Here's a draft you can build from…", "Sure, …", "Got it, …")
 *   - trailing model commentary ("Let me know if…", "Want me to…", "Hope this helps")
 * Does NOT touch parenthetical ad-libs, internal lines, or anything ambiguous.
 *   node build/clean_corpus_lyrics.js --dry   (preview)   |   node build/clean_corpus_lyrics.js
 */
const fs = require("fs"), path = require("path");
const DRY = process.argv.includes("--dry");
const DIR = path.join(__dirname, "..", "corpus", "models");

const HEADER = /^\s*\[?\s*(verse|chorus|pre[-\s]?chorus|bridge|intro|outro|hook|refrain|interlude|breakdown|coda|vamp)(\s*\d+)?\s*\]?\s*:?\s*$/i;
const TITLE  = /^\s*(title|song title)\s*[:：]/i;
// TIGHT preamble: unambiguous chat openers OR explicit "draft/lyrics you can build" phrasing.
const PRE_OPEN = /^\s*(here'?s |here is |sure[,!.—]|certainly[,!. ]|of course[,!. ]|got it[,!.]|i'?d be happy|absolutely[,!. ])/i;
const PRE_PHRASE = /(you can build (on|from)|a (draft|lyric|version) you can|lyrics? you can build|here'?s a (draft|set|lyric))/i;
const TRAIL = /^\s*(let me know|want me to|would you like|happy to (adjust|tweak|expand|help)|hope (this|that) (helps|works)|i can (also )?(adjust|tweak|expand|add|write another)|if you'?d like)/i;
const QUOTED_TITLE = /^\s*["“'][^"”']{1,48}["”']\s*$/;   // a lone short quoted line (likely a title)

function clean(raw) {
  let lines = String(raw == null ? "" : raw).replace(/\r/g, "").split("\n");
  // remove section headers + "Title:" lines ANYWHERE
  lines = lines.filter(l => !HEADER.test(l) && !TITLE.test(l));
  // leading: blanks, preamble, and a single bare-quoted title as the very first content line
  let titleDropped = false;
  while (lines.length) {
    const l = lines[0].trim();
    if (l === "" || PRE_OPEN.test(l) || (l.length > 40 && PRE_PHRASE.test(l))) { lines.shift(); continue; }
    if (!titleDropped && QUOTED_TITLE.test(l)) { lines.shift(); titleDropped = true; continue; }
    break;
  }
  // trailing: blanks + commentary
  while (lines.length) {
    const l = lines[lines.length - 1].trim();
    if (l === "" || TRAIL.test(l)) lines.pop(); else break;
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

let total = 0;
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith(".json"))) {
  const p = path.join(DIR, f); const d = JSON.parse(fs.readFileSync(p)); const arr = d.songs || d;
  let changed = 0; const samples = [];
  for (const s of arr) {
    if (!s || typeof s.lyrics !== "string") continue;
    const c = clean(s.lyrics);
    if (c !== s.lyrics.trim()) {
      if (samples.length < 4) samples.push(`"${s.lyrics.split("\n").find(x=>x.trim())?.slice(0,55)}" -> "${c.split("\n")[0]?.slice(0,55)}"`);
      if (!DRY) s.lyrics = c;
      changed++;
    }
  }
  total += changed;
  console.log(`${f.padEnd(34)} changed ${changed}/${arr.length}`);
  samples.forEach(x => console.log("    " + x));
  if (!DRY && changed) { fs.writeFileSync(p + ".bak", JSON.stringify(d)); fs.writeFileSync(p, JSON.stringify(d)); }
}
console.log(DRY ? `\n(dry-run) would change ${total}` : `\nwrote ${total} (.bak saved)`);
