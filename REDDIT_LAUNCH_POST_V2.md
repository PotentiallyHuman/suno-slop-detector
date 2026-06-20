# r/SunoAI repost v2 — "the cliché game" (post ~1 week after the v1 removal)

## Why this version (grounded in reading the top threads' COMMENTS)
The top lyrics threads on r/SunoAI all run on ONE of two engines, and v1 used neither:
1. THE CLICHÉ GAME — "Suno lyrics be like" (493▲) and the "I WRITE MY OWN LYRICS" meme (306c)
   are wall-to-wall people RIFFING in AI clichés ("echoes of neon shadows", "whispers of neon
   lights", "my lyrics are heartbeats of all you"). They compete to write the most AI line. They
   already KNOW the tells — one top comment: "only people in this community understand those are
   generic phrases." The tool's whole domain (cliché detection) IS their in-joke.
2. VALUE DUMP + PROOF — "secret trick dump" (254c): a generous structured tips post → comments are
   "I tried it, it's FIRE." Generosity earns experiment-and-share engagement.
ANTI-PATTERN to avoid: the top comment in the meme thread (140▲) is "Nothing ruins a hobby like a
   subreddit for a hobby." This sub HATES gatekeeping/judging. A "score how AI your slop is" framing
   reads as policing → scroll-past. v1 also led with a promo link → Rule-6 removal. Fix BOTH: lead
   with the value (the tells), frame it as a self-deprecating GAME, bury the tool in a comment.

## Title (pick one — both are value/game, zero promo)
A) I trained a thing on 2,000 human songs + a pile of Suno songs to find the exact phrases that make lyrics read as "AI". Here are the top 25 tells. How many did you use this week? (I used most of them.)
B) The 25 phrases that instantly out your lyrics as AI — measured, not vibes. Score yourself.

## Body (plain text, no markdown asterisks — Reddit rich editor shows them literally)
I got obsessed with a dumb question: can you actually MEASURE how "AI" a set of lyrics reads, instead of just vibing it? So I trained a little model on 2,000 real human songs and a stack of Suno/ChatGPT/Claude/etc. lyrics and had it rank what separates them.

It is NOT what I expected. It's barely about clichés like "neon lights" — the single biggest tell is PREDICTABILITY: AI picks the most likely next word so consistently that the lyrics flatten out. The phrase-clichés are just the visible tip.

Here's the visible tip — the 25 that lit up hardest (be honest, count yours):

Stock imagery
• neon lights / city lights / streetlights
• shadows dance / dancing shadows
• whisper in the wind
• echoes (in the night / of the past)
• rise from the ashes / like a phoenix
• on the horizon / chasing the horizon
• concrete jungle, painted skies
• fire in my veins, frozen in time, weight of the world
• demons in my head, calm before the storm

Sentence shapes (the real giveaway)
• "not A, not B, just C"
• "it's not A, it's B"
• "maybe X, maybe Y"
• "every X, every Y"
• anaphora: "in the shimmer, in the ___"

Single-word tells (highest AI-vs-human lift)
• night (86x), light (71x), sky (58x), maybe (56x), quiet (55x), love (55x), heart (53x), time (50x)

The funny part the model confirmed: plenty of BELOVED human songs score high too — the AI learned from songs like them. So a high score doesn't mean "bad," it means "predictable." It's a mirror, not a verdict. I scored my own catalog and ate a fat slice of humble pie.

So — drop your most accidentally-AI line in the comments. Bonus points if it hits 4+ of the list. I'll start: [your real example line here].

(I turned the scorer into a free, on-device thing if anyone wants to actually run it on their own lyrics — link in a comment so I'm not spamming the post.)

## First comment (the soft tool drop — post it yourself right after, NO beta ask)
Made it free + open-source, runs 100% on your device — no account, nothing leaves your browser. Puts a "% AI" badge on a Suno song's lyrics, tap to see which of these tells it caught, and one tap rewrites the sloppiest lines (kept my hooks + rhymes intact). Curious what your catalog scores.
Firefox: https://addons.mozilla.org/en-US/firefox/addon/humanize-ai-slop-lyrics/
Chrome: https://chromewebstore.google.com/detail/lcgafecacefmkhckbkjchlbgibfhbnke
Code: https://github.com/PotentiallyHuman/suno-slop-detector

(Phone version exists too — happy to send it if anyone asks, but no pressure, the browser one is the easiest way to try it.)

## NOTE on the beta-tester narrative (per user 2026-06-17)
DROPPED from the post AND the lead comment. The post sells what the community WANTS (the tells list +
the cliché game + a free mirror), not what WE need (testers). The Android closed test still needs ~12
testers for Google — but that recruitment now happens ORGANICALLY in DMs, only with people who already
tried it and liked it. Never lead with the ask; lead with the value, let the ask follow the interest.

## IMAGES (all built + AUDITED 2026-06-17, ready)
1. store/reddit_0_tells.png — the "25 tells" value graphic (1080x1080, on-brand dark, NO beta ask).
   THIS is the post's lead image — it's the value, it's save-able, it carries the predictability hook.
2. store/reddit_1_feedback_panel.png — a slop line reading 99% AI in the real compact panel (before).
3. store/reddit_3_after_chaos.png — same after Chaos: 2% AI, "rhymes + hooks kept". The money shot.
Put #1 on the POST. Put #2→#3 (before/after) in the TOOL COMMENT as proof it does something.
All three match the shipped v1.0.1 UI / real model output (audited per the screenshot rule).

## Engagement mechanics this version triggers (vs v1)
- Invites the cliché-game reply chain (the 493▲/306c engine) → comments = upvotes = reach.
- Self-deprecating ("I used most of them", "humble pie") → disarms the anti-gatekeeping crowd.
- Leads with a SAVE-able value list (the trick-dump engine) → shares.
- Tool is a comment, not the post → dodges Rule-6 promo removal AND the "this is an ad" scroll-past.
- The "predictability not clichés" reveal is a genuine non-obvious finding → credibility hook.

## Risk note
Still self-promo-adjacent (link in comments). Mods may still remove; that's acceptable per the
declicker-funnel strategy. But even if removed, a value/game post earns comments BEFORE removal,
and the removal itself drives the DM curiosity. v1 earned ~0 because it was a pitch; v2 earns the
chain first.
