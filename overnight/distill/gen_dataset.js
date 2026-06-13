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
const sc = (t)=>sb.SlopV8.scoreV8(t).score;
const words = (l)=>(String(l).toLowerCase().match(/[a-z']+/g))||[];
const nsyl=(w)=>{w=w.toLowerCase().replace(/[^a-z]/g,"");if(!w)return 1;const m=w.match(/[aeiouy]+/g);let n=m?m.length:1;if(/e$/.test(w)&&n>1)n--;return Math.max(1,n);};
const sylLine=(l)=>words(l).reduce((s,w)=>s+nsyl(w),0);
const rk=(w)=>VK[w]||null;
// ANTI-COPY: the corpus 4-gram set (same guard the engine ships). Drop any generated line that
// repeats 4 consecutive words found in real lyrics — so the library is copyright-clean BY CONSTRUCTION.
const FG=new Set(new Uint32Array(Uint8Array.from(Buffer.from(sb.HZ_MODEL.fourgB64,"base64")).buffer));
function fnv(x){let h=2166136261;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=(h*16777619)>>>0;}return h>>>0;}
function copies(line){const w=words(line);for(let i=0;i+3<w.length;i++){if(FG.has(fnv(w[i]+" "+w[i+1]+" "+w[i+2]+" "+w[i+3])))return true;}return false;}


// AI songs
const pools = ["suno","grok","claude","chatgpt"].map((m)=>{try{const j=JSON.parse(fs.readFileSync(path.join(__dirname,"..","..","corpus","models",m+".json"),"utf8"));const a=Array.isArray(j)?j:(j.songs||[]);return a.map((x)=>typeof x==="string"?x:(x.lyrics_en||x.lyrics||x.text||"")).filter((t)=>t&&t.length>150);}catch(e){return[];}});
const all=[];const mx=Math.max(...pools.map(p=>p.length));for(let i=0;i<mx;i++)for(const p of pools)if(p[i])all.push(p[i]);

function themeWords(song){const c={};for(const w of words(song))if(w.length>3&&!CLI.has(w))c[w]=(c[w]||0)+1;return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,7).map(x=>x[0]);}

function qwen(above,below,theme,rhyme){
  const prompt=`You are a lyricist rewriting ONE line so it sounds original and human, not AI-generated.
THEMATIC INSPIRATION (mood only, don't copy): ${theme.join(", ")}.
Suggest the line that fits BETWEEN:
  before: "${above}"
  [YOUR NEW LINE]
  after:  "${below}"
RULES:
1. End on a word that RHYMES with "${rhyme}".
2. ~${sylLine(above)} syllables, singable.
3. ONLY common everyday words. No abstract (-ness/-tion/-ity) or rare words.
4. A coherent grammatical sentence, never word-salad.
5. Original; avoid AI cliches (neon, shadows, whispers, echoes, eternal, endless, midnight sky).
6. Fit the feeling and flow naturally between the two lines.
Output EXACTLY 10 numbered lines, nothing else.`;
  try{return execSync("ollama run qwen2.5:32b",{input:prompt,encoding:"utf8",timeout:240000,maxBuffer:1<<20});}catch(e){return "";}
}

const DS=path.join(__dirname,"dataset.jsonl");
let made=0, kept=0, seen=0;
const stride=Math.max(1,Math.floor(all.length/200));
for(let si=0; si<all.length && made<N; si+=stride){
  const lines=all[si].split("\n").map(l=>l.trim()).filter(l=>words(l).length>=4&&words(l).length<=12&&!/^\[/.test(l));
  for(let i=1;i+1<lines.length && made<N;i++){
    const mid=lines[i]; if(sc(mid)<70)continue;                 // only replace HIGH-AI middle lines
    const above=lines[i-1], below=lines[i+1], rhyme=words(mid).slice(-1)[0]; if(!rk(rhyme))continue;
    // RHYME STRUCTURE (user's point): the new line rhymes on the ORIGINAL line's rhyme word, which
    // pairs with above OR below per the scheme. Record which, so the distilled runtime learns to
    // infer it from the surrounding rhyme pattern when the original line is gone.
    const aboveL=words(above).slice(-1)[0], belowL=words(below).slice(-1)[0];
    const rhymeWith = rk(rhyme)===rk(belowL)?"below" : rk(rhyme)===rk(aboveL)?"above" : "other";
    seen++;
    const theme=themeWords(all[si]);
    const raw=qwen(above,below,theme,rhyme);
    const cands=raw.split("\n").map(l=>l.replace(/^\s*\d+[.)]\s*/,"").replace(/^["']|["',]+$/g,"").trim()).filter(l=>words(l).length>=4);
    const good=cands.filter(l=>{const w=words(l),last=w[w.length-1];return rk(last)===rk(rhyme)&&last!==rhyme&&sc(l)<55&&Math.abs(sylLine(l)-sylLine(mid))<=3&&!copies(l);});
    made++;
    if(good.length){kept+=good.length;fs.appendFileSync(DS, JSON.stringify({above,below,theme,rhyme,rhymeWith,syl:sylLine(mid),mid,good})+"\n");}
    console.log("["+made+"/"+N+"] mid("+sc(mid)+"%): "+mid.slice(0,40)+" -> "+good.length+" kept");
    if(good.length)good.slice(0,3).forEach(g=>console.log("     + "+g));
  }
}
console.log("\nDONE: "+made+" contexts, "+kept+" good lines kept -> overnight/distill/dataset.jsonl");
