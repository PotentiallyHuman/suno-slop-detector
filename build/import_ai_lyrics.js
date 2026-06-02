#!/usr/bin/env node
/*
 * import_ai_lyrics.js — fold the hourly Claude-generated corpus
 *   (lyric_generator output: corpus/ai_lyrics/<date>/<id>_<slug>.md, each a
 *    YAML-frontmatter + lyrics body)
 * into a corpus/models/<model>.json baseline file the detector consumes.
 *
 * Cleaning makes these comparable to the rest of the AI corpus (which is plain
 * lyric text, no Suno meta):
 *   - drop [Verse]/[Chorus]-style tag lines      (SlopScore.stripSectionLabels)
 *   - remove parenthetical stage directions      "(soprano sax, a shimmer)"
 *   - drop LEAD:/ECHO:/CALL:/RESPONSE: speaker labels
 *   - collapse blank runs
 *
 *   node build/import_ai_lyrics.js            # writes corpus/models/*.json
 *   node build/import_ai_lyrics.js --dry      # preview only, write nothing
 */
const fs = require("fs");
const path = require("path");
const SlopScore = require("../src/slop-core.js");

const DRY = process.argv.includes("--dry");
const SRC = path.join(__dirname, "..", "corpus", "ai_lyrics");
const MODELS_DIR = path.join(__dirname, "..", "corpus", "models");

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// minimal frontmatter parse: scalars between the first two '---' fences.
// (the multi-line `brief: |` block is indented, so its body lines are skipped.)
function parse(md) {
  const lines = md.split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  let i = 1;
  const fm = {};
  for (; i < lines.length; i++) {
    if (lines[i].trim() === "---") { i++; break; }
    const m = /^([A-Za-z_][\w]*):\s?(.*)$/.exec(lines[i]); // top-level keys only (no indent)
    if (m) {
      let v = m[2].trim();
      if (/^".*"$/.test(v)) { try { v = JSON.parse(v); } catch (_) {} }
      fm[m[1]] = v === "" ? null : v;
    }
  }
  const body = lines.slice(i).join("\n");
  return { fm, body };
}

function cleanLyrics(raw) {
  const stripped = SlopScore.stripSectionLabels(raw); // remove [..] tag lines
  const cleaned = stripped
    .split(/\n/)
    .map((l) => l.replace(/^\s*(LEAD|ECHO|CALL|RESPONSE|VOICE\s*\d?)\s*:\s*/i, ""))
    .map((l) => l.replace(/\([^)]*\)/g, " ").replace(/\s{2,}/g, " ").trimEnd())
    .filter((l, idx, arr) => l.trim() !== "" || (idx > 0 && arr[idx - 1].trim() !== ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
}

if (!fs.existsSync(SRC)) {
  console.error(`no source dir: ${SRC}`);
  process.exit(1);
}

const byModel = {};
let scanned = 0, kept = 0, skipped = 0;
for (const file of walk(SRC)) {
  scanned++;
  const parsed = parse(fs.readFileSync(file, "utf8"));
  if (!parsed) { skipped++; continue; }
  const { fm, body } = parsed;
  const lyrics = cleanLyrics(body);
  if (lyrics.length < 30) { skipped++; continue; }
  const model = fm.model || "claude";
  const idxMatch = (fm.id || "").match(/_(\d+)$/);
  (byModel[model] = byModel[model] || []).push({
    model,
    source: "generated",
    strategy: fm.strategy || "vibe",
    index: idxMatch ? +idxMatch[1] : 0,
    subject: fm.subject || fm.genre || "(generated)",
    genre: fm.genre || null,
    constraint: fm.constraint || null,
    lang: fm.lang || "en",
    lyrics,
  });
  kept++;
}

console.log(`scanned ${scanned} md files — kept ${kept}, skipped ${skipped}`);
for (const [model, songs] of Object.entries(byModel)) {
  songs.sort((a, b) => (a.id || "").localeCompare?.(b.id || "") || a.index - b.index);
  const slug = model.replace(/[^a-z0-9.-]+/gi, "-");
  const out = path.join(MODELS_DIR, `${slug}-generated.json`);
  if (!DRY) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ model, songs }, null, 2));
  }
  console.log(`  ${model}: ${songs.length} songs -> corpus/models/${slug}-generated.json${DRY ? " (dry)" : ""}`);
}
if (DRY) console.log("(dry run — nothing written)");
