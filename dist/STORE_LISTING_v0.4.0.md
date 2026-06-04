# Store listing — Suno Slop Detector v0.4.0

## Name
Suno Slop Detector

## Summary / short description (≤132 chars — Chrome)
Scores how AI a Suno song's lyrics read with a trained model, plus craft feedback. Reads only the lyrics box. For fun. And spite.

## Category
Fun / Developer Tools

## Full description
Open a song on suno.com and a little pill appears top-right with one honest number — how much the lyrics read like AI slop (0–100%). Click it for a craft-coach panel: what the song does well, one creative move to try, and what to work on. A one-click **Humanize** pass mechanically de-clichés a pasted lyric.

100% on-device. Text-only. No network, no accounts, no tracking. It reads **only** the lyrics box on a `suno.com/song/…` page and analyses nothing anywhere else.

This is a playful mirror, not a courtroom. The score rates lyrical *texture*, not talent or worth — using AI to make music is completely fine. Plenty of beloved human songs score high (they share vocabulary with the AI trained on them) and careful AI-assisted writing scores low. Don't use it to harass or shame anyone.

## What's new in 0.4.0
- **Bigger, cleaner training corpus** mined from the real tools people use: Grok, Claude, Gemini, ChatGPT, and Suno.
- **Retrained model** — 5-fold cross-validation 86.6% (up from 82.8%), with the feature mix chosen by a leave-one-generator-out study so it generalizes to *new* AI tools instead of memorizing one.
- **Punchier Humanize** — one click now lands several targeted de-clichéing edits with a visible before→after.
- Still on-device, text-only, no network. No copyrighted lyrics are stored or shipped.

## Privacy
No data collected. No data shared. No network requests. All analysis runs locally in the browser. Privacy policy: see PRIVACY.md in the repo.

## Permissions justification
- Host access to `suno.com` only: to read the lyrics text on a song page so it can be scored locally. Nothing is sent anywhere.
