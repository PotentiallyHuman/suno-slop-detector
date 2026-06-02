// Robustly merge a claude -p batch (JSON array of {genre,subject,lyrics}) into the
// claude-opus corpus file, deduping by the first 120 chars of normalized lyrics.
// Prints "merged +N -> TOTAL" so the daemon can detect zero-progress and back off.
const fs = require("fs");
const file = process.argv[2];
const TARGET = "corpus/models/claude-opus-4-8-generated.json";
let raw = "";
try { raw = fs.readFileSync(file, "utf8"); } catch (e) { console.log("merged +0 -> NA (no batch file)"); process.exit(0); }
// strip markdown fences, then slice the outermost JSON array
raw = raw.replace(/```json/gi, "").replace(/```/g, "");
const a = raw.indexOf("["), b = raw.lastIndexOf("]");
if (a < 0 || b < 0 || b <= a) { console.log("merged +0 -> NA (no array)"); process.exit(0); }
let arr;
try { arr = JSON.parse(raw.slice(a, b + 1)); } catch (e) { console.log("merged +0 -> NA (parse fail: " + e.message + ")"); process.exit(0); }
if (!Array.isArray(arr)) { console.log("merged +0 -> NA (not array)"); process.exit(0); }
const j = JSON.parse(fs.readFileSync(TARGET));
const songs = j.songs || j;
const norm = s => String(s || "").replace(/\s+/g, " ").trim().slice(0, 120);
const seen = new Set(songs.map(s => norm(s.lyrics)));
let added = 0;
for (const s of arr) {
  const ly = String(s.lyrics || "").trim();
  if (ly.split(/\n/).filter(x => x.trim()).length < 6) continue; // too short to be a song
  const key = norm(ly);
  if (!key || seen.has(key)) continue;
  seen.add(key);
  songs.push({
    model: "claude-opus-4-8", source: "claude-opus-daemon", strategy: "varied",
    genre: String(s.genre || ""), subject: String(s.subject || ""), lang: "en", lyrics: ly
  });
  added++;
}
if (j.songs) j.songs = songs;
fs.writeFileSync(TARGET, JSON.stringify(j, null, 2));
console.log("merged +" + added + " -> " + songs.length);
