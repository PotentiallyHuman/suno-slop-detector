# Store listing — Suno Slop Detector v0.2.0

Copy/paste into the AMO and Chrome Web Store dashboards when submitting the 0.2.0 update.

---

## What's new in 0.2.0 (release-notes blurb — paste in the "What's new" / version-notes field)

v0.2 swaps the hand-tuned cliché meter for a **real trained model** and adds a **craft coach**.

- The score is now a logistic-regression model trained on 3,805 AI songs vs 3,848 human-song metric vectors (bag-of-words + 79 text-only craft/stylometric features, ~85% cross-validated). The number you see is pure, temperature-calibrated P(AI) — no more blended guesswork.
- New craft-coach panel: **5 things the song does well · 1 creative move to try · 5 things to work on**, every note quoting a real word or line from *your* song with a one-line fix.
- Smarter input handling: strips [Verse]/[Chorus] tags, leaked JSON and model scaffolding before scoring; instrumentals are detected and skipped.
- Still 100% on-device, text-only, no network — the model ships inside the extension. No embeddings, no LLM calls, nothing uploaded.

---

## Name
Suno Slop Detector

## Short summary (≤132 chars, Chrome)
Scores how "AI" a Suno song's lyrics read with a trained model + gives craft feedback. On-device, reads only the lyrics box.

## Category
Fun / Entertainment

## Detailed description

Open any Suno song and a little badge appears showing how much the lyrics read like AI — e.g. "62% AI". Click it for the craft-coach panel: what the song already does well, one creative move to try next, and what to work on — each note quoting a real word or line from your song.

Under the hood (v0.2) it's no longer a hand-tuned word list. A logistic-regression model was trained on thousands of AI songs (ChatGPT, Claude, Grok, Gemini, Suno) versus real human songs, combining a bag-of-words half with 79 text-only craft and stylometric features: cliché density, rhyme predictability, line-length burstiness, named-referent specificity, over-personification, repeated lines, argument structure, and more. The score you see is the model's calibrated confidence that the lyrics are AI-written.

It measures DEGREE of slop, not origin. A well-crafted song scores low even if AI made it, and a cliché-heavy human song scores high — it rates the texture of the words, never the person who wrote them.

It's a playful vibe-meter and craft mirror, NOT a personal attack or a judgement of any songwriter. Using AI to make music is completely fine. A high score doesn't mean a song is bad — plenty of beloved human songs score high because the AI was trained on songs like them. Please don't use it to harass or "out" anyone.

Privacy by design:
• Runs ONLY on suno.com/song/ pages.
• Reads ONLY the lyrics text — nothing else on the page, no account, no other tabs.
• 100% on-device. The trained model ships inside the extension. No network requests, no embeddings, no LLM calls, no tracking, no data stored or sold.

Open source: https://github.com/PotentiallyHuman/suno-slop-detector

## Permission justification (for the review form)
- activeTab: lets the toolbar popup read the score that the content script already computed for the current Suno song tab. No other use.
- Host access (https://suno.com/song/*): the content script must run on Suno song pages to read the lyrics box. It is scoped to song pages only and runs nowhere else.

## Data-use disclosures (Chrome "Privacy practices" form)
- Single purpose: rate the AI-likeness of a Suno song's lyrics and give craft feedback.
- Does the extension collect user data? NO.
- All processing is local; the model is bundled; nothing is transmitted. Privacy policy: link to the hosted PRIVACY.md (GitHub raw URL).

## Screenshots (you provide — must be from a real page)
- 1280×800 (or 640×400): a Suno song page with the badge + expanded craft-coach panel (5 ✅ / 1 🃏 / 5 ⚠️) visible.
- Optional: the toolbar popup with a pasted lyric scored.
(Take these on one of your own songs — they can't be generated without a live page.)
