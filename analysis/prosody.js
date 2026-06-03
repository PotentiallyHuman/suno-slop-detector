/* prosody.js — pure-JS, text-only, offline phonetic/rhythm primitives shared by every
 * craft-perspective detector. No dictionary download, no network, no LLM.
 *
 * Phonetic approach follows Hirjee & Brown (rap rhyme detection): collapse vowels to a few
 * SOUND CLASSES and match vowel sequences while ignoring consonants, so slant / internal /
 * multisyllabic rhymes are caught — not just exact end rhyme.
 *
 * Node-native (module.exports) and attaches to globalThis for the browser build.
 */
'use strict';
(function () {
  const G = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);
  function safeReq(p){ try { return require(p); } catch(_) { return null; } }
  const SlopScore = G.SlopScore || (typeof require !== 'undefined' ? safeReq('../src/slop-core.js') : null);
  const EyeRhymes = G.EyeRhymes || (typeof require !== 'undefined' ? safeReq('./eye_rhymes.js') : null);
  function stripLabels(t){ return SlopScore && SlopScore.stripSectionLabels ? SlopScore.stripSectionLabels(String(t||'')) : String(t||''); }

  // ---- tokenizers (operate on label-stripped text) ----
  function lines(text){ return stripLabels(text).split(/\r?\n/).map(l=>l.trim()).filter(Boolean); }
  function stanzas(text){ return stripLabels(text).split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean); }
  function words(line){ return (String(line).toLowerCase().match(/[a-z']+/g) || []); }
  function lastWord(line){ const w = words(line); return w.length ? w[w.length-1] : ''; }

  // ---- syllable estimate (vowel-group heuristic + exceptions) ~88-90% ----
  const SYL_EXC = { rhythm:2, every:2, evening:2, fire:1, fires:1, hour:1, hours:1, our:1, ours:1,
    people:2, business:2, beautiful:3, area:3, idea:3, being:2, doing:2, going:2, science:2,
    quiet:2, poem:2, prayer:1, choir:2, flower:2, power:2, tower:2, hire:1, wire:1, tired:1,
    fluid:2, ruin:2, real:1, really:2, family:3, memory:3, different:3, heaven:2, given:2,
    create:2, creature:2, february:3, chocolate:2, comfortable:3, interesting:3, favorite:3 };
  function syllables(w){
    w = String(w).toLowerCase().replace(/[^a-z]/g,'');
    if (!w) return 0;
    if (SYL_EXC[w] != null) return SYL_EXC[w];
    if (w.length <= 3) return 1;
    let s = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/,'');  // silent e / -ed / -es
    s = s.replace(/^y/,'');                                              // leading y = consonant
    const m = s.match(/[aeiouy]{1,2}/g);
    return Math.max(1, m ? m.length : 1);
  }
  function syllCount(line){ return words(line).reduce((a,w)=>a+syllables(w),0); }

  // ---- vowel sound classes (collapse for slant matching) ----
  // a,e,i,o,u -> A,E,I,O,U ; y -> I ; common digraphs handled by first letter (cheap approx)
  const VC = { a:'A', e:'E', i:'I', o:'O', u:'U', y:'I' };
  function vowelClass(v){ return VC[v[0]] || 'A'; }
  // sequence of vowel-classes for a word ("nation" -> "AO"? -> "A"+"O" = "AO")
  function vowelSeq(w){ return (String(w).toLowerCase().match(/[aeiouy]+/g) || []).map(vowelClass).join(''); }

  // rhymeKey = the rime of the LAST syllable: last vowel-group onward, vowels->classes.
  // "bail"->"Al", "pretend"->"End", "ale"->"E". Matches perfect AND slant end/internal rhyme.
  // orthographic rime: trailing letters from the last vowel (silent-e stripped) — the "spelling tail"
  function orthoRime(w){
    w = String(w).toLowerCase().replace(/[^a-z]/g,'');
    if (/[bcdfghjkmnpqrstvwxz]e$/.test(w) && w.length > 2) w = w.slice(0, -1);
    const m = w.match(/[aeiouy]+[^aeiouy]*$/); return m ? m[0] : '';
  }
  function rhymeKey(w){
    w = String(w).toLowerCase().replace(/[^a-z]/g,'');
    // PRONUNCIATION OVERRIDE first: eye-rhyme archive knows the *real* sound (love=UHV, move=OOV)
    if (EyeRhymes){ const sk = EyeRhymes.soundKey(w); if (sk) return 'OV:' + sk; }
    const r = orthoRime(w);
    return r.replace(/[aeiouy]+/g, v => vowelClass(v));
  }
  // eye rhyme: same spelling tail, different sound (love/move). True only when the override knows
  // the sounds actually differ — so non-archive words that simply share a tail still rhyme normally.
  function eyeRhyme(a, b){
    a = String(a).toLowerCase().replace(/[^a-z]/g,''); b = String(b).toLowerCase().replace(/[^a-z]/g,'');
    if (a === b || !a || !b) return false;
    if (orthoRime(a) !== orthoRime(b)) return false;   // must LOOK like a rhyme
    return rhymeKey(a) !== rhymeKey(b);                // but SOUND different
  }
  // multisyllabic key: vowel-class sequence of the last k syllables' worth of a line tail.
  function tailVowelSeq(line, kSyll){
    const ws = words(line); let out = []; let s = 0;
    for (let i = ws.length-1; i >= 0 && s < kSyll; i--){ const vs = vowelSeq(ws[i]); out.unshift(vs); s += Math.max(1, vs.length); }
    return out.join('');
  }
  // longest common trailing vowel-class run between two lines (multisyllabic rhyme length)
  function multiRhymeLen(a, b){
    const A = tailVowelSeq(a, 8), B = tailVowelSeq(b, 8);
    let i = A.length-1, j = B.length-1, n = 0;
    while (i >= 0 && j >= 0 && A[i] === B[j]) { n++; i--; j--; }
    return n;
  }

  // ---- crude primary-stress guess (for meter/flow variance) ----
  function stressGuess(w){
    const n = syllables(w);
    if (n <= 1) return [1];
    const a = new Array(n).fill(0);
    if (/(tion|sion|ity|ic|ical|ial|ious|graphy|ology)$/.test(w)) a[Math.max(0,n-2)] = 1;  // suffix pulls stress
    else a[n >= 3 ? n-2 : 0] = 1;                                                            // penult-ish default
    return a;
  }

  // ---- light POS by suffix / closed-class (noun/verb/adj/adv/func) ----
  const FUNC = new Set('a an the and or but if then so as of to in on at by for with from into about over under up down out off i you he she it we they me him her us them my your his its our their this that these those is am are was were be been being do does did have has had will would can could should may might must not no oh yeah la na ooh'.split(/\s+/));
  function posLite(w){
    w = String(w).toLowerCase();
    if (FUNC.has(w)) return 'F';
    if (/ly$/.test(w)) return 'ADV';
    if (/(ous|ful|less|ive|able|ible|al|ic|ish|y)$/.test(w)) return 'ADJ';
    if (/(ing|ed|s)$/.test(w) || /(ate|ize|ify)$/.test(w)) return 'V';
    return 'N';
  }

  const api = { lines, stanzas, words, lastWord, syllables, syllCount, vowelClass, vowelSeq,
    rhymeKey, orthoRime, eyeRhyme, tailVowelSeq, multiRhymeLen, stressGuess, posLite,
    mean: a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0,
    stdev: a => { if(a.length<2) return 0; const m=a.reduce((x,y)=>x+y,0)/a.length; return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length); },
    entropy: counts => { const tot=counts.reduce((x,y)=>x+y,0); if(!tot) return 0; let h=0; for(const c of counts){ if(c){ const p=c/tot; h-=p*Math.log2(p);} } return h; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  G.Prosody = api;
})();
