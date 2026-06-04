#!/usr/bin/env python3
"""Claude lyrics generator via the bare Anthropic Messages API.

CLEAN BY DESIGN: no `system` prompt, a single user message, no prior turns ->
zero influence from Claude Code memory / personality / CLAUDE.md, and minimal
input tokens. Same realism rule as the others: NATURAL user-style prompts, not
craft-engineered ones (polishing makes AI songs less AI-like).

Key: ANTHROPIC_API_KEY (env or ~/.openclaw/secrets.env). Cost tracked from
usage tokens; hard-stop at CLAUDE_BUDGET. Batch-4 full-length, bloat-cleaned,
deduped, incremental save to corpus/models/claude.json (tagged source=api-clean).

Usage: ANTHROPIC_API_KEY=... python3 build/claude_mine.py   (env: CLAUDE_MODEL, CLAUDE_BUDGET, GROK_BATCH)
"""
import json, os, re, sys, time, random, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, "corpus/models/claude.json")
KEY  = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")   # representative default
BUDGET_USD = float(os.environ.get("CLAUDE_BUDGET", "4.50"))
BATCH = int(os.environ.get("CLAUDE_BATCH", "4"))
GAP = float(os.environ.get("CLAUDE_GAP", "1.0"))
URL = "https://api.anthropic.com/v1/messages"

# approx USD per 1M tokens (input, output) — used only for the local budget cap
PRICE = {"claude-sonnet-4-6": (3.0, 15.0), "claude-haiku-4-5-20251001": (1.0, 5.0),
         "claude-opus-4-8": (5.0, 25.0)}
pin, pout = PRICE.get(MODEL, (3.0, 15.0))

if not KEY:
    print("no ANTHROPIC_API_KEY — set it in env or ~/.openclaw/secrets.env", flush=True); sys.exit(1)

GENRES = ["pop","country","indie folk","R&B","trap","rock","synthpop","gospel","punk","soul",
          "singer-songwriter","emo","bluegrass","reggae","disco","lo-fi","alt rock","ballad",
          "hip-hop","americana","dream pop","blues"]
THEMES = ["heartbreak","a long road trip","missing someone who moved away","growing up in a small town",
          "falling in love at a party","losing a parent","summer ending","a city at 3am","an old photograph",
          "working a dead-end job","a friend who changed","moving to a new city","a rainy Sunday","forgiveness",
          "chasing a dream","an ex you still think about","being broke but happy","a wedding day","the ocean",
          "insomnia","getting sober","a first apartment","your hometown","a breakup text","faith",
          "dancing alone in the kitchen","saying goodbye at an airport","a childhood home","starting over",
          "a funeral","a new baby","quitting your job","driving with the windows down","a midnight phone call"]
PERSONAS = ["","","","from a teenager's point of view","from an old man's point of view",
            "from a single mother's point of view","from a bartender's point of view","like a diary entry",
            "from someone in love","from someone who just got dumped"]
DELIM = "@@@NEXT-SONG@@@"

def make_batch_prompt():
    specs=[(random.choice(GENRES),random.choice(THEMES),random.choice(PERSONAS)) for _ in range(BATCH)]
    lines=["Write %d completely different full-length songs, one per request below. Each song must be "
           "complete, like a real radio song: at least three verses and a repeated chorus. For each, write "
           "only the song lyrics -- no titles, no section labels like Verse or Chorus, no commentary. Separate "
           "each song with a line that is exactly:\n%s\n" % (BATCH, DELIM)]
    for n,(g,t,p) in enumerate(specs,1):
        lines.append("%d. A %s song about %s.%s" % (n,g,t,(" "+p) if p else ""))
    return "\n".join(lines), ["%s / %s"%(g,t) for g,t,p in specs]

def split_batch(text):
    chunks=re.split(r"(?im)^\s*@+\s*NEXT[- ]?SONG\s*@+\s*$|^\s*@{3,}\s*$", text)
    if len(chunks)<2:
        chunks=re.split(r"(?im)^\s*(?:song\s*\d+|#?\d+)\s*[:.\)]\s*$", text)
    return [c for c in chunks if c and c.strip()] or [text]

SECTION = re.compile(r"^\s*[\(\[\*]{0,2}\s*(verse|chorus|bridge|pre[- ]?chorus|hook|intro|outro|refrain|"
                     r"interlude|coda|breakdown|tag|post[- ]?chorus)\b[^\n]*$", re.I)
PREAMBLE = re.compile(r"^\s*(sure|here(?:'s| is| are| you go)|of course|absolutely|certainly|i'd love to|"
                      r"i'll write|let me|okay|alright|title|song title|song|lyrics|hope you|i hope|"
                      r"feel free|this (?:song|is)|enjoy)\b", re.I)
REFUSAL = re.compile(r"\b(i can't|i cannot|i'm not able|i am unable|i won't be able|i'm sorry, but)\b", re.I)

def clean(text):
    t=text.strip()
    t=re.sub(r"^```[a-z]*\n?","",t); t=re.sub(r"\n?```\s*$","",t)
    out=[]
    for ln in t.split("\n"):
        s=ln.strip()
        if not s: out.append(""); continue
        if SECTION.match(s): continue
        if not any(out) and PREAMBLE.match(s): continue
        if not any(out) and re.match(r'^["*_].*["*_]$', s) and len(s)<60: continue
        out.append(ln.strip())
    while out and out[-1].strip() and PREAMBLE.match(out[-1].strip()): out.pop()
    res=re.sub(r"\n{3,}","\n\n","\n".join(out)).strip()
    if len(res)>2 and res[0] in '"“' and res[-1] in '"”': res=res[1:-1].strip()
    return res

def audit(t):
    if not t or len(t)<220: return "too short"
    if REFUSAL.search(t[:300]): return "refusal"
    if t.count("\n")<6: return "too few lines"
    return None

def call(prompt):
    body=json.dumps({"model":MODEL,"max_tokens":1200*BATCH,"temperature":1.0,
                     "messages":[{"role":"user","content":prompt}]}).encode()  # NO system field
    req=urllib.request.Request(URL,data=body,headers={
        "x-api-key":KEY,"anthropic-version":"2023-06-01","content-type":"application/json"})
    with urllib.request.urlopen(req,timeout=120) as r:
        return json.load(r)

data=json.load(open(OUT)) if os.path.exists(OUT) else {"model":"claude","songs":[]}
songs=data.get("songs",[])
def keyf(ly): return ly[:80].lower().strip()
seen=set(keyf(s.get("lyrics","")) for s in songs)
start=max([s.get("index",0) for s in songs]+[0])
print("start: %d existing claude songs (model=%s, budget=$%.2f)"%(len(songs),MODEL,BUDGET_USD),flush=True)

spent=0.0; made=0; i=start; calls=0; fails=0
while spent<BUDGET_USD:
    prompt,subjects=make_batch_prompt(); calls+=1
    try:
        resp=call(prompt)
    except urllib.error.HTTPError as e:
        msg=e.read().decode()[:200]
        if e.code in (401,403): print("AUTH error: %s"%msg,flush=True); break
        if "credit" in msg.lower() or "billing" in msg.lower(): print("BILLING: %s"%msg,flush=True); break
        print("HTTP %s: %s"%(e.code,msg),flush=True); fails+=1
        if fails>8: break
        time.sleep(4); continue
    except Exception as e:
        print("err: %s"%e,flush=True); fails+=1
        if fails>8: break
        time.sleep(4); continue
    u=resp.get("usage",{})
    cost=u.get("input_tokens",0)/1e6*pin + u.get("output_tokens",0)/1e6*pout
    spent+=cost
    raw="".join(b.get("text","") for b in resp.get("content",[]) if b.get("type")=="text")
    chunks=split_batch(raw); percall=cost/max(len(chunks),1)
    for n,ch in enumerate(chunks):
        ly=clean(ch); subj=subjects[n] if n<len(subjects) else "claude"
        why=audit(ly)
        if why: print("  skip (%s) %s"%(why,subj),flush=True); continue
        if keyf(ly) in seen: print("  skip (dup) %s"%subj,flush=True); continue
        seen.add(keyf(ly)); i+=1
        songs.append({"model":"claude","source":"api-clean","gen_model":MODEL,"index":i,
                      "subject":subj,"lang":"en","lyrics":ly,"lyrics_en":ly,
                      "prompt":prompt,"cost_usd":round(percall,5)})
        made+=1
    data["songs"]=songs; json.dump(data,open(OUT,"w"),ensure_ascii=False,indent=1)
    print("[call %d] +%d songs, total=%d, $%.3f/%.2f"%(calls,len(chunks),len(songs),spent,BUDGET_USD),flush=True)
    time.sleep(GAP)
json.dump(data,open(OUT,"w"),ensure_ascii=False,indent=1)
print("DONE: made %d this run, %d total, spent ~$%.3f in %d calls"%(made,len(songs),spent,calls),flush=True)
