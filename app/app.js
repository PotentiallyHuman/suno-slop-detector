/* app.js — Lyric Humanizer PWA glue.
 * Wires the paste box to the trained engine (SlopV2.score + SlopPanel.build)
 * and renders the score + the 5 ✅ · 1 🃏 · 5 ⚠️ craft panel.
 * The engine is reused VERBATIM from the extension — nothing is scored here. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var lyricsEl = $("lyrics");
  var howaiBtn = $("howai");
  var humanizeBtn = $("humanize");
  var rewriteBtn = $("rewrite");
  var undoBtn  = $("undo");
  var clearBtn = $("clear");
  var exampleBtn = $("example");
  var hintEl   = $("hint");
  var toastEl  = $("toast");

  // A typical AI-generated lyric: repeated chorus, stacked stock imagery, perfect rhymes.
  // Chosen so "Try an example" → "How AI?" reads high, and "Humanize" can visibly improve
  // it over several clicks (each click swaps a stock image / varies a repeated line).
  var EXAMPLE = [
    "Neon shadows fill the endless midnight sky tonight",
    "Whispered echoes of a crimson flame ignite",
    "Burning embers, frozen tears, we chase the fading light",
    "Drowning in the velvet silence of the night",
    "Neon shadows fill the endless midnight sky tonight",
    "Whispered echoes of a crimson flame ignite",
    "Shattered dreams and faded scars dissolve into the rain",
    "Lost forever in the shadows of the pain"
  ].join("\n");
  var resultEl = $("result");
  var scoreEl  = $("score");
  var verdictEl = $("verdict");
  var meterFill = $("meter-fill");
  var subnoteEl = $("subnote");
  var craftEl  = $("craft");

  function colorFor(s) {
    if (s >= 70) return "#ff4d4d";
    if (s >= 45) return "#ff9f1c";
    if (s >= 25) return "#ffd23f";
    return "#5fd068";
  }

  // The model is English-only (its bag-of-words + cliché lexicon are English).
  // On other languages almost no words/clichés match, so the score is meaningless.
  // Cheap on-device check: share of very common English words. If tiny, it isn't English.
  var EN_COMMON = /^(the|and|you|to|a|of|in|it|that|is|my|me|we|for|on|with|but|love|night|i|are|was|be|he|she|they|this|have|not|your|all|like|when|what|so|do|can|just|know|now|time|up|out|no|yes|oh|don't|i'm|we're|you're|it's)$/;
  function looksNonEnglish(text) {
    var toks = String(text).toLowerCase().match(/[a-z']+/g) || [];
    if (toks.length < 12) return false;            // too short to judge
    var hits = 0;
    for (var i = 0; i < toks.length; i++) if (EN_COMMON.test(toks[i])) hits++;
    return (hits / toks.length) < 0.08;            // <8% common English words -> not English
    // (real English lyrics run ~30-40%+; Danish/Spanish samples land ~0-6%, so this margin is safe)
  }

  // ---- craft panel renderer (DOM API, no innerHTML — pasted text stays inert) ----
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function head(txt) {
    var h = document.createElement("div");
    h.className = "craft-h"; h.textContent = txt; craftEl.appendChild(h);
  }
  function row(cls, emoji, label, detail) {
    var r = document.createElement("div");
    r.className = "craft-row " + cls;
    var e = document.createElement("span");
    e.className = "cr-emoji"; e.textContent = emoji; r.appendChild(e);
    var body = document.createElement("div");
    body.className = "cr-body";
    var l = document.createElement("div");
    l.className = "cr-label"; l.textContent = label; body.appendChild(l);
    if (detail) {
      var d = document.createElement("div");
      d.className = "cr-detail"; d.textContent = detail; body.appendChild(d);
    }
    r.appendChild(body);
    craftEl.appendChild(r);
  }
  function renderCraft(p) {
    clear(craftEl);
    if (!p) return;
    if (p.good && p.good.length) {
      head("✅ Keep this");
      p.good.forEach(function (g) { row("good", "✅", g.label, g.quote || ""); });
    }
    if (p.joker) {
      head("🃏 Try this");
      row("joker", "🃏", p.joker.text, "");
    }
    if (p.bad && p.bad.length) {
      head("⚠️ Work on");
      p.bad.forEach(function (b) {
        row("bad", "⚠️", b.label, [b.quote, b.fix].filter(Boolean).join(" — "));
      });
    }
  }

  function showInstrumental() {
    humanizeBtn.hidden = true;
    resultEl.hidden = false;
    scoreEl.className = "score nodata";
    scoreEl.textContent = "–";
    scoreEl.style.color = "#888";
    verdictEl.textContent = "No lyrics detected";
    verdictEl.style.color = "var(--muted)";
    meterFill.style.left = "0%";
    subnoteEl.textContent = "Paste some words to score — section tags or blanks alone can't be rated.";
    renderCraft(null);
  }

  function showNonEnglish() {
    humanizeBtn.hidden = true;
    resultEl.hidden = false;
    scoreEl.className = "score nodata";
    scoreEl.textContent = "–";
    scoreEl.style.color = "#888";
    verdictEl.textContent = "Looks non-English";
    verdictEl.style.color = "var(--muted)";
    meterFill.style.left = "0%";
    subnoteEl.textContent = "The model reads English words and clichés, so a score here wouldn't mean anything.";
    // route the guidance through the joker card the user already knows
    renderCraft({ joker: { text: "Translate these lyrics to English for a coherent result, then run it again." } });
  }

  function analyse() {
    var text = lyricsEl.value || "";
    if (text.trim().length < 8) {
      hintEl.textContent = "Paste a few lines first.";
      return;
    }
    hintEl.textContent = "";

    var sc;
    try { sc = SlopV2.score(text); }
    catch (e) { hintEl.textContent = "Engine error — reload the app."; return; }

    if (!sc || sc.instrumental) { showInstrumental(); return; }
    if (looksNonEnglish(text)) { showNonEnglish(); return; }

    // v5 model (if loaded) drives the headline score + LLM attribution; old model still
    // drives the craft panel jokers. Graceful fallback to the old score.
    var v5 = null, content = null, v8 = null;
    try { if (typeof SLOP_MODEL_V5 !== "undefined" && SLOP_MODEL_V5 && SlopV2.scoreV5) v5 = SlopV2.scoreV5(text); } catch (e) {}
    try { if (typeof SLOP_MODEL_V5 !== "undefined" && SLOP_MODEL_V5 && SlopV2.scoreContent) content = SlopV2.scoreContent(text); } catch (e) {}
    try { if (typeof SLOP_MODEL_V8 !== "undefined" && SLOP_MODEL_V8 && typeof SlopV8 !== "undefined" && SlopV8.scoreV8) v8 = SlopV8.scoreV8(text); } catch (e) {}
    // Meter = v8 score (format-robust, 88% CV): reads WHAT IS SAID, not how it's lined up, and it's
    // the number Rewrite can actually move. v5 still drives the LLM attribution below.
    var headScore = (v8 && v8.score != null) ? v8.score : ((content && content.score != null) ? content.score : ((v5 && v5.score != null) ? v5.score : sc.score));

    var col = colorFor(headScore);
    resultEl.hidden = false;
    humanizeBtn.hidden = false;
    if (rewriteBtn) rewriteBtn.hidden = false;
    scoreEl.className = "score";
    scoreEl.style.color = col;
    scoreEl.textContent = String(headScore);
    verdictEl.style.color = col;
    verdictEl.textContent = SlopScore.verdict(headScore);
    // reflow so the meter transition animates from its prior position
    void meterFill.offsetWidth;
    meterFill.style.left = headScore + "%";
    var sub = "Model confidence these lyrics read as AI: " + headScore + "%.";
    var headIsAI = headScore >= 50;   // gate attribution on the v8 HEADLINE, not v5 (they can disagree post-rewrite)
    if (headIsAI && v5 && v5.attribution && v5.attribution.model) {
      var NAMES = { suno: "Suno", claude: "Claude", grok: "Grok", chatgpt: "ChatGPT", gemini: "Gemini" };
      var a = v5.attribution;
      sub += "  Likely written by " + (NAMES[a.model] || a.model) + " (" + Math.round(a.conf * 100) + "%).";
    } else if (headIsAI) { sub += "  AI — model uncertain."; }
    else { sub += "  Likely human-written."; }
    subnoteEl.textContent = sub;

    var panel = null;
    try { panel = SlopPanel.build(text, sc); } catch (e) { /* panel optional */ }
    renderCraft(panel);

    if (resultEl.scrollIntoView) resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  howaiBtn.addEventListener("click", analyse);

  // ---- Humanize: apply ONE mechanical fix per click, with Undo ----------------
  var undoStack = [];
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) { hintEl.textContent = msg; return; }
    toastEl.textContent = msg;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4200);
  }

  // The headline score EXACTLY as the meter shows it (v5 if loaded, else old model).
  // Humanize must report this same number, never the old-model res.before/res.after.
  function headlineScore(t) {
    try {
      var sc = SlopV2.score(t); if (!sc || sc.instrumental) return null;
      try { if (typeof SLOP_MODEL_V8 !== "undefined" && SLOP_MODEL_V8 && typeof SlopV8 !== "undefined" && SlopV8.scoreV8) { var v8 = SlopV8.scoreV8(t); if (v8 && v8.score != null) return v8.score; } } catch (e) {}
      var cv = null;
      try { if (typeof SLOP_MODEL_V5 !== "undefined" && SLOP_MODEL_V5 && SlopV2.scoreContent) cv = SlopV2.scoreContent(t); } catch (e) {}
      if (cv && cv.score != null) return cv.score;   // content score = the meter (what Humanize moves)
      var hv = null;
      try { if (typeof SLOP_MODEL_V5 !== "undefined" && SLOP_MODEL_V5 && SlopV2.scoreV5) hv = SlopV2.scoreV5(t); } catch (e) {}
      return (hv && hv.score != null) ? hv.score : sc.score;
    } catch (e) { return null; }
  }

  // v8 line-level AI score (0..100) — ranks lines and gates the freestyle rebuilds
  function aiScore(t) { try { var r = SlopV8.scoreV8(t); return (r && r.score != null) ? r.score : 0; } catch (e) { return 0; } }
  function humanize() {   // "Humanize Line" — rebuild the single worst line, one per click
    var text = lyricsEl.value || "";
    if (text.trim().length < 8) { hintEl.textContent = "Paste a few lines first."; return; }
    // "Humanize Line": rebuild the single most-AI line with the on-device freestyle generator. One per click.
    var res = null;
    try { res = HumanizeFreestyle.humanizeOne(text, aiScore); } catch (e) { res = null; }
    if (!res) {
      var s0 = aiScore(text);
      if (s0 >= 55) showToast((function () { var dg = null; try { dg = HumanizeFreestyle.diagnoseShape(text); } catch (e) {} return "Still reads " + s0 + "% AI — but that's the song's SHAPE, not its words. " + (dg ? "Measured on your song: " + dg + "." : "To bring it down: vary your line lengths, break up a repeated chorus, let a line spill past the rhyme."); })());
      else showToast("Every line already reads human — nothing left to rebuild.");
      return;
    }
    undoStack.push(text);              // one undo reverts this whole click
    undoBtn.hidden = false;
    lyricsEl.value = res.text;
    clearBtn.hidden = false;
    flashBox();
    analyse();                         // re-score + repaint meter from the new text
    showToast("Rebuilt your most-AI line (#" + (res.lineIndex + 1) + "): " + res.before + "% → " + res.after + "% AI. Click again for the next-worst — Undo to revert.");
  }

  // brief highlight so the user SEES the textarea changed (textareas can't style ranges)
  function flashBox() {
    if (!lyricsEl) return;
    lyricsEl.classList.add("hz-flash");
    setTimeout(function () { lyricsEl.classList.remove("hz-flash"); }, 700);
  }

  function undo() {
    if (!undoStack.length) return;
    lyricsEl.value = undoStack.pop();
    undoBtn.hidden = undoStack.length === 0;
    clearBtn.hidden = lyricsEl.value.length === 0;
    analyse();
    showToast("Undid last change.");
  }

  // ---- Rewrite: full-song gated rewrite (v8). Sweeps every line in random order, keeps ONLY
  //      changes that lower the v8 AI%. Never worsens the song. Pure on-device, no network. ----
  function rewrite() {
    var text = lyricsEl.value || "";
    if (text.trim().length < 8) { hintEl.textContent = "Paste a few lines first."; return; }
    // "Humanize Rewrite": rebuild the worst HALF of the song in one press, keep the better half the user's.
    var res = null;
    try { res = HumanizeFreestyle.humanizeHalf(text, aiScore); } catch (e) { res = null; }
    if (!res) {
      var s0 = aiScore(text);
      if (s0 >= 55) showToast((function () { var dg = null; try { dg = HumanizeFreestyle.diagnoseShape(text); } catch (e) {} return "Still reads " + s0 + "% AI — but that's the song's SHAPE, not its words. " + (dg ? "Measured on your song: " + dg + "." : "To bring it down: vary your line lengths, break up a repeated chorus, let a line spill past the rhyme."); })());
      else showToast("Every line already reads human — nothing to rewrite.");
      return;
    }
    undoStack.push(text);
    undoBtn.hidden = false;
    lyricsEl.value = res.text;
    clearBtn.hidden = false;
    flashBox();
    analyse();
    showToast("Rewrote your " + res.count + " most-AI " + (res.count === 1 ? "line" : "lines") + " (" + res.before + "% → " + res.after + "% AI), kept the rest yours. Press again for the worst half of what's left — Undo to revert.");
  }
  if (rewriteBtn) rewriteBtn.addEventListener("click", rewrite);

  humanizeBtn.addEventListener("click", humanize);
  undoBtn.addEventListener("click", undo);

  // Ctrl/Cmd+Enter from the textarea = analyse
  lyricsEl.addEventListener("keydown", function (ev) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") { ev.preventDefault(); analyse(); }
  });

  // show/hide Clear; reset hint as the user types
  lyricsEl.addEventListener("input", function () {
    clearBtn.hidden = lyricsEl.value.length === 0;
    if (hintEl.textContent) hintEl.textContent = "";
  });
  clearBtn.addEventListener("click", function () {
    lyricsEl.value = "";
    clearBtn.hidden = true;
    resultEl.hidden = true;
    humanizeBtn.hidden = true;
    undoBtn.hidden = true;
    undoStack = [];
    if (toastEl) toastEl.hidden = true;
    lyricsEl.focus();
  });

  exampleBtn.addEventListener("click", function () {
    lyricsEl.value = EXAMPLE;
    clearBtn.hidden = false;
    analyse();
  });

  // ?demo auto-fills the example and scores it (handy for a first look / testing)
  if (/[?&]demo\b/.test(location.search)) {
    lyricsEl.value = EXAMPLE;
    clearBtn.hidden = false;
    analyse();
  }

  // ---- register service worker for offline / installability ----
  // Only in the real web/PWA — NOT inside the Capacitor native shell, where the
  // app is already fully on-device (and an SW just adds a failing fetch path).
  if (!window.Capacitor && "serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline still works after first cache */ });
    });
  }
})();
