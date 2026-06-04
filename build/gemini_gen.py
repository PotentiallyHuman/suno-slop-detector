#!/usr/bin/env python3
"""Gemini lyrics generator — realistic natural-prompt + story->song flow, click+keyboard only.

Logged-in gemini.google.com/app. NO DevTools/console (Google account safety).
Paced CONSERVATIVELY (long human-like gaps) because Google bot-detection is aggressive
and ChatGPT already rate-blocked under faster automation.

Usage:  python3 build/gemini_gen.py <target_total_gemini> [scenario_offset]
Progress -> /tmp/gemini_gen.log . Saves incrementally to corpus/models/gemini.json.
"""
import sys, os, subprocess, time, json, random, re, functools
print = functools.partial(print, flush=True)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'corpus', 'models', 'gemini.json')

def _firefox_win():
    env = os.environ.get("GEMINI_WIN")
    if env: return env
    r = subprocess.run(["env", "DISPLAY=:1", "xdotool", "search", "--class", "firefox"],
                       capture_output=True, text=True)
    ids = [w for w in r.stdout.split() if w.strip()]
    # avoid the Private-Browsing window (no Google login there)
    for w in ids:
        nm = subprocess.run(["env", "DISPLAY=:1", "xdotool", "getwindowname", w],
                            capture_output=True, text=True).stdout
        if "Private" not in nm: return w
    return ids[0] if ids else "0"
WIN = _firefox_win()
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 600
OFFSET = int(sys.argv[2]) if len(sys.argv) > 2 else 0

# logged-in Gemini layout (1080x1920), calibrated 2026-06-03
CHAT_URL = "https://gemini.google.com/app"
INPUT = (626, 1009)    # "Ask Gemini" composer
BODY  = (626, 400)     # conversation body (focus here before Ctrl+A so we copy the page)
STORY2SONG = float(os.environ.get("STORY2SONG", "0.30"))  # fraction via two-stage story->song

def x(*a): subprocess.run(["env", "DISPLAY=:1", "xdotool", *a], capture_output=True)
def click(p): x("mousemove", str(p[0]), str(p[1]), "click", "1")
def key(k): x("key", "--clearmodifiers", k)
def setclip(s): subprocess.run(["env", "DISPLAY=:1", "xclip", "-selection", "clipboard"],
                               input=s.encode(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def getclip(): return subprocess.run(["env", "DISPLAY=:1", "xclip", "-selection", "clipboard", "-o"],
                                     capture_output=True, text=True).stdout

LOCK = "/tmp/browser_control.lock"; HOLDER = LOCK + "/holder"; PRIO = "/tmp/browser_control.priority"
def lock_refresh():
    try:
        os.makedirs(LOCK, exist_ok=True); open(HOLDER, "w").write(f"gemini_gen {os.getpid()} {int(time.time())}")
    except Exception: pass
def yield_if_priority():
    w = 0
    while os.path.exists(PRIO) and w < 1800:
        if time.time() - os.path.getmtime(PRIO) > 240: break
        print("   [yield] browser priority held — pause 20s"); time.sleep(20); w += 20

def nav(url):
    x("windowactivate", WIN); time.sleep(0.4)
    key("ctrl+l"); time.sleep(0.4)
    setclip(url); time.sleep(0.2)
    key("ctrl+a"); key("ctrl+v"); time.sleep(0.3); key("Return")

# --- scenario / prompt banks (natural user phrasing) ---
WHO = ["my grandmother", "my first love", "my estranged father", "my childhood best friend",
       "my older brother", "my mother", "an ex I still think about", "a teacher who believed in me",
       "my younger self", "a neighbor I grew up next to", "the friend I lost touch with",
       "my sister", "someone I met once on a train", "my old bandmate", "the person who raised me"]
EVENT = ["the summer everything changed", "the night I finally left home", "a long drive we took together",
         "the day of the funeral", "moving to a new city alone", "the last real conversation we had",
         "learning to let someone go", "a phone call at 3am", "coming back home after years away",
         "an ordinary afternoon I never forgot", "the fight that ended it", "the day I forgave them",
         "watching the old house get sold", "the first winter on my own", "the morning I knew it was over"]
PLACE = ["in a small rust-belt town", "by the coast in late autumn", "in a cramped city apartment",
         "out on the prairie", "in the suburbs in the rain", "back in the old neighborhood",
         "on a cross-country highway", "in a town that's barely there anymore", "in the mountains in summer"]
GENRE = ["folk", "indie rock", "country", "pop", "R&B", "soul", "americana", "punk",
         "synthpop", "blues", "alt-rock", "singer-songwriter", "gospel", "hip-hop", "ballad"]
MOOD = ["heartbreaking", "hopeful", "angry", "bittersweet", "tender", "defiant",
        "wistful", "joyful", "haunting", "raw and honest"]

def make_scenario(i):
    r = random.Random(i * 2654435761 % (2**31))
    return f"{r.choice(EVENT)} with {r.choice(WHO)}, {r.choice(PLACE)}"
def one_prompt(scn, r):
    return r.choice([
        f"Write a song about {scn}.",
        f"Write a {r.choice(GENRE)} song about {scn}.",
        f"Write a {r.choice(MOOD)} song about {scn}.",
        f"Can you write me song lyrics about {scn}?",
        f"I want to write a song about {scn}. Can you draft the lyrics?",
        f"Help me write the lyrics to a song about {scn}.",
        f"Write the lyrics to a {r.choice(GENRE)} song about {scn}.",
    ])
def story_prompt(scn):
    return (f"Tell me a deeply personal, emotional first-person short story of about 2000 characters "
            f"about {scn}. Make it specific and real, with concrete sensory details and a turning point.")
SONG_PROMPT = "Write a song about this story:\n\n"

# --- extraction from a whole-page Ctrl+A copy ---
# multi-word UI phrases ONLY — single words like "Listen"/"Upgrade" appear in lyrics and falsely truncate
FOOTER = re.compile(r"(Gemini isn[’'`]?t human|Gemini can make mistakes|"
                    r"It can make mistakes, including|so double-check it|"
                    r"Your privacy & Gemini|Enter a prompt here|Ask Gemini|"
                    r"Conversation with Gemini|Show drafts|Check important info)", re.I)
# a full line that is a parenthetical PRODUCTION note (not a lyric) -> drop it
STAGE_RE = re.compile(r'^\s*[\(\[].*\b(tempo|instrument|instruments|guitar|harmonica|drums?|bass|'
                      r'piano|bpm|capo|fade ?(in|out)|fades? (in|out)|spoken|intro music|outro music|'
                      r'beat|melody|chords?|strumming|foot[- ]?stomp|key of|verse \d)\b.*[\)\]]\s*$', re.I)
HEADER_RE = re.compile(r'^\s*[\*\[\(]{0,2}\s*(verse|chorus|pre[-\s]?chorus|bridge|intro|outro|hook|'
                       r'refrain|interlude|breakdown|coda|vamp|spoken)(\s*\d+)?\s*[\*\]\)]{0,2}\s*:?\s*$', re.I)
TITLE_RE  = re.compile(r'^\s*[\*]{0,2}\s*(title|song title)\s*[:：]', re.I)
QTITLE_RE = re.compile(r'^\s*[\*"“\'’]{1,2}[^\n]{1,52}[\*"”\'’]{1,2}\s*$')   # lone short bold/quoted = title
PRE_RE    = re.compile(r"^\s*(here[’'`]?s |here is |sure[,!.—]|certainly|of course|got it[,!.]|"
                       r"absolutely|i[’'`]?d be happy|okay[,!. ]|alright|that[’'`]?s a (beautiful|powerful)|"
                       r"this is a|what a )", re.I)
TRAIL_RE  = re.compile(r"^\s*(let me know|want me to|would you like|happy to (adjust|tweak|expand|help)|"
                       r"hope (this|that|you)|i can (also )?(adjust|tweak|expand|add)|if you[’'`]?d like|"
                       r"feel free|do you want|i tried to|note:|this song )", re.I)

def strip_md(s):
    s = re.sub(r'\*\*(.+?)\*\*', r'\1', s)       # bold
    s = re.sub(r'(?<!\*)\*(?!\*)(.+?)\*', r'\1', s)  # italic
    return s

def extract_reply(raw, prompt):
    t = raw.replace('\r', '')
    tail = prompt.strip().split('\n')[-1].strip()[-40:]
    k = t.rfind(tail)                               # rfind: last echo of the prompt
    if k != -1: t = t[k + len(tail):]
    m = FOOTER.search(t)
    if m: t = t[:m.start()]
    lines = [strip_md(l) for l in t.split('\n')]
    lines = [l for l in lines if not HEADER_RE.match(l) and not TITLE_RE.match(l)
             and not STAGE_RE.match(l)]
    titled = False
    while lines:
        l = lines[0].strip()
        if l == '' or PRE_RE.match(l): lines.pop(0); continue
        if not titled and QTITLE_RE.match(l): lines.pop(0); titled = True; continue
        break
    while lines:
        l = lines[-1].strip()
        if l == '' or TRAIL_RE.match(l): lines.pop()
        else: break
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(l.strip() for l in lines)).strip()

def capture():
    click(BODY); time.sleep(0.4)
    key("End"); time.sleep(0.5)
    key("ctrl+a"); time.sleep(0.4); key("ctrl+c"); time.sleep(0.5)
    return getclip()

def get_reply(prompt, wait0=12, max_wait=90, minlen=120):
    time.sleep(wait0)
    prev = -1; stable = 0; waited = wait0; last = ''
    while waited < max_wait:
        last = extract_reply(capture(), prompt)
        if len(last) >= minlen and len(last) == prev:
            stable += 1
            if stable >= 2: return last
        else:
            stable = 0
        prev = len(last); time.sleep(5); waited += 5
    return last if len(last) >= minlen else None

def _composer_text():
    """Read back what's currently in the composer (select-all + copy inside the input)."""
    click(INPUT); time.sleep(0.4)
    key("ctrl+a"); time.sleep(0.3); key("ctrl+c"); time.sleep(0.3)
    return getclip()

def send(prompt):
    """Paste prompt, VERIFY it actually landed in the box, submit, then VERIFY it echoed
    on the page. Returns True only if both checks pass — never blind-proceeds."""
    tail = prompt.strip().split('\n')[-1].strip()[-40:]
    for attempt in range(2):
        click(INPUT); time.sleep(0.7)
        key("ctrl+a"); time.sleep(0.2); key("Delete"); time.sleep(0.2)   # clear any stale text
        setclip(prompt); time.sleep(0.3)
        key("ctrl+v"); time.sleep(0.9)
        back = _composer_text()
        if tail in back.replace('\r', ''):                # paste landed in the composer
            click(INPUT); time.sleep(0.3); key("End"); time.sleep(0.2)
            key("Return"); time.sleep(3.0)
            page = capture()                              # did the prompt echo into the conversation?
            if tail in page.replace('\r', ''):
                return True
            print(f"   [send] submit not echoed (attempt {attempt+1}) — retry")
        else:
            print(f"   [send] paste did NOT land in composer (attempt {attempt+1}) — retry")
        time.sleep(2)
    # save a screenshot of the failed state for inspection
    subprocess.run(["env", "DISPLAY=:1", "gnome-screenshot", "-f", "/tmp/gemini_send_fail.png"],
                   capture_output=True)
    return False

def is_songlike(t):
    lines = [l for l in t.split('\n') if l.strip()]
    if len(lines) < 8: return False
    short = sum(1 for l in lines if len(l) < 60)
    return short / len(lines) >= 0.5

def gen_song(scn, idx):
    r = random.Random(idx * 40503 + 7)
    if r.random() < STORY2SONG:
        nav(CHAT_URL); time.sleep(13)
        if not send(story_prompt(scn)): return None, None, "story2song(story-send-fail)"
        story = get_reply(story_prompt(scn), minlen=400)
        if not story: return None, None, "story2song(no-story)"
        story = story[:3000]
        nav(CHAT_URL); time.sleep(13)
        if not send(SONG_PROMPT + story): return None, story, "story2song(song-send-fail)"
        song = get_reply(SONG_PROMPT + story, minlen=180)
        if not song or not is_songlike(song): return None, story, "story2song(no-song)"
        return song, story, "story2song"
    prompt = one_prompt(scn, r)
    nav(CHAT_URL); time.sleep(13)
    if not send(prompt): return None, None, "direct(send-fail)"
    song = get_reply(prompt, minlen=180)
    if not song or not is_songlike(song): return None, None, "direct(no-song)"
    return song, None, "direct"

def bigrams(t):
    w = re.findall(r"[a-z']+", t.lower()); return set(zip(w, w[1:]))
def jacc(a, b): return len(a & b) / len(a | b) if a and b else 0.0

def load():
    try:
        d = json.load(open(OUT)); return d if isinstance(d, dict) else {"model": "gemini", "songs": d}
    except Exception:
        return {"model": "gemini", "songs": []}
def save(d):
    tmp = OUT + ".tmp"; json.dump(d, open(tmp, "w"), ensure_ascii=False); os.replace(tmp, OUT)

def main():
    data = load(); songs = data.setdefault("songs", []); n = len(songs)
    print(f"=== gemini_gen story->song: start gemini={n} target={TARGET} win={WIN} ===")
    seen = [bigrams(s['lyrics']) for s in songs if isinstance(s, dict) and s.get('lyrics')]
    i = OFFSET; consec = 0; added = 0
    while n < TARGET and i < OFFSET + TARGET * 3:
        i += 1; lock_refresh(); yield_if_priority()
        scn = make_scenario(i); print(f"[{i}] {scn}")
        song, story, strat = gen_song(scn, i)
        if not song:
            consec += 1; print(f"   FAIL ({strat}) consec={consec}")
            if consec >= 4: print("!! 4 consecutive fails — likely rate/bot wall; stopping"); break
            time.sleep(25); continue
        nb = bigrams(song)
        if any(jacc(nb, eb) >= 0.55 for eb in seen):
            print("   dup — skip"); consec = 0; time.sleep(8); continue
        songs.append({"model": "gemini", "source": "web-" + strat,
                      "scenario": scn, "story": story, "lyrics": song})
        seen.append(nb); n += 1; added += 1; consec = 0; save(data)
        nlines = len([l for l in song.split(chr(10)) if l.strip()])
        print(f"   SAVED gemini {n}/{TARGET} (+{added})  [{nlines} lines, {len(song)} chars]")
        time.sleep(random.randint(15, 30))      # conservative human-like gap
    print(f"=== done: gemini now {n} (added {added}) ===")

if __name__ == '__main__':
    main()
