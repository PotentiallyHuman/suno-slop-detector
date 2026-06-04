# v5 model — retrain results, red-team, and extension-integration handoff

_Authored 2026-06-05. Supersedes the v0.4.x `combined_model.json` for the detector. The
trained artifact is `corpus/model_v5.json`. The extension is **not yet wired** to it — see
§5 for the integration steps (deliberately left for review; behaviour-changing)._

## 0. v5.1 update (2026-06-05, calibrated)
The shipped `corpus/model_v5.json` is the **v5.1** model: ultra-rare dense features (<1%
prevalence, incl. the `s_halfXHalfY` +40 offender) **pruned at the source** + moderate L2 (1e-3),
and a **calibrated decision threshold of 0.55** baked into the JSON (`threshold` field), chosen by
an out-of-fold sweep. Net: **87.9% acc, human false-positive 9.8%** (down from 13.5%), recall 85%,
attribution **86.2% argmax / 94.2% when confident** (honest, per-fold banks). The reference scorer
`analysis/score_v5.js` loads the artifact and applies the threshold + **gated attribution** (a
human song gets verdict "human" and no model named) — it is the spec for the browser engine.
Watch-items: `s_negNegPos` −14.6 and `f_numeralDensity` −14.3 weights are larger than ideal but
generalize (89.9% unseen-human recall). Numbers in §2/§3 below are the pre-calibration v5.0 run.

## 1. What changed vs the old model
The old model couldn't separate AI Suno songs from human hits (it scored your AI song 16% and
Bohemian Rhapsody 14% — indistinguishable). Root cause: the AI training corpus was skewed
(Grok-heavy from API convenience, concrete/craft-prompted, no Gemini), so it learned
"AI = concrete/crafted" and generic Suno slop read as human.

Fixes in v5:
- **Corpus reweighted to real-world tool usage** (per `project_28_corpus_weighting`):
  ChatGPT 35 / Suno 30 / Gemini 12 / Claude 12 / Grok 5. Done with **per-song loss weights**
  (data too scarce to subsample to ratio), applied to both the loss and the phrase bank.
- **Gemini added** (58 songs) → 5-way attribution. **English-only filter** (drops the foreign
  ChatGPT songs). **All Claude kept** (user decision — the craft-prompted concreteness is a
  deliberate hard-positive).
- **New feature: typicality** — the share of a song's 3-word phrases that recur in the AI phrase
  bank ("how close it sits to the AI corpus" — the founding idea in `corpus/STRATEGIES.md`,
  made explicit). This is the single strongest new signal (held-out, subject-disjoint
  Cohen's d ≈ 1.03).
- New structural detectors logged too (`analysis/portability_tells.js`): filler-"just",
  contraction-aware negation-anaphora, self-qualify. (Weak/mixed — see §3.)
- **Training method:** AI fixed (~2,000), human fetched live (lrclib + lyrics.ovh), 4,750
  English humans; generalization checked on humans never trained on.

## 2. Results (5-fold CV, 2,043 AI vs 4,750 human)
| | accuracy | precision | recall |
|---|---|---|---|
| without typicality | 79.6% | 64.9% | 69.7% |
| **with typicality** | **85.7%** | **72.8%** | **83.8%** |

- **Generalization:** trained on 2,000 humans → **89.9% of 2,750 *unseen* humans** correctly
  called human.
- **Human false-positive rate: 13.5%** at threshold 0.5 (see §3 — tune the threshold).
- **Attribution (5-way):** 86.3% argmax; **92.8% accurate when confident, 80% coverage**
  (abstains as "model uncertain" otherwise). *Optimistic — see §3.*

Reference songs, **old → new** (% AI):
| song | old | new | note |
|---|---|---|---|
| Bohemian Rhapsody (Queen) | 0% | **0%** | human, correct |
| Baby (Justin Bieber) | 0% | **0%** | human, correct |
| the annoying AI Suno song | 16%* | **100%** | caught (*old BoW head; combined head was 0%) |
| "Dear Claude" (AI, humanized) | 0% | **100%** | correctly caught even though hand-tuned to dodge |

## 3. Red-team findings (READ BEFORE SHIPPING)
1. **FIXED — overfit artifact.** With weak L2 (3e-4), `s_halfXHalfY` got a **+40 weight** while
   firing in only 0.6% of AI / 0.1% of human songs — it would have slammed any "half X, half Y"
   song to 100%. Fixed by raising L2 to 1e-2; top weight is now a sane +6.7 and weights are
   distributed (`typ_ai` +5.76 is among the leaders). This cost ~5 pts accuracy (90→86%) but the
   model is now robust, not memorizing.
2. **MUST FIX IN THE EXTENSION — gate attribution behind the AI verdict.** The attribution heads
   are one-vs-rest among AI models; they never saw human songs, so they *always* name a model.
   Ungated, the model says *"Bohemian Rhapsody = Suno 90%"* — nonsense on a human song. The live
   card must compute the binary AI score first and **only show / run attribution when
   P(AI) ≥ threshold**; below that show "likely human-written," no model.
3. **13.5% human false-positive** at 0.5 is high for comfort. It's a deployment knob, not a
   retrain: raise the decision threshold (e.g. ~0.6–0.7) to cut false-positives at some recall
   cost. Recommend exposing/΅choosing this in the extension. (The README already warns "plenty of
   beloved human songs score high.")
4. **Optimistic CV caveats (the shipped model is fine; only the accuracy *estimate* is inflated):**
   the typicality and attribution CV reuse phrase banks built on all AI, so they leak slightly.
   The unbiased typicality signal was confirmed separately (subject-disjoint d≈1.03). The honest
   attribution estimate is somewhat below 86%.
5. **Weak features kept for completeness:** `px_negAnaphora` +2.18 (mild AI), `px_just` ≈ −0.2,
   `px_selfQualify` −0.58 (mild human — confirms humans self-qualify too), `s_imNotImB` +0.21.
   The "not A, not B, just C" family is a weak/mixed signal; **typicality carries the day.**
6. **Human corpus = famous hits** (older). Part of the human↔AI gap is era/genre; a contemporary
   amateur-human set would test robustness further.

## 4. The artifact — `corpus/model_v5.json` (~1.1 MB)
```
{ vocab, denseNames, denseMean, denseStd,
  binary:      { wBow, wDense, bias },              // Stage 1: P(AI)
  attribution: { suno|claude|grok|chatgpt|gemini: { wBow, wDense, bias } }, // Stage 2
  aiBank:      [ ...8000 trigrams ],                // for typ_ai
  modelBanks:  { suno:[...1500], ... },             // for typ_<model>
  usage, nAI, nHuman, cnt }
```

## 5. Extension integration (NOT done — behaviour-changing, left for review)
Today the extension scores via `src/ext/model.js` (auto-generated by `build/gen_model.js` from
`combined_model.json`) and **does not compute trigrams/typicality** in-browser. To ship v5:
1. **Port feature computation to the content script:** the dense vector now needs `typ_ai` and
   `typ_<model>` = fraction of the song's 3-grams present in the shipped banks. Add a trigram
   builder + Set lookups against `aiBank` / `modelBanks`. (Also the `px_*` detectors from
   `analysis/portability_tells.js` if you want them.)
2. **Update `build/gen_model.js`** to emit `model_v5.json`'s structure (binary + attribution +
   banks) into `src/ext/model.js`.
3. **Two-stage scoring + gating (§3.2):** P(AI) from `binary`; if `P(AI) ≥ threshold`, run the 5
   attribution heads, pick the top, and show it only if `top ≥ 0.5 && top − second ≥ 0.15`, else
   "model uncertain." Card reads e.g. **"78% AI · likely ChatGPT (84%)"** or **"…· model uncertain."**
4. **Threshold:** consider default 0.6 to tame the 13.5% FP.
5. **Bundle size:** `model_v5.json` is ~1.1 MB (gzips well). Confirm it's acceptable; if not, cap
   `aiBank` smaller (currently 8,000 trigrams).
6. **Version bump → 0.5.0** in `manifest.json` AFTER the above. Watch the two known traps:
   Chrome rejects `description` > 132 chars; `build_www` `JS_ORDER` is hardcoded — add any new JS
   or the build ships stale code silently.
7. Repackage with `build/package_chrome.sh`; store submission is done separately (mouse/keyboard).

## 6. Files
- `analysis/finalize_v7.js` — fits the final model + exports `corpus/model_v5.json` + re-scores.
- `analysis/train_v7.js` — the 3-round (rotating-human) training rig (CV reporting).
- `analysis/portability_tells.js` — typicality + the structural detectors.
- `analysis/{train_v5,train_v6,run_tells_compare,show_human_hits}.js` — the investigation trail.
