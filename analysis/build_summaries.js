/* build_summaries.js — make the v1 discriminator-summary for EVERY song (AI + human),
 * numbers only (no raw lyrics stored). Derives the AI-overused word list empirically. */
const fs=require('fs');
const path=require('path'); const ROOT=path.join(__dirname,'..');
const slop=require(path.join(ROOT,'src/slop-core.js'));
const pat=require('./patterns.js');

const STOP=new Set("a an the and or but if then so as of to in on at by for with from into about over under up down out off i you he she it we they me him her us them my your his its our their this that these those is am are was were be been being do does did have has had will would can could should may might must shall not no n't oh yeah la na ooh".split(/\s+/));
const toks=t=>(String(t).toLowerCase().match(/[a-z']+/g)||[]);
const content=t=>toks(slop.stripSectionLabels(t)).filter(w=>!STOP.has(w)&&w.length>2);

async function fetchLyrics(a,t){
  try{const r=await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`);if(r.ok){const j=await r.json();const l=j.plainLyrics||'';if(l.length>60)return l;}}catch(e){}
  try{const r=await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`);if(r.ok){const j=await r.json();if(j.lyrics&&j.lyrics.length>60)return j.lyrics;}}catch(e){}
  return '';
}
async function pool(items,n,fn){const out=[];let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const k=i++;out[k]=await fn(items[k],k);}}));return out;}

(async()=>{
  // ---- gather AI texts ----
  const ai=[];
  for(const m of ['chatgpt','claude','grok','qwen-2.5-14b','claude-opus-4-8-generated','suno']){
    const p=path.join(ROOT,'corpus/models',m+'.json'); if(!fs.existsSync(p))continue;
    const r=JSON.parse(fs.readFileSync(p)); for(const s of (r.songs||r)){const t=s.lyrics||s; if(typeof t==='string'&&t.length>40) ai.push({model:m,text:t});}
  }
  // suno from .txt too (already in suno.json, skip dup) -> already included via suno.json
  console.log('AI songs:',ai.length);

  // ---- fetch re-fetchable human in memory ----
  const profs=JSON.parse(fs.readFileSync(path.join(ROOT,'corpus/human_profiles.json'))).profiles.filter(p=>p.source!=='dataset'&&p.artist&&p.title);
  console.log('human to fetch:',profs.length);
  const hum=[]; let done=0;
  await pool(profs,5,async(p)=>{const t=await fetchLyrics(p.artist,p.title); done++; if(done%100===0)console.log('  fetched',done); if(t&&t.length>60) hum.push({artist:p.artist,text:t});});
  console.log('human fetched ok:',hum.length);

  // ---- corpus content-word frequencies (for overused derivation) ----
  const freq=(arr)=>{const f={};let tot=0;for(const s of arr)for(const w of content(s.text)){f[w]=(f[w]||0)+1;tot++;}return{f,tot};};
  const A=freq(ai), H=freq(hum);
  const eps=1/Math.max(A.tot,H.tot);
  const AI_VOCAB=new Set(Object.keys(A.f));
  const ALPHA=0.5;
  // per-word AI-vs-human log-likelihood ratio (Naive-Bayes weight): + = AI-favored
  const llr={}; const allW=new Set([...Object.keys(A.f),...Object.keys(H.f)]);
  for(const w of allW){ const ar=(A.f[w]+ALPHA)/(A.tot+ALPHA*allW.size); const hr=(H.f[w]+ALPHA)/(H.tot+ALPHA*allW.size); llr[w]=Math.log(ar/hr); }
  const cand=Object.keys(A.f).filter(w=>A.f[w]>=ai.length*0.15);   // appears in ~15%+ of AI on average
  const overused=cand.map(w=>{const ar=A.f[w]/A.tot, hr=(H.f[w]||0)/H.tot; return [w,ar/(hr+eps),A.f[w],H.f[w]||0];})
                     .sort((x,y)=>y[1]-x[1]).slice(0,40);
  const OVER=new Set(overused.map(x=>x[0]));
  console.log('\n=== TOP 25 AI-OVERUSED WORDS (word: AIrate/HUMANrate  [AIn/HUMn]) ===');
  overused.slice(0,25).forEach(([w,r,an,hn])=>console.log('  '+w.padEnd(14)+' '+r.toFixed(1)+'x   ['+an+'/'+hn+']'));

  // ---- per-song summaries (numbers + matched lists) ----
  function summarize(text, isAI){
    const a=pat.analyze(text);
    const cw0=content(text);
    let inV=0, aff=0;
    const selfCnt={}; if(isAI) for(const w of cw0) selfCnt[w]=(selfCnt[w]||0)+1;
    for(const w of cw0){
      const inAi = isAI ? ((A.f[w]||0)-(selfCnt[w]||0) > 0) : ((A.f[w]||0) > 0);  // leave-one-out for AI
      if(inAi) inV++;
      aff += (llr[w]||0);
    }
    const nW=Math.max(1,cw0.length);
    const vocab={ aiCoverage:+(inV/nW).toFixed(3), outOfAiVocab:+(1-inV/nW).toFixed(3), aiAffinity:+(aff/nW).toFixed(3) };
    const cl=Object.entries(a).filter(([k,v])=>k.startsWith('cliche::')&&v>0).map(([k,v])=>[k.slice(8),v]);
    const rh=Object.entries(a).filter(([k,v])=>k.startsWith('rhyme::')&&v>0);
    const st={}; for(const[k,v]of Object.entries(a)) if(k.startsWith('struct::')) st[k.slice(8)]=v;
    const cw=cw0; const ov={}; for(const w of cw) if(OVER.has(w)) ov[w]=(ov[w]||0)+1;
    return {
      nLines:a.__nLines, nWords:cw.length, ...vocab,
      clicheCount: cl.reduce((s,[,v])=>s+v,0), cliches: Object.fromEntries(cl),
      overusedCount: Object.values(ov).reduce((s,v)=>s+v,0), overused: ov,
      predictableRhyme: rh.reduce((s,[,v])=>s+v,0), rhymes: Object.fromEntries(rh.map(([k,v])=>[k.slice(7),v])),
      ...st,   // ALL 39 structural detectors from patterns.js (previously only 11 were emitted) — all categories, more data
    };
  }
  const aiSum=ai.map(s=>({model:s.model,...summarize(s.text,true)}));
  const huSum=hum.map(s=>({...summarize(s.text,false)}));   // artist dropped to keep it lyrics-free-ish; keep artist? store nothing identifying beyond is fine
  fs.writeFileSync(path.join(ROOT,'corpus/ai_summaries.json'),JSON.stringify({note:'discriminator-summary v1, numbers only',overusedWords:overused.map(x=>x[0]),count:aiSum.length,summaries:aiSum},null,0));
  fs.writeFileSync(path.join(ROOT,'corpus/human_summaries.json'),JSON.stringify({note:'discriminator-summary v1, numbers only',count:huSum.length,summaries:huSum},null,0));

  // ---- comparison report: per-feature AI vs human mean + separation ----
  const numKeys=Object.keys(huSum[0]||{}).filter(k=>typeof (huSum[0]||{})[k]==='number');  // auto-include ALL numeric detectors in the separation report
  const RATEKEYS=new Set(['contentDensity','aiAffinity','aiCoverage','outOfAiVocab']);
  const norm=(s,k)=> RATEKEYS.has(k)? (s[k]||0) : (s[k]||0)/Math.max(1,s.nLines);   // per-line rate except density
  const stat=(arr,k)=>{const v=arr.map(s=>norm(s,k)); const m=v.reduce((a,b)=>a+b,0)/v.length; const sd=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length); return{m,sd};};
  console.log('\n=== DISCRIMINATOR SEPARATION (per-line rate; cohen-d = effect size) ===');
  const rows=numKeys.map(k=>{const a=stat(aiSum,k),h=stat(huSum,k); const d=(a.m-h.m)/Math.sqrt((a.sd**2+h.sd**2)/2+1e-9); return[k,a.m,h.m,d];});
  rows.sort((x,y)=>Math.abs(y[3])-Math.abs(x[3]));
  console.log('feature'.padEnd(20)+'AI'.padEnd(9)+'human'.padEnd(9)+'effect-size(d)');
  for(const[k,am,hm,d]of rows) console.log(k.padEnd(20)+am.toFixed(3).padEnd(9)+hm.toFixed(3).padEnd(9)+(d>0?'+':'')+d.toFixed(2)+(Math.abs(d)>0.5?'  <== strong':''));
  console.log('\nwrote corpus/ai_summaries.json + corpus/human_summaries.json');
})();
