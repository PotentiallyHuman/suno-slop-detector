/* AUTO-WRAPPED for browser content-script — exposes globalThis.SLOP_PX.
 * Ported verbatim from analysis/portability_tells.js so the px_* features match
 * the trained model byte-for-byte, plus trigram typicality (typ_ai / typ_<model>).
 * Format-blind: strips section markers first (via SlopScore). No text stored. */
(function () {
  const G = (typeof globalThis !== "undefined") ? globalThis : window;
  const SlopScore = G.SlopScore;
  const lc = s => String(s).toLowerCase();
  const words = s => lc(s).match(/[a-z']+/g) || [];
  function lines(text) {
    return SlopScore.stripSectionLabels(String(text || ""))
      .split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  // --- T1: filler "just" + minimizers (counts all per line, minus literal uses) ---
  function hedgeJust(text) {
    const L = lines(text); let just = 0, minim = 0;
    for (const line of L) {
      const low = lc(line);
      const allJust = (low.match(/\bjust\b/g) || []).length;
      const literal = (low.match(/\bjust\s+(now|then|because|about|as|once|a (?:moment|second|minute)|in time|like that)\b/g) || []).length;
      just += Math.max(0, allJust - literal);
      minim += (low.match(/\b(only|merely|simply|barely)\b/g) || []).length;
    }
    const n = Math.max(1, L.length);
    return { justRate: just / n, minimRate: minim / n, hedgeRate: (just + 0.5 * minim) / n, justCount: just };
  }

  // --- T2: templated anaphora (same opening frame, different fill-ins) ---
  const NEG_FRAME = /^(i'?m |i am |it'?s |that'?s |this is |there'?s |we'?re |you'?re |we are |you are |you'?re )?(not|no|never|neither|ain'?t|nothing|no more)\b/;
  function clauses(text) { return lines(text).flatMap(l => l.split(/[,;]+| - /).map(s => s.trim()).filter(Boolean)); }
  function frameInfo(clause) {
    const w = lc(clause).match(/[a-z']+/g) || [];
    if (!w.length) return { f: null, rem: '' };
    const j = w.join(' ');
    if (NEG_FRAME.test(j)) return { f: 'NEG', rem: j.replace(NEG_FRAME, '').trim() };
    return { f: w.slice(0, 2).join(' '), rem: w.slice(2).join(' ') };
  }
  function templateAnaphora(text) {
    const cls = clauses(text), F = cls.map(frameInfo);
    let negScore = 0, frameScore = 0, tripleNeg = 0, resolvedNot = 0, negRuns = 0, i = 0;
    while (i < F.length) {
      const cur = F[i].f; if (cur == null) { i++; continue; }
      let j = i + 1; while (j < F.length && F[j].f === cur) j++;
      const runLen = j - i;
      if (runLen >= 2 && new Set(F.slice(i, j).map(x => x.rem)).size >= 2) {
        if (cur === 'NEG') { negScore += runLen - 1; negRuns++; if (runLen >= 3) tripleNeg++; if (j < F.length && /^(just|but|it'?s|i'?m|only)\b/.test((cls[j] || '').toLowerCase())) resolvedNot++; }
        else frameScore += runLen - 1;
      }
      i = j;
    }
    const n = Math.max(1, lines(text).length);
    return { negAnaphoraRate: negScore / n, frameAnaphoraRate: frameScore / n, resolvedNotRate: resolvedNot / n, tripleNegCount: tripleNeg, negRuns, anaphoraRate: (negScore + frameScore) / n };
  }

  // --- T2b: self-qualifying emotional template ---
  const FEELING = new Set(("lonely awake broken alone tired empty numb hollow fine okay fooled angry sad happy mad scared afraid " +
    "hurt lost found whole free replaced pretending sure here gone done over fading falling drowning " +
    "different better worse same enough ready strong weak right wrong real fake bitter cold blind awake " +
    "love pain fear hope dream feeling feelings dumb late strange normal harder").split(/\s+/));
  const DENY_LINE = /^(i\s+)?(do ?n'?t|don'?t|can'?t|won'?t|did ?n'?t|ai ?n'?t|i'?m not|it'?s not|you'?re not|we'?re not|there'?s no|i never|i'?ll never|i don'?t want|i don'?t miss|i don'?t need)\b/i;
  function selfQualify(text) {
    const L = lines(text); let deny = 0, correction = 0, concessive = 0, abstractTemplate = 0, denyRun = 0, run = 0;
    for (const raw of L) {
      const low = lc(raw.trim());
      const isDeny = DENY_LINE.test(low);
      if (isDeny) { deny++; run++; } else { if (run >= 2) denyRun += run - 1; run = 0; }
      if (/\b(i'?m|it'?s|you'?re) not\b/.test(low) && /\bjust\b/.test(low)) correction++;
      else if (/\bnot\b[^,.]{0,25},\s*(just|i'?m|it'?s|but)\b/.test(low)) correction++;
      if (/\bi know it'?s\b/.test(low) || /\bi know\b[^.]*\bbut\b/.test(low)) concessive++;
      if (isDeny || /\bjust\b/.test(low)) { if ((low.match(/[a-z']+/g) || []).some(w => FEELING.has(w))) abstractTemplate++; }
    }
    if (run >= 2) denyRun += run - 1;
    const n = Math.max(1, L.length);
    return { denyLineRate: deny / n, denyRunRate: denyRun / n, correctionRate: correction / n, concessiveRate: concessive / n, abstractTemplateRate: abstractTemplate / n, selfQualifyScore: (2 * correction + 1.5 * denyRun + concessive + abstractTemplate) / n };
  }

  // --- typicality: fraction of a song's 3-grams present in a (Set) bank ---
  function tokensFor(text) { return (SlopScore.stripSectionLabels(String(text)).toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 1 || w === 'i'); }
  function trigrams(text) { const w = tokensFor(text); const s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [...s]; }
  function typicality(text, bankSet) { const g = trigrams(text); return g.length ? g.filter(x => bankSet.has(x)).length / g.length : 0; }

  // convenience: the px_* + typ_* keys exactly as denseDict expects them
  function features(text, aiBank, modelBanks) {
    const sq = selfQualify(text), ta = templateAnaphora(text), hj = hedgeJust(text);
    const d = { px_just: hj.justRate, px_negAnaphora: ta.negAnaphoraRate, px_correction: sq.correctionRate, px_selfQualify: sq.selfQualifyScore };
    if (aiBank) d.typ_ai = typicality(text, aiBank);
    if (modelBanks) for (const m in modelBanks) d['typ_' + m] = typicality(text, modelBanks[m]);
    return d;
  }

  G.SLOP_PX = { hedgeJust, templateAnaphora, selfQualify, trigrams, typicality, features };
})();
