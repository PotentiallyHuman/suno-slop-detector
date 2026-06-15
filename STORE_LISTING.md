# Store listing — copy/paste when submitting (current: v1.0.1)

## Name
Humanize AI Slop Lyrics

## Short summary (≤132 chars, Chrome) — 128 chars
Detect AI/Suno slop in lyrics, then humanize it to read human. On-device, no account. Score + craft feedback. For fun and spite.

## Category
Fun / Entertainment

## Detailed description
Open any Suno song — or the Suno create page — and a little badge appears showing how much
the lyrics "reek of AI" — e.g. "56% AI". Click it to see *why*: which clichés and stock
phrases show up, how predictable the rhymes are, how repetitive the vocabulary is, and how
the lyrics compare to a corpus of real human songs vs. AI-generated ones.

Then actually fix it. One tap rewrites the sloppiest lines to read more human — swapping
tired clichés for fresher words and breaking up the stock structures AI loves to repeat —
all on your device, with no account and no internet. On the Suno create page it edits the
lyrics box in place, so you can humanize a draft before you generate.

It's a playful vibe-meter and a craft mirror, NOT a personal attack or a judgement of any
songwriter. Using AI to make music is completely fine. A high score doesn't mean a song is
bad; plenty of beloved human songs score high because the AI was trained on songs like them.

Privacy by design:
• Runs ONLY on suno.com song pages and the suno.com create page.
• Reads ONLY the lyrics text — nothing else on the page, no account, no other tabs.
• 100% on-device. No network requests, no tracking, no data stored or sold.

Open source: https://github.com/PotentiallyHuman/suno-slop-detector
Firefox add-on: https://addons.mozilla.org/en-US/firefox/addon/suno-slop-detector/

## Permission justification (for the review form)
- activeTab: lets the toolbar popup read the score that the content script already
  computed for the current Suno tab. No other use.
- Host access (https://suno.com/song/* and https://suno.com/create*): the content script
  must run on Suno song pages to read the lyrics, and on the create page to read and
  (when you press a Humanize button) rewrite the lyrics box. Scoped to those pages only.

## Data-use disclosures (Chrome "Privacy practices" form)
- Single purpose: rate how AI a Suno song's lyrics read, and help rewrite them to read more human.
- Does the extension collect user data? NO.
- All processing is local; nothing is transmitted. Privacy policy: link to the hosted
  PRIVACY.md (e.g. the GitHub raw URL).

## Screenshots needed (you provide — must be from a real page)
- 1280×800 (or 640×400): a Suno song page with the badge + expanded panel visible.
- The create page showing a Humanize button rewriting the lyrics box.
- Optional: the toolbar popup with a pasted lyric scored.
(Take these on one of your own songs — they can't be generated without a live page.)
