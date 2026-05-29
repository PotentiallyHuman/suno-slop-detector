/* popup.js — shows the current tab's score (from content.js) + a manual tester */
(function () {
  "use strict";

  function colorFor(s) {
    if (s >= 70) return "#ff4d4d";
    if (s >= 45) return "#ff9f1c";
    if (s >= 25) return "#ffd23f";
    return "#5fd068";
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
      pageScore.textContent = r.score + "% AI";
      pageScore.style.color = colorFor(r.score);
      pageLabel.textContent = r.label;
    });
  });

  // ---- manual paste tester ------------------------------------------------
  const pasteEl = document.getElementById("paste");
  const pasteResult = document.getElementById("paste-result");
  const pasteScore = document.getElementById("paste-score");
  const pasteLabel = document.getElementById("paste-label");
  const pasteChips = document.getElementById("paste-chips");

  document.getElementById("analyze").addEventListener("click", () => {
    const text = pasteEl.value || "";
    if (text.trim().length < 8) return;
    const r = SlopScore.scoreLyrics(text);
    pasteResult.hidden = false;
    pasteScore.textContent = r.score + "% AI";
    pasteScore.style.color = colorFor(r.score);
    pasteLabel.textContent = r.label;
    const chips = r.hits.words
      .slice(0, 20)
      .map((w) => `<span class="chip t${w.weight}">${w.word}${w.count > 1 ? " ×" + w.count : ""}</span>`)
      .concat(
        r.hits.phrases.map((p) => `<span class="chip t3">“${p.phrase}”</span>`)
      )
      .join("");
    pasteChips.innerHTML = chips || `<span class="muted">no clichés found 🎉</span>`;
  });
})();
