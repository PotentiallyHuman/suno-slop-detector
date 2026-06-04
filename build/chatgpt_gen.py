#!/usr/bin/env python3
"""ChatGPT (logged-OUT) lyrics generator — realistic STORY->SONG flow, click+keyboard only.

Mimics how people actually use it:
  1) new chat: ask for a ~2000-char personal first-person STORY about a scenario.
  2) capture the story (this becomes the seed prompt — NOT saved as lyrics).
  3) new chat: paste the story + "write a song about this story" -> capture the SONG.
  4) save the SONG as the lyric; repeat with a fresh story.

No [Verse]/[Chorus] format instructions in the prompts. NO DevTools/console.
Usage:  python3 build/chatgpt_gen.py <target_total_chatgpt> [scenario_offset]
Self-running (zero model tokens). Progress -> /tmp/chatgpt_gen.log
"""
import sys, os, subprocess, time, json, random, re, functools
print = functools.partial(print, flush=True)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'corpus', 'models', 'chatgpt.json')

def _firefox_win():
    # explicit override, else the Private-Browsing window (dodges the rate-block), else first firefox
    env = os.environ.get("CHATGPT_WIN")
    if env: return env
    r = subprocess.run(["env", "DISPLAY=:1", "xdotool", "search", "--class", "firefox"],
                       capture_output=True, text=True)
    ids = [w for w in r.stdout.split() if w.strip()]
    for w in ids:
        nm = subprocess.run(["env", "DISPLAY=:1", "xdotool", "getwindowname", w],
                            capture_output=True, text=True).stdout
        if "Private" in nm: return w
    return ids[0] if ids else "0"
WIN = _firefox_win()
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
OFFSET = int(sys.argv[2]) if len(sys.argv) > 2 else 0

# logged-OUT PRIVATE window layout (calibrated 2026-06-03). Logged-out = nothing saved anyway.
CHAT_URL = os.environ.get("CHATGPT_URL", "https://chatgpt.com/")
INPUT = (730, 892)     # "Ask anything" composer
BODY  = (730, 450)     # conversation body (focus here before Ctrl+A so we copy the page)
MON = "/tmp/cg_mon.png"  # screenshot checkpoint refreshed every 5 saves

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
        os.makedirs(LOCK, exist_ok=True); open(HOLDER, "w").write(f"chatgpt_gen {os.getpid()} {int(time.time())}")
    except Exception: pass
def yield_if_priority():
    w = 0
    while os.path.exists(PRIO) and w < 1800:
        if time.time() - os.path.getmtime(PRIO) > 240: break
        print("   [yield] browser priority held — pause 20s"); time.sleep(20); w += 20

def nav(url):
    x("windowactivate", WIN); time.sleep(0.3)
    key("ctrl+l"); time.sleep(0.3)
    setclip(url); time.sleep(0.15)
    key("ctrl+a"); key("ctrl+v"); time.sleep(0.2); key("Return")

# --- scenario generator: personal, real-life, NO format words ---
WHO = ["my grandmother", "my first love", "my estranged father", "my childhood best friend",
       "my older brother", "my mother", "an ex I still think about", "a teacher who believed in me",
       "my younger self", "a neighbor I grew up next to", "the friend I lost touch with",
       "my sister", "someone I met once on a train", "my old bandmate", "the person who raised me"]
EVENT = ["the summer everything changed", "the night I finally left home", "a long drive we took together",
         "the day of the funeral", "moving to a new city completely alone", "the last real conversation we had",
         "learning to let someone go", "a phone call that came at 3am", "coming back home after years away",
         "an ordinary afternoon I somehow never forgot", "the fight that ended it", "the day I forgave them",
         "watching the old house get sold", "the first winter on my own", "the morning I knew it was over"]
PLACE = ["in a small rust-belt town", "by the coast in late autumn", "in a cramped city apartment",
         "out on the prairie", "in the suburbs in the rain", "back in the old neighborhood",
         "on a cross-country highway", "in a town that's barely there anymore", "in the mountains in summer"]

def make_scenario(i):
    r = random.Random(i * 2654435761 % (2**31))
    return f"{r.choice(EVENT)} with {r.choice(WHO)}, {r.choice(PLACE)}"

def story_prompt(scn):
    return (f"Tell me a deeply personal, emotional first-person short story of about 2000 characters "
            f"about {scn}. Make it specific and real, with concrete sensory details and a turning point.")
SONG_PROMPT = "Write a song about this story:\n\n"

# --- reply extraction from a whole-page Ctrl+A copy (no markers, no console) ---
# Two-phase, principled: (1) strip the LLM wrapper top+bottom so the span between the first and
# last real lyric line remains; (2) strip formatting tags + explicit titles. Curly-apostrophe aware.
FOOTER = re.compile(r'(ChatGPT can make mistakes|By messaging ChatGPT|Ask anything|'
                    r'Get responses tailored|Log in to get answers|Search chats|New chat)', re.I)
HEADER_RE = re.compile(r'^\s*\[?\s*(verse|chorus|pre[-\s]?chorus|bridge|intro|outro|hook|refrain|'
                       r'interlude|breakdown|coda|vamp)(\s*\d+)?\s*\]?\s*:?\s*$', re.I)
TITLE_RE  = re.compile(r'^\s*(title|song title)\s*[:：]', re.I)
QTITLE_RE = re.compile(r'^\s*[\"“\'’][^\"”\'’]{1,48}[\"”\'’]\s*$')      # lone short quoted line = title
PRE_RE    = re.compile(r"^\s*(here[’'`]?s |here is |sure[,!.—]|certainly|of course|got it[,!.]|"
                       r"absolutely|i[’'`]?d be happy|okay[,!. ])", re.I)
PRE_PHRASE= re.compile(r"(you can build (on|from)|a (draft|lyric|version) you can|"
                       r"lyrics? you can build|here[’'`]?s a (draft|set|lyric))", re.I)
TRAIL_RE  = re.compile(r"^\s*(let me know|want me to|would you like|happy to (adjust|tweak|expand|help)|"
                       r"hope (this|that) (helps|works)|i can (also )?(adjust|tweak|expand|add)|if you[’'`]?d like)", re.I)

def extract_reply(raw, prompt):
    t = raw.replace('\r', '')
    tail = prompt.strip().split('\n')[-1].strip()[-40:]       # slice after the echoed prompt
    k = t.find(tail)
    if k != -1: t = t[k + len(tail):]
    m = FOOTER.search(t)
    if m: t = t[:m.start()]
    lines = t.split('\n')
    lines = [l for l in lines if not HEADER_RE.match(l) and not TITLE_RE.match(l)]  # phase 2: tags/titles
    titled = False
    while lines:                                              # phase 1a: strip leading wrapper
        l = lines[0].strip()
        if l == '' or PRE_RE.match(l) or (len(l) > 40 and PRE_PHRASE.search(l)): lines.pop(0); continue
        if not titled and QTITLE_RE.match(l): lines.pop(0); titled = True; continue
        break
    while lines:                                              # phase 1b: strip trailing wrapper
        l = lines[-1].strip()
        if l == '' or TRAIL_RE.match(l): lines.pop()
        else: break
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip()

def capture():
    click(BODY); time.sleep(0.4)
    key("ctrl+a"); time.sleep(0.3); key("ctrl+c"); time.sleep(0.4)
    return getclip()

def get_reply(prompt, wait0=27, max_wait=110, minlen=120):
    """Send already-pasted prompt's reply; stability-based done-detection (no markers)."""
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
    click(INPUT); time.sleep(0.4)
    key("ctrl+a"); time.sleep(0.3); key("ctrl+c"); time.sleep(0.3)
    return getclip()

def send(prompt):
    """Paste, VERIFY it landed in the box, submit, VERIFY it echoed on the page.
    Returns True only if both pass — never blind-proceeds (the bug that wasted stories)."""
    tail = prompt.strip().split('\n')[-1].strip()[-40:]
    for attempt in range(2):
        key("Escape"); time.sleep(0.4)        # dismiss the "Stay logged out" modal if present
        click(INPUT); time.sleep(0.7)
        key("ctrl+a"); time.sleep(0.2); key("Delete"); time.sleep(0.2)
        setclip(prompt); time.sleep(0.3)
        key("ctrl+v"); time.sleep(0.9)
        if tail in _composer_text().replace('\r', ''):
            click(INPUT); time.sleep(0.3); key("End"); time.sleep(0.2)
            key("Return"); time.sleep(3.0)
            if tail in capture().replace('\r', ''):
                return True
            print(f"   [send] submit not echoed (attempt {attempt+1}) — retry")
        else:
            print(f"   [send] paste did NOT land (attempt {attempt+1}) — retry")
        time.sleep(2)
    subprocess.run(["env", "DISPLAY=:1", "gnome-screenshot", "-f", "/tmp/chatgpt_send_fail.png"],
                   capture_output=True)
    return False

def is_songlike(t):
    lines = [l for l in t.split('\n') if l.strip()]
    if len(lines) < 8: return False
    short = sum(1 for l in lines if len(l) < 60)
    return short / len(lines) >= 0.5            # lyrics = mostly short lines (prose = long)

GENRE = ["folk", "indie rock", "country", "pop", "R&B", "soul", "americana", "punk",
         "synthpop", "blues", "alt-rock", "singer-songwriter", "gospel", "hip-hop"]
MOOD = ["heartbreaking", "hopeful", "angry", "bittersweet", "tender", "defiant",
        "wistful", "joyful", "haunting", "raw and honest"]

def one_stage_prompt(scn, r):
    return r.choice([
        f"Write a song about {scn}.",
        f"Write a {r.choice(GENRE)} song about {scn}.",
        f"Write a {r.choice(MOOD)} song about {scn}.",
        f"Can you write me song lyrics about {scn}?",
        f"I want to write a song about {scn}. Can you draft the lyrics for me?",
        f"My friend is going through {scn}. Write a song that captures how it feels.",
        f"Help me write the lyrics to a song about {scn}.",
    ])

def gen_song(scn, idx):
    """Pick a strategy for variety/realism. ~35% the two-stage story->song; else a single
    natural prompt phrased many different ways. All markerless extraction."""
    r = random.Random(idx * 40503 + 7)
    if r.random() < 0.35:
        # stage A: story -> stage B (new chat): song about the story
        nav(CHAT_URL); time.sleep(12)
        if not send(story_prompt(scn)): return None, None, "story2song(story-send-fail)"
        story = get_reply(story_prompt(scn), minlen=400)
        if not story: return None, None, "story2song(no-story)"
        story = story[:3000]
        nav(CHAT_URL); time.sleep(12)
        if not send(SONG_PROMPT + story): return None, story, "story2song(song-send-fail)"
        song = get_reply(SONG_PROMPT + story, minlen=180)
        if not song or not is_songlike(song): return None, story, "story2song(no-song)"
        return song, story, "story2song"
    else:
        prompt = one_stage_prompt(scn, r)
        nav(CHAT_URL); time.sleep(12)
        if not send(prompt): return None, None, "direct(send-fail)"
        song = get_reply(prompt, minlen=180)
        if not song or not is_songlike(song): return None, None, "direct(no-song)"
        return song, None, "direct"

def bigrams(t):
    w = re.findall(r"[a-z']+", t.lower()); return set(zip(w, w[1:]))
def jacc(a, b): return len(a & b) / len(a | b) if a and b else 0.0

def load():
    try:
        d = json.load(open(OUT)); return d if isinstance(d, dict) else {"model": "chatgpt", "songs": d}
    except Exception:
        return {"model": "chatgpt", "songs": []}
def save(d):
    tmp = OUT + ".tmp"; json.dump(d, open(tmp, "w")); os.replace(tmp, OUT)

def main():
    data = load(); songs = data.setdefault("songs", []); n = len(songs)
    print(f"=== chatgpt_gen story->song: start chatgpt={n} target={TARGET} ===")
    seen = [bigrams(s['lyrics']) for s in songs if isinstance(s, dict) and s.get('lyrics')]
    i = OFFSET; consec = 0; added = 0
    while n < TARGET and i < OFFSET + TARGET * 3:
        i += 1; lock_refresh(); yield_if_priority()
        scn = make_scenario(i); print(f"[{i}] {scn}")
        song, story, strat = gen_song(scn, i)
        if not song:
            consec += 1; print(f"   FAIL ({strat}, rate-limit/slow/extract) consec={consec}")
            if consec >= 5: print("!! 5 consecutive fails — likely rate wall; stopping for heartbeat"); break
            time.sleep(20); continue
        nb = bigrams(song)
        if any(jacc(nb, eb) >= 0.55 for eb in seen):
            print("   dup — skip"); consec = 0; time.sleep(4); continue
        songs.append({"model": "chatgpt", "source": "web-loggedout-" + strat,
                      "scenario": scn, "story": story, "lyrics": song})
        seen.append(nb); n += 1; added += 1; consec = 0; save(data)
        print(f"   SAVED chatgpt {n}/{TARGET} (+{added} this run)  [{len([l for l in song.split(chr(10)) if l.strip()])} lines]")
        if added % 5 == 0:    # screenshot checkpoint every 5 lyrics
            subprocess.run(["env", "DISPLAY=:1", "gnome-screenshot", "-f", MON], capture_output=True)
            print(f"   [checkpoint] screenshot -> {MON} after {added} saves")
        time.sleep(random.randint(4, 9))
    print(f"=== done: chatgpt now {n} (added {added}) ===")

if __name__ == '__main__':
    main()
