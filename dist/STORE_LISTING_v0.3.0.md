# Store listing — Suno Slop Detector v0.3.0

Copy/paste into the AMO and Chrome Web Store dashboards when submitting the 0.3.0 update.

---

## What's new in 0.3.0 (release-notes blurb — paste in the "What's new" / version-notes field)

**A panel of craft experts, a sharper model, and honest non-English handling.**

- **Six craft "lenses."** The detector now reads your lyrics the way a rapper, poet, psychologist,
  philosopher, storyteller, and wit each would — ~55 new on-device signals (rhyme density &
  internal rhyme, assonance, direct address, named places, vocabulary reach, imagery & sound, idea
  structure…). The feedback panel quotes real lines and gives specific, example-rich fixes.
- **Catches AI it used to miss.** Retrained on real consumer-AI sources (Suno-dominant) — it now
  correctly flags Suno-style lyrics while keeping human classics low. Plus an eye-rhyme detector
  (love/move "sight rhymes") and a fixed feedback bug.
- **Non-English, handled honestly.** Lyrics in another language now get a clear "English-only for
  now" note + a translate tip instead of a meaningless score — detected on-device, no network.
- Still 100% on-device, text-only, no network — nothing is uploaded, ever.

---

## What's new in 0.2.0 (kept for reference)

v0.2 swapped the hand-tuned cliché meter for a **real trained model** (logistic regression: bag-of-words + 79 text-only craft/stylometric features, temperature-calibrated P(AI)) and added the **5 ✅ keep · 1 🃏 try · 5 ⚠️ work-on** craft-coach panel.

---

## Name
Suno Slop Detector

## Short summary (≤132 chars, Chrome)
Scores how "AI" a Suno song's lyrics read with a trained model + gives craft feedback. On-device, reads only the lyrics box.

## Category
Fun / Entertainment

## Detailed description

Open any Suno song and a little badge appears showing how much the lyrics read like AI — e.g. "62% AI". Click it for the craft-coach panel: what the song already does well, one creative move to try next, and what to work on — each note quoting a real word or line from your song.

Under the hood it's no longer a hand-tuned word list. A logistic-regression model was trained on real AI songs (Suno, ChatGPT, Grok, Gemini) versus real human songs, combining a bag-of-words half with 130+ text-only craft and stylometric features. New in v0.3, those features include **six craft-perspective lenses** — the detector reads your lyrics the way a rapper, poet, psychologist, philosopher, storyteller, and wit each would: rhyme density and internal rhyme, assonance, direct address, named people and places, vocabulary reach and allusion, imagery and sound devices, idea structure, and more. The score you see is the model's calibrated confidence that the lyrics are AI-written.

New in 0.3: lyrics in another language now get an honest "English-only for now" note (detected on-device, no network) with a translate suggestion instead of a meaningless score; an eye-rhyme detector spots "sight rhymes" (love/move); and the craft panel quotes real lines with specific, example-rich fixes.

It measures DEGREE of slop, not origin. A well-crafted song scores low even if AI made it, and a cliché-heavy human song scores high — it rates the texture of the words, never the person who wrote them.

It's a playful vibe-meter and craft mirror, NOT a personal attack or a judgement of any songwriter. Using AI to make music is completely fine. A high score doesn't mean a song is bad — plenty of beloved human songs score high because the AI was trained on songs like them. Please don't use it to harass or "out" anyone.

Privacy by design:
• Runs ONLY on suno.com/song/ pages.
• Reads ONLY the lyrics text — nothing else on the page, no account, no other tabs.
• 100% on-device. The trained model ships inside the extension. No network requests, no embeddings, no LLM calls, no tracking, no data stored or sold. The non-English check is a pure on-device function-word ratio — still nothing leaves your machine.

Open source: https://github.com/PotentiallyHuman/suno-slop-detector

## Permission justification (for the review form)
- activeTab: lets the toolbar popup read the score that the content script already computed for the current Suno song tab. No other use.
- Host access (https://suno.com/song/*): the content script must run on Suno song pages to read the lyrics box. It is scoped to song pages only and runs nowhere else.

## Data-use disclosures (Chrome "Privacy practices" form)
- Single purpose: rate the AI-likeness of a Suno song's lyrics and give craft feedback.
- Does the extension collect user data? NO.
- All processing is local; the model is bundled; nothing is transmitted. Privacy policy: link to the hosted PRIVACY.md (GitHub raw URL).

## Screenshots (reuse the existing assets)
- store/screenshot_1_ai.png, store/screenshot_2_human.png, store/promo_tile_440x280.png.
- (Optional new shot: a non-English song showing the "Looks non-English" notice + translate joker.)
</content>
</invoke>
