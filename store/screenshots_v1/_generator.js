const fs=require("fs"),path=require("path"),vm=require("vm"),os=require("os");
const ROOT="/home/potentiallyhumanspark/projects/28_suno_slop_detector/dist/firefox";
const Fs=["src/slop-core.js","src/common_words.js","src/features.js","src/ext/patterns.browser.js","src/ext/tier3.browser.js","src/ext/perspectives.browser.js","src/ext/model.js","src/ext/model_v5.browser.js","src/ext/model_v8.browser.js","src/ext/portability_tells.browser.js","src/ext/clean-lyrics.js","src/ext/v2-engine.js","src/ext/craft_features.browser.js","src/ext/v8-score.browser.js","src/ext/cliche_swaps.browser.js","src/ext/v2-panel.js","src/ext/humanizer_model_p1.browser.js","src/ext/humanizer_model_p2.browser.js","src/ext/humanizer_model_p3.browser.js","src/ext/humanizer-gen.browser.js"];
const sb={console,setTimeout,clearTimeout,atob:s=>Buffer.from(s,"base64").toString("binary"),Uint8Array,Int8Array,Float32Array};
sb.globalThis=sb;sb.self=sb;sb.window=sb;vm.createContext(sb);
for(const f of Fs)vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),sb,{filename:f});
const S=t=>{try{const r=sb.SlopV8.scoreV8(t);return (r&&r.score!=null)?r.score:0;}catch(e){return 0;}};
const L=t=>{try{const r=sb.SlopV8.scoreV8(t);return typeof r.z==="number"?r.z:0;}catch(e){return 0;}};
const verdict=t=>{try{return sb.SlopScore.verdict(S(t));}catch(e){return "";}};

const song=`In the shadows of the night, I'm searching for a sign
Every broken dream I chase keeps slipping out of line
The city lights are calling but the silence pulls me back
Echoes of a love we lost are fading down the track
I will rise above the ashes, break these chains tonight
Through the fire and the storm I'll find my guiding light
Forever and forever, in the echoes we remain
Dancing through the endless dark, chasing the falling rain`;

const one=sb.HumanizeFreestyle.humanizeOne(song,S,L);
const half=sb.HumanizeFreestyle.humanizeHalf(song,S,L);
const chaos=sb.HumanizeFreestyle.humanizeChaos(song,S,L);

// per-line word diff: highlight words in `after` that differ positionally from `before`
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function diffLines(before,after){
  const b=before.split("\n"),a=after.split("\n"),out=[];
  for(let i=0;i<a.length;i++){
    const bw=(b[i]||"").split(/(\s+)/), aw=a[i].split(/(\s+)/);
    let line="";
    for(let j=0;j<aw.length;j++){
      const tok=aw[j];
      if(/^\s+$/.test(tok)){line+=tok;continue;}
      const norm=s=>s.toLowerCase().replace(/[‘’]/g,"'").replace(/[^a-z']/g,"");
      if(norm(tok)!==norm(bw[j]||"")) line+=`<mark>${esc(tok)}</mark>`;
      else line+=esc(tok);
    }
    out.push(line);
  }
  return out.join("\n");
}

const panel=sb.SlopPanel.build(song, sb.SlopV2.score(song));
const joker=(panel.jokerOpts&&panel.jokerOpts[0])||"";
const bad=(panel.bad&&panel.bad[0])||{label:""};
const good=(panel.good&&panel.good[0])||{label:""};

const states=[
 {key:"1_original",step:"What Suno gave you",btn:"Original lyrics",sub:"straight from the generator",before:null,after:S(song),verdict:verdict(song),html:esc(song),note:"Every line leans on the same stock images — shadows, city lights, echoes, ashes, endless dark."},
 {key:"2_line",step:"Humanize Line",btn:"⚡ rebuilds your single worst line",sub:"one surgical edit, your rhymes kept",before:one.before,after:one.after,verdict:verdict(one.text),html:diffLines(song,one.text),note:"Targets the most-AI line and rewrites just that — minimal, safe, repeatable. Press again for the next-worst."},
 {key:"3_rewrite",step:"Humanize Rewrite",btn:"🔁 swaps every cliché word at once",sub:"all the stock words, one click",before:half.before,after:half.after,verdict:verdict(half.text),html:diffLines(song,half.text),note:"Replaces every flagged cliché in one pass. The score holds because this song is pinned by its SHAPE, not its words — which is exactly what Chaos fixes."},
 {key:"4_chaos",step:"Humanize Chaos",btn:"🌀 full rework — structure and all",sub:"when you want it truly human",before:chaos.before,after:chaos.after,verdict:verdict(chaos.text),html:diffLines(song,chaos.text),note:`Drops every safety gate and reworks the structure too. ${chaos.before}% → ${chaos.after}% AI. This is the one that actually clears the flag.`},
];

function color(s){return s>=75?"#ff4d4f":s>=45?"#f0a020":"#34d399";}
function page(st){
  const arrow = st.before!=null ? `<span class="before">${st.before}%</span><span class="arr">→</span>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,Inter,sans-serif}
  html,body{width:1280px;height:800px;background:radial-gradient(1200px 600px at 75% -10%, #1a1430 0%, #0d0e13 55%)}
  .wrap{padding:54px 60px;height:800px;display:flex;flex-direction:column}
  .top{display:flex;align-items:center;gap:14px;margin-bottom:8px}
  .logo{width:38px;height:38px;border-radius:9px;background:linear-gradient(135deg,#b07bff,#6d4bd6);display:flex;align-items:center;justify-content:center;font-size:21px}
  .brand{color:#fff;font-size:21px;font-weight:700;letter-spacing:.2px}
  .brand small{display:block;color:#9b8fc0;font-size:12.5px;font-weight:500;letter-spacing:.3px}
  .step{margin-left:auto;color:#cdb6ff;font-size:14px;background:rgba(176,123,255,.14);border:1px solid rgba(176,123,255,.35);padding:7px 15px;border-radius:999px;font-weight:600}
  .h{color:#fff;font-size:34px;font-weight:800;margin:18px 0 2px;letter-spacing:-.3px}
  .hsub{color:#a99fc4;font-size:16px;margin-bottom:20px}
  .h .pill{font-size:18px;vertical-align:middle;background:#241c3a;border:1px solid #3a2e5e;color:#d9c4ff;border-radius:8px;padding:3px 11px;margin-left:6px}
  .body{display:flex;gap:26px;flex:1;min-height:0}
  .lyr{flex:1.35;background:#15161d;border:1px solid #262833;border-radius:18px;padding:26px 30px;overflow:hidden}
  .lyr .cap{color:#7d8190;font-size:12.5px;text-transform:uppercase;letter-spacing:1.3px;margin-bottom:14px}
  .lyr pre{color:#e7e7ee;font-size:18.5px;line-height:2.0;white-space:pre-wrap;font-family:inherit}
  mark{background:rgba(52,211,153,.20);color:#7ef0bf;border-radius:5px;padding:1px 5px;text-decoration:none;font-weight:600}
  .side{flex:1;display:flex;flex-direction:column;gap:16px}
  .score{background:#15161d;border:1px solid #262833;border-radius:18px;padding:24px 26px;text-align:center}
  .score .num{font-size:74px;font-weight:900;line-height:1}
  .score .vd{color:#cfd0da;font-size:18px;font-weight:700;margin-top:8px}
  .score .ai{font-size:15px;color:#8a8f9c;margin-top:3px}
  .before{color:#8a8f9c;font-size:30px;font-weight:800;vertical-align:middle}
  .arr{color:#8a8f9c;font-size:26px;margin:0 12px;vertical-align:middle}
  .note{background:#15161d;border:1px solid #262833;border-radius:16px;padding:18px 20px;color:#bfc2cf;font-size:15px;line-height:1.55}
  .craft{background:#15161d;border:1px solid #262833;border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:9px}
  .cr{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;line-height:1.4;border-left:3px solid;padding:7px 11px;border-radius:9px;background:rgba(255,255,255,.03)}
  .cr.j{border-color:#b07bff}.cr.b{border-color:#ff9f1c}.cr.g{border-color:#5fd068}
  .cr .t{color:#d7d8e0}.cr.j .t{color:#d9c4ff}
  .foot{color:#6f7382;font-size:13px;margin-top:16px;text-align:center}
  .foot b{color:#9b8fc0}
  </style></head><body><div class="wrap">
   <div class="top"><div class="logo">🤖</div><div class="brand">Suno Slop Detector<small>on-device AI-lyric score + humanizer</small></div><div class="step">${st.step}</div></div>
   <div class="h">${st.btn}</div><div class="hsub">${st.sub}</div>
   <div class="body">
     <div class="lyr"><div class="cap">Lyrics${st.before!=null?" &nbsp;·&nbsp; <span style='color:#7ef0bf'>green = what changed</span>":""}</div><pre>${st.html}</pre></div>
     <div class="side">
       <div class="score"><div class="num" style="color:${color(st.after)}">${arrow}<span>${st.after}%</span></div><div class="vd">${st.verdict.replace(/🤖/,'').trim()}</div><div class="ai">model confidence this is AI</div></div>
       <div class="note">${st.note}</div>
       <div class="craft">
         <div class="cr j"><span>🃏</span><span class="t">${esc(joker).slice(0,120)}</span></div>
         <div class="cr b"><span>⚠️</span><span class="t">${esc(bad.label)}</span></div>
         <div class="cr g"><span>✅</span><span class="t">${esc(good.label)}</span></div>
       </div>
     </div>
   </div>
   <div class="foot">Runs entirely <b>on your device</b> · no account, no upload · reads only your lyrics box · <b>free &amp; open source</b></div>
  </div></body></html>`;
}
const dir=path.join(os.homedir(),"shots");
fs.mkdirSync(dir,{recursive:true});
states.forEach(st=>fs.writeFileSync(path.join(dir,st.key+".html"),page(st)));
console.log("wrote",states.length,"html files to",dir);
states.forEach(st=>console.log(`  ${st.key}: ${st.before!=null?st.before+"%->":""}${st.after}% (${st.verdict})`));
