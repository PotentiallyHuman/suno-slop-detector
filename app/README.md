# Lyric Humanizer

Paste any song lyrics → get one honest **"how AI does this read?"** number (0–100%)
plus a craft-coach panel: **5 ✅ keep this · 1 🃏 try this · 5 ⚠️ work on**, every note
quoting a real line from *your* lyrics with a one-line fix.

It measures **degree of AI texture, not origin** — a polished AI song scores low, a
cliché-heavy human song scores high. A playful mirror, never a verdict.

**100% on-device · text-only · no network, no accounts, no tracking. Works offline.**
This is an installable PWA — open it on a phone and "Add to Home Screen."

## How it works

It reuses the **exact trained scoring engine** shipped in the Suno Slop Detector
browser extension (a logistic-regression model: 2254-word bag-of-words + 79 text-only
craft/stylometric features, temperature-scaled to calibrated P(AI)). The only thing
that changed for the app is the front door: a paste box replaces the extension's
Suno-page reader. The model is **not** retrained or altered here.

- `index.html` / `app.css` / `app.js` — the paste-box UI + render glue.
- `engine/` — the 9 engine files, copied verbatim from `../src` (load order matters;
  see the `<script>` tags in `index.html`).
- `manifest.webmanifest` + `sw.js` — installability + offline (cache-first).
- `icons/` — app icons (the equalizer bars run green→red = the human→AI spectrum).

Public API used: `SlopV2.score(text)` → `{ score, pAI, instrumental, … }` and
`SlopPanel.build(text, scoreResult)` → `{ good[], joker, bad[] }`.

## Run / develop

```bash
./serve.sh            # → http://localhost:8088  (a SW/manifest need http, not file://)
# open ?demo=1 to auto-fill + score the built-in example
```

## Keep the engine in sync

The 9 files under `engine/` are copies. After retraining the model
(`node ../build/gen_model.js`), re-sync them:

```bash
./sync_engine.sh      # copies the 9 files from ../src → engine/  (then bump CACHE in sw.js)
```

## Install on a phone

Serve over HTTPS (any static host), open in mobile Chrome/Safari → **Add to Home
Screen**. It then launches full-screen with its own icon and runs fully offline.
To ship a real Play Store `.apk` later, wrap this folder with Capacitor — no code
rewrite needed.
