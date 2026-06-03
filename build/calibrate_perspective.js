#!/usr/bin/env node
/* calibrate_perspective.js <perspectiveModule> — measure how well a perspective's t4_* features
 * separate AI from human lyrics. AI = sample from corpus/models; human = live lrclib fetch
 * (numbers only, no text stored). Prints mean(AI), mean(human), and separation
 * d = |meanAI - meanHuman| / pooledStd  (>=0.3 = useful, >=0.5 = strong).
 *   node build/calibrate_perspective.js analysis/perspectives/rapper.js [aiN] [humanN]
 */
require('../src/slop-core.js'); require('../analysis/prosody.js');
const fs = require('fs'), path = require('path');
const PERSP = require(path.join('..', process.argv[2]));
const AIN = +(process.argv[3] || 150), HUN = +(process.argv[4] || 90);

function aiSample(n){
  const dir = path.join(__dirname, '..', 'corpus', 'models'); const out = [];
  for (const f of ['suno.json','chatgpt.json','grok.json','gemini.json']){
    const p = path.join(dir, f); if (!fs.existsSync(p)) continue;
    const arr = (JSON.parse(fs.readFileSync(p)).songs)||[];
    for (const s of arr) if (s && s.lyrics && s.lyrics.length>80) out.push(s.lyrics);
  }
  // shuffle (seeded) + take n
  for (let i=out.length-1;i>0;i--){ const j=(i*7919+3)%(i+1); [out[i],out[j]]=[out[j],out[i]]; }
  return out.slice(0, n);
}
async function fetchLyrics(artist,title){
  try{ const r=await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`);
    if(r.ok){ const j=await r.json(); if(j.plainLyrics&&j.plainLyrics.length>80) return j.plainLyrics; } }catch(_){}
  return '';
}
async function humanSample(n){
  const prof=(JSON.parse(fs.readFileSync(path.join(__dirname,'..','corpus','human_profiles.json'))).profiles||[]).filter(p=>p.artist&&p.title);
  for(let i=prof.length-1;i>0;i--){const j=(i*104729+11)%(i+1);[prof[i],prof[j]]=[prof[j],prof[i]];}
  const out=[]; let idx=0;
  while(out.length<n && idx<prof.length){
    const batch=prof.slice(idx,idx+12); idx+=12;
    const got=await Promise.all(batch.map(s=>fetchLyrics(s.artist,s.title)));
    for(const t of got) if(t) out.push(t);
    process.stdout.write(`\r  fetched ${out.length}/${n} human...`);
  }
  console.log(''); return out;
}
function feats(set){ return set.map(t=>PERSP.analyze(t).features); }
function stats(rows,key){ const v=rows.map(r=>r[key]); const m=v.reduce((a,b)=>a+b,0)/v.length;
  const sd=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length); return {m,sd}; }

(async()=>{
  const ai=aiSample(AIN); console.log(`AI sample: ${ai.length}`);
  const hu=await humanSample(HUN); console.log(`human sample: ${hu.length}`);
  const fa=feats(ai), fh=feats(hu);
  const keys=Object.keys(fa[0]);
  console.log('\nfeature                  meanAI    meanHuman   separation  leans');
  const rows=[];
  for(const k of keys){ const a=stats(fa,k), h=stats(fh,k);
    const pooled=Math.sqrt((a.sd**2+h.sd**2)/2)||1e-9; const d=Math.abs(a.m-h.m)/pooled;
    rows.push({k,a:a.m,h:h.m,d,lean:a.m>h.m?'AI':'human'}); }
  rows.sort((x,y)=>y.d-x.d);
  for(const r of rows) console.log(r.k.padEnd(24), r.a.toFixed(3).padStart(7), r.h.toFixed(3).padStart(10), r.d.toFixed(2).padStart(11), '  '+(r.d>=0.5?'STRONG ':r.d>=0.3?'useful ':'weak   ')+r.lean);
  // sample reports
  console.log('\nsample AI report:   ', PERSP.analyze(ai[0]).report);
  console.log('sample human report:', PERSP.analyze(hu[0]).report);
})();
