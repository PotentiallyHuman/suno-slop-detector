// CHEAP TEST of "Semantic N+7": borrow a real human line's grammar skeleton, refill its content
// slots with theme-matched words, keep the song's rhyme word at the end. Coherent by borrowed
// syntax, original by new content. Eyeball: coherent or soup?
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const R = path.join(process.env.HOME, "projects/28_suno_slop_detector");
const sb = { console, atob: (s) => Buffer.from(s, "base64").toString("binary"), Uint8Array, Int8Array, Float32Array };
sb.globalThis = sb; sb.self = sb; sb.window = sb; vm.createContext(sb);
for (const f of ["humanizer_model_p1", "humanizer_model_p2", "humanizer_model_p3"]) vm.runInContext(fs.readFileSync(R + "/src/ext/" + f + ".browser.js", "utf8"), sb);
const M = sb.HZ_MODEL;
const EMB = new Int8Array(Uint8Array.from(Buffer.from(M.embB64, "base64")).buffer), DIM = M.embDim, EW = {};
M.embWords.forEach((w, i) => EW[w] = i);
const POS = M.wordPOS, VK = M.vkey, HUM = M.humanness, CLI = new Set(M.cliche);
function emb(w){const r=EW[w];if(r===undefined)return null;const v=new Float32Array(DIM);for(let k=0;k<DIM;k++)v[k]=EMB[r*DIM+k]/127;return v;}
function dot(a,b){let s=0;for(let k=0;k<a.length;k++)s+=a[k]*b[k];return s;}
function unit(v){let s=0;for(let k=0;k<v.length;k++)s+=v[k]*v[k];s=Math.sqrt(s)||1;const o=new Float32Array(v.length);for(let k=0;k<v.length;k++)o[k]=v[k]/s;return o;}
function nsyl(w){w=w.toLowerCase().replace(/[^a-z]/g,"");if(!w)return 1;const m=w.match(/[aeiouy]+/g);let n=m?m.length:1;if(/e$/.test(w)&&n>1)n--;return Math.max(1,n);}
const words=l=>(String(l).toLowerCase().replace(/[’‘]/g,"'").match(/[a-z']+/g))||[];
const pos=w=>POS[w]||"NN";  // untagged content words default to noun
const FUNC=new Set("the a an and or but of to in on at by for with from as is are was were be been i you he she it we they me my your his her our their this that these those not no so if when then there here out up down off over under into through about".split(" "));
const isContent=w=>!FUNC.has(w)&&w.length>2&&/^(NN|NNS|VB|VBD|VBG|VBP|VBZ|JJ|RB)/.test(pos(w));

// theme vector from a song's content words
function themeVec(text){const ws=words(text),acc=new Float32Array(DIM);let n=0;for(const w of ws){const v=emb(w);if(v&&w.length>3&&(HUM[w]||0)>-2){for(let k=0;k<DIM;k++)acc[k]+=v[k];n++;}}return n?unit(acc):null;}

// donor bank: clean human lines, 4-9 content-bearing words
const human=JSON.parse(fs.readFileSync(fs.existsSync("/tmp/human_lyrics_cache.json")?"/tmp/human_lyrics_cache.json":R+"/corpus/human_lyrics_cache2.json","utf8"));
const hT=(Array.isArray(human)?human:Object.values(human)).map(x=>typeof x==="string"?x:(x.lyrics||x.text||""));
// corpus bigrams (slot-fit) — does the candidate actually occur after prev / before next in human text?
const BIG=new Map(),UNI=new Map();
for(const t of hT){const w=words(t);for(let i=0;i<w.length;i++){UNI.set(w[i],(UNI.get(w[i])||0)+1);if(i+1<w.length){const k=w[i]+" "+w[i+1];BIG.set(k,(BIG.get(k)||0)+1);}}}
const bg=(a,b)=>BIG.get(a+" "+b)||0;
// concrete = NOT an abstract-suffix word and reasonably common (imageable nouns sing better)
const ABSTRACT=/(ness|tion|sion|ment|ity|ance|ence|ism|ship|hood|dom|ude|acy)$/;
const concrete=w=>!ABSTRACT.test(w)&&(UNI.get(w)||0)>=8;
const donors=[];
for(const t of hT){for(const l of String(t).split("\n")){const w=words(l);if(w.length<4||w.length>9)continue;if(/[^a-z' ]/i.test(l.trim()))continue;const last=w[w.length-1];if(!VK[last])continue;let syl=0;for(const x of w)syl+=nsyl(x);donors.push({w,syl,lastPOS:pos(last)});}if(donors.length>40000)break;}

// generic high-frequency words that win theme-nearest but read as filler — never substitute IN as content
const GENERIC=new Set("own thing things way ways make made makes get gets got let lets keep keeps take takes put go goes one ones some any all more most much many lot kind sort part bit something nothing anything everything someone".split(" "));
// confident content POS only (skip defaulted-NN ambiguity by requiring the tag to EXIST)
const tagged=w=>POS[w]!==undefined;
// NOUNS ONLY — verbs/adjs need agreement/argument structure (swapping them broke grammar: "she's return be").
// This mirrors the proven humanizer, which only swaps concrete nouns.
const swappable=w=>tagged(w)&&!FUNC.has(w)&&w.length>3&&/^(NN|NNS)$/.test(POS[w])&&!GENERIC.has(w);
// substitute: theme-nearest CONCRETE noun (high humanness = a real imageable word), strong theme floor
function cos(a,b){if(!a||!b)return -1;let s=0;for(let k=0;k<a.length;k++)s+=a[k]*b[k];return s;}
function sub(origPos,theme,used,targetSyl,origWord,prev,next){
  const ov=emb(origWord);if(!ov)return origWord;      // need the donor word's TYPE vector
  let best=null,bs=-1e9;
  for(let i=0;i<M.embWords.length;i++){const w=M.embWords[i];
    if(used.has(w)||CLI.has(w)||GENERIC.has(w))continue;
    if(POS[w]!==origPos)continue;
    if(w.length<4||!concrete(w))continue;
    const v=emb(w);if(!v)continue;
    const typeSim=cos(v,ov);                           // SAME TYPE as the word it replaces
    if(typeSim<0.30)continue;                           // hard: must be in the donor word's family
    const slot=Math.log(1+bg(prev,w))+Math.log(1+bg(w,next));
    const s=0.6*typeSim+0.5*dot(v,theme)+0.25*slot-Math.abs(nsyl(w)-targetSyl)*0.2;
    if(s>bs){bs=s;best=w;}}
  return (best&&bs>0.5)?best:origWord;                  // else keep the donor's real word
}
// SEMANTIC N+7 (refined): refill only the CONFIDENT content slots, keep donor's other real words, end on rhyme
function generate(clicheLine,songText){
  const theme=themeVec(songText);if(!theme)return null;
  const cw=words(clicheLine),rhyme=cw[cw.length-1];let tSyl=0;for(const x of cw)tSyl+=nsyl(x);
  const rPOS=pos(rhyme);
  let cand=donors.filter(d=>Math.abs(d.syl-tSyl)<=2&&d.lastPOS===rPOS&&d.w.filter(swappable).length>=2
    && bg(d.w[d.w.length-2], rhyme) >= 1);   // the rhyme word must REALLY follow the donor's penultimate word
  if(!cand.length)return null;
  let seed=0;for(const c of songText)seed=(seed*31+c.charCodeAt(0))%100003;
  const donor=cand[seed%cand.length];
  const out=donor.w.slice(),used=new Set([rhyme]);
  let changed=0;
  for(let i=0;i<out.length-1;i++){if(swappable(out[i])){const prev=i>0?out[i-1]:"",next=i+1<out.length?out[i+1]:"";const s=sub(POS[out[i]],theme,used,nsyl(out[i]),out[i],prev,next);if(s!==out[i]){used.add(s);out[i]=s;changed++;}}}
  out[out.length-1]=rhyme;
  // need at least 1 real change (originality) — else it's just the donor
  if(changed<1)return null;
  return {line:out.join(" "),donor:donor.w.join(" "),changed};
}

const song="I floated through the silence without a spark or flame, a neutron in the shadows without a face or name, you are a force of nature pulling atoms in your wake, gravity was singing when you stepped into my light";
const TESTS=["Neon shadows fill the endless sky","my heart will break tonight","dancing in the pouring rain","lost inside a broken dream","the fire burns within my soul","you are my shining star"];
console.log("donor bank:",donors.length,"human lines\n");
for(const t of TESTS){const r=generate(t,song);console.log("CLICHE : "+t);if(r){console.log("DONOR  : "+r.donor);console.log("GENNED : "+r.line);}else console.log("(no donor)");console.log("");}
