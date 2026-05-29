# Store listing — copy/paste when submitting

## Name
Suno Slop Detector

## Short summary (≤132 chars, Chrome)
Rates how "AI" a Suno song's lyrics read — for fun. Reads only the lyrics box; nothing leaves your device.

## Category
Fun / Entertainment

## Detailed description
Open any Suno song and a little badge appears showing how much the lyrics "reek of AI"
— e.g. "56% AI". Click it to see *why*: which clichés and stock phrases show up, how
predictable the rhymes are, how repetitive the vocabulary is, and how the lyrics compare
to a corpus of real human songs vs. AI-generated ones.

It's a playful vibe-meter, NOT a personal attack or a judgement of any songwriter. Using
AI to make music is completely fine — this is a curiosity toy and a craft mirror. A high
score doesn't mean a song is bad; plenty of beloved human songs score high because the AI
was trained on songs like them.

Privacy by design:
• Runs ONLY on suno.com/song/ pages.
• Reads ONLY the lyrics text — nothing else on the page, no account, no other tabs.
• 100% on-device. No network requests, no tracking, no data stored or sold.

Open source: https://github.com/PotentiallyHuman/suno-slop-detector

## Permission justification (for the review form)
- activeTab: lets the toolbar popup read the score that the content script already
  computed for the current Suno song tab. No other use.
- Host access (https://suno.com/song/*): the content script must run on Suno song pages
  to read the lyrics box. It is scoped to song pages only and runs nowhere else.

## Data-use disclosures (Chrome "Privacy practices" form)
- Single purpose: rate the AI-likeness of a Suno song's lyrics.
- Does the extension collect user data? NO.
- All processing is local; nothing is transmitted. Privacy policy: link to the hosted
  PRIVACY.md (e.g. the GitHub raw URL).

## Screenshots needed (you provide — must be from a real page)
- 1280×800 (or 640×400): a Suno song page with the badge + expanded panel visible.
- Optional: the toolbar popup with a pasted lyric scored.
(Take these on one of your own songs — they can't be generated without a live page.)
```
