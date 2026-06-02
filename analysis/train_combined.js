/* train_combined.js — FEATURE UNION: BoW(AI-vocab) + structural discriminators + cliché/rhyme
 * + the 18 stat features. Train logistic regression on the combined vector; ablate to show
 * each layer's contribution. Copyright-clean: text in memory only, numbers exported. */
const path=require('path'), fs=require('fs'), ROOT=path.join(__dirname,'..');
const slop=require(path.join(ROOT,'src/slop-core.js'));
const feats=require(path.join(ROOT,'src/features.js'));
const pat=require('./patterns.js');
const toks=t=>(slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g)||[]).filter(w=>w.length>1||w==='i');

async function fetchLyrics(a,t){
  try{const r=await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`);if(r.ok){const j=await r.json();const l=j.plainLyrics||'';if(l.length>60)return l;}}catch(e){}
  try{const r=await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`);if(r.ok){const j=await r.json();if(j.lyrics&&j.lyrics.length>60)return j.lyrics;}}catch(e){}
  return '';
}
async function pool(items,n,fn){let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){await fn(items[i++]);}}));}

// dense (non-BoW) features for a song -> named dict
function dense(text){
  const d={};
  try{const f=feats.extract(text); f.names.forEach((k,i)=>d['f_'+k]=f.values[i]);}catch(e){}
  const a=pat.analyze(text); const nL=Math.max(1,a.__nLines);
  const RATE=new Set(['contentDensity']);
  let cl=0,rh=0;
  for(const [k,v] of Object.entries(a)){
    if(k.startsWith('struct::')){const n=k.slice(8); d['s_'+n]=RATE.has(n)?v:v/nL;}
    else if(k.startsWith('cliche::')) cl+=v;
    else if(k.startsWith('rhyme::')) rh+=v;
  }
  d['lex_cliche']=cl/nL; d['lex_rhyme']=rh/nL;
  return d;
}

(async()=>{
  const ai=[];
  for(const m of ['chatgpt','claude','grok','qwen-2.5-14b','claude-opus-4-8-generated','suno'])
    for(const s of (JSON.parse(fs.readFileSync(path.join(ROOT,'corpus/models',m+'.json'))).songs||[])){const t=s.lyrics||s; if(typeof t==='string'&&t.length>40) ai.push(t);}
  console.log('AI songs:',ai.length);
  const df={}; for(const t of ai) for(const w of new Set(toks(t))) df[w]=(df[w]||0)+1;
  const VOCAB=Object.keys(df).filter(w=>df[w]>=2).sort(); const IDX=new Map(VOCAB.map((w,i)=>[w,i]));
  console.log('AI vocab (df>=2):',VOCAB.length);

  const profs=JSON.parse(fs.readFileSync(path.join(ROOT,'corpus/human_profiles.json'))).profiles.filter(p=>p.source!=='dataset'&&p.artist&&p.title);
  const hum=[]; let done=0;
  await pool(profs,6,async(p)=>{const t=await fetchLyrics(p.artist,p.title); if(++done%150===0)console.log('  fetched',done); if(t&&t.length>60) hum.push(t);});
  console.log('human fetched:',hum.length);

  // build dense feature name index (from a sample)
  const denseNames=[...new Set(ai.concat(hum).slice(0,40).flatMap(t=>Object.keys(dense(t))))].sort();
  const DN=denseNames.length; console.log('dense features:',DN);

  // vectorize each song: {bow: sparse{idx:tf}, dn: Float64Array}
  function vec(text){ const tk=toks(text); const bow={}; for(const w of tk){const i=IDX.get(w); if(i!==undefined)bow[i]=(bow[i]||0)+1;} const n=Math.max(1,tk.length); for(const i in bow)bow[i]/=n;
    const d=dense(text); const dn=new Float64Array(DN); denseNames.forEach((k,j)=>dn[j]=(+d[k]||0)); return {bow,dn}; }
  const X=ai.map(t=>({...vec(t),y:1})).concat(hum.map(t=>({...vec(t),y:0})));
  // z-score dense features
  const mean=new Float64Array(DN),std=new Float64Array(DN);
  for(const s of X) for(let j=0;j<DN;j++) mean[j]+=s.dn[j]; for(let j=0;j<DN;j++)mean[j]/=X.length;
  for(const s of X) for(let j=0;j<DN;j++) std[j]+=(s.dn[j]-mean[j])**2; for(let j=0;j<DN;j++)std[j]=Math.sqrt(std[j]/X.length)||1;
  for(const s of X) for(let j=0;j<DN;j++) s.dn[j]=(s.dn[j]-mean[j])/std[j];

  // logistic regression on a chosen feature mode
  function train(tr,mode){ const Dv=VOCAB.length; const wB=new Float64Array(Dv),wD=new Float64Array(DN); let b=0;
    const lr=0.5,l2=3e-4,EP=120; const nP=tr.filter(s=>s.y).length,nN=tr.length-nP,wP=tr.length/(2*Math.max(1,nP)),wN=tr.length/(2*Math.max(1,nN));
    for(let e=0;e<EP;e++){ for(let k=tr.length-1;k>0;k--){const j=(Math.random()*(k+1))|0;[tr[k],tr[j]]=[tr[j],tr[k]];}
      for(const s of tr){ let z=b; if(mode!=='dense')for(const i in s.bow)z+=wB[i]*s.bow[i]; if(mode!=='bow')for(let j=0;j<DN;j++)z+=wD[j]*s.dn[j];
        const p=1/(1+Math.exp(-z)); const g=(s.y?wP:wN)*(p-s.y);
        if(mode!=='dense')for(const i in s.bow)wB[i]-=lr*(g*s.bow[i]+l2*wB[i]); if(mode!=='bow')for(let j=0;j<DN;j++)wD[j]-=lr*(g*s.dn[j]+l2*wD[j]); b-=lr*g; } }
    return {wB,wD,b,mode}; }
  const pred=(m,s)=>{let z=m.b; if(m.mode!=='dense')for(const i in s.bow)z+=m.wB[i]*s.bow[i]; if(m.mode!=='bow')for(let j=0;j<DN;j++)z+=m.wD[j]*s.dn[j]; return 1/(1+Math.exp(-z));};
  function cv(mode){ const d=X.slice(); for(let k=d.length-1;k>0;k--){const j=(Math.random()*(k+1))|0;[d[k],d[j]]=[d[j],d[k]];}
    let c=0,t=0,tp=0,fp=0,fn=0; const K=5;
    for(let f=0;f<K;f++){const te=d.filter((_,i)=>i%K===f),tr=d.filter((_,i)=>i%K!==f);const m=train(tr,mode);
      for(const s of te){const p=pred(m,s)>=0.5?1:0; if(p===s.y)c++; t++; if(s.y&&p)tp++;else if(!s.y&&p)fp++;else if(s.y&&!p)fn++;}}
    return {acc:c/t,prec:tp/Math.max(1,tp+fp),rec:tp/Math.max(1,tp+fn)}; }

  console.log('\n=== ABLATION (5-fold CV) ===');
  for(const mode of ['bow','dense','combined']){const r=cv(mode);
    console.log(mode.padEnd(10)+'acc '+(100*r.acc).toFixed(1)+'%   precAI '+(100*r.prec).toFixed(1)+'%  recAI '+(100*r.rec).toFixed(1)+'%');}
  // full combined model for interpretable weights + export
  const full=train(X,'combined');
  const dRanked=denseNames.map((k,j)=>[k,full.wD[j]]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  console.log('\n=== TOP DENSE FEATURES (|weight|) — the structural/stat discriminators that matter ===');
  dRanked.slice(0,15).forEach(([k,w])=>console.log('  '+k.padEnd(22)+(w>0?'+':'')+w.toFixed(2)+(w>0?'  (AI)':'  (human)')));
  const wRanked=VOCAB.map((w,i)=>[w,full.wB[i]]).sort((a,b)=>b[1]-a[1]);
  console.log('\n=== TOP 15 AI words / TOP 15 human words (learned) ===');
  console.log('AI:    '+wRanked.slice(0,15).map(x=>x[0]).join(', '));
  console.log('human: '+wRanked.slice(-15).reverse().map(x=>x[0]).join(', '));
  fs.writeFileSync(path.join(ROOT,'corpus/combined_model.json'),JSON.stringify({note:'combined BoW+dense logistic-regression',vocab:VOCAB,wBow:Array.from(full.wB),denseNames,wDense:Array.from(full.wD),denseMean:Array.from(mean),denseStd:Array.from(std),bias:full.b}));
  console.log('\nwrote corpus/combined_model.json');
})();
