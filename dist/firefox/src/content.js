/*
 * content.js — runs ONLY on https://suno.com/song/* (enforced by manifest
 * `matches` AND re-checked below). It reads ONE element: the lyrics paragraph.
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

  // The /create lyrics editor, pinned to the STABLE data-testid="lyrics-textarea"
  // (verified live), with fuzzy fallbacks. Never the style/title box.
  // Suno can keep MORE THAN ONE matching textarea mounted (e.g. a restored draft
  // in a hidden editor instance) — caught live 2026-06-13 when the panel quoted a
  // line that wasn't in the visible box. Always pick the first VISIBLE match.
  function getCreateBox() {
    if (!isCreatePage()) return null;
    const list = document.querySelectorAll(
      'textarea[data-testid="lyrics-textarea"], textarea[data-testid*="lyric" i], textarea[placeholder*="lyric" i]'
    );
    for (let i = 0; i < list.length; i++) {
      if (list[i].getClientRects().length > 0) return list[i]; // on-screen editor
    }
    return list[0] || null;
  }

  // Write into the lyrics box ONLY — through the native value setter, then an
  // `input` event, so Suno's controlled React textarea picks the change up as if
  // the user had typed it. Plain `.value =` would render but desync React state,
  // and the next keystroke would snap the box back to the stale value.
  function setCreateBoxText(box, text) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // The ONLY text we read: the song-page lyrics <p>, or (on /create) the lyrics
  // input box. Returns "" if neither is present. Reads nothing else on the page.
  function getLyricsText() {
    if (isCreatePage()) {
      const box = getCreateBox();
      return (box && typeof box.value === "string") ? box.value : "";
    }
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
    const toks = String(text).toLowerCase().match(/[a-z']+/g) || [];
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
    badge = el("button", { id: "slop-badge", type: "button", title: "Suno Slop Detector" }, [
      el("span", { class: "slop-emoji", text: "🤖" }),
      refs.pct,
    ]);
    refs.verdict = el("div", { id: "slop-verdict" });
    refs.components = el("div", { id: "slop-components", class: "slop-components" });
    refs.hz = el("div", { id: "slop-hz" }); // /create only: edits the lyrics box in place
    refs.craft = el("div", { id: "slop-craft" }); // the 5 ✅ · 1 🃏 · 5 ⚠️ panel
    const closeBtn = el("button", { id: "slop-close", type: "button", "aria-label": "close", text: "×" });
    panel = el("div", { id: "slop-panel", hidden: true }, [
      el("div", { class: "slop-head" }, [el("strong", { text: "Suno Slop Detector" }), closeBtn]),
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
    const text = box.value || "";
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
      setCreateBoxText(box, res.text);
      scheduleAnalyse();
      hzMsg("Chaos: dropped every safety gate and reworked " + res.count + " " + (res.count === 1 ? "line" : "lines") +
        " — " + res.before + "% → " + res.after + "% AI. Rhymes and your hooks kept. Undo to revert.");
      return;
    }
    hzUndoStack.push(text);
    if (refs.hzUndo) refs.hzUndo.hidden = false;
    setCreateBoxText(box, res.text);
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
      setCreateBoxText(box, hzUndoStack.pop());
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

  function renderCraft(p) {
    clear(refs.craft);
    if (!p) return;
    // ✅ good — keep this
    if (p.good && p.good.length) {
      refs.craft.appendChild(el("div", { class: "slop-craft-h", text: "✅ Keep this" }));
      p.good.forEach((g) =>
        refs.craft.appendChild(craftRow("good", "✅", g.label, g.quote || "", "")));
    }
    // 🃏 joker — do this. On /create, when the next-press preview is current, the
    // joker names the exact line the next "Humanize Line" press will rebuild; when
    // the engine has nothing safe left and the song still reads AI, it says what
    // only the writer can fix (shape + a real-world anchor).
    let joker = p.joker ? p.joker.text : null;
    if (isCreatePage() && lastResult && hzNext.key === lastResult._text) {
      if (hzNext.res) {
        joker = "Your most-AI line is #" + (hzNext.res.lineIndex + 1) + ": “" + hzNext.res.from +
          "” — press Humanize Line above to rebuild exactly that line.";
      } else if (lastResult.score >= 55) {
        let dg = null;
        try { dg = HumanizeFreestyle.diagnoseShape(lastResult._text); } catch (e) {}
        if (dg) joker = "Every safe mechanical edit is done — what's left is yours to write: " + dg + ".";
      }
    }
    if (joker) {
      refs.craft.appendChild(el("div", { class: "slop-craft-h", text: "🃏 Try this" }));
      refs.craft.appendChild(craftRow("joker", "🃏", joker, "", ""));
    }
    // ⚠️ bad — work on
    if (p.bad && p.bad.length) {
      refs.craft.appendChild(el("div", { class: "slop-craft-h", text: "⚠️ Work on" }));
      p.bad.forEach((b) =>
        refs.craft.appendChild(craftRow("bad", "⚠️", b.label, b.quote || "", b.fix || "")));
    }
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
          hasLyrics: !!getLyricsNode(),
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
