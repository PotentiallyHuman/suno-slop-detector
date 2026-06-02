/* clean_lyrics.js — strip non-lyric noise from raw model output.
 * Removes: conversational preamble/footer, markdown section labels
 * (**Verse 1:**, [Chorus], "Bridge:"), metadata lines (Title:, Genre:),
 * markdown dividers/bold-titles, list bullets. Returns plain lyrics.
 * Used by build/gen_qwen_diverse.mjs before saving each song.
 */
'use strict';

const PREAMBLE_RE = /^\s*(sure|of course|certainly|here'?s|here are|here is|absolutely|alright|ok(ay)?|i can|i'd|i'll|let me|let's|below is|enjoy|hope you|feel free|i hope|that's it|the end|i love|i'?m happy|i am happy|i'?ve|i have written|this song)/i;
const META_LINE_RE = /^\s*(title|song|artist|genre|key|tempo|tags?|notes?|style|mood|theme|bpm|chord|capo)\s*[:\-]/i;
const SECTION_INLINE_RE = /^[\s*#_>]*\(?\[?\s*(verse|chorus|bridge|intro|outro|pre[-\s]?chorus|hook|refrain|tag|interlude|breakdown|drop|coda|post[-\s]?chorus|reprise|vamp)\s*\d*\s*\)?\]?\s*:?\s*\**\s*$/i;
const MD_DIVIDER_RE = /^[\s]*([*#=\-_]{2,})\s*$/;
const MD_BOLD_HEADER_RE = /^\s*\*\*[^*\n]+\*\*\s*$/;
const HASH_HEADER_RE = /^\s*#{1,6}\s+\S/;
const STAR_BULLET_RE = /^\s*[*\-•·]\s+/;
const SPEAKER_LABEL_RE = /^\s*(speaker\s*[a-z0-9]+|person\s*[a-z0-9]+|narrator|singer)\s*:\s*/i;

function isNoiseLine(line) {
  const t = line.trim();
  if (!t) return false; // blanks handled separately
  if (META_LINE_RE.test(t)) return true;
  if (SECTION_INLINE_RE.test(t)) return true;
  if (MD_DIVIDER_RE.test(t)) return true;
  if (MD_BOLD_HEADER_RE.test(t)) return true;
  if (HASH_HEADER_RE.test(t)) return true;
  return false;
}

function looksLikePreamble(line) {
  const t = line.trim();
  if (!t) return true;
  if (PREAMBLE_RE.test(t)) return true;
  if (isNoiseLine(t)) return true;
  // a single short line ending with ":" and not containing punctuation looks like a section header / intro line
  if (/:\s*$/.test(t) && t.split(/\s+/).length <= 12 && !/[?!.,]/.test(t.slice(0, -1))) return true;
  return false;
}

function cleanLyrics(raw) {
  if (!raw) return '';
  let text = String(raw);
  text = text.replace(/```[\s\S]*?```/g, ' ');
  let lines = text.split(/\r?\n/);

  while (lines.length && looksLikePreamble(lines[0])) lines.shift();
  while (lines.length && looksLikePreamble(lines[lines.length - 1])) lines.pop();

  lines = lines
    .filter(l => !isNoiseLine(l))
    .map(l => l.replace(STAR_BULLET_RE, ''))
    .map(l => l.replace(SPEAKER_LABEL_RE, ''))
    .map(l => l.replace(/^\s*\*+\s*(.+?)\s*\*+\s*$/, '$1'))
    .map(l => l.replace(/^\s*_+\s*(.+?)\s*_+\s*$/, '$1'))
    .map(l => l.replace(/^\s*>\s?/, ''))
    .map(l => l.trim());

  const out = [];
  let blank = false;
  for (const l of lines) {
    if (!l) { if (!blank && out.length) out.push(''); blank = true; }
    else { out.push(l); blank = false; }
  }
  while (out.length && !out[out.length - 1]) out.pop();
  return out.join('\n');
}

module.exports = { cleanLyrics };
