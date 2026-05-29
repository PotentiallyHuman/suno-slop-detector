#!/usr/bin/env node
/*
 * profile_human.js — build a REAL human-lyrics baseline WITHOUT storing any
 * copyrighted text. For each song it fetches the lyrics, computes a feature
 * vector + analysis summary (word/line/section/repetition/vocabulary stats),
 * and writes ONLY those derived numbers to corpus/human_profiles.json.
 * The lyrics themselves are processed in memory and discarded.
 *
 * Songs are pre-2025 across genres/eras (2025-26 excluded — could be undisclosed AI).
 */
const fs = require("fs");
const path = require("path");
const SlopScore = require("../src/slop-core.js");
const { extract, FEATURE_NAMES } = require("../src/features.js");

const OUT = path.join(__dirname, "..", "corpus", "human_profiles.json");

// [artist, title, year, genre]
const SONGS = [
  ["Queen", "Bohemian Rhapsody", 1975, "rock"],
  ["Led Zeppelin", "Stairway to Heaven", 1971, "rock"],
  ["The Beatles", "Let It Be", 1970, "rock"],
  ["The Rolling Stones", "Paint It Black", 1966, "rock"],
  ["Pink Floyd", "Wish You Were Here", 1975, "rock"],
  ["Eagles", "Hotel California", 1976, "rock"],
  ["Bruce Springsteen", "Born to Run", 1975, "rock"],
  ["David Bowie", "Space Oddity", 1969, "rock"],
  ["Fleetwood Mac", "Go Your Own Way", 1977, "rock"],
  ["The Who", "Baba O'Riley", 1971, "rock"],
  ["Bob Dylan", "Like a Rolling Stone", 1965, "folk"],
  ["Simon & Garfunkel", "The Sound of Silence", 1964, "folk"],
  ["Joni Mitchell", "Both Sides Now", 1969, "folk"],
  ["Leonard Cohen", "Hallelujah", 1984, "folk"],
  ["Cat Stevens", "Father and Son", 1970, "folk"],
  ["James Taylor", "Fire and Rain", 1970, "folk"],
  ["Marvin Gaye", "What's Going On", 1971, "soul"],
  ["Aretha Franklin", "Respect", 1967, "soul"],
  ["Stevie Wonder", "Superstition", 1972, "soul"],
  ["Otis Redding", "Sitting On The Dock Of The Bay", 1968, "soul"],
  ["Sam Cooke", "A Change Is Gonna Come", 1964, "soul"],
  ["Al Green", "Let's Stay Together", 1972, "soul"],
  ["Michael Jackson", "Billie Jean", 1982, "pop"],
  ["Madonna", "Like a Prayer", 1989, "pop"],
  ["Whitney Houston", "I Wanna Dance with Somebody", 1987, "pop"],
  ["ABBA", "Dancing Queen", 1976, "pop"],
  ["Cyndi Lauper", "Time After Time", 1983, "pop"],
  ["Prince", "Purple Rain", 1984, "pop"],
  ["Grandmaster Flash", "The Message", 1982, "hiphop"],
  ["The Notorious B.I.G.", "Juicy", 1994, "hiphop"],
  ["2Pac", "Changes", 1998, "hiphop"],
  ["Eminem", "Lose Yourself", 2002, "hiphop"],
  ["Kendrick Lamar", "Alright", 2015, "hiphop"],
  ["OutKast", "Ms. Jackson", 2000, "hiphop"],
  ["Nirvana", "Smells Like Teen Spirit", 1991, "grunge"],
  ["Pearl Jam", "Black", 1991, "grunge"],
  ["Radiohead", "Creep", 1992, "alt"],
  ["R.E.M.", "Losing My Religion", 1991, "alt"],
  ["The Smashing Pumpkins", "1979", 1995, "alt"],
  ["Green Day", "Boulevard of Broken Dreams", 2004, "punk"],
  ["The Clash", "London Calling", 1979, "punk"],
  ["Johnny Cash", "Ring of Fire", 1963, "country"],
  ["Dolly Parton", "Jolene", 1973, "country"],
  ["Willie Nelson", "On the Road Again", 1980, "country"],
  ["Garth Brooks", "Friends in Low Places", 1990, "country"],
  ["B.B. King", "The Thrill Is Gone", 1969, "blues"],
  ["Creedence Clearwater Revival", "Bad Moon Rising", 1969, "roots"],
  ["Bob Marley", "Redemption Song", 1980, "reggae"],
  ["Bob Marley", "No Woman No Cry", 1974, "reggae"],
  ["Bee Gees", "Stayin' Alive", 1977, "disco"],
  ["Adele", "Someone Like You", 2011, "pop"],
  ["Amy Winehouse", "Rehab", 2006, "soul"],
  ["Coldplay", "Yellow", 2000, "alt"],
  ["The Killers", "Mr. Brightside", 2003, "alt"],
  ["Arcade Fire", "Wake Up", 2004, "indie"],
  ["Beyonce", "Halo", 2008, "pop"],
  ["Taylor Swift", "Love Story", 2008, "pop"],
  ["Lorde", "Royals", 2013, "pop"],
  ["Bruno Mars", "Just the Way You Are", 2010, "pop"],
  ["Billie Eilish", "bad guy", 2019, "pop"],
  ["Nine Inch Nails", "Hurt", 1994, "industrial"],
  ["Tracy Chapman", "Fast Car", 1988, "folk"],
  ["U2", "With or Without You", 1987, "rock"],
  ["The Beatles", "Hey Jude", 1968, "rock"],
  ["The Beatles", "Yesterday", 1965, "rock"],
  ["The Rolling Stones", "Wild Horses", 1971, "rock"],
  ["Led Zeppelin", "Kashmir", 1975, "rock"],
  ["The Doors", "Light My Fire", 1967, "rock"],
  ["Jimi Hendrix", "Purple Haze", 1967, "rock"],
  ["Lynyrd Skynyrd", "Sweet Home Alabama", 1974, "rock"],
  ["Don McLean", "American Pie", 1971, "folk"],
  ["Neil Young", "Heart of Gold", 1972, "folk"],
  ["Tom Petty", "Free Fallin'", 1989, "rock"],
  ["Guns N' Roses", "Sweet Child O' Mine", 1987, "rock"],
  ["AC/DC", "Back in Black", 1980, "rock"],
  ["Bon Jovi", "Livin' on a Prayer", 1986, "rock"],
  ["Journey", "Don't Stop Believin'", 1981, "rock"],
  ["Dire Straits", "Sultans of Swing", 1978, "rock"],
  ["Paul Simon", "Graceland", 1986, "folk"],
  ["Carole King", "So Far Away", 1971, "folk"],
  ["Joni Mitchell", "A Case of You", 1971, "folk"],
  ["Bob Dylan", "Tangled Up in Blue", 1975, "folk"],
  ["Bruce Springsteen", "Thunder Road", 1975, "rock"],
  ["John Prine", "Angel from Montgomery", 1971, "folk"],
  ["Stevie Wonder", "Isn't She Lovely", 1976, "soul"],
  ["Bill Withers", "Ain't No Sunshine", 1971, "soul"],
  ["Curtis Mayfield", "Move On Up", 1970, "soul"],
  ["Earth Wind & Fire", "September", 1978, "funk"],
  ["Michael Jackson", "Thriller", 1982, "pop"],
  ["George Michael", "Faith", 1987, "pop"],
  ["Britney Spears", "...Baby One More Time", 1998, "pop"],
  ["Backstreet Boys", "I Want It That Way", 1999, "pop"],
  ["Kelly Clarkson", "Since U Been Gone", 2004, "pop"],
  ["Katy Perry", "Firework", 2010, "pop"],
  ["Lady Gaga", "Bad Romance", 2009, "pop"],
  ["Rihanna", "Umbrella", 2007, "pop"],
  ["Ed Sheeran", "Shape of You", 2017, "pop"],
  ["Dua Lipa", "New Rules", 2017, "pop"],
  ["Jay-Z", "99 Problems", 2003, "hiphop"],
  ["Dr. Dre", "Still D.R.E.", 1999, "hiphop"],
  ["Nas", "N.Y. State of Mind", 1994, "hiphop"],
  ["Wu-Tang Clan", "C.R.E.A.M.", 1993, "hiphop"],
  ["Kanye West", "Stronger", 2007, "hiphop"],
  ["Snoop Dogg", "Gin and Juice", 1993, "hiphop"],
  ["Missy Elliott", "Work It", 2002, "hiphop"],
  ["Kenny Rogers", "The Gambler", 1978, "country"],
  ["Hank Williams", "Your Cheatin' Heart", 1953, "country"],
  ["Patsy Cline", "Crazy", 1961, "country"],
  ["Shania Twain", "Man! I Feel Like a Woman!", 1997, "country"],
  ["Soundgarden", "Black Hole Sun", 1994, "grunge"],
  ["Red Hot Chili Peppers", "Under the Bridge", 1991, "alt"],
  ["Oasis", "Wonderwall", 1995, "alt"],
  ["The Cranberries", "Zombie", 1994, "alt"],
  ["Foo Fighters", "Everlong", 1997, "alt"],
  ["The White Stripes", "Seven Nation Army", 2003, "alt"],
  ["Florence + The Machine", "Dog Days Are Over", 2008, "indie"],
  ["Mumford & Sons", "Little Lion Man", 2009, "indie"],
  ["Bob Marley", "Three Little Birds", 1977, "reggae"],
  ["Elton John", "Tiny Dancer", 1971, "rock"],
  ["Carly Simon", "You're So Vain", 1972, "pop"],
  ["The Beach Boys", "God Only Knows", 1966, "pop"],
  ["Van Morrison", "Brown Eyed Girl", 1967, "rock"],
  ["Chuck Berry", "Johnny B. Goode", 1958, "rock"],
  ["Aretha Franklin", "Natural Woman", 1967, "soul"],
  ["The Temptations", "My Girl", 1964, "soul"],
];

const STOP = new Set(
  ("a an the and or but of to in on at for with from by as is are was were be i you he she it we they me my your " +
   "this that so just like too can will would do does have had not no oh yeah hey la na up down out all any some " +
   "got get let cause til em im ive dont cant wont").split(/\s+/)
);

function clean(raw) {
  return String(raw || "")
    .replace(/paroles de la chanson.*?\n/i, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function analyze(lyrics) {
  const norm = SlopScore.normalizeStructure(lyrics);
  const lines = norm.split(/\n/).map((l) => l.trim()).filter((l) => l && !/^\[[^\]]*\]$/.test(l));
  const toks = (norm.replace(/\[[^\]]*\]/g, " ").toLowerCase().match(/[a-z][a-z']*[a-z]|[a-z]/g) || []);
  const content = toks.filter((w) => !STOP.has(w) && w.length > 1);
  const freq = {};
  for (const w of content) freq[w] = (freq[w] || 0) + 1;
  const lc = {};
  for (const l of lines) lc[l.toLowerCase()] = (lc[l.toLowerCase()] || 0) + 1;
  const repeats = Object.values(lc).filter((c) => c > 1);
  const hookRepeat = Math.max(0, ...Object.values(lc));
  const sections = (norm.match(/\[[^\]]+\]/g) || []).length;
  const flat = norm.replace(/\[[^\]]*\]/g, " ");
  return {
    words: toks.length,
    uniqueWords: new Set(toks).size,
    ttr: +(new Set(toks).size / Math.max(1, toks.length)).toFixed(3),
    avgWordLen: +(toks.reduce((a, w) => a + w.length, 0) / Math.max(1, toks.length)).toFixed(2),
    avgLineLen: +(toks.length / Math.max(1, lines.length)).toFixed(2),
    lines: lines.length,
    sections,
    repeatLineRatio: +(repeats.reduce((a, c) => a + c, 0) / Math.max(1, lines.length)).toFixed(2),
    hookMaxRepeat: hookRepeat,
    similes: (flat.match(/\blike a\b/gi) || []).length,
    topWords: Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 8),
  };
}

async function fetchLyrics(artist, title) {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  const L = clean(j.lyrics);
  if (L.length < 80) throw new Error("too short");
  return L;
}

(async () => {
  const profiles = [];
  let ok = 0, fail = 0;
  for (const [artist, title, year, genre] of SONGS) {
    try {
      const lyrics = await fetchLyrics(artist, title); // in memory only
      const f = extract(lyrics);                        // derived numbers
      const summary = analyze(lyrics);                  // derived numbers
      profiles.push({ artist, title, year, genre, vector: f.values, named: f.named, summary });
      ok++;
      console.log(`✓ ${artist} — ${title} (${year}) ${summary.words}w ttr${summary.ttr}`);
    } catch (e) {
      fail++;
      console.log(`✗ ${artist} — ${title}: ${e.message}`);
    }
    // lyrics variable goes out of scope; nothing copyrighted is persisted
  }
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      { note: "Derived metrics only — no lyrics text stored (copyright).", featureNames: FEATURE_NAMES, count: profiles.length, profiles },
      null, 2
    )
  );
  console.log(`\nwrote ${ok} profiles (${fail} failed) -> ${path.relative(process.cwd(), OUT)}`);
})();
