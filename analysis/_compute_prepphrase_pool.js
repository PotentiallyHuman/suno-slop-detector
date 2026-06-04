#!/usr/bin/env node
/* expanded replacement-pool vetting: grouped by syllable count, both families,
 * favouring phrases that ACTUALLY OCCUR in the human corpus (so "reads human" is
 * data-backed, not just absent-from-AI). Read-only.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { syllables } = require(path.join(ROOT, 'analysis/prosody.js'));
const syllP = p => p.split(/\s+/).reduce((a,w)=>a+syllables(w),0);

const aiDocs = [];
for (const f of fs.readdirSync(path.join(ROOT, 'corpus/models'))) {
  if (!f.endsWith('.json') || f.endsWith('.heldout') || f.endsWith('.bak')) continue;
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/models', f)));
  for (const s of d.songs) { const t=(s.lyrics_en||s.lyrics||'').toLowerCase(); if(t.trim()) aiDocs.push(t); }
}
const human = JSON.parse(fs.readFileSync('/tmp/human_lyrics_cache.json'));
const huDocs = Object.values(human).map(v=>String(v||'').toLowerCase()).filter(t=>t.trim());

function docRate(docs,p){ const re=new RegExp('\\b'+p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i'); let n=0; for(const t of docs) if(re.test(t))n++; return n/docs.length; }
function row(p){ const ai=docRate(aiDocs,p),hu=docRate(huDocs,p); return {p,ai,hu,ratio:hu>0?ai/hu:(ai>0?Infinity:0),s:syllP(p)}; }

// big candidate pool — concrete/plain scene phrases, mostly attested human, both families
const CAND = {
  night: [
    'late at night','all night long','through the night','well past dark','dead of night',
    'half past two','two in the morning','one in the morning','out past dark',
    'cold out tonight','dark out tonight','the lights went out','sun went down',
    'after dark','when the lights go','quarter to three','dark and quiet',
    'down the road','out on the porch','sitting up late','out past midnight',
  ],
  rain: [
    'washing down','pouring down','washed away','coming down','soaking wet',
    'out in the rain','caught in the rain','rain on the roof','wet to the bone',
    'cold and wet','under the rain','pouring outside','it starts to rain',
    'the clouds break open','grey and wet','out in the storm','soaked to the skin',
  ],
};
console.log(`AI N=${aiDocs.length} HU N=${huDocs.length}\n`);
const out = {night:[],rain:[]};
for (const fam of ['night','rain']) {
  console.log(`=== ${fam.toUpperCase()} family candidates ===`);
  console.log('phrase               | syll | AI%   | HU%   | ratio | human-attested');
  const rows = CAND[fam].map(row).sort((a,b)=>a.s-b.s || a.ratio-b.ratio);
  for (const r of rows) {
    out[fam].push(r);
    console.log(
      r.p.padEnd(20),'|',String(r.s).padStart(3),' |',
      (r.ai*100).toFixed(2).padStart(4)+'%','|',
      (r.hu*100).toFixed(2).padStart(4)+'%','|',
      (isFinite(r.ratio)?r.ratio.toFixed(2):'inf').padStart(5),'|',
      r.hu>0 ? 'YES' : 'no'
    );
  }
  console.log();
}
fs.writeFileSync('/tmp/prepphrase_pool.json', JSON.stringify(out,null,2));
console.log('wrote /tmp/prepphrase_pool.json');
