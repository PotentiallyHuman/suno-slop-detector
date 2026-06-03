/* popup.js — shows the current tab's score (from content.js) + a manual tester.
 * v2: pure trained-model confidence P(AI) + a compact 5✅·1🃏·5⚠️ craft panel. */
(function () {
  "use strict";

  function colorFor(s) {
    if (s >= 70) return "#ff4d4d";
    if (s >= 45) return "#ff9f1c";
    if (s >= 25) return "#ffd23f";
    return "#5fd068";
  }

  // The model is English-only (its BoW + cliché lexicon are English keywords), so a
  // non-English score would be noise. Cheap on-device check: share of common English
  // function words. (real English ~30-40%+; Danish/Spanish ~0-6%, so the margin is safe)
  const EN_COMMON = /^(the|and|you|to|a|of|in|it|that|is|my|me|we|for|on|with|but|love|night|i|are|was|be|he|she|they|this|have|not|your|all|like|when|what|so|do|can|just|know|now|time|up|out|no|yes|oh|don't|i'm|we're|you're|it's)$/;
  function looksNonEnglish(text) {
    const toks = String(text).toLowerCase().match(/[a-z']+/g) || [];
    if (toks.length < 12) return false;            // too short to judge
    let hits = 0;
    for (let i = 0; i < toks.length; i++) if (EN_COMMON.test(toks[i])) hits++;
    return (hits / toks.length) < 0.08;            // <8% common English words -> not English
  }

  // Show the non-English notice (no number) + the translate joker, mirroring the on-page panel.
  const NONEN_JOKER = "Translate these lyrics to English for a coherent result, then run it again.";
  function showNonEnglish(scoreEl, labelEl, craftHost) {
    scoreEl.textContent = "–";
    scoreEl.style.color = "#888";
    labelEl.textContent = "Looks non-English · model reads English only";
    renderCraft(craftHost, { joker: { text: NONEN_JOKER } });
  }

  // build a compact craft panel into `host` from a panel object {good,joker,bad}
  function renderCraft(host, p) {
    while (host.firstChild) host.removeChild(host.firstChild);
    if (!p) return;
    const head = (txt) => {
      const h = document.createElement("div");
      h.className = "craft-h";
      h.textContent = txt;
      host.appendChild(h);
    };
    const row = (cls, label, detail) => {
      const r = document.createElement("div");
      r.className = "craft-row " + cls;
      const l = document.createElement("div");
      l.className = "craft-label";
      l.textContent = label;
      r.appendChild(l);
      if (detail) {
        const d = document.createElement("div");
        d.className = "craft-detail";
        d.textContent = detail;
        r.appendChild(d);
      }
      host.appendChild(r);
    };
    if (p.good && p.good.length) {
      head("✅ Keep this");
      p.good.forEach((g) => row("good", "✅ " + g.label, g.quote || ""));
    }
    if (p.joker) {
      head("🃏 Try this");
      row("joker", "🃏 " + p.joker.text, "");
    }
    if (p.bad && p.bad.length) {
      head("⚠️ Work on");
      p.bad.forEach((b) => row("bad", "⚠️ " + b.label, [b.quote, b.fix].filter(Boolean).join(" — ")));
    }
  }

  // ---- current tab --------------------------------------------------------
  const pageMsg = document.getElementById("page-msg");
  const pageResult = document.getElementById("page-result");
  const pageScore = document.getElementById("page-score");
  const pageLabel = document.getElementById("page-label");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;
    const isSong = /^https:\/\/suno\.com\/song\//.test(tab.url || "");
    if (!isSong) {
      pageMsg.textContent =
        "Open a suno.com/song/… page to score its lyrics. (Reads nowhere else.)";
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: "GET_SLOP" }, (resp) => {
      if (chrome.runtime.lastError || !resp) {
        pageMsg.textContent = "Reload the song page, then reopen this popup.";
        return;
      }
      if (!resp.result) {
        pageMsg.textContent = resp.hasLyrics
          ? "Reading lyrics…"
          : "No lyrics box found on this song page yet.";
        return;
      }
      const r = resp.result;
      pageMsg.hidden = true;
      pageResult.hidden = false;
      // compact craft panel for the current page
      let host = document.getElementById("page-craft");
      if (!host) {
        host = document.createElement("div");
        host.id = "page-craft";
        host.className = "craft";
        pageResult.appendChild(host);
      }
      if (r.nonEnglish) {
        showNonEnglish(pageScore, pageLabel, host);
        return;
      }
      if (r.instrumental) {
        pageScore.textContent = "–";
        pageScore.style.color = "#888";
        pageLabel.textContent = "Instrumental — no lyrics to score";
        renderCraft(host, null);
        return;
      }
      pageScore.textContent = r.score + "% AI";
      pageScore.style.color = colorFor(r.score);
      pageLabel.textContent = r.label;
      renderCraft(host, r.panel);
    });
  });

  // ---- manual paste tester ------------------------------------------------
  const pasteEl = document.getElementById("paste");
  const pasteResult = document.getElementById("paste-result");
  const pasteScore = document.getElementById("paste-score");
  const pasteLabel = document.getElementById("paste-label");
  const pasteCraft = document.getElementById("paste-craft");
  const pasteMsg = document.getElementById("paste-msg");
  const humanizeBtn = document.getElementById("humanize");
  const undoBtn = document.getElementById("undo");
  const undoStack = [];

  // Score + render the current paste box. Returns true on a normal numeric score
  // (so the caller knows Humanize is applicable), false for instrumental/non-English.
  function analysePaste() {
    const text = pasteEl.value || "";
    if (text.trim().length < 8) return false;
    const sc = SlopV2.score(text);
    pasteResult.hidden = false;
    if (sc && sc.instrumental) {
      pasteScore.textContent = "–";
      pasteScore.style.color = "#888";
      pasteLabel.textContent = "No lyrics to score";
      humanizeBtn.hidden = true;
      renderCraft(pasteCraft, null);
      return false;
    }
    if (looksNonEnglish(text)) {
      showNonEnglish(pasteScore, pasteLabel, pasteCraft);
      humanizeBtn.hidden = true;
      return false;
    }
    let panel = null;
    try { panel = SlopPanel.build(text, sc); } catch (e) {}
    pasteScore.textContent = sc.score + "% AI";
    pasteScore.style.color = colorFor(sc.score);
    pasteLabel.textContent = SlopScore.verdict(sc.score) + " · model confidence";
    humanizeBtn.hidden = false;            // a real score → one-click cleanup is available
    renderCraft(pasteCraft, panel);
    return true;
  }

  function showMsg(txt) { pasteMsg.textContent = txt; pasteMsg.hidden = !txt; }

  document.getElementById("analyze").addEventListener("click", () => {
    showMsg("");
    analysePaste();
  });

  // Humanize: apply ONE mechanical fix, re-score, show the drop. Reversible via Undo.
  humanizeBtn.addEventListener("click", () => {
    const text = pasteEl.value || "";
    let res = null;
    try { res = Humanize.next(text); } catch (e) {}
    if (!res) { showMsg("Nothing safe left to auto-fix — the rest needs your words."); return; }
    undoStack.push(text);
    undoBtn.hidden = false;
    pasteEl.value = res.text;
    analysePaste();
    const delta = (res.before > res.after) ? (res.before + "% → " + res.after + "% AI") : (res.after + "% AI");
    showMsg("Applied: " + (res.detail || res.label) + " · " + delta);
  });

  undoBtn.addEventListener("click", () => {
    if (!undoStack.length) return;
    pasteEl.value = undoStack.pop();
    undoBtn.hidden = undoStack.length === 0;
    analysePaste();
    showMsg("Undid last change.");
  });
})();
