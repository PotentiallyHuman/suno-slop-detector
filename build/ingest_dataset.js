#!/usr/bin/env node
/*
 * ingest_dataset.js — METRICS-ONLY ingest of a pre-AI lyrics CSV (read from
 * stdin) into corpus/human_profiles.json. Stores ONLY the derived feature
 * vector per song; the lyric text is processed in a streaming parser and
 * discarded (same no-copyright design as profile_human.js).
 *
 * Purpose: broaden the HUMAN class beyond famous hits — deep album cuts across
 * the full quality range — so the detector learns "human (any quality)" vs AI,
 * not "polished hit" vs AI. New rows are tagged tier:"catalog", source:"dataset".
 *
 * Usage (pre-2019 Spotify-Million-Song CSV; columns artist,song,link,text):
 *   curl -sL "<csv-url>" | node build/ingest_dataset.js [--dry] \
 *        [--cap 3500] [--stride 15]
 *
 *   --dry      parse + featurize, print a sample, write NOTHING
 *   --cap N    stop after N newly-kept songs (default 3500)
 *   --stride K keep every Kth data row (spreads across an artist-sorted file)
 */
const fs = require("fs");
const path = require("path");
const { extract, FEATURE_NAMES } = require("../src/features.js");

const OUT = path.join(__dirname, "..", "corpus", "human_profiles.json");
const DRY = process.argv.includes("--dry");
const argN = (flag, d) => { const i = process.argv.indexOf(flag); return i !== -1 ? +process.argv[i + 1] : d; };
const CAP = argN("--cap", 3500);
const STRIDE = Math.max(1, argN("--stride", 15));
const MIN_FREE_MB = +(process.env.MIN_FREE_MB || 6000);
const memAvailableMB = () => { try { const m = /MemAvailable:\s+(\d+)\s+kB/.exec(fs.readFileSync("/proc/meminfo", "utf8")); return m ? Math.round(+m[1] / 1024) : Infinity; } catch (_) { return Infinity; } };

// existing keys (dedupe) + existing profiles (so we append, never lose)
let profiles = [];
const seen = new Set();
if (fs.existsSync(OUT)) {
  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  profiles = prev.profiles || [];
  for (const p of profiles) seen.add(`${p.artist}|${p.title}`.toLowerCase());
}
const startCount = profiles.length;

// ---- streaming RFC-4180 CSV parser (handles quoted fields w/ commas/newlines/"") ----
let field = "", row = [], inQuotes = false, header = null, col = {}, rowIdx = 0;
let kept = 0, scanned = 0, skipped = 0, stopped = false;
const samples = [];

function asciiRatio(s) { let a = 0, t = 0; for (const ch of s) { if (/[a-z]/i.test(ch)) { t++; if (ch.charCodeAt(0) < 128) a++; } } return t ? a / t : 1; }

function endField() { row.push(field); field = ""; }
function endRow() {
  endField();
  if (!header) {
    header = row.map((h) => h.trim().toLowerCase());
    col.artist = header.indexOf("artist");
    col.title = header.findIndex((h) => h === "song" || h === "title" || h === "track");
    col.text = header.findIndex((h) => h === "text" || h === "lyrics");
    if (col.artist < 0 || col.title < 0 || col.text < 0) {
      console.error("could not find artist/song/text columns in header:", header);
      process.exit(1);
    }
  } else {
    rowIdx++;
    handle(row);
  }
  row = [];
}

const writeOut = () => fs.writeFileSync(OUT, JSON.stringify(
  { note: "Derived metrics only — no lyrics text stored (copyright).", featureNames: FEATURE_NAMES, count: profiles.length, profiles }, null, 2));

function handle(r) {
  if (stopped) return;
  const artist = (r[col.artist] || "").trim();
  const title = (r[col.title] || "").trim();
  const text = r[col.text] || "";
  if (!artist || !title) { skipped++; return; }
  if (rowIdx % STRIDE !== 0) return;                 // stride-sample for diversity
  scanned++;
  const key = `${artist}|${title}`.toLowerCase();
  if (seen.has(key)) { skipped++; return; }
  const clean = text.replace(/\r/g, "").trim();
  if (clean.replace(/\s/g, "").length < 80) { skipped++; return; }   // too short
  if (asciiRatio(clean) < 0.85) { skipped++; return; }                // mostly non-English
  if (memAvailableMB() < MIN_FREE_MB) {
    console.log(`⏸ low memory (<${MIN_FREE_MB}MB) — stopping ingest early`);
    stopped = true; return;
  }
  let f;
  try { f = extract(clean); } catch (_) { skipped++; return; }
  seen.add(key);
  const prof = { artist, title, year: null, genre: "catalog", lang: "en",
                 tier: "catalog", source: "dataset", vector: f.values, named: f.named };
  if (!DRY) profiles.push(prof);
  kept++;
  if (samples.length < 8) samples.push(`${artist} — ${title}  (clichรฉ ${f.named.clicheDensity.toFixed(2)}, endRhyme ${f.named.endRhymeRate.toFixed(2)})`.replace("clichรฉ", "cliche"));
  if (!DRY && kept % 200 === 0) { writeOut(); console.log(`  …${kept} kept (total ${profiles.length})`); }
  if (kept >= CAP) { stopped = true; }
}

process.stdin.on("data", (chunk) => {
  if (stopped) { process.stdin.destroy(); return; }
  const s = chunk.toString("utf8");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") endField();
      else if (c === "\n") endRow();
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (stopped) process.stdin.destroy();
});

process.stdin.on("close", finish);
process.stdin.on("end", finish);
let finished = false;
function finish() {
  if (finished) return; finished = true;
  if (field.length || row.length) endRow();
  console.log(`\nscanned ${scanned} sampled rows — kept ${kept} new, skipped ${skipped}`);
  console.log("sample of kept songs:"); samples.forEach((s) => console.log("  ✓ " + s));
  if (!DRY) { writeOut(); console.log(`\nhuman_profiles.json: ${startCount} -> ${profiles.length} (+${profiles.length - startCount})`); }
  else console.log("\n(dry run — nothing written)");
}
