# AI Lyrics Corpus Analysis

Corpus: **45 AI songs** across 3 models — chatgpt (15), claude-opus (15), qwen-2.5-14b (15). Human anchors: 8.

Focus: vocabulary, recurring phrases, syntactic tics, and segment structure. All compared across models.

## 1. Segment structure

| model | avg sections/song | section types (most common) | repeated-line ratio |
|---|---|---|---|
| chatgpt | 7.7 | chorus×37, verse×33, pre-chorus×20, bridge×14, outro×8 | 0.27 |
| claude-opus | 3.3 | verse×24, chorus×16, bridge×9 | 0.02 |
| qwen-2.5-14b | 6.9 | verse×37, chorus×36, bridge×15, outro×15 | 0.25 |

## 2. Most overused AI words (top 30 of 100)

Ranked by how many of the 45 songs use them. "lift" = how much more often than in human anchors.

| # | word | songs | models | lift | chatgpt | claude-opus | qwen-2.5-14b |
|---|---|---|---|---|---|---|---|
| 1 | every | 31/45 | 3/3 | 2.2× | 13 | 5 | 13 |
| 2 | through | 25/45 | 3/3 | 2.9× | 10 | 4 | 11 |
| 3 | light | 22/45 | 3/3 | 71.3× | 11 | 4 | 7 |
| 4 | night | 21/45 | 3/3 | 86.2× | 7 | 4 | 10 |
| 5 | still | 21/45 | 3/3 | 1.2× | 8 | 6 | 7 |
| 6 | time | 21/45 | 3/3 | 49.7× | 10 | 4 | 7 |
| 7 | quiet | 20/45 | 3/3 | 54.7× | 9 | 1 | 10 |
| 8 | one | 18/45 | 3/3 | 0.6× | 7 | 6 | 5 |
| 9 | love | 18/45 | 3/3 | 54.7× | 8 | 4 | 6 |
| 10 | never | 18/45 | 3/3 | 0.3× | 5 | 9 | 4 |
| 11 | little | 17/45 | 3/3 | 2.5× | 10 | 3 | 4 |
| 12 | morning | 17/45 | 3/3 | 1.9× | 6 | 7 | 4 |
| 13 | go | 17/45 | 3/3 | 0.7× | 6 | 7 | 4 |
| 14 | old | 16/45 | 3/3 | 1.9× | 5 | 4 | 7 |
| 15 | know | 16/45 | 3/3 | 1× | 5 | 7 | 4 |
| 16 | back | 16/45 | 3/3 | 0.6× | 7 | 4 | 5 |
| 17 | day | 16/45 | 3/3 | 49.7× | 6 | 4 | 6 |
| 18 | home | 15/45 | 3/3 | 0.7× | 10 | 2 | 3 |
| 19 | sky | 15/45 | 3/3 | 58× | 10 | 2 | 3 |
| 20 | heart | 15/45 | 2/3 | 53× | 5 | 0 | 10 |
| 21 | left | 15/45 | 3/3 | 39.8× | 6 | 4 | 5 |
| 22 | world | 15/45 | 3/3 | 39.8× | 4 | 2 | 9 |
| 23 | eyes | 15/45 | 2/3 | 1.1× | 6 | 0 | 9 |
| 24 | hands | 15/45 | 3/3 | 33.2× | 5 | 4 | 6 |
| 25 | maybe | 14/45 | 3/3 | 56.4× | 10 | 1 | 3 |
| 26 | name | 14/45 | 3/3 | 48.1× | 7 | 3 | 4 |
| 27 | each | 14/45 | 3/3 | 46.4× | 1 | 1 | 12 |
| 28 | dark | 14/45 | 3/3 | 39.8× | 5 | 2 | 7 |
| 29 | made | 14/45 | 3/3 | 1.1× | 8 | 2 | 4 |
| 30 | shadows | 14/45 | 3/3 | 34.8× | 2 | 2 | 10 |

→ full 100 in `analysis/ai_words_top100.json`

## 3. Syntactic cliché patterns

| pattern | songs | hits | example |
|---|---|---|---|
| simile 'like a ...' | 17/45 | 29 | like a |
| 'chasing/under the <sky-word>' | 5/45 | 5 | beneath the sky |
| rhetorical 'I don't know where/why' | 4/45 | 10 | I don't know why |
| anaphora: 'carry the X, carry the Y' | 3/45 | 9 | In the shimmer, in the |
| 'every X, every Y' | 2/45 | 3 | Every mystery's a doorway, every page |
| 'I learned X from Y' | 2/45 | 2 | I learned love from |
| 'too A to B' | 2/45 | 2 | too vast to miss |
| not A, not B, just/but C | 1/45 | 1 | not a fire, not a lantern, but |
| 'maybe ... maybe ...' | 1/45 | 1 | Maybe he's a lion, maybe |
| 'half X, half Y' | 1/45 | 1 | half in my head, half |
| I'm not A, I'm (just) B | 0/45 | 0 |  |
| it's not A, it's B | 0/45 | 0 |  |
| fingers/hands trace | 0/45 | 0 |  |
| trace the <noun> | 0/45 | 0 |  |
| 'in the dead/middle of the night' | 0/45 | 0 |  |

## 4. Recurring multi-word phrases (across ≥3 songs)

| phrase | songs | models | count |
|---|---|---|---|
| the morning | 11 | 3 | 23 |
| the dark | 11 | 3 | 19 |
| the night | 10 | 3 | 25 |
| through the | 10 | 3 | 22 |
| the world | 10 | 3 | 11 |
| used to | 9 | 3 | 13 |
| the same | 8 | 3 | 19 |
| there's a | 6 | 3 | 19 |
| your name | 6 | 3 | 13 |
| a place | 6 | 3 | 9 |
| the city | 6 | 3 | 9 |
| in the dark | 6 | 3 | 9 |
| a stranger | 6 | 3 | 7 |
| i never | 6 | 3 | 7 |
| morning light | 6 | 3 | 6 |
| before i | 5 | 3 | 10 |
| soft and | 5 | 3 | 7 |
| his name | 5 | 3 | 6 |
| i found | 5 | 3 | 6 |
| starts to | 5 | 3 | 5 |
| a quiet | 4 | 3 | 7 |
| of every | 4 | 3 | 7 |
| the room | 4 | 3 | 5 |
| the cold | 4 | 3 | 5 |
| we talked | 4 | 3 | 4 |
| the warmth | 4 | 3 | 4 |
| the lid | 4 | 3 | 4 |
| the way | 4 | 3 | 4 |
| felt like | 4 | 3 | 4 |
| found a | 3 | 3 | 5 |

## 5. Distinctive imagery words (high AI-vs-human lift)

night (86.2×), light (71.3×), sky (58×), maybe (56.4×), quiet (54.7×), love (54.7×), heart (53×), time (49.7×), day (49.7×), name (48.1×), each (46.4×), rain (44.8×), said (44.8×), left (39.8×), world (39.8×), dark (39.8×), place (39.8×), shadows (34.8×), hands (33.2×), felt (33.2×), story (31.5×), open (31.5×), free (31.5×), face (31.5×), inside (31.5×), way (29.8×), beneath (29.8×), something (28.2×), once (28.2×), bright (28.2×)

## 6. Per-model fingerprint (words each model over-uses vs the others)

- **chatgpt**: star, sometimes, thunder, spell, mara, looking, block, he's, jar, brass
- **claude-opus**: grey, good, windowsill, neon, alright, nine, ghost, miles, she's, quit
- **qwen-2.5-14b**: whispers, grace, dance, embrace, pages, meet, here's, re, stories, lies
