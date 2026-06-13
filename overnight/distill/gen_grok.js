/* gen_dataset.js — TEACHER step of distillation. For real AI-song line-triples (above, cliché,
 * below), ask the offline local Qwen for 10 replacement middle-lines (theme + rhyme + our rules),
 * then FILTER with our own engine (rhyme-correct + reads-low-AI + syllable-fit). Keep the good ones
 * as training data: {above, below, theme[], rhyme, syl, good:[lines]} -> dataset.jsonl.
 *
 * Usage: node overnight/distill/gen_dataset.js [N_LINES=8]
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { execSync } = require("child_process");
const N = parseInt(process.argv[2] || "8", 10);
const ROOT = path.join(__dirname, "..", "..", "dist", "firefox");
const F = ["src/slop-core.js","src/common_words.js","src/features.js","src/ext/patterns.browser.js","src/ext/tier3.browser.js","src/ext/perspectives.browser.js","src/ext/model.js","src/ext/model_v5.browser.js","src/ext/portability_tells.browser.js","src/ext/clean-lyrics.js","src/ext/v2-engine.js","src/ext/model_v8.browser.js","src/ext/craft_features.browser.js","src/ext/v8-score.browser.js","src/ext/humanizer_model_p1.browser.js","src/ext/humanizer_model_p2.browser.js","src/ext/humanizer_model_p3.browser.js","src/ext/cliche_swaps.browser.js","src/ext/humanizer-gen.browser.js"];
const sb = { console, setTimeout, clearTimeout, atob:(s)=>Buffer.from(s,"base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb; vm.createContext(sb);
for (const f of F) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
const VK = sb.HZ_MODEL.vkey, CLI = new Set(sb.HZ_MODEL.cliche);
// The detector's full 125-word cliche lexicon, fed to the model as an explicit avoid-list so it stops
// generating words the filter would only reject post-hoc (the head-to-head showed the prompt's 7-word
// hint left most clichés un-warned). Plus a few surface offenders the lexicon misses (e.g. "hum").
const CLI_LIST = [...sb.HZ_MODEL.cliche.filter(c=>!/ /.test(c)), "hum","humming"].join(", ");
// The detector's exact cliché PHRASES (multi-word substring tells), fed verbatim so the model avoids
// them outright — plus user-flagged ones the list misses. Parsed from our own source array (safe).
const PHRASE_LIST = (()=>{const s=fs.readFileSync(path.join(ROOT,"src/ext/patterns.browser.js"),"utf8");const m=s.match(/const PHRASES = (\[[\s\S]*?\]);/);const arr=m?eval(m[1]):[];
  return [...arr,"fingers trace","in your arms tonight","tangled in the sheets","under the moonlight","lost in your eyes","heart skips a beat"].map(p=>`"${p}"`).join(", ");})();
// BANNED — egregious surface-AI words the user hears constantly ("echoes hum under street lights").
// HARD-rejected from the library: the prompt asks the model to avoid them, this guarantees it.
const BANNED = new Set(["hum","humming","hums","hummed"]);
const sc = (t)=>sb.SlopV8.scoreV8(t).score;
const words = (l)=>(String(l).toLowerCase().match(/[a-z']+/g))||[];
const nsyl=(w)=>{w=w.toLowerCase().replace(/[^a-z]/g,"");if(!w)return 1;const m=w.match(/[aeiouy]+/g);let n=m?m.length:1;if(/e$/.test(w)&&n>1)n--;return Math.max(1,n);};
const sylLine=(l)=>words(l).reduce((s,w)=>s+nsyl(w),0);
const rk=(w)=>VK[w]||null;
// rhyme EXAMPLES — 3 words that BOTH share the target's phonetic vowel (rk/VK) AND match its spelling
// coda, so they actually SOUND like rhymes. Head-to-head showed Qwen ignores a bare "rhyme with X"
// instruction but anchors correctly when shown real rhyming words. (embWords is alphabetical, so we
// score+rank rather than take-first, else every example starts with "a".)
function rhymeExamples(r){const k=rk(r);if(!k)return[];const rl=r.toLowerCase(),t2=rl.slice(-2),t3=rl.slice(-3);const scored=[];
  for(const w of sb.HZ_MODEL.embWords){if(w===r||rk(w)!==k)continue;if(w.length<3||w.length>7||CLI.has(w))continue;if(/(ness|tion|ity|ous|ism|ade)$/.test(w))continue;
    let s; if(w.slice(-3)===t3)s=3; else if(w.slice(-2)===t2)s=2; else continue; if(w.length<=5)s++;
    scored.push([s,w]);}
  scored.sort((a,b)=>b[0]-a[0]);return scored.slice(0,3).map(x=>x[1]);}
// ANTI-COPY: the corpus 4-gram set (same guard the engine ships). Drop any generated line that
// repeats 4 consecutive words found in real lyrics — so the library is copyright-clean BY CONSTRUCTION.
const FG=new Set(new Uint32Array(Uint8Array.from(Buffer.from(sb.HZ_MODEL.fourgB64,"base64")).buffer));
function fnv(x){let h=2166136261;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=(h*16777619)>>>0;}return h>>>0;}
function copies(line){const w=words(line);for(let i=0;i+3<w.length;i++){if(FG.has(fnv(w[i]+" "+w[i+1]+" "+w[i+2]+" "+w[i+3])))return true;}return false;}


// AI songs
const pools = ["suno","grok","claude","chatgpt"].map((m)=>{try{const j=JSON.parse(fs.readFileSync(path.join(__dirname,"..","..","corpus","models",m+".json"),"utf8"));const a=Array.isArray(j)?j:(j.songs||[]);return a.map((x)=>typeof x==="string"?x:(x.lyrics_en||x.lyrics||x.text||"")).filter((t)=>t&&t.length>150);}catch(e){return[];}});
const all=[];const mx=Math.max(...pools.map(p=>p.length));for(let i=0;i<mx;i++)for(const p of pools)if(p[i])all.push(p[i]);

function themeWords(song){const c={};for(const w of words(song))if(w.length>3&&!CLI.has(w))c[w]=(c[w]||0)+1;return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,7).map(x=>x[0]);}

const https=require("https");
let FUNDS_OUT=false;
function grok(above,below,theme,rhyme){
  const ex=rhymeExamples(rhyme);
  const prompt=`You are a lyricist rewriting ONE line so it sounds original and human, not AI-generated.
THEMATIC INSPIRATION (mood only, don't copy): ${theme.join(", ")}.
Suggest the line that fits BETWEEN:
  before: "${above}"
  [YOUR NEW LINE]
  after:  "${below}"
RULES:
1. The LAST WORD must RHYME with "${rhyme}"${ex.length?` (e.g. ${ex.join(", ")})`:""} — this is the most important rule.
2. ~${sylLine(above)} syllables, singable.
3. ONLY common everyday words. No abstract (-ness/-tion/-ity) or rare words.
4. A coherent grammatical sentence, never word-salad.
5. Original. Do NOT use ANY of these over-used AI-cliche WORDS (especially "hum", "humming", "echoes", "neon", "shadows" — instant AI tells): ${CLI_LIST}.
6. NEVER use these exact cliche PHRASES: ${PHRASE_LIST}.
7. Fit the feeling and flow naturally between the two lines.
8. Do NOT repeat or barely reword the before/after lines — write a genuinely new line.
Output EXACTLY 10 numbered lines, nothing else.`;
  const body=JSON.stringify({model:"grok-3",messages:[{role:"user",content:prompt}],temperature:1.0});
  try{
    const r=execSync(`curl -s https://api.x.ai/v1/chat/completions -H "Authorization: Bearer $XAI_API_KEY" -H "Content-Type: application/json" -d @-`,{input:body,encoding:"utf8",timeout:60000,maxBuffer:1<<20});
    const d=JSON.parse(r);
    if(d.choices)return d.choices[0].message.content;
    const msg=JSON.stringify(d).toLowerCase();
    if(msg.includes("credit")||msg.includes("fund")||msg.includes("quota")||msg.includes("insufficient")||msg.includes("403")||msg.includes("payment")){FUNDS_OUT=true;console.log("FUNDS OUT: "+JSON.stringify(d).slice(0,120));}
    return "";
  }catch(e){return "";}
}

const DS=path.join(__dirname,"dataset.jsonl");
// RESUME DEDUP: skip contexts already in the dataset, so a relaunch continues instead of repeating
// (and, for the paid Grok teacher, never re-spends on done work).
const DONE=new Set();
try{fs.readFileSync(DS,"utf8").trim().split("\n").filter(Boolean).forEach(l=>{try{const r=JSON.parse(l);DONE.add(r.above+"|"+r.below);}catch(e){}});}catch(e){}
let made=0, kept=0, seen=0;
const stride=Math.max(1,Math.floor(all.length/200));
for(let si=Math.floor(all.length/2); si<all.length && made<N && !FUNDS_OUT; si+=stride){
  const lines=all[si].split("\n").map(l=>l.trim()).filter(l=>words(l).length>=4&&words(l).length<=12&&!/^\[/.test(l));
  if(FUNDS_OUT)break;
  for(let i=1;i+1<lines.length && made<N;i++){
    const mid=lines[i]; if(sc(mid)<70)continue;                 // only replace HIGH-AI middle lines
    const above=lines[i-1], below=lines[i+1], rhyme=words(mid).slice(-1)[0]; if(!rk(rhyme))continue;
    // RHYME STRUCTURE (user's point): the new line rhymes on the ORIGINAL line's rhyme word, which
    // pairs with above OR below per the scheme. Record which, so the distilled runtime learns to
    // infer it from the surrounding rhyme pattern when the original line is gone.
    const aboveL=words(above).slice(-1)[0], belowL=words(below).slice(-1)[0];
    const rhymeWith = rk(rhyme)===rk(belowL)?"below" : rk(rhyme)===rk(aboveL)?"above" : "other";
    if(DONE.has(above+"|"+below))continue;   // resume: already generated for this context
    seen++;
    const theme=themeWords(all[si]);
    const raw=grok(above,below,theme,rhyme);if(FUNDS_OUT)break;
    const cands=raw.split("\n").map(l=>l.replace(/^\s*\d+[.)]\s*/,"").replace(/^["']|["',]+$/g,"").trim()).filter(l=>words(l).length>=4);
    // DIVERSITY GATE: a memorized/famous line makes Qwen CONVERGE (few distinct candidates). Genuine
    // generation BRANCHES. If <5 of the candidates are distinct, the context is likely reconstructing
    // a known line -> skip it entirely. Detects memorization with NO famous-songs reference.
    const distinct=new Set(cands.map(l=>words(l).join(" "))).size;
    if(distinct<5){console.log("["+(made+1)+"] DIVERSITY-GATE skip (only "+distinct+" distinct cands — possible reconstruction)");made++;continue;}
    // ECHO GUARD: head-to-head + dataset audit found Qwen sometimes echoes the before/after line
    // verbatim. Reject any candidate whose word-set equals the above or below line.
    const aJoin=words(above).join(" "), bJoin=words(below).join(" ");
    const good=cands.filter(l=>{const w=words(l),last=w[w.length-1],j=w.join(" ");
      if(w.some(x=>BANNED.has(x)))return false;                       // hard-reject "hum"/"humming"/etc
      return rk(last)===rk(rhyme)&&last!==rhyme&&j!==aJoin&&j!==bJoin&&sc(l)<55&&Math.abs(sylLine(l)-sylLine(mid))<=3&&!copies(l);});
    made++;
    if(good.length){kept+=good.length;fs.appendFileSync(DS, JSON.stringify({above,below,theme,rhyme,rhymeWith,syl:sylLine(mid),mid,good})+"\n");}
    console.log("["+made+"/"+N+"] mid("+sc(mid)+"%): "+mid.slice(0,40)+" -> "+good.length+" kept");
    if(good.length)good.slice(0,3).forEach(g=>console.log("     + "+g));
  }
}
console.log("\nDONE: "+made+" contexts, "+kept+" good lines kept -> overnight/distill/dataset.jsonl");
