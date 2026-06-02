/* train_bow.js — the RIGHT approach: bag-of-words over the AI vocabulary, then TRAIN a
 * logistic-regression classifier (AI=1 / human=0). The model LEARNS which words+frequencies
 * predict AI vs human. Per-song summary = AI-vocab word counts (numbers only, copyright-clean). */
const path=require('path'), fs=require('fs'), ROOT=path.join(__dirname,'..');
const slop=require(path.join(ROOT,'src/slop-core.js'));
const toks=t=>(slop.stripSectionLabels(String(t)).toLowerCase().match(/[a-z']+/g)||[]).filter(w=>w.length>1||w==='i');

async function fetchLyrics(a,t){
  try{const r=await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`);if(r.ok){const j=await r.json();const l=j.plainLyrics||'';if(l.length>60)return l;}}catch(e){}
  try{const r=await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`);if(r.ok){const j=await r.json();if(j.lyrics&&j.lyrics.length>60)return j.lyrics;}}catch(e){}
  return '';
}
async function pool(items,n,fn){let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const k=i++;await fn(items[k]);}}));}

(async()=>{
  // ---- AI texts + vocabulary ----
  const ai=[];
  for(const m of ['chatgpt','claude','grok','qwen-2.5-14b','claude-opus-4-8-generated','suno']){
    const p=path.join(ROOT,'corpus/models',m+'.json'); if(!fs.existsSync(p))continue;
    for(const s of (JSON.parse(fs.readFileSync(p)).songs||[])){const t=s.lyrics||s; if(typeof t==='string'&&t.length>40) ai.push(t);}
  }
  console.log('AI songs:',ai.length);
  // vocab = AI words appearing in >=2 AI songs (drop hapax noise)
  const df={}; for(const t of ai){for(const w of new Set(toks(t))) df[w]=(df[w]||0)+1;}
  const VOCAB=Object.keys(df).filter(w=>df[w]>=2).sort();
  const IDX=new Map(VOCAB.map((w,i)=>[w,i]));
  console.log('AI vocabulary (df>=2):',VOCAB.length,'words');

  // ---- fetch human ----
  const profs=JSON.parse(fs.readFileSync(path.join(ROOT,'corpus/human_profiles.json'))).profiles.filter(p=>p.source!=='dataset'&&p.artist&&p.title);
  const hum=[]; let done=0;
  await pool(profs,6,async(p)=>{const t=await fetchLyrics(p.artist,p.title); if(++done%150===0)console.log('  fetched',done); if(t&&t.length>60) hum.push(t);});
  console.log('human fetched:',hum.length);

  // ---- vectorize: per song, term-frequency over AI vocab ----
  function vec(text){const tk=toks(text); const c={}; for(const w of tk){const i=IDX.get(w); if(i!==undefined)c[i]=(c[i]||0)+1;} const x={}; const n=Math.max(1,tk.length); for(const i in c) x[i]=c[i]/n; return {x,total:tk.length,counts:c};}
  const data=[]; const summaries={ai:[],human:[]};
  ai.forEach(t=>{const v=vec(t); data.push({x:v.x,y:1}); summaries.ai.push({total:v.total,inVocab:Object.values(v.counts).reduce((a,b)=>a+b,0),wc:v.counts});});
  hum.forEach(t=>{const v=vec(t); data.push({x:v.x,y:0}); summaries.human.push({total:v.total,inVocab:Object.values(v.counts).reduce((a,b)=>a+b,0),wc:v.counts});});

  // ---- logistic regression (class-weighted, L2), 5-fold CV ----
  const D=VOCAB.length;
  function train(tr){
    const w=new Float64Array(D); let b=0; const lr=0.5,l2=2e-4,EP=120;
    const nP=tr.filter(s=>s.y).length,nN=tr.length-nP,wP=tr.length/(2*Math.max(1,nP)),wN=tr.length/(2*Math.max(1,nN));
    for(let e=0;e<EP;e++){ for(let k=tr.length-1;k>0;k--){const j=(Math.random()*(k+1))|0;[tr[k],tr[j]]=[tr[j],tr[k]];}
      for(const s of tr){ let z=b; for(const i in s.x) z+=w[i]*s.x[i]; const p=1/(1+Math.exp(-z)); const g=(s.y?wP:wN)*(p-s.y);
        for(const i in s.x) w[i]-=lr*(g*s.x[i]+l2*w[i]); b-=lr*g; } }
    return {w,b};
  }
  const pred=(m,x)=>{let z=m.b; for(const i in x) z+=m.w[i]*x[i]; return 1/(1+Math.exp(-z));};
  // CV
  for(let k=data.length-1;k>0;k--){const j=(Math.random()*(k+1))|0;[data[k],data[j]]=[data[j],data[k]];}
  let correct=0,tot=0,tp=0,fp=0,fn=0,tn=0;
  const K=5;
  for(let f=0;f<K;f++){ const te=data.filter((_,i)=>i%K===f), tr=data.filter((_,i)=>i%K!==f); const m=train(tr);
    for(const s of te){const p=pred(m,s.x)>=0.5?1:0; if(p===s.y)correct++; tot++; if(s.y&&p)tp++; else if(!s.y&&p)fp++; else if(s.y&&!p)fn++; else tn++;} }
  console.log('\n=== BoW logistic-regression, 5-fold CV ===');
  console.log('accuracy: '+(100*correct/tot).toFixed(1)+'%  ('+correct+'/'+tot+')');
  console.log('precision(AI): '+(100*tp/Math.max(1,tp+fp)).toFixed(1)+'%  recall(AI): '+(100*tp/Math.max(1,tp+fn)).toFixed(1)+'%');
  // full-data model for interpretable weights
  const full=train(data);
  const ranked=VOCAB.map((w,i)=>[w,full.w[i],df[w]]).sort((a,b)=>b[1]-a[1]);
  console.log('\n=== TOP 22 AI-INDICATIVE WORDS (learned weight, AI-songs-using) ===');
  ranked.slice(0,22).forEach(([w,wt,d])=>console.log('  '+w.padEnd(15)+(wt>0?'+':'')+wt.toFixed(2)+'   ['+d+' AI songs]'));
  console.log('\n=== TOP 22 HUMAN-INDICATIVE WORDS ===');
  ranked.slice(-22).reverse().forEach(([w,wt,d])=>console.log('  '+w.padEnd(15)+wt.toFixed(2)+'   ['+d+' AI songs]'));
  // persist (numbers only)
  fs.writeFileSync(path.join(ROOT,'corpus/bow_model.json'),JSON.stringify({note:'BoW logistic-regression over AI vocabulary',vocabSize:D,vocab:VOCAB,weights:Array.from(full.w),bias:full.b,cvAccuracy:+(correct/tot).toFixed(4)}));
  fs.writeFileSync(path.join(ROOT,'corpus/song_summaries_bow.json'),JSON.stringify({note:'per-song AI-vocab word counts, numbers only',vocabSize:D,aiCount:summaries.ai.length,humanCount:summaries.human.length,ai:summaries.ai,human:summaries.human}));
  console.log('\nwrote corpus/bow_model.json + corpus/song_summaries_bow.json');
})();
