#!/usr/bin/env python3
"""Capture a Suno-generated lyric set from a text file (piped from the X clipboard),
clean it, reject near-duplicates, and save to corpus/suno_capture/simple/suno/.

Usage:  xclip -selection clipboard -o > /tmp/clip.txt
        python3 build/capture_suno.py /tmp/clip.txt "song title"
"""
import sys, os, re, glob

SRC = sys.argv[1]
SLUG = re.sub(r'[^a-z0-9]+', '-', (sys.argv[2] if len(sys.argv) > 2 else 'untitled').lower()).strip('-')
DIR = os.path.join(os.path.dirname(__file__), '..', 'corpus', 'suno_capture', 'simple', 'suno')
os.makedirs(DIR, exist_ok=True)
SIM_THRESHOLD = 0.55   # reject if word-bigram Jaccard vs any existing >= this

def clean(text):
    # normalize newlines, drop blank/whitespace-only lines and any leading "✦"/bullet junk
    lines = [l.rstrip() for l in text.replace('\r', '').split('\n')]
    lines = [l for l in lines if l.strip()]
    # drop everything before the first [section] tag (title / preamble)
    for i, l in enumerate(lines):
        if re.match(r'\s*\[', l):
            lines = lines[i:]; break
    return '\n'.join(lines).strip()

def bigrams(text):
    words = re.findall(r"[a-z']+", text.lower())
    return set(zip(words, words[1:]))

def jaccard(a, b):
    if not a or not b: return 0.0
    return len(a & b) / len(a | b)

raw = open(SRC, encoding='utf-8', errors='replace').read()
body = clean(raw)
nlines = len([l for l in body.split('\n') if l.strip()])

# sanity: a real lyric set has structure + enough lines
if nlines < 8:
    print(f"REJECT: only {nlines} lines — capture looks incomplete/empty"); sys.exit(2)
if not re.search(r'\[(verse|chorus|pre-?chorus|bridge|intro|outro|hook)', body, re.I):
    print(f"REJECT: no section tags found — not a Suno lyric set?"); sys.exit(2)

new_bg = bigrams(body)
for f in sorted(glob.glob(os.path.join(DIR, 'suno_*.txt'))):
    existing = bigrams(open(f, encoding='utf-8', errors='replace').read())
    s = jaccard(new_bg, existing)
    if s >= SIM_THRESHOLD:
        print(f"REJECT: {s:.0%} bigram-similar to {os.path.basename(f)} — near-duplicate, not saving"); sys.exit(3)

n = len(glob.glob(os.path.join(DIR, 'suno_*.txt')))
out = os.path.join(DIR, f"suno_{n+1:03d}_{SLUG}.txt")
open(out, 'w', encoding='utf-8').write(body + '\n')
print(f"SAVED {os.path.relpath(out)}  ({nlines} lines, max-sim {max([jaccard(new_bg, bigrams(open(f).read())) for f in glob.glob(os.path.join(DIR,'suno_*.txt')) if f!=out], default=0):.0%} vs others)")
