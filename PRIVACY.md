# Privacy Policy — Suno Slop Detector

_Last updated: 2026-05-30_

**Short version: this extension collects nothing, sends nothing, and stores nothing.**

## What it accesses
- It runs **only** on pages whose address starts with `https://suno.com/song/`. It does
  nothing on any other website.
- On those pages it reads the **text of the lyrics box only** (a single paragraph
  element). It does not read your account, your other tabs, comments, page metadata, or
  anything else on the page.

## What it does with that text
- The lyrics text is analyzed **entirely on your own device**, in memory, to compute a
  score. The analysis is local JavaScript shipped inside the extension.
- The text is **discarded** as soon as the score is computed. It is never written to
  disk, saved, or remembered between page loads.

## What it does NOT do
- **No network requests.** Nothing is uploaded or sent anywhere.
- **No tracking, analytics, cookies, fingerprinting, or advertising.**
- **No personal data collection.** No accounts, no identifiers.
- **No data sharing or selling** — there is nothing to share or sell.

## Permissions
- `activeTab` — lets the toolbar popup ask the current Suno song tab for the score it
  already computed. Nothing more.

## Contact
Questions or issues: open an issue at
<https://github.com/PotentiallyHuman/suno-slop-detector>.

This is a hobby project provided "as is" for entertainment. The score is a heuristic, not
a judgement of any songwriter — see the README.
