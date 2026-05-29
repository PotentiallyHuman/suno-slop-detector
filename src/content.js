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
  let host = null,
    badge = null,
    panel = null;

  function ensureUI() {
    if (host) return;
    host = document.createElement("div");
    host.id = "slop-detector-root";
    host.innerHTML = `
      <button id="slop-badge" type="button" title="Suno Slop Detector">
        <span class="slop-emoji">🤖</span><span id="slop-pct">…</span>
      </button>
      <div id="slop-panel" hidden>
        <div class="slop-head">
          <strong>Suno Slop Detector</strong>
          <button id="slop-close" type="button" aria-label="close">×</button>
        </div>
        <div id="slop-verdict"></div>
        <div id="slop-components" class="slop-components"></div>
        <div id="slop-bars"></div>
        <div id="slop-section" class="slop-section">
          <div class="slop-label">Cliché words found</div>
          <div id="slop-words" class="slop-chips"></div>
        </div>
        <div id="slop-phrase-section" class="slop-section">
          <div class="slop-label">Stock phrases</div>
          <div id="slop-phrases" class="slop-chips"></div>
        </div>
        <div class="slop-foot">Reads only the lyrics box · heuristic, not proof</div>
      </div>`;
    document.body.appendChild(host);
    badge = host.querySelector("#slop-badge");
    panel = host.querySelector("#slop-panel");
    badge.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });
    host.querySelector("#slop-close").addEventListener("click", () => {
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
      badge.querySelector("#slop-pct").textContent = "?";
      return;
    }
    const c = colorFor(result.score);
    badge.style.setProperty("--slop-color", c);
    badge.querySelector("#slop-pct").textContent = result.score + "%";

    panel.querySelector("#slop-verdict").innerHTML =
      `<span class="slop-big" style="color:${c}">${result.score}% AI</span>` +
      `<span class="slop-verdict-text">${result.label}</span>`;

    panel.querySelector("#slop-components").textContent =
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
    panel.querySelector("#slop-bars").innerHTML = parts
      .map(
        ([name, v]) => `
        <div class="slop-bar-row">
          <span class="slop-bar-name">${name}</span>
          <span class="slop-bar-track"><span class="slop-bar-fill" style="width:${Math.round(
            (Math.max(0, v) / max) * 100
          )}%"></span></span>
        </div>`
      )
      .join("");

    const wordChips = result.hits.words
      .slice(0, 24)
      .map(
        (w) =>
          `<span class="slop-chip t${w.weight}">${w.word}${
            w.count > 1 ? " ×" + w.count : ""
          }</span>`
      )
      .join("");
    panel.querySelector("#slop-words").innerHTML =
      wordChips || `<span class="slop-none">none — nice</span>`;

    const phraseChips = result.hits.phrases
      .map((p) => `<span class="slop-chip t3">“${p.phrase}”${p.count > 1 ? " ×" + p.count : ""}</span>`)
      .join("");
    panel.querySelector("#slop-phrases").innerHTML =
      phraseChips || `<span class="slop-none">none</span>`;
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
