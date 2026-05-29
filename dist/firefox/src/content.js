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

  function analyse() {
    const node = getLyricsNode();
    if (!node) return null;
    const text = node.innerText || node.textContent || "";
    if (text.trim().length < 12) return null; // too short to mean anything

    // English-cliché signals only fire on English text; flag otherwise.
    // (Offline corpus is normalized via build/translate.js; for live non-English
    //  songs, on-device Chrome Translator could be wired here in future.)
    const toks = (text.toLowerCase().match(/[a-z']+/g) || []);
    const enHits = toks.filter((t) =>
      /^(the|and|you|to|a|of|in|it|that|is|my|me|we|for|on|with|but|love|night)$/.test(t)
    ).length;
    const nonEnglish = toks.length > 12 && enHits / toks.length < 0.05;

    const heur = SlopScore.scoreLyrics(text);
    let base = null;
    try {
      if (globalThis.SLOP_BASELINE && typeof SlopFeatures !== "undefined") {
        base = SlopFeatures.classify(text, globalThis.SLOP_BASELINE);
      }
    } catch (e) {
      /* baseline optional */
    }
    // final "AI-ness": blend the cliché lexicon with the data-driven corpus
    const finalScore = base
      ? Math.round(0.45 * heur.score + 0.55 * base.pAI)
      : heur.score;

    const result = {
      score: finalScore,
      label: SlopScore.verdict(finalScore),
      heuristicScore: heur.score,
      baselineScore: base ? base.pAI : null,
      nonEnglish: nonEnglish,
      breakdown: heur.breakdown,
      hits: heur.hits,
      stats: heur.stats,
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
    refs.bars = el("div", { id: "slop-bars" });
    refs.words = el("div", { id: "slop-words", class: "slop-chips" });
    refs.phrases = el("div", { id: "slop-phrases", class: "slop-chips" });
    const closeBtn = el("button", { id: "slop-close", type: "button", "aria-label": "close", text: "×" });
    panel = el("div", { id: "slop-panel", hidden: true }, [
      el("div", { class: "slop-head" }, [el("strong", { text: "Suno Slop Detector" }), closeBtn]),
      refs.verdict,
      refs.components,
      refs.bars,
      el("div", { class: "slop-section" }, [
        el("div", { class: "slop-label", text: "Cliché words found" }),
        refs.words,
      ]),
      el("div", { class: "slop-section" }, [
        el("div", { class: "slop-label", text: "Stock phrases" }),
        refs.phrases,
      ]),
      el("div", { class: "slop-foot", text: "Reads only the lyrics box · heuristic, not proof" }),
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
    const c = colorFor(result.score);
    badge.style.setProperty("--slop-color", c);
    refs.pct.textContent = result.score + "%";

    clear(refs.verdict);
    refs.verdict.appendChild(el("span", { class: "slop-big", style: "color:" + c, text: result.score + "% AI" }));
    refs.verdict.appendChild(el("span", { class: "slop-verdict-text", text: result.label }));

    refs.components.textContent =
      (result.baselineScore != null
        ? `cliché lexicon ${result.heuristicScore}%  ·  vs AI corpus ${result.baselineScore}%`
        : `cliché lexicon ${result.heuristicScore}%  ·  corpus baseline not loaded`) +
      (result.nonEnglish ? "  ·  ⚠ non-English: score approximate" : "");

    const b = result.breakdown;
    const parts = [
      ["Cliché words", b.words],
      ["Stock phrases", b.phrases],
      ["Lazy rhymes", b.rhymes],
      ["Repetition", b.repetition],
      ["Section tags", b.sectionTags],
    ];
    const max = Math.max(0.5, ...parts.map((p) => p[1]));
    clear(refs.bars);
    for (const [name, v] of parts) {
      const fill = el("span", { class: "slop-bar-fill" });
      fill.style.width = Math.round((Math.max(0, v) / max) * 100) + "%";
      refs.bars.appendChild(
        el("div", { class: "slop-bar-row" }, [
          el("span", { class: "slop-bar-name", text: name }),
          el("span", { class: "slop-bar-track" }, [fill]),
        ])
      );
    }

    clear(refs.words);
    if (result.hits.words.length) {
      result.hits.words.slice(0, 24).forEach((w) =>
        refs.words.appendChild(
          el("span", { class: "slop-chip t" + w.weight, text: w.word + (w.count > 1 ? " ×" + w.count : "") })
        )
      );
    } else refs.words.appendChild(el("span", { class: "slop-none", text: "none — nice" }));

    clear(refs.phrases);
    if (result.hits.phrases.length) {
      result.hits.phrases.forEach((p) =>
        refs.phrases.appendChild(
          el("span", { class: "slop-chip t3", text: "“" + p.phrase + "”" + (p.count > 1 ? " ×" + p.count : "") })
        )
      );
    } else refs.phrases.appendChild(el("span", { class: "slop-none", text: "none" }));
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
                breakdown: lastResult.breakdown,
                hits: lastResult.hits,
                stats: lastResult.stats,
              }
            : null,
        });
      }
      return true;
    });
  }
})();
