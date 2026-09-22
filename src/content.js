/*
 * content.js — runs ONLY on https://suno.com/song/* and https://suno.com/create*
 * (enforced by manifest `matches` AND re-checked below). It reads ONE element:
 * the song page's lyrics paragraph, or the create page's lyrics editor.
 * It never reads anything else on the page. No network, no storage of page text.
 */
(function () {
  "use strict";

  // ---- SAFETY GATE #1: URL must be a Suno song OR create page ---------------
  const ON_SCORABLE = /^https:\/\/suno\.com\/(song|create)\b/.test(location.href);
  if (!ON_SCORABLE) return; // never read, never analyse anywhere else

  // ---- SAFETY GATE #2: the ONLY element we are allowed to read --------------
  // The lyrics paragraph. We intentionally use the stable, non-responsive
  // class fragments from the user-supplied selector chain (responsive classes
  // like `xl:pr-8` are brittle across breakpoints and need escaping). This
  // still pins us to the lyrics <p> and nothing else.
  // The lyrics <p>. We identify it by STRUCTURE + the one stable semantic class
  // `whitespace-pre-wrap` (Suno uses it to preserve lyric line breaks), NOT by brittle
  // styling classes (`pr-6`/`font-sans`/`text-foreground-primary`) that change across
  // layout variants. That fragility was the bug: when those classes changed the selector
  // missed, read "", and showed a false 0%. Still scoped to a <section>, so it can never
  // grab a heading, the prompt box, or anything outside the lyrics window.
  let lastResult = null;
  let renderedText = null; // lyrics currently painted in the panel — skip needless repaints

  function getLyricsNode() {
    let nodes = document.querySelectorAll("section p.whitespace-pre-wrap");
    if (!nodes.length) nodes = document.querySelectorAll("p.whitespace-pre-wrap");
    if (!nodes.length) return null;
    // if several match, the lyrics are the largest text block
    let best = null, bestLen = 0;
    nodes.forEach((n) => {
      const t = (n.innerText || n.textContent || "").trim();
      if (t.length > bestLen) { bestLen = t.length; best = n; }
    });
    return best;
  }

  // Which suno page we score on: a song page OR the create page.
  function isScorablePage() {
    return /^https:\/\/suno\.com\/(song|create)\b/.test(location.href);
  }

  function isCreatePage() {
    return /^https:\/\/suno\.com\/create\b/.test(location.href);
  }

  // The /create lyrics editor. Since 2026-09 (verified live 2026-09-22 against a saved
  // copy of the page) Suno's lyrics box is a Lexical rich-text editor:
  //   <div contenteditable="true" role="textbox" aria-label="Lyrics editor"
  //        data-lexical-editor="true" class="lyrics-editor-content">
  //     <p class="lyrics-paragraph"><span data-lexical-text="true">one line</span></p>
  //     <p class="lyrics-paragraph"><br></p>            <- a blank line
  //   </div>
  // The old <textarea data-testid="lyrics-textarea"> is gone; it is kept only as a
  // legacy fallback. The NEW "Cowriter prompt" textarea (Suno's "improve this
  // section / write another verse" feature) is explicitly never the lyrics box.
  // Suno can keep MORE THAN ONE editor mounted (a hidden draft instance, or the
  // full-screen editor dialog on top of the inline one) — always pick a VISIBLE
  // match, and prefer the one inside an open dialog.
  function isVisible(n) { return !!n && n.getClientRects().length > 0; }
  function getCreateBox() {
    if (!isCreatePage()) return null;
    const editors = document.querySelectorAll(
      'div[contenteditable="true"][data-lexical-editor="true"][aria-label="Lyrics editor"],' +
      'div[contenteditable="true"].lyrics-editor-content,' +
      'div[contenteditable="true"][role="textbox"][aria-label*="lyric" i]'
    );
    let first = null;
    for (let i = 0; i < editors.length; i++) {
      if (!isVisible(editors[i])) continue;
      if (editors[i].closest('[role="dialog"]')) return editors[i]; // full-screen editor on top
      if (!first) first = editors[i];
    }
    if (first) return first;
    if (editors.length) return editors[0];
    // legacy layout (pre-2026-09): the plain textarea
    const list = document.querySelectorAll(
      'textarea[data-testid="lyrics-textarea"], textarea[data-testid*="lyric" i], textarea[placeholder*="lyric" i]'
    );
    let firstTa = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].hasAttribute("data-cowrite-input")) continue;        // never the co-writer prompt
      if (/cowrit/i.test(list[i].getAttribute("aria-label") || "")) continue;
      if (isVisible(list[i])) return list[i];
      if (!firstTa) firstTa = list[i];
    }
    return firstTa;
  }

  function isEditorBox(box) { return !!box && box.tagName !== "TEXTAREA"; }

  // The exact text in the lyrics box. For the Lexical editor: one block (<p>) per
  // line, a <br> inside a block is an in-paragraph line break, and a block whose
  // only child is a <br> is an empty line. Never `innerText` — it double-spaces <p>s.
  function readBoxText(box) {
    if (!box) return "";
    if (!isEditorBox(box)) return typeof box.value === "string" ? box.value : "";
    const blocks = box.children.length ? Array.prototype.slice.call(box.children) : [box];
    const lines = [];
    for (let b = 0; b < blocks.length; b++) {
      const blk = blocks[b];
      let s = "";
      (function walk(n) {
        if (n.nodeType === 3) { s += n.nodeValue; return; }
        if (n.nodeType !== 1) return;
        if (n.tagName === "BR") { s += "\n"; return; }
        for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
      })(blk);
      const kids = blk.childNodes;
      if (kids.length === 1 && kids[0].nodeType === 1 && kids[0].tagName === "BR") s = ""; // empty paragraph
      else if (s.endsWith("\n\n")) s = s.slice(0, -1); // Lexical paints a trailing line break as <br><br>
      lines.push(s);
    }
    return lines.join("\n");
  }

  function normText(t) { return String(t || "").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n+$/, ""); }

  // Write into the lyrics box ONLY.
  //  - legacy textarea: the native value setter + an `input` event, so Suno's
  //    controlled React textarea picks the change up as if the user had typed it.
  //  - Lexical editor: select everything, then dispatch a `paste` event carrying the
  //    new text — the exact path a user's Ctrl+V takes, so Suno's editor state, its
  //    auto-save and its own undo history all see the change. The DOM is never
  //    edited directly (Lexical would overwrite that on its next render).
  //    Lexical commits asynchronously, so the result is verified on a short timer;
  //    if the paste route did nothing, `insertText` (a beforeinput event Lexical
  //    also handles) is tried, and `onDone(ok)` reports whether the box now holds
  //    the text.
  function setCreateBoxText(box, text, onDone) {
    const done = typeof onDone === "function" ? onDone : function () {};
    if (!isEditorBox(box)) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(box, text);
      box.dispatchEvent(new Event("input", { bubbles: true }));
      done(true);
      return;
    }
    const want = normText(text);
    function selectAll() {
      box.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(box);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    function landed() { return normText(readBoxText(box)) === want; }
    // which route landed the text (read back by the maintainer from a saved page; harmless otherwise)
    function mark(v) { if (host) host.setAttribute("data-hz-write", v); }
    selectAll();
    setTimeout(() => { // let the editor register the selection before the paste
      try {
        const dt = new DataTransfer();
        dt.setData("text/plain", text);
        box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      } catch (e) { /* fall through to insertText */ }
      setTimeout(() => {
        if (landed()) { mark("paste"); done(true); return; }
        // Route 2 (Firefox ignores a synthetic paste's clipboard data): rebuild the text
        // line by line through the editor's own input commands — `insertText` for a line,
        // `insertParagraph` between lines — which is what typing it would do, so every
        // line stays its own paragraph exactly like a user paste.
        selectAll();
        setTimeout(() => {
          try {
            const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
            document.execCommand("delete");
            for (let i = 0; i < lines.length; i++) {
              if (i > 0) document.execCommand("insertParagraph");
              if (lines[i]) document.execCommand("insertText", false, lines[i]);
            }
          } catch (e) {}
          setTimeout(() => {
            if (landed()) { mark("lines"); done(true); return; }
            // Route 3 (last resort): the whole text in one insertText — right words, one block.
            selectAll();
            setTimeout(() => {
              try { document.execCommand("insertText", false, text); } catch (e) {}
              setTimeout(() => { const ok = landed(); mark(ok ? "inserttext" : "failed"); done(ok); }, 80);
            }, 30);
          }, 120);
        }, 30);
      }, 80);
    }, 30);
  }

  // The ONLY text we read: the song-page lyrics <p>, or (on /create) the lyrics
  // input box. Returns "" if neither is present. Reads nothing else on the page.
  function getLyricsText() {
    if (isCreatePage()) return readBoxText(getCreateBox());
    // /song: the rendered lyrics paragraph (or "" — never anything else on the page).
    const p = getLyricsNode();
    return p ? (p.innerText || p.textContent || "") : "";
  }

  // The model is English-only (its bag-of-words + cliché lexicon are English keywords).
  // On other languages almost no words/clichés match, so the score would be noise.
  // Cheap on-device check: share of very common English function words. If tiny, it isn't English.
  // (real English lyrics run ~30-40%+; Danish/Spanish samples land ~0-6%, so this margin is safe)
  const EN_COMMON = /^(the|and|you|to|a|of|in|it|that|is|my|me|we|for|on|with|but|love|night|i|are|was|be|he|she|they|this|have|not|your|all|like|when|what|so|do|can|just|know|now|time|up|out|no|yes|oh|don't|i'm|we're|you're|it's)$/;
  function looksNonEnglish(text) {
    const s = String(text);
    // Non-Latin scripts (Japanese kana/kanji, Korean, Chinese, Cyrillic, Hebrew,
    // Arabic, Thai, …): the English bag-of-words + cliché lexicon can't read a single
    // character, so the score would be pure noise (a katakana song was reading 96%).
    // Any meaningful share of these letters -> not English, regardless of word count.
    const nonLatin = (s.match(/[぀-ヿ㐀-鿿가-힯Ѐ-ӿ֐-׿؀-ۿ฀-๿]/g) || []).length;
    const latin = (s.match(/[a-z]/gi) || []).length;
    if (nonLatin > 0 && nonLatin >= (nonLatin + latin) * 0.2) return true; // >=20% non-Latin letters
    const toks = s.toLowerCase().match(/[a-z']+/g) || [];
    if (toks.length < 12) return false;            // too short to judge
    let hits = 0;
    for (let i = 0; i < toks.length; i++) if (EN_COMMON.test(toks[i])) hits++;
    return (hits / toks.length) < 0.08;            // <8% common English words -> not English
  }

  function analyse() {
    const text = getLyricsText();
    if (!text || text.trim().length < 12) return null; // too short to mean anything

    // Old model drives the craft-panel jokers; the v5 model (if loaded) drives the
    // headline score + LLM attribution. Graceful fallback to the old score.
    const sc = SlopV2.score(text);
    // Instrumental (nothing but bracket-tags / blank after cleaning) -> no score, no feedback.
    if (sc && sc.instrumental) { lastResult = { instrumental: true, _text: text }; return lastResult; }

    // Non-English guard (separate check AFTER scoring): the English-only model can't
    // give a meaningful number here, so show an honest notice instead of a fake score.
    if (looksNonEnglish(text)) { lastResult = { nonEnglish: true, _text: text }; return lastResult; }

    let v5 = null, v8 = null;
    try { if (globalThis.SLOP_MODEL_V5 && SlopV2.scoreV5) v5 = SlopV2.scoreV5(text); } catch (e) { /* fall back */ }
    try { if (globalThis.SLOP_MODEL_V8 && globalThis.SlopV8 && SlopV8.scoreV8) v8 = SlopV8.scoreV8(text); } catch (e) { /* fall back */ }

    let panel = null;
    try {
      panel = SlopPanel.build(text, sc);
    } catch (e) {
      /* panel optional */
    }

    // Headline = v8 (if loaded) -> v5 -> old model. Attribution is gated on the DISPLAYED
    // score (v8), not v5: post-port they can disagree, and we must never show "likely Suno"
    // under a human-reading number.
    const headScore = (v8 && v8.score != null) ? v8.score : ((v5 && v5.score != null) ? v5.score : sc.score);
    const headIsAI = headScore >= 50;
    const result = {
      score: headScore, // v8 P(AI)*100 if available, else v5, else old model
      pAI: (v8 && v8.pAI != null) ? v8.pAI : ((v5 && v5.pAI != null) ? v5.pAI : sc.pAI),
      label: SlopScore.verdict(headScore),
      attribution: (headIsAI && v5) ? v5.attribution : null, // only named under an AI headline
      verdict: headIsAI ? "ai" : "human",
      panel: panel,
      _text: text,
    };
    lastResult = result;
    return result;
  }

  // ---- UI: floating badge + expandable panel --------------------------------
  // Built with DOM APIs (no innerHTML) so page-controlled lyric text can never
  // inject markup into our panel, and the AMO linter stays clean.
  let host = null,
    badge = null,
    panel = null,
    refs = {};

  function el(tag, props, kids) {
    const e = document.createElement(tag);
    if (props)
      for (const k in props) {
        if (k === "class") e.className = props[k];
        else if (k === "text") e.textContent = props[k];
        else if (k === "style") e.style.cssText = props[k];
        else if (k === "hidden") e.hidden = !!props[k];
        else e.setAttribute(k, props[k]);
      }
    (kids || []).forEach((c) => c && e.appendChild(c));
    return e;
  }
  function clear(n) {
    while (n.firstChild) n.removeChild(n.firstChild);
  }

  function ensureUI() {
    if (host) return;
    refs.pct = el("span", { id: "slop-pct", text: "…" });
    badge = el("button", { id: "slop-badge", type: "button", title: "Humanize AI Slop Lyrics" }, [
      el("span", { class: "slop-emoji", text: "🤖" }),
      refs.pct,
    ]);
    refs.verdict = el("div", { id: "slop-verdict" });
    refs.components = el("div", { id: "slop-components", class: "slop-components" });
    refs.hz = el("div", { id: "slop-hz" }); // /create only: edits the lyrics box in place
    refs.craft = el("div", { id: "slop-craft" }); // the 5 ✅ · 1 🃏 · 5 ⚠️ panel
    const closeBtn = el("button", { id: "slop-close", type: "button", "aria-label": "close", text: "×" });
    panel = el("div", { id: "slop-panel", hidden: true }, [
      el("div", { class: "slop-head" }, [el("strong", { text: "Humanize AI Slop Lyrics" }), closeBtn]),
      refs.verdict,
      refs.components,
      refs.hz,
      refs.craft,
      el("div", { class: "slop-foot", text: "Reads only the lyrics box · model confidence, not proof" }),
    ]);
    host = el("div", { id: "slop-detector-root" }, [badge, panel]);
    document.body.appendChild(host);
    badge.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });
    closeBtn.addEventListener("click", () => {
      panel.hidden = true;
    });
    if (isCreatePage()) buildHumanizeUI();
  }

  // ---- /create: Humanize buttons that edit the lyrics box in place -----------
  // Same engine and press semantics as the popup (humanizeOne = worst line,
  // humanizeHalf = worst half), but the result is written straight back into the
  // create-page lyrics textarea. Undo restores the previous press, lyrics box ONLY.
  const hzUndoStack = [];

  // Next-press preview: the joker card shows the exact line the next "Humanize
  // Line" press will rebuild. The engine is deterministic, so precomputing
  // humanizeOne on the current text IS the next press — the press then reuses
  // this cached result (instant), the box change re-analyses, and the joker
  // rotates to the new most-AI line.
  let hzNext = { key: null, res: null };
  let hzChaosArmed = false; // Rewrite would refuse but the song still reads AI -> the button becomes Chaos

  function updateHalfBtn() {
    if (!refs.hzHalf) return;
    hzChaosArmed = !!(lastResult && hzNext.key === lastResult._text && !hzNext.res && lastResult.score >= 20);
    refs.hzHalf.textContent = hzChaosArmed ? "🌀 Humanize Chaos" : "🪄 Humanize Rewrite";
  }

  function computeHzNext(text) {
    if (!isCreatePage() || !globalThis.HumanizeFreestyle) return;
    if (hzNext.key === text) { updateHalfBtn(); return; } // cache hit — joker already current
    setTimeout(() => { // off the render path: never delay the pill
      if (hzNext.key !== text) {
        let res = null;
        try { res = HumanizeFreestyle.humanizeOne(text, hzScore, hzLogit); } catch (e) { res = null; }
        hzNext = { key: text, res: res };
      }
      // repaint the joker + button if the page text hasn't moved on meanwhile
      if (lastResult && lastResult._text === text && lastResult.panel) renderCraft(lastResult.panel);
      updateHalfBtn();
    }, 0);
  }

  function hzScore(t) {
    try { const r = SlopV8.scoreV8(t); return (r && r.score != null) ? r.score : 0; } catch (e) { return 0; }
  }

  // Log-odds scorer for the engine's gates: the rounded % saturates (a 100% song can't
  // "drop 2 points" no matter how good an edit is), log-odds keep resolution everywhere.
  function hzLogit(t) {
    try {
      const r = SlopV8.scoreV8(t);
      if (r && typeof r.z === "number") return r.z;   // raw log-odds: exact at any depth
      let p = Math.min(Math.max(r.pAI, 1e-9), 1 - 1e-9);
      return Math.log(p / (1 - p));
    } catch (e) { return 0; }
  }

  function hzBusyRun(btn, work) {
    if (!btn || btn.disabled) return;
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Working…";
    setTimeout(() => {
      try { work(); } finally { btn.disabled = false; btn.textContent = label; }
    }, 30);
  }

  function hzMsg(text) {
    if (refs.hzMsg) refs.hzMsg.textContent = text || "";
  }

  // Runs after an edit was written into Suno's editor (its commit is async): if the
  // box does NOT hold the new text, say so instead of describing an edit that never landed.
  function hzWriteCheck(ok) {
    if (ok) return;
    hzUndoStack.pop();
    if (refs.hzUndo) refs.hzUndo.hidden = hzUndoStack.length === 0;
    hzMsg("Couldn't write into Suno's lyrics editor (its layout may have changed again). Nothing was changed.");
  }

  function hzShapeMsg(text) {
    const s0 = hzScore(text);
    if (s0 < 55) return "Every line already reads human — nothing left to rebuild.";
    let dg = null;
    try { dg = HumanizeFreestyle.diagnoseShape(text); } catch (e) {}
    return "Still reads " + s0 + "% AI — but that's the song's SHAPE, not its words. " +
      (dg ? "Measured on your song: " + dg + "."
          : "To bring it down: vary your line lengths, break up a repeated chorus, let a line spill past the rhyme.");
  }

  function hzPress(kind) {
    const box = getCreateBox();
    if (!box) { hzMsg("Couldn't find the lyrics box on this page."); return; }
    const text = readBoxText(box);
    if (text.trim().length < 8) { hzMsg("Write a few lines in the lyrics box first."); return; }
    if (!globalThis.HumanizeFreestyle) { hzMsg("Humanizer is still loading — try again in a second."); return; }
    let res = null, chaos = kind === "half" && hzChaosArmed;
    if (kind === "one" && hzNext.key === text) res = hzNext.res; // the previewed press, precomputed
    else {
      try {
        res = chaos ? HumanizeFreestyle.humanizeChaos(text, hzScore, hzLogit)
          : kind === "half" ? HumanizeFreestyle.humanizeHalf(text, hzScore, hzLogit)
          : HumanizeFreestyle.humanizeOne(text, hzScore, hzLogit);
      } catch (e) { res = null; }
    }
    if (!res) { hzMsg(hzShapeMsg(text)); return; }
    if (chaos) {
      hzUndoStack.push(text);
      if (refs.hzUndo) refs.hzUndo.hidden = false;
      setCreateBoxText(box, res.text, hzWriteCheck);
      scheduleAnalyse();
      hzMsg("Chaos: dropped every safety gate and reworked " + res.count + " " + (res.count === 1 ? "line" : "lines") +
        " — " + res.before + "% → " + res.after + "% AI. Rhymes and your hooks kept. Undo to revert.");
      return;
    }
    hzUndoStack.push(text);
    if (refs.hzUndo) refs.hzUndo.hidden = false;
    setCreateBoxText(box, res.text, hzWriteCheck);
    scheduleAnalyse(); // refresh the pill % from the edited box
    let summary = "";
    try { summary = HumanizeFreestyle.pressSummary(res); } catch (e) {}
    const head = (kind === "half"
      ? "Rewrote your " + res.count + " most-AI " + (res.count === 1 ? "line" : "lines")
      : "Rebuilt your most-AI line (#" + (res.lineIndex + 1) + ")") + (summary ? " — " + summary : "");
    if (res.after < res.before) {
      hzMsg(head + ". " + res.before + "% → " + res.after + "% AI. Press again for the next-worst — Undo to revert.");
    } else {
      // saturated song: the edit removed real evidence but the rounded % can't show
      // it — say what changed and why the number is pinned, instead of "100% → 100%"
      let dg = null;
      try { dg = HumanizeFreestyle.diagnoseShape(res.text); } catch (e) {}
      hzMsg(head + ". The % won't budge — this song is pinned at " + res.after +
        "% by its SHAPE, not these words. " +
        (dg ? "Measured on your song: " + dg + "."
            : "To move it: vary your line lengths, or let a line end without its rhyme.") +
        " Undo to revert.");
    }
  }

  function buildHumanizeUI() {
    refs.hzLine = el("button", { class: "slop-hz-btn", type: "button", text: "✍️ Humanize Line" });
    refs.hzHalf = el("button", { class: "slop-hz-btn", type: "button", text: "🪄 Humanize Rewrite" });
    refs.hzUndo = el("button", { class: "slop-hz-btn slop-hz-undo", type: "button", text: "↩ Undo", hidden: true });
    refs.hzMsg = el("div", { class: "slop-hz-msg" });
    refs.hz.appendChild(el("div", { class: "slop-hz-row" }, [refs.hzLine, refs.hzHalf, refs.hzUndo]));
    refs.hz.appendChild(refs.hzMsg);
    refs.hzLine.addEventListener("click", () => hzBusyRun(refs.hzLine, () => hzPress("one")));
    refs.hzHalf.addEventListener("click", () => hzBusyRun(refs.hzHalf, () => hzPress("half")));
    refs.hzUndo.addEventListener("click", () => {
      const box = getCreateBox();
      if (!box || !hzUndoStack.length) return;
      setCreateBoxText(box, hzUndoStack.pop(), hzWriteCheck);
      refs.hzUndo.hidden = hzUndoStack.length === 0;
      scheduleAnalyse();
      hzMsg("Reverted the last Humanize press.");
    });
  }

  // Build one craft row: emoji + label + optional quote + optional fix.
  function craftRow(cls, emoji, label, quote, fix) {
    const kids = [el("span", { class: "slop-cr-emoji", text: emoji })];
    const body = el("div", { class: "slop-cr-body" });
    body.appendChild(el("div", { class: "slop-cr-label", text: label }));
    if (quote) body.appendChild(el("div", { class: "slop-cr-quote", text: quote }));
    if (fix) body.appendChild(el("div", { class: "slop-cr-fix", text: fix }));
    kids.push(body);
    return el("div", { class: "slop-cr " + cls }, kids);
  }

  // Compact panel (user 2026-06-14): ONE joker (top) + ONE ⚠️ (middle) + ONE ✅ (bottom) so it fits a
  // phone. Tapping any row REROLLS it within its own category; the joker cycles the smart move then the
  // most-AI lines. (On /create, when the engine is exhausted, the joker becomes the shape diagnosis.)
  function renderCraft(p) {
    clear(refs.craft);
    if (!p) return;
    var jokerOpts = (p.jokerOpts && p.jokerOpts.length) ? p.jokerOpts.slice() : (p.joker ? [p.joker.text] : []);
    if (isCreatePage() && lastResult && lastResult.score >= 55 && hzNext.key === lastResult._text && !hzNext.res) {
      var dg = null; try { dg = HumanizeFreestyle.diagnoseShape(lastResult._text); } catch (e) {}
      if (dg) jokerOpts = ["Every safe mechanical edit is done — what's left is yours to write: " + dg + "."];
    }
    var bad = p.bad || [], good = p.good || [], ix = { joker: 0, bad: 0, good: 0 };
    function addRow(cat, cls, emoji, header) {
      refs.craft.appendChild(el("div", { class: "slop-craft-h", text: header }));
      var holder = el("div", {});
      refs.craft.appendChild(holder);
      (function paint() {
        clear(holder);
        var row, count;
        if (cat === "joker") { if (!jokerOpts.length) return; row = craftRow(cls, emoji, jokerOpts[ix.joker % jokerOpts.length], "", ""); count = jokerOpts.length; }
        else if (cat === "bad") { if (!bad.length) return; var b = bad[ix.bad % bad.length]; row = craftRow(cls, emoji, b.label, b.quote || "", b.fix || ""); count = bad.length; }
        else { if (!good.length) return; var g = good[ix.good % good.length]; row = craftRow(cls, emoji, g.label, g.quote || "", ""); count = good.length; }
        if (count > 1) { row.classList.add("slop-cr-tap"); row.title = "tap for another"; row.addEventListener("click", function () { ix[cat]++; paint(); }); }
        holder.appendChild(row);
      })();
    }
    addRow("joker", "joker", "🃏", "🃏 Try this");
    addRow("bad", "bad", "⚠️", "⚠️ Work on");
    addRow("good", "good", "✅", "✅ Keep this");
  }

  function colorFor(score) {
    if (score >= 70) return "#ff4d4d";
    if (score >= 45) return "#ff9f1c";
    if (score >= 25) return "#ffd23f";
    return "#5fd068";
  }

  function render(result) {
    ensureUI();
    if (!result) {
      refs.pct.textContent = "?";
      return;
    }
    // Suno is a SPA that mutates the DOM constantly, and our own panel edits (tap-to-reroll)
    // re-fire the MutationObserver. Re-painting on an UNCHANGED analysis would wipe the user's
    // reroll state, so when the lyrics haven't changed we leave the live panel exactly as-is.
    if (result._text != null && result._text === renderedText && refs.craft && refs.craft.childNodes.length) return;
    renderedText = result._text;
    if (result.instrumental) {
      badge.style.setProperty("--slop-color", "#888");
      refs.pct.textContent = "–";
      clear(refs.verdict);
      refs.verdict.appendChild(el("span", { class: "slop-verdict-text", text: "Instrumental — no lyrics to score" }));
      refs.components.textContent = "";
      renderCraft(null);
      return;
    }
    if (result.nonEnglish) {
      badge.style.setProperty("--slop-color", "#888");
      refs.pct.textContent = "–";
      clear(refs.verdict);
      refs.verdict.appendChild(el("span", { class: "slop-verdict-text", text: "Looks non-English" }));
      refs.components.textContent =
        "The model reads English words and clichés, so a score here wouldn't mean anything.";
      // route the guidance through the joker card the user already knows
      renderCraft({ joker: { text: "Translate these lyrics to English for a coherent result, then run it again." } });
      return;
    }
    const c = colorFor(result.score);
    badge.style.setProperty("--slop-color", c);
    refs.pct.textContent = result.score + "%";

    clear(refs.verdict);
    refs.verdict.appendChild(el("span", { class: "slop-big", style: "color:" + c, text: result.score + "% AI" }));
    refs.verdict.appendChild(el("span", { class: "slop-verdict-text", text: result.label }));

    // v5 model attribution — only named when confident, gated behind the AI verdict
    if (result.attribution) {
      const NAMES = { suno: "Suno", claude: "Claude", grok: "Grok", chatgpt: "ChatGPT", gemini: "Gemini" };
      const a = result.attribution;
      const attrText = a.model
        ? `likely ${NAMES[a.model] || a.model} (${Math.round(a.conf * 100)}%)`
        : "AI — model uncertain";
      refs.verdict.appendChild(el("span", { class: "slop-attribution", text: attrText }));
    } else if (result.verdict === "human") {
      refs.verdict.appendChild(el("span", { class: "slop-attribution", text: "likely human-written" }));
    }

    refs.components.textContent = `model confidence this is AI: ${result.score}%`;

    renderCraft(result.panel);
    computeHzNext(result._text); // refresh the joker's next-press preview (async)
  }

  // ---- Suno is a SPA: lyrics load late, and the page changes without reload ---
  // flush() drops the previous analysis (removes the pill) so a refreshed/changed
  // page never shows a stale score; a fresh pill is rebuilt on the next render.
  function flush() {
    if (host) { host.remove(); host = null; badge = null; panel = null; refs = {}; }
    lastResult = null;
    renderedText = null;
    hzUndoStack.length = 0; // a new page must never "undo" into a previous song's text
    hzNext = { key: null, res: null };
  }

  let debounce = null;
  function scheduleAnalyse() {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      // Belt-and-suspenders: if the SPA changed the URL in a way our history hooks
      // didn't catch, the on-screen score is stale -> flush BEFORE re-reading, so a
      // new page never inherits the previous song's %AI.
      if (location.href !== lastUrl) { lastUrl = location.href; flush(); }
      if (!isScorablePage()) { flush(); return; } // left song/create -> clear it
      const r = analyse();
      render(r);
    }, 400);
  }

  // SPA navigation: Suno changes the URL via the History API (no full reload).
  // On ANY url change -> flush the old analysis, then re-analyse if still scorable.
  let lastUrl = location.href;
  function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    flush();                                 // always drop the previous page's score
    if (isScorablePage()) scheduleAnalyse();  // make a new one if on song/create
  }
  const wrapHist = (orig) => function () { const ret = orig.apply(this, arguments); onUrlChange(); return ret; };
  history.pushState = wrapHist(history.pushState);
  history.replaceState = wrapHist(history.replaceState);
  window.addEventListener("popstate", onUrlChange);

  const observer = new MutationObserver(scheduleAnalyse);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleAnalyse();

  // ---- popup asks for the current score -------------------------------------
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.type === "GET_SLOP") {
        sendResponse({
          onSongPage: true,
          hasLyrics: !!getLyricsText(),
          result: lastResult
            ? {
                score: lastResult.score,
                label: lastResult.label,
                panel: lastResult.panel,
                instrumental: !!lastResult.instrumental,
                nonEnglish: !!lastResult.nonEnglish,
              }
            : null,
        });
      }
      return true;
    });
  }
})();
