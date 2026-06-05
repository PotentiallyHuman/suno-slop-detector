/*
 * content.js — runs ONLY on https://suno.com/song/* (enforced by manifest
 * `matches` AND re-checked below). It reads ONE element: the lyrics paragraph.
 * It never reads anything else on the page. No network, no storage of page text.
 */
(function () {
  "use strict";

  // ---- SAFETY GATE #1: URL must be a Suno song page -------------------------
  const ON_SONG_PAGE = /^https:\/\/suno\.com\/song\//.test(location.href);
  if (!ON_SONG_PAGE) return; // never read, never analyse anywhere else

  // ---- SAFETY GATE #2: the ONLY element we are allowed to read --------------
  // The lyrics paragraph. We intentionally use the stable, non-responsive
  // class fragments from the user-supplied selector chain (responsive classes
  // like `xl:pr-8` are brittle across breakpoints and need escaping). This
  // still pins us to the lyrics <p> and nothing else.
  const LYRICS_SELECTOR =
    "section div.font-sans.text-foreground-primary p.pr-6.whitespace-pre-wrap";

  let lastResult = null;

  function getLyricsNode() {
    // Strictly the lyrics paragraph; if it isn't there, we read NOTHING.
    return document.querySelector(LYRICS_SELECTOR);
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
    const node = getLyricsNode();
    if (!node) return null;
    const text = node.innerText || node.textContent || "";
    if (text.trim().length < 12) return null; // too short to mean anything

    // Old model drives the craft-panel jokers; the v5 model (if loaded) drives the
    // headline score + LLM attribution. Graceful fallback to the old score.
    const sc = SlopV2.score(text);
    // Instrumental (nothing but bracket-tags / blank after cleaning) -> no score, no feedback.
    if (sc && sc.instrumental) { lastResult = { instrumental: true, _text: text }; return lastResult; }

    // Non-English guard (separate check AFTER scoring): the English-only model can't
    // give a meaningful number here, so show an honest notice instead of a fake score.
    if (looksNonEnglish(text)) { lastResult = { nonEnglish: true, _text: text }; return lastResult; }

    let v5 = null;
    try { if (globalThis.SLOP_MODEL_V5 && SlopV2.scoreV5) v5 = SlopV2.scoreV5(text); } catch (e) { /* fall back */ }

    let panel = null;
    try {
      panel = SlopPanel.build(text, sc);
    } catch (e) {
      /* panel optional */
    }

    const headScore = (v5 && v5.score != null) ? v5.score : sc.score;
    const result = {
      score: headScore, // v5 P(AI)*100 if available, else old model
      pAI: (v5 && v5.pAI != null) ? v5.pAI : sc.pAI,
      label: SlopScore.verdict(headScore),
      attribution: v5 ? v5.attribution : null, // {model,conf} | {model:null} | null — gated behind AI verdict
      verdict: v5 ? v5.verdict : null,
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
    refs.craft = el("div", { id: "slop-craft" }); // the 5 ✅ · 1 🃏 · 5 ⚠️ panel
    const closeBtn = el("button", { id: "slop-close", type: "button", "aria-label": "close", text: "×" });
    panel = el("div", { id: "slop-panel", hidden: true }, [
      el("div", { class: "slop-head" }, [el("strong", { text: "Suno Slop Detector" }), closeBtn]),
      refs.verdict,
      refs.components,
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
    // 🃏 joker — do this
    if (p.joker) {
      refs.craft.appendChild(el("div", { class: "slop-craft-h", text: "🃏 Try this" }));
      refs.craft.appendChild(craftRow("joker", "🃏", p.joker.text, "", ""));
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
  }

  // ---- Suno is a SPA: lyrics load late & change on navigation ---------------
  let debounce = null;
  function scheduleAnalyse() {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (!/^https:\/\/suno\.com\/song\//.test(location.href)) return; // re-gate
      const r = analyse();
      render(r);
    }, 400);
  }

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
