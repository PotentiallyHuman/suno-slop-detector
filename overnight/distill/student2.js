/* student2.js — distilled runtime v2. Adds (a) a continuous RHYME GRADIENT: score each song 0..1 on
 * how strictly it rhymes, and require that same tightness from the replacement (rap/loose -> slant ok;
 * ballad -> full rhyme); (b) a TEMPLATE LAYER: abstract each Qwen line into a fillable mold so the
 * engine can COMPOSE (fill slots with the song's own theme words), not only retrieve verbatim.
 * Hybrid: verbatim-retrieve first (best quality), template-fill as coverage fallback. No Qwen.
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..", "dist", "firefox");
const F = ["src/slop-core.js","src/common_words.js","src/features.js","src/ext/patterns.browser.js","src/ext/tier3.browser.js","src/ext/perspectives.browser.js","src/ext/model.js","src/ext/model_v5.browser.js","src/ext/portability_tells.browser.js","src/ext/clean-lyrics.js","src/ext/v2-engine.js","src/ext/model_v8.browser.js","src/ext/craft_features.browser.js","src/ext/v8-score.browser.js","src/ext/humanizer_model_p1.browser.js","src/ext/humanizer_model_p2.browser.js","src/ext/humanizer_model_p3.browser.js","src/ext/cliche_swaps.browser.js","src/ext/humanizer-gen.browser.js"];
const sb = { console, setTimeout, clearTimeout, atob:(s)=>Buffer.from(s,"base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb; vm.createContext(sb);
for (const f of F) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
const M = sb.HZ_MODEL, VK = M.vkey, POS = M.wordPOS, CLI = new Set(M.cliche);
const EMB = new Int8Array(Uint8Array.from(Buffer.from(M.embB64, "base64")).buffer), DIM = M.embDim, EW = {};
M.embWords.forEach((w,i)=>EW[w]=i);
const emb=(w)=>{const r=EW[w];if(r===undefined)return null;const v=new Float32Array(DIM);for(let k=0;k<DIM;k++)v[k]=EMB[r*DIM+k]/127;return v;};
const dotp=(a,b)=>{let s=0;for(let k=0;k<a.length;k++)s+=a[k]*b[k];return s;};
const cos=(a,b)=>{if(!a||!b)return -1;let s=0;for(let k=0;k<a.length;k++)s+=a[k]*b[k];return s;};
const unit=(v)=>{let s=0;for(let k=0;k<v.length;k++)s+=v[k]*v[k];s=Math.sqrt(s)||1;const o=new Float32Array(v.length);for(let k=0;k<v.length;k++)o[k]=v[k]/s;return o;};
const words=(l)=>(String(l).toLowerCase().match(/[a-z']+/g))||[];
const nsyl=(w)=>{w=w.toLowerCase().replace(/[^a-z]/g,"");if(!w)return 1;const m=w.match(/[aeiouy]+/g);let n=m?m.length:1;if(/e$/.test(w)&&n>1)n--;return Math.max(1,n);};
const sylLine=(l)=>words(l).reduce((s,w)=>s+nsyl(w),0);
const slantKey=(w)=>VK[w]||null;                                        // last STRESSED vowel — loose rhyme
const strictKey=(w)=>{const m=w.toLowerCase().match(/[aeiouy]+[^aeiouy]*$/);return m?m[0]:null;};  // vowel+coda — full rhyme
const sc=(t)=>sb.SlopV8.scoreV8(t).score;
const themeVec=(text)=>{const ws=words(text),acc=new Float32Array(DIM);let n=0;for(const w of ws){const v=emb(w);if(v&&w.length>3){for(let k=0;k<DIM;k++)acc[k]+=v[k];n++;}}return n?unit(acc):null;};

// (a) RHYME GRADIENT 0..1 — fraction of adjacent line-pairs that FULL-rhyme. Strict song -> ~1, rap/loose -> low.
function rhymeStrength(song){
  const ls=String(song).split("\n").map(l=>words(l)).filter(w=>w.length>=3);
  let pairs=0,full=0;
  for(let i=0;i+1<ls.length;i++){const a=ls[i].slice(-1)[0],b=ls[i+1].slice(-1)[0];if(a===b)continue;pairs++;
    if(strictKey(a)&&strictKey(a)===strictKey(b))full++;}
  return pairs?full/pairs:0.4;
}
// candidate rhyme quality vs target: 1.0 full rhyme, 0.55 slant only, 0 none
function rhymeQuality(cand,target){const a=words(cand).slice(-1)[0];if(strictKey(a)&&strictKey(a)===strictKey(target))return 1.0;if(slantKey(a)&&slantKey(a)===slantKey(target))return 0.55;return 0;}

// GRAMMAR GATE — the acceptance harness (blind Grok judge, calibrated 8/8 on human+scramble controls)
// showed ~17% of raw student lines are word-salad the v8 AI-score CANNOT catch (rejected lines score
// LOWER AI%). The failures are dangling/stranded endings ("...name how", "...more they", "...around,
// expand"). This gate refuses them so the modes emit ONLY acceptable lines (coverage < 100% is fine —
// better to refuse than ship garbage).
const BAD_END = new Set("the a an and but or nor yet so of to in on at with for from by as how why when where who whom whose that this these those into onto upon than then though although while because if unless until they we he she i my your his her our their its".split(" "));
const BAD_END_POS = new Set(["DT","CC","IN","TO","WDT","WRB","WP","MD","PRP$"]);
function grammarOK(line){
  const w = words(line); if (w.length < 3) return false;
  const last = w[w.length-1];
  if (BAD_END.has(last)) return false;                              // stranded function/subject word
  if (POS[last] && BAD_END_POS.has(POS[last])) return false;        // stranded by part-of-speech
  if (/,\s*[a-z']+$/i.test(line) && (POS[last]==="VB"||POS[last]==="VBP")) return false; // ", expand" dangling verb
  if (w.length>=2 && BAD_END.has(w[w.length-2]) && POS[last]==="VB") return false;       // "...to try ... more they"-type tails
  return true;
}

// ---- data ----
const rows = fs.readFileSync(path.join(__dirname,"dataset.jsonl"),"utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
if (rows.length < 6) { console.log("dataset too small ("+rows.length+")"); process.exit(0); }
const test = rows.filter((_,i)=>i%5===0), train = rows.filter((_,i)=>i%5!==0);

// verbatim LIBRARY
const LIB=[];const seenLine=new Set();
for(const r of train)for(const line of r.good){if(seenLine.has(line))continue;seenLine.add(line);const last=words(line).slice(-1)[0];if(!slantKey(last))continue;LIB.push({line,syl:sylLine(line),tv:themeVec(line)});}

// (b) TEMPLATE LAYER — abstract each good line: content nouns/adjs -> typed slots (keep its embedding for type)
const FUNC=new Set("the a an and or but of to in on at by for with from as is are was were be been i you he she it we they me my your his her our their this that not no so when then there here out up down into through".split(" "));
const slotPos=(w)=>POS[w]; const swappable=(w)=>{const p=POS[w];return p!==undefined&&!FUNC.has(w)&&w.length>3&&/^(NN|NNS|JJ)$/.test(p);};
const TPL=[];
for(const r of train)for(const line of r.good){const w=words(line);if(w.filter(swappable).length<1)continue;const last=w[w.length-1];if(!slantKey(last))continue;
  TPL.push({w,syl:sylLine(line)});}

// COMMON fill lexicon (frequent concrete words, by POS) — reuse engine vocab
const COMMON=[];for(const w of M.embWords){const p=POS[w];if(!p)continue;if(CLI.has(w))continue;if(w.length<4||w.length>9)continue;if(/(ness|tion|ment|ity|ance|ence)$/.test(w))continue;if(/^(NN|NNS|JJ)$/.test(p)&&emb(w))COMMON.push(w);}
const COMMONSET=new Set(COMMON);
function fillSlot(origWord,theme){const ov=emb(origWord);if(!ov)return origWord;let best=origWord,bs=0.45;
  for(const w of COMMON){if(POS[w]!==POS[origWord])continue;if(Math.abs(nsyl(w)-nsyl(origWord))>0)continue;const v=emb(w);const s=0.6*cos(v,ov)+0.5*(theme?dotp(v,theme):0);if(s>bs){bs=s;best=w;}}return best;}

// ---- THE STUDENT: 2 lines in -> 1 line out, rhyme tightness matched to the song ----
function student(above, below, targetRhyme, song){
  const req = rhymeStrength(song);                         // required rhyme quality (gradient)
  const theme = themeVec([song,above,below].join(" "));
  const tSyl = Math.round((sylLine(above)+sylLine(below))/2);
  // 1) VERBATIM retrieve: rhyme-quality >= song's strictness, syllable close, best theme fit, low-AI
  const v = LIB.map(x=>({...x,rq:rhymeQuality(x.line,targetRhyme)}))
    .filter(x=>x.rq>=req-0.001 && Math.abs(x.syl-tSyl)<=3 && words(x.line).slice(-1)[0]!==targetRhyme)
    .sort((a,b)=>(theme&&b.tv?dotp(theme,b.tv):0)-(theme&&a.tv?dotp(theme,a.tv):0));
  for(const c of v){ if(sc(c.line)<55 && grammarOK(c.line)) return {line:c.line,mode:"retrieve",rq:c.rq}; }
  // 2) TEMPLATE fill (coverage fallback): a mold whose ending matches the rhyme tightness, fill slots w/ theme
  const tpls=TPL.filter(t=>Math.abs(t.syl-tSyl)<=3 && rhymeQuality(t.w.join(" "),targetRhyme)>=req-0.001);
  for(const t of tpls.slice(0,200)){const out=t.w.slice();for(let i=0;i<out.length-1;i++)if(swappable(out[i]))out[i]=fillSlot(out[i],theme);
    const line=out.join(" "); if(sc(line)<55 && grammarOK(line)) return {line,mode:"template",rq:rhymeQuality(line,targetRhyme)}; }
  return null;
}

// studentRanked — return up to K gate-passing candidates (best theme-fit first). Lets an offline judge
// (build-time, allowed) prove whether the library HAS an acceptable line for a context — i.e. whether
// the 13% raw-failures are a SELECTION problem (fixable by judge-cleaning the library) or a coverage gap.
function studentRanked(above, below, targetRhyme, song, K){
  K = K || 3;
  const req = rhymeStrength(song);
  const theme = themeVec([song,above,below].join(" "));
  const tSyl = Math.round((sylLine(above)+sylLine(below))/2);
  const out = [];
  const v = LIB.map(x=>({...x,rq:rhymeQuality(x.line,targetRhyme)}))
    .filter(x=>x.rq>=req-0.001 && Math.abs(x.syl-tSyl)<=3 && words(x.line).slice(-1)[0]!==targetRhyme)
    .sort((a,b)=>(theme&&b.tv?dotp(theme,b.tv):0)-(theme&&a.tv?dotp(theme,a.tv):0));
  for(const c of v){ if(sc(c.line)<55 && grammarOK(c.line)){ out.push({line:c.line,mode:"retrieve",rq:c.rq}); if(out.length>=K) return out; } }
  const tpls = TPL.filter(t=>Math.abs(t.syl-tSyl)<=3 && rhymeQuality(t.w.join(" "),targetRhyme)>=req-0.001);
  for(const t of tpls.slice(0,200)){const o=t.w.slice();for(let i=0;i<o.length-1;i++)if(swappable(o[i]))o[i]=fillSlot(o[i],theme);
    const line=o.join(" "); if(sc(line)<55&&grammarOK(line)){out.push({line,mode:"template",rq:rhymeQuality(line,targetRhyme)});if(out.length>=K)return out;}}
  return out;
}
module.exports = { student, studentRanked, rhymeStrength, sc, LIB, TPL, test, train, rows, words, sylLine };
if (require.main === module) {
  console.log("LIB "+LIB.length+" lines | TPL "+TPL.length+" molds | COMMON "+COMMON.length+" | test "+test.length+"\n");
  let hit=0;
  for(const r of test){
    const song=[r.above,r.mid,r.below].join("\n");
    const out=student(r.above,r.below,r.rhyme,song);
    const strength=rhymeStrength(song).toFixed(2);
    if(out)hit++;
    console.log("(rhyme:"+r.rhyme+" strength:"+strength+") "+(out?"["+out.mode+" rq"+out.rq.toFixed(2)+" "+sc(out.line)+"%AI] "+out.line:"(no fit)"));
  }
  console.log("\nv2 produced a line for "+hit+"/"+test.length+" held-out contexts (rhyme tightness matched per-song).");
}
