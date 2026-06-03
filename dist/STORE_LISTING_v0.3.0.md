# Store listing — Suno Slop Detector v0.3.0

Copy/paste into the AMO and Chrome Web Store dashboards when submitting the 0.3.0 update.

---

## What's new in 0.3.0 (release-notes blurb — paste in the "What's new" / version-notes field)

**Non-English lyrics are now handled honestly.**

- The model reads English words and clichés, so a number on Danish, Spanish, or any other
  language wouldn't mean anything. v0.3 now detects non-English lyrics **on-device** (a tiny
  function-word check — no network, no API, no LLM) and, instead of a misleading score, shows a
  clear "English-only for now" note with a friendly **🃏 Translate these lyrics to English** tip.
- Works the same on the song page and in the toolbar paste-to-test box.
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

Under the hood it's no longer a hand-tuned word list. A logistic-regression model was trained on thousands of AI songs (ChatGPT, Gemini, Grok, Suno) versus real human songs, combining a bag-of-words half with 79 text-only craft and stylometric features: cliché density, rhyme predictability, line-length burstiness, named-referent specificity, over-personification, repeated lines, argument structure, and more. The score you see is the model's calibrated confidence that the lyrics are AI-written.

New in 0.3: the model is English-only, so lyrics in another language now get an honest "English-only for now" note (detected on-device, no network) with a translate suggestion — instead of a meaningless score.

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
