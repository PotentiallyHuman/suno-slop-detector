# Session 2026-06-03 — "Lyric Humanizer" standalone app (PWA + signed Android), shipped & proven

## TL;DR
Spun the Suno extension's trained engine into a **generic, paste-any-lyrics phone app** called
**Lyric Humanizer** — an installable PWA AND a **signed Android APK/AAB** — verified working on a
real Android emulator. Added a **non-English guard**. Wrote the **v0.3.0 extension handoff prompt**.

## What was built (all under ~/projects/28_suno_slop_detector)
- **`app/`** — installable PWA. Paste box → "How AI?" → 0–100% score + 5✅/1🃏/5⚠️ panel.
  Reuses the 9 engine files VERBATIM (synced from `src/` by `app/sync_engine.sh`). Files:
  index.html, app.css, app.js (DOM-API renderer, no innerHTML), manifest.webmanifest, sw.js
  (cache-first offline), icons/ (green→red equalizer = human→AI spectrum), serve.sh, README.md.
  Extras: "Try an example" button + `?demo=1` auto-score; Ctrl/Cmd+Enter = analyze.
- **`mobile/`** — Capacitor 6 Android wrapper. appId `com.potentiallyhuman.lyrichumanizer`.
  - `build_www.py` → inlines ALL css+js+brand-img into ONE `mobile/www/index.html` (see fix below).
  - `keystore/release.keystore` (pass `lyric2026`, alias `lyrichumanizer`; creds in
    `keystore/signing.properties`) — **gitignored** via `mobile/.gitignore`.
  - `android_env.sh` — env for the aarch64 build (JDK17 + SDK + QEMU_LD_PREFIX).
- **`dist/android/`** — shippable artifacts: `LyricHumanizer-1.0-release.apk` (3.0 MB, signed),
  `LyricHumanizer-1.0-release.aab` (2.8 MB → **this uploads to Play Console**), debug apk.
- Non-English guard added to `app/app.js` (`looksNonEnglish()` + joker "Translate these lyrics to
  English…"). English-only model; Danish → no misleading number.

## 🔑 Key fixes / learnings (don't relearn these)
1. **Capacitor WebView deadlocks on many `<script>` sub-requests** — the Android System WebView
   served by Capacitor's localhost server hung at script #1 (readyState stuck "loading", JS never
   ran, page rendered via CSS only → dead buttons). FIX = inline everything into ONE self-contained
   index.html (`mobile/build_www.py`, webDir=`mobile/www`). Diagnosed via remote DevTools
   (adb→`webview_devtools_remote_<pid>`→CDP; `suppress_origin=True` beats the 403 origin check).
   ⚠️ `npx cap copy | tail` masks cap-copy's exit code → its `||` fallback never fires; overwrite
   `mobile/android/app/src/main/assets/public/index.html` directly after build_www, then gradle.
2. **aarch64-Linux Android build recipe** (this box = ARM64 Ubuntu 24.04 + KVM, no Intel VT):
   JDK17 via apt; cmdline-tools run on arm64 JDK; but build-tools `aapt2`/`zipalign` are x86_64 ELF
   → run under `qemu-user-static` + an **amd64 sysroot** at `/opt/amd64root` (extracted
   libc6/libstdc++6/libgcc-s1/zlib1g amd64 debs; `export QEMU_LD_PREFIX=/opt/amd64root`; symlinked
   `lib64/ld-linux-x86-64.so.2`). All in `mobile/android_env.sh`.
3. **No linux-aarch64 Android emulator** (sdkmanager won't list `emulator`) → ran via **Waydroid**
   (`modprobe binder_linux`; `waydroid init -s VANILLA` = Android 13 arm64; headless **weston**
   `--backend=headless-backend.so --socket=wayland-wd` as render target; `waydroid session start`;
   `waydroid app install`; screenshot via `sudo waydroid shell -- screencap -p /data/local/tmp/x.png`
   then copy from `~/.local/share/waydroid/data/...`). Synthetic `input tap` is flaky on WebView
   buttons — drive reliably via CDP `.click()`.
4. **Phone delivery:** local QR/`http.server` FAILED (this is a remote server, NOT on the user's
   LAN — the phone hitting its IP collapsed both connections). What WORKED: upload to **catbox.moe**
   → QR of the public URL → phone downloads over its own connection. (Outlook strips raw .apk
   email; 0x0.st uploads disabled.) Latest APK URL: https://files.catbox.moe/wo36b8.apk

## Proven (real Android, captured)
Installed signed APK → renders, scores 100% "Reeks of slop 🤖" + full 5/1/5 panel; Danish →
"Looks non-English" + translate joker, no number. English engine unaffected (verified via CDP).

## Running processes (still up at session close — stop if you want the resources back)
- Waydroid session + container + headless weston (the emulator). Stop:
  `waydroid session stop; sudo systemctl stop waydroid-container; pkill weston` (kill by PID).
- Nothing else long-running. (The APK file server was closed.)

## STATUS / open items
- App is DONE + tested on device. **NOT committed** to git yet (no commit was requested).
- Updated APK (with non-English fix) delivered via catbox QR; user said they'd test.
- **v0.3.0 extension** (fold non-English guard into the Suno extension + resubmit AMO/Chrome):
  prompt written → **`V0.3.0_HANDOFF_PROMPT.md`** (paste into a fresh chat when ready).
- Play Store: `.aab` ready; needs the user's $25 Play Console acct + (new personal accounts)
  a 12-tester/14-day closed test before production unlocks.

## Memory
Full detail saved to memory: project_28_suno_slop_detector.md (Lyric Humanizer paragraphs +
the WebView fix + the aarch64 build recipe + the non-English guard).
