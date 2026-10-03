(function () {
  "use strict";

  var lyricsEl = document.getElementById("lyrics");
  var fileEl = document.getElementById("file");
  var fileStatusEl = document.getElementById("file-status");
  var resultEl = document.getElementById("result");
  var scoreEl = document.getElementById("score");
  var verdictEl = document.getElementById("verdict");
  var notesEl = document.getElementById("notes");
  var craftEl = document.getElementById("craft");

  var SAMPLE =
    "I found your note in the kitchen drawer\n" +
    "Beside the key from our first apartment\n" +
    "The rain kept time on the fire escape\n" +
    "While the neighbor's radio argued with the dark\n\n" +
    "I don't know why I kept the receipt\n" +
    "From the diner off Marshall Street\n" +
    "But your coffee stain still knows my name\n" +
    "Better than I do tonight";

  function colorFor(score) {
    if (score >= 70) return "#ff5a5f";
    if (score >= 45) return "#f5a524";
    if (score >= 25) return "#dfc94f";
    return "#55c982";
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderCraft(panel) {
    clearNode(craftEl);
    if (!panel) return;

    function head(text) {
      craftEl.appendChild(el("div", "craft-h", text));
    }

    function row(cls, label, quote, fix) {
      var item = el("div", "craft-row " + cls);
      item.appendChild(el("div", "craft-label", label));
      if (quote) item.appendChild(el("div", "craft-detail", quote));
      if (fix) item.appendChild(el("div", "craft-fix", fix));
      craftEl.appendChild(item);
    }

    if (panel.good && panel.good.length) {
      head("Keep this");
      panel.good.forEach(function (g) {
        row("good", g.label, g.quote || "", "");
      });
    }

    if (panel.joker) {
      head("Try this");
      row("joker", panel.joker.text, "", "");
    }

    if (panel.bad && panel.bad.length) {
      head("Work on");
      panel.bad.forEach(function (b) {
        row("bad", b.label, b.quote || "", b.fix || "");
      });
    }
  }

  function englishWarning(text) {
    var toks = (String(text).toLowerCase().match(/[a-z']+/g) || []);
    var enHits = toks.filter(function (t) {
      return /^(the|and|you|to|a|of|in|it|that|is|my|me|we|for|on|with|but|love|night)$/.test(t);
    }).length;
    return toks.length > 12 && enHits / toks.length < 0.05;
  }

  function analyzeText() {
    var text = lyricsEl.value || "";
    if (text.trim().length < 8) {
      fileStatusEl.textContent = "Paste or upload lyrics first.";
      return;
    }

    var sc = globalThis.SlopV2.score(text);
    resultEl.hidden = false;

    if (sc.instrumental) {
      scoreEl.textContent = "No score";
      scoreEl.style.color = "#a7a9b0";
      verdictEl.textContent = "Instrumental or empty after cleanup";
      notesEl.textContent = "There are no lyrics left to analyze after section tags and scaffolding are removed.";
      clearNode(craftEl);
      return;
    }

    var panel = null;
    try {
      panel = globalThis.SlopPanel.build(text, sc);
    } catch (e) {
      panel = null;
    }

    scoreEl.textContent = sc.score + "% AI";
    scoreEl.style.color = colorFor(sc.score);
    verdictEl.textContent = globalThis.SlopScore.verdict(sc.score);
    notesEl.textContent =
      "Model confidence this lyric reads AI-written: " + sc.score + "%." +
      (englishWarning(text) ? " Non-English lyrics are approximate because the model is English-heavy." : "");
    renderCraft(panel);
  }

  function readTextFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(reader.error || new Error("Could not read file")); };
      reader.readAsText(file);
    });
  }

  fileEl.addEventListener("change", function () {
    var file = fileEl.files && fileEl.files[0];
    if (!file) return;

    fileStatusEl.textContent = "Reading " + file.name + "...";
    readTextFile(file).then(function (text) {
      lyricsEl.value = text;
      fileStatusEl.textContent = "Loaded " + file.name + ".";
      analyzeText();
    }).catch(function () {
      fileStatusEl.textContent = "Could not read that file.";
    });
  });

  document.getElementById("analyze").addEventListener("click", analyzeText);

  document.getElementById("sample").addEventListener("click", function () {
    lyricsEl.value = SAMPLE;
    fileStatusEl.textContent = "Loaded sample lyrics.";
    analyzeText();
  });

  document.getElementById("clear").addEventListener("click", function () {
    lyricsEl.value = "";
    fileEl.value = "";
    fileStatusEl.textContent = "";
    resultEl.hidden = true;
    clearNode(craftEl);
  });
})();
