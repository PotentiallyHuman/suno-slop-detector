#!/usr/bin/env python3
"""Suno lyrics-generation loop — CLICK-ONLY (no DevTools/JS injection; ban-safe).

Drives the logged-in Suno create page like a human: Magic Wand -> paste concept
-> Write Lyrics -> Select This Option -> copy the lyrics textarea -> save (deduped)
into corpus/suno_capture/<model>/.  Free lyrics gen (no song credits).

Usage:  python3 build/suno_lyrics_loop.py <remi|classic> <target_count> [concept_offset]
Coords are for a MAXIMIZED Firefox at 1080x1920 (window id 10485783). If the UI
shifts, update the constants block. Progress -> /tmp/suno_loop_<model>.log
(heartbeat reads this + the bucket count to detect stalls).
"""
import sys, os, subprocess, time, random, re, glob, functools
print = functools.partial(print, flush=True)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = (sys.argv[1] if len(sys.argv) > 1 else 'remi').lower()
assert MODEL in ('remi', 'classic')
TARGET = int(sys.argv[2]) if len(sys.argv) > 2 else 50
OFFSET = int(sys.argv[3]) if len(sys.argv) > 3 else 0
WIN = "10485783"
BUCKET = os.path.join(ROOT, 'corpus', 'suno_capture', MODEL)

# --- UI coordinates (real px, maximized 1080x1920) ---
WAND        = (382, 438)    # Magic Wand on EMPTY lyrics box -> opens generate-lyrics modal
PROMPT      = (540, 1755)   # modal prompt input bar
WRITE       = (790, 1797)   # "Write Lyrics" button
SELECT_LEFT = (398, 1685)   # "Select This Option" under the left column
TEXTAREA    = (400, 360)    # lyrics textarea body (to focus before Ctrl+A/C)
CLEAR       = (648, 295)    # clear-lyrics (X) in the Lyrics header

def x(*a): subprocess.run(["env", "DISPLAY=:1", "xdotool", *a], capture_output=True)
def click(p): x("mousemove", str(p[0]), str(p[1]), "click", "1")
def key(k): x("key", "--clearmodifiers", k)
def setclip(s): subprocess.run(["env", "DISPLAY=:1", "xclip", "-selection", "clipboard"],
                               input=s.encode(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def getclip(): return subprocess.run(["env", "DISPLAY=:1", "xclip", "-selection", "clipboard", "-o"],
                                     capture_output=True, text=True).stdout

# --- cooperative browser lock: yield to the email-cron priority between songs ---
PRIO = "/tmp/browser_control.priority"
def yield_if_priority():
    waited = 0
    while os.path.exists(PRIO) and waited < 1800:
        age = time.time() - os.path.getmtime(PRIO)
        if age > 240:  # stale
            break
        print(f"   [yield] another claude has browser priority — pausing 20s"); time.sleep(20); waited += 20

def mem_ok(min_mb=3500):
    try:
        a = int(re.search(r"MemAvailable:\s+(\d+)", open("/proc/meminfo").read()).group(1)) // 1024
        return a >= min_mb, a
    except Exception:
        return True, 99999

def bucket_count():
    return len(glob.glob(os.path.join(BUCKET, f"{MODEL}_*.txt")))

# --- concept generator: combinatorial, varied, deterministic per index ---
SUBJ = ["a late night drive", "an old love letter", "leaving a small town", "a city at dawn",
        "a missed phone call", "dancing alone in the kitchen", "the last day of summer", "a funeral",
        "missing the last train", "a childhood home", "falling out of love", "a new beginning",
        "a storm rolling in", "two strangers on a bus", "an empty diner", "a long distance call",
        "growing up too fast", "a wedding that never happened", "the ocean at night", "a broken promise",
        "first heartbreak", "coming home from war", "a barfly's confession", "neon and rain",
        "a road that never ends", "selling the family farm", "a ghost in an apartment", "winter loneliness",
        "a reckless youth", "saying goodbye at an airport", "a sober morning after", "chasing a dream",
        "a small victory", "the weight of a secret", "an apology too late", "a summer fling",
        "working the night shift", "a letter to a younger self", "burning old photographs", "a quiet rebellion"]
MOOD = ["bittersweet", "defiant", "tender", "haunting", "euphoric", "wistful", "angry", "hopeful",
        "numb", "playful", "desperate", "serene", "nostalgic", "anxious", "triumphant", "melancholy"]
LENS = ["told in vivid concrete detail", "with a single repeated image", "as a confession",
        "from a stranger's point of view", "with a twist in the last verse", "in plain spoken language",
        "with one unforgettable metaphor", "as a conversation", "looking back years later",
        "with a hopeful turn at the end", "full of specific place names", "stripped down and honest"]

def make_concept(i):
    r = random.Random(i * 2654435761 % (2**31))
    return f"{r.choice(SUBJ)}, {r.choice(MOOD)}, {r.choice(LENS)}"

def gen_one(concept):
    """One full click-only cycle. Returns capture_suno_model.py exit (0 ok)."""
    x("windowactivate", WIN); time.sleep(0.3)
    click(WAND); time.sleep(1.8)                     # open generate-lyrics modal (empty box)
    click(PROMPT); time.sleep(0.4)
    key("ctrl+a"); key("Delete"); time.sleep(0.2)
    setclip(concept); time.sleep(0.15)
    key("ctrl+v"); time.sleep(0.5)
    click(WRITE)                                     # generate
    # wait for lyrics to render (text-only gen is fast but variable)
    time.sleep(24)
    saved = _select_and_capture(concept)
    if saved != 0:                                   # maybe slow render — wait + retry once
        print("   slow render — +9s retry"); time.sleep(9)
        saved = _select_and_capture(concept)
    # return to a clean EMPTY box for the next cycle
    x("windowactivate", WIN); time.sleep(0.2)
    click(CLEAR); time.sleep(0.6)
    return saved

def _select_and_capture(concept):
    x("windowactivate", WIN); time.sleep(0.2)
    click(SELECT_LEFT); time.sleep(2.0)              # load left option into the lyrics textarea, closes modal
    click(TEXTAREA); time.sleep(0.4)
    key("ctrl+a"); time.sleep(0.2); key("ctrl+c"); time.sleep(0.4)
    open('/tmp/suno_clip.txt', 'w').write(getclip())
    slug = re.sub(r'[^a-z0-9]+', '-', concept.lower())[:40]
    r = subprocess.run(['python3', os.path.join(ROOT, 'build', 'capture_suno_model.py'),
                        '/tmp/suno_clip.txt', slug, MODEL], capture_output=True, text=True)
    print("   " + (r.stdout or r.stderr).strip())
    return r.returncode

def main():
    os.makedirs(BUCKET, exist_ok=True)
    start = bucket_count()
    print(f"=== suno {MODEL} loop: start {start}, target {TARGET} (offset {OFFSET}) ===")
    i = OFFSET
    consec_fail = 0
    while bucket_count() < TARGET and i < OFFSET + TARGET * 4:
        i += 1
        yield_if_priority()
        ok, avail = mem_ok()
        while not ok:
            print(f"   [mem] {avail}MB free — pause 60s"); time.sleep(60); ok, avail = mem_ok()
        concept = make_concept(i)
        print(f"[{i}] gen: {concept}")
        rc = gen_one(concept)
        cur = bucket_count()
        print(f"   bucket {MODEL}: {cur}/{TARGET}   (rc={rc})")
        consec_fail = 0 if rc == 0 else consec_fail + 1
        if consec_fail >= 6:
            print("!! 6 consecutive failures — UI may have shifted; stopping for heartbeat to inspect")
            break
        time.sleep(random.randint(5, 14))            # human-ish pacing
    print(f"=== done: {MODEL} bucket now {bucket_count()} (added {bucket_count()-start}) ===")

if __name__ == '__main__':
    main()
