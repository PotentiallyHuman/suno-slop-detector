#!/usr/bin/env python3
"""Mine Grok-generated song lyrics into corpus/models/grok.json via the xAI API.

Design choices:
- NATURAL user-style prompts (varied topic/genre/persona/mood) so the songs look
  like real AI slop a normal user would get -- NOT craft-engineered, which would
  make them less AI-like and corrupt the training data.
- Single call per song (grok-3, flagship realism, ~$0.015/call).
- Live cost tracking via response usage.cost_in_usd_ticks (1e9 ticks = 1 USD).
  Hard stop at BUDGET_USD; the account itself also hard-stops at $0.
- Aggressive bloat-stripping + audit (reject refusals/too-short/dupes).
- Incremental save after every accept, so a crash loses nothing.
"""
import json, os, re, sys, time, random, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, "corpus/models/grok.json")
KEY  = os.environ.get("XAI_API_KEY", "")
MODEL  = os.environ.get("GROK_MODEL",  "grok-3")   # phase 1: fast / light reasoning
MODEL2 = os.environ.get("GROK_MODEL2", "grok-4")   # phase 2: stronger / "think longer"
BUDGET_USD = float(os.environ.get("GROK_BUDGET", "4.60"))
SWITCH_AT  = float(os.environ.get("GROK_SWITCH", "0.5"))  # spend fraction to switch model
GAP = float(os.environ.get("GROK_GAP", "1.0"))
URL = "https://api.x.ai/v1/chat/completions"

if not KEY:
    print("no XAI_API_KEY", flush=True); sys.exit(1)

# ---- variety banks (natural-user phrasing) --------------------------------
GENRES = ["pop","country","indie folk","R&B","trap","rock","synthpop","gospel",
          "punk","soul","singer-songwriter","emo","bluegrass","reggae","disco",
          "lo-fi","alt rock","ballad","hip-hop","americana","dream pop","blues"]
THEMES = ["heartbreak","a long road trip","missing someone who moved away",
          "growing up in a small town","falling in love at a party","losing a parent",
          "summer ending","a city at 3am","an old photograph","working a dead-end job",
          "a friend who changed","moving to a new city","a rainy Sunday","forgiveness",
          "chasing a dream","an ex you still think about","being broke but happy",
          "a wedding day","the ocean","insomnia","getting sober","a first apartment",
          "your hometown","a breakup text","dancing alone in the kitchen","faith",
          "a road you keep driving","saying goodbye at an airport","a childhood home",
          "running away","coming back home","a midnight phone call","being misunderstood",
          "the last day of school","a long-distance relationship","starting over",
          "a funeral","a new baby","quitting your job","driving with the windows down"]
PERSONAS = ["", "", "", "from a teenager's point of view","from an old man's point of view",
            "from a single mother's point of view","from a soldier's point of view",
            "from a bartender's point of view","like a diary entry","from someone in love",
            "from someone who just got dumped"]
BATCH = int(os.environ.get("GROK_BATCH", "4"))
DELIM = "@@@NEXT-SONG@@@"
SPLIT_RE = re.compile(r"^\s*@+\s*NEXT[- ]?SONG\s*@+\s*$|^\s*@{3,}\s*$", re.I)
# fallback splitter if the model ignores the delimiter
NUMHEAD_RE = re.compile(r"^\s*(?:song|#)\s*\d+\s*[:.\)]?\s*$", re.I)

def make_spec():
    g = random.choice(GENRES); t = random.choice(THEMES); p = random.choice(PERSONAS)
    p = (" " + p) if p else ""
    return g, t, p

def make_batch_prompt():
    specs = [make_spec() for _ in range(BATCH)]
    lines = ["Write %d completely different full-length songs, one per request below. "
             "Each song must be complete, like a real radio song: at least three verses "
             "and a repeated chorus. For each, write only the song lyrics -- no titles, "
             "no section labels like Verse or Chorus, no commentary. Separate each song "
             "with a line that is exactly:\n%s\n" % (BATCH, DELIM)]
    for n, (g, t, p) in enumerate(specs, 1):
        lines.append("%d. A %s song about %s.%s" % (n, g, t, p))
    subjects = ["%s / %s" % (g, t) for g, t, p in specs]
    return "\n".join(lines), subjects

def split_batch(text):
    # primary: split on the explicit delimiter line
    chunks = re.split(r"(?im)^\s*@+\s*NEXT[- ]?SONG\s*@+\s*$|^\s*@{3,}\s*$", text)
    if len(chunks) < 2:
        # fallback: split on "Song N" / "N." headers on their own line
        chunks = re.split(r"(?im)^\s*(?:song\s*\d+|#?\d+)\s*[:.\)]\s*$", text)
    if len(chunks) < 2:
        chunks = [text]
    return [c for c in chunks if c and c.strip()]

# ---- cleaning / bloat removal ---------------------------------------------
SECTION = re.compile(r"^\s*[\(\[\*]{0,2}\s*(verse|chorus|bridge|pre[- ]?chorus|"
                     r"hook|intro|outro|refrain|interlude|coda|breakdown|tag|"
                     r"post[- ]?chorus)\b[^\n]*$", re.I)
PREAMBLE = re.compile(r"^\s*(sure|here(?:'s| is| are| you go)|of course|absolutely|"
                      r"certainly|i'd love to|i'll write|let me|okay|alright|"
                      r"title|song title|song|lyrics|\*\*title|hope you|i hope|"
                      r"feel free|this (?:song|is)|enjoy)\b", re.I)
REFUSAL = re.compile(r"\b(i can't|i cannot|i'm not able|i am unable|as an ai|"
                     r"i won't be able|i'm sorry, but)\b", re.I)

def clean(text):
    t = text.strip()
    # strip code fences
    t = re.sub(r"^```[a-z]*\n?", "", t); t = re.sub(r"\n?```\s*$", "", t)
    lines = [ln.rstrip() for ln in t.split("\n")]
    out = []
    for ln in lines:
        s = ln.strip()
        if not s:
            out.append(""); continue
        if SECTION.match(s):           # drop [Verse] / (Chorus) / **Bridge** lines
            continue
        # drop a leading title/preamble line only while we have no lyric yet
        if not any(out) and PREAMBLE.match(s):
            continue
        # drop a leading quoted/bolded title-only line
        if not any(out) and re.match(r'^["*_].*["*_]$', s) and len(s) < 60:
            continue
        out.append(ln)
    # drop trailing commentary lines ("I hope...", "This song...")
    while out and out[-1].strip() and PREAMBLE.match(out[-1].strip()):
        out.pop()
    res = "\n".join(out).strip()
    res = re.sub(r"\n{3,}", "\n\n", res)   # collapse blank runs
    # strip surrounding quotes if the whole thing is quoted
    if len(res) > 2 and res[0] in '"“' and res[-1] in '"”':
        res = res[1:-1].strip()
    return res

def audit(text):
    if not text or len(text) < 220: return "too short"
    if REFUSAL.search(text[:300]): return "refusal"
    if text.count("\n") < 6: return "too few lines"
    letters = sum(c.isalpha() for c in text)
    if letters < 150: return "not enough text"
    return None

def call(prompt, model):
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max(4000, 1200 * BATCH), "temperature": 1.0,
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={
        "Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)

# ---- load existing + dedup ------------------------------------------------
data = json.load(open(OUT)) if os.path.exists(OUT) else {"model":"grok","songs":[]}
songs = data.get("songs", [])
def keyf(s): return (s.get("lyrics","")[:80].lower().strip())
seen = set(keyf(s) for s in songs)
start_idx = max([s.get("index",0) for s in songs] + [0])
print("start: %d existing songs, next index %d" % (len(songs), start_idx+1), flush=True)

def save():
    data["songs"] = songs
    json.dump(data, open(OUT,"w"), ensure_ascii=False, indent=1)

spent = 0.0; made = 0; fails = 0; i = start_idx; calls = 0; switched = False
print("phase 1 model = %s (switch to %s at $%.2f)" %
      (MODEL, MODEL2, BUDGET_USD*SWITCH_AT), flush=True)
while spent < BUDGET_USD:
    model = MODEL if spent < BUDGET_USD*SWITCH_AT else MODEL2
    if model == MODEL2 and not switched:
        switched = True
        print(">>> switching to stronger model %s at $%.3f" % (MODEL2, spent), flush=True)
    prompt, subjects = make_batch_prompt()
    calls += 1
    try:
        resp = call(prompt, model)
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:200]
        if "credit" in msg.lower() or "spending limit" in msg.lower():
            print("BUDGET EXHAUSTED (account credits): %s" % msg, flush=True); break
        # an unavailable phase-2 model -> fall back to phase-1 model
        if model == MODEL2 and ("not found" in msg.lower() or e.code == 404):
            print("phase-2 model %s unavailable (%s); staying on %s" % (MODEL2, msg, MODEL), flush=True)
            globals()['MODEL2'] = MODEL; continue
        print("HTTP %s: %s" % (e.code, msg), flush=True); fails += 1
        if fails > 10: print("too many failures, stopping", flush=True); break
        time.sleep(3); continue
    except Exception as e:
        print("err: %s" % e, flush=True); fails += 1
        if fails > 10: break
        time.sleep(3); continue

    if "choices" not in resp:
        err = str(resp.get("error",""))
        if "credit" in err.lower() or "spending limit" in err.lower():
            print("BUDGET EXHAUSTED: %s" % err, flush=True); break
        print("no choices: %s" % err[:150], flush=True); fails += 1; continue

    cost = resp.get("usage",{}).get("cost_in_usd_ticks",0)/1e9
    spent += cost
    raw = resp["choices"][0]["message"]["content"]
    chunks = split_batch(raw)
    percall = cost/max(len(chunks),1)
    for n, ch in enumerate(chunks):
        i += 1
        lyr = clean(ch)
        subject = subjects[n] if n < len(subjects) else "grok"
        why = audit(lyr)
        if why:
            print("  skip (%s) %s" % (why, subject), flush=True); i -= 1; continue
        if keyf({"lyrics":lyr}) in seen:
            print("  skip (dup) %s" % subject, flush=True); i -= 1; continue
        seen.add(keyf({"lyrics":lyr}))
        songs.append({
            "model":"grok","source":"api","strategy":"natural-prompt","gen_model":model,
            "index":i,"subject":subject,"lang":"en","lyrics":lyr,"lyrics_en":lyr,
            "prompt":prompt,"cost_usd":round(percall,5),
        })
        made += 1
    save()  # incremental save after every batch
    print("[call %d via %s] +%d songs, total=%d, $%.3f/%.2f" %
          (calls, model, len(chunks), len(songs), spent, BUDGET_USD), flush=True)
    time.sleep(GAP)

save()
print("DONE: made %d this run, %d total in corpus, spent $%.3f in %d calls" %
      (made, len(songs), spent, calls), flush=True)
