# How Humanize works — the honest design story

This tool started from a guess and was corrected, repeatedly, by data. We're keeping the
whole arc visible on purpose — including the dead ends — because that's how it was actually built.

## 1. What we first *expected* (and were wrong about)
Our first hypothesis was that AI lyrics give themselves away with **surface tells**: the word
"just", "not A, not B, just C" structures, triple repetition, stock cliché words. We built and
tested detectors for all of these. **They didn't separate AI from human** — real hit songs use
them constantly (Stevie Wonder, ABBA, the Stones). A clean disproof.

## 2. What the data actually said
The real signal is **typicality and structure**, not any single word:
- *Typicality* — how close the phrasing sits to a large bank of AI-generated lines.
- *Structure* — uniform line lengths, end-stopped perfect-rhyme couplets, heavy repetition.
The v5 model scores these. It's accurate (most real human songs read 0%), but it means a song's
"AI-ness" often lives in its **shape**, which you can't fix by swapping a word.

## 3. Two ways to enhance a song — by design
Because of that, Humanize is built in two tiers, most-human first:

**① Humanize (the human way).** It targets a **content-focused score** — we deliberately
*discount the structural weights* so the model listens to *what the song says*, not how it's
formatted. Then it swaps generic, abstract, clichéd content for **concrete, specific, human**
content. This is the kind of edit a careful writer makes: same song, sharper words. It can't
(and shouldn't) rewrite the song's bones.

**② De-AI'fy (the aggressive way).** When Humanize is tapped out, this red button is allowed to
change **more** — ideas, themes, and structure — trading some "faithfulness to the original" for
**maximum distance from AI patterns**. It's less about staying human and more about being
**unique** — and unique reads as not-AI.

## 4. What's honestly hard (and why)
- A saturated, structurally-regular song can't be pulled down by word swaps alone — the AI-ness
  is in the structure. The meter will tell you so, and point you at the lever (vary line lengths,
  break a repeated chorus, let a line run past the rhyme).
- The replacement content is only as good as the examples it's mined from: **if a replacement
  reads as AI as what it replaced, the catalog was built from the wrong examples.** The pool is
  being rebuilt from the *most-human, least-AI* lines so every swap truly moves the needle.
- Everything runs **100% on-device** — no network, no LLM, no data leaves your phone/browser.
  That's a hard constraint, and it's why the deep rewriting is guided rather than generated.

## 5. Where it stood (measured) — superseded by §6
On 100 AI songs, the content-humanizer (catalog version) took the average content-score from
**72% → 48%**, and **52% of songs reached ≤25%**. The other half didn't move — and the planned
"catalog rebuild" never closed that gap, because the approach itself was the ceiling (see §6).

## 6. The freestyle rebuild (v0.7, 2026-06-11) — the design that shipped
The catalog/pool approach hit two walls, honestly:
- **Word swaps can't fix structure**, and structure is half the score (§4 said so already).
- **Transplanting whole lines from a pool** broke songs a worse way: a pool line carries its
  own song's topic with it, so a love song suddenly mentions "Bayou Jubilee". Caught by a user
  on the phone build. Transplant was a dead end — a line must be *made for* the song, not
  *found and pasted into* it.

So the Humanize buttons were rebuilt around **generation under constraints** — the freestyle
method: lock the **end rhyme first**, build the line **backward** word-by-word to the syllable
target, steer every word choice toward the **song's own theme vector**. Then a quality shell
rejects everything that isn't craft:
1. **Cliché-free vocabulary by construction** — the detector's 125-word AI-cliché blocklist is
   excluded from the model vocabulary at build time. (NOT a humanness threshold — that wrongly
   keeps "dream" and drops "coffee". The explicit blocklist is the right filter.)
2. **The grammar professor** — a candidate is kept only if its whole-line part-of-speech
   structure equals a real human line's structure (+ no repeated word-pair, no but/or opener).
   This is what makes lines complete standalone thoughts instead of fragments.
3. **Anti-copy** — any 4 consecutive corpus words = rejected (FNV-1a hashes). Nothing is ever
   reproduced from a real lyric.
4. **The v8 gate** — a rebuilt line is kept only if the song's AI% doesn't rise. A press can
   only improve the song or do nothing.

Two UI modes, both on every surface (extensions, PWA, Android): **Humanize Line** = the single
worst line per click, worst-first; **Humanize Rewrite** = the worst half in one press, keeping
the better half the user's own words. Measured at 3000-line scale: **99% grammar-clean, 100%
rhyme-correct, 98% syllable-within-2, 0 clichés** — and interaction-audited on each surface
(simulated presses to convergence on real AI songs: never worsens, never throws, never
silently does nothing).

A phone-size LLM was cheap-tested for the same job and **lost**: ban the clichés it leans on
and it collapses (2/3 of lines produced nothing). The n-gram + constraints generator is the
better on-device writer once slop is forbidden.


## 7. v1.0 — the two-tier surgeon (2026-06-12)
The generator chapter (§6) ended honestly: the n-gram writes grammatically but cannot mean.
v1.0 retires it from the press path and replaces it with two deterministic tiers, each owning
the failure mode the other can't fix:

**Tier 0 — word surgery.** The user's sentence is the frame; only the cliché word changes,
from a hand-curated table where every substitute is corpus-validated against BOTH corpora.
The validation caught the trap a human curator falls into: modern AI's slop is CONCRETE
(quiet, salt, porch, kitchen are on AI's own overused list), so "just be more specific" picks
launder it back in. 20/20 examples accepted in human audit.

**Tier 1 — structure surgery.** Leave-one-out ablation over the full AI corpus (the user's
design: remove each line, score the fork, the biggest drop is the guilty line) proved the
molds: "Every X…" opens 48 of the top-100 guilty lines; maybe-pairs, too-too and
not-not-just follow. Each mold gets a DESIGNED transform that keeps 100% of the user's words
("Maybe I stay broke, maybe I stay small" → "I stay broke, I stay small"). The frame variants
are themselves corpus-validated — the first design ("The last X", "One more X") turned out to
be AI's own favorite openers (4–12× AI-leaning) and was replaced by That/This/Some +
Perhaps/Could-be, which humans use and AI doesn't. A transform fires only when the song reads
≥55% AI and removing that exact line provably drops this song's score (the ablation runs
inside the app, per press).

**When neither applies**, the app measures the song's neighborhood grammar (AI stamps line
lengths and couplet rhyme, 26–29% of adjacent pairs vs human 20%, while humans repeat openers
2× more) and tells the user their dominant tell with their own numbers — it never edits an
innocent line to move a meter that is blind to words anyway.
