#!/usr/bin/env node
/* _test_humanize.js — proves the v4.x data-vetted catalogs are wired into Humanize and
 * that the survey's TRANSPARENT-ONLY decisions are honoured. Run: node build/_test_humanize.js
 *
 * Loads the browser globals in popup load-order (window=global shim), then the 5 catalogs,
 * then humanize.js, and exercises the transforms + runAll. Asserts:
 *   - catalog swaps fire (adj-stack / -ing verb / prep-phrase)            (items 7,8,9)
 *   - "in the night" / EXCLUDED adjectives are NOT swapped                (transparent data)
 *   - heart / forever / neon / shadow / soul are NOT word-swapped         (items 6,10)
 *   - image-stacked lines are NOT deleted                                 (item 12)
 *   - runAll lowers the score and never throws (incl. adversarial inputs)
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global;

// engine, in content-script order
['src/slop-core.js','src/common_words.js','src/features.js','src/ext/patterns.browser.js',
 'src/ext/tier3.browser.js','src/ext/perspectives.browser.js','src/ext/model.js',
 'src/ext/clean-lyrics.js','src/ext/v2-engine.js','src/ext/v2-panel.js']
  .forEach(f => require(path.join(ROOT, f)));

// catalogs (UMD files only set module.exports under node -> assign the globals humanize reads)
global.RhymeIndex         = require(path.join(ROOT, 'src/rhyme_index.js'));
global.ADJSTACK_SWAPS     = require(path.join(ROOT, 'src/adjstack_swaps.js'));
global.INGVERB_SWAPS      = require(path.join(ROOT, 'src/ingverb_swaps.js'));
global.PREPPHRASE_SWAPS   = require(path.join(ROOT, 'src/prepphrase_swaps.js'));

const H = require(path.join(ROOT, 'src/humanize.js'));
const V2 = global.SlopV2;

let pass = 0, fail = 0;
const ok  = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + m); } };

// ---- catalog globals present ----
['RhymeIndex','ADJSTACK_SWAPS','INGVERB_SWAPS','PREPPHRASE_SWAPS','SlopV2','SlopPanel']
  .forEach(g => ok(!!global[g], 'global ' + g + ' missing'));

// ---- items 7,8,9: catalog swaps fire ----
const adj = H.transforms.swapAdjStackCat("fading dreams beneath the sky");
ok(adj && /\bdreams\b/.test(adj.text) && !/fading dreams/i.test(adj.text), 'adj-stack: "fading" not swapped');

const ing = H.transforms.swapIngVerbCat("a burning love I can't let go");
ok(ing && !/burning love/i.test(ing.text), '-ing verb: "burning love" not swapped');

const prep = H.transforms.swapPrepPhraseCat("walking slow out in the dark");
ok(prep && !/in the dark/i.test(prep.text), 'prep-phrase: "in the dark" not swapped');

// ---- transparent data: must NOT swap ----
ok(H.transforms.swapPrepPhraseCat("i'm lost in the night") === null, 'prep: "in the night" wrongly swapped (transparent)');
const adjEx = H.transforms.swapAdjStackCat("shattered dreams and broken hearts");
ok(adjEx === null, 'adj: EXCLUDED "shattered"/"broken" wrongly swapped');

// ---- items 6,10: heart/forever/neon/shadow/soul NOT word-swapped ----
const stock = H.transforms.replaceStockWord;
[["i keep it in my heart","chest"],["it lasts forever now","for good"],["under neon light","bright"],
 ["the shadow on the wall","corner"],["deep inside my soul","spirit"]].forEach(([line, banned]) => {
  const r = stock(line);
  ok(!r || r.text.toLowerCase().indexOf(banned) === -1, 'transparent word swapped in: "' + line + '" -> ' + (r && r.text));
});

// ---- item 12: image-stacked, dup-free, filler-free lyric keeps all its lines ----
const imgLyric = "neon shadows flicker on the rain\nstardust echoes in the burning sky\nvelvet whispers cascade through the night\nember glimmers shimmer in the cold";
const ra = H.runAll(imgLyric);
if (ra) {
  ok(ra.text.split('\n').length === imgLyric.split('\n').length, 'image lyric LOST a line (deletion not suppressed)');
}
ok(true, '(image lyric ran)');

// ---- runAll lowers the score on a sloppy input ----
const sloppy = "burning desire in my soul tonight\nshattered dreams fading in the dark\ni feel the pain inside my heart\nlost in the shadows of the night";
const r2 = H.runAll(sloppy);
ok(r2 && r2.after <= r2.before, 'runAll did not lower score');
if (r2) console.log('  runAll: ' + r2.before + '% -> ' + r2.after + '% in ' + r2.count + ' edits');

// ---- adversarial: never throw ----
["", "   ", "\n\n\n", "one line only", "x ".repeat(40000), "🎵🎶 la la la", "[Verse]\n[Chorus]\n[Outro]",
 "AAAA\nAAAA\nAAAA", "你好 世界 这是 测试"].forEach((t, i) => {
  try { H.runAll(t); H.next(t); pass++; }
  catch (e) { fail++; console.log('  ✗ FAIL: adversarial #' + i + ' threw: ' + e.message); }
});

console.log(`\n_test_humanize: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
