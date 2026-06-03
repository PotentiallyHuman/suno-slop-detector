#!/usr/bin/env python3
"""Capture a Suno-generated lyric set into a PER-MODEL bucket (remi | classic).

Same clean + dedup + sanity as capture_suno.py, but saves to
corpus/suno_capture/<model>/ so the classic-vs-ReMi split stays separated from
the start. Dedup is checked within that model's bucket only.

Usage:  python3 build/capture_suno_model.py /tmp/clip.txt "slug" remi
Exit:   0 saved · 2 rejected(short/no-tags) · 3 rejected(near-duplicate)
"""
import sys, os, re, glob

SRC = sys.argv[1]
SLUG = re.sub(r'[^a-z0-9]+', '-', (sys.argv[2] if len(sys.argv) > 2 else 'untitled').lower()).strip('-')[:40]
MODEL = (sys.argv[3] if len(sys.argv) > 3 else 'remi').lower()
assert MODEL in ('remi', 'classic'), "model must be remi|classic"
DIR = os.path.join(os.path.dirname(__file__), '..', 'corpus', 'suno_capture', MODEL)
os.makedirs(DIR, exist_ok=True)
SIM_THRESHOLD = 0.55   # reject if word-bigram Jaccard vs any existing in this bucket >= this

def clean(text):
    lines = [l.rstrip() for l in text.replace('\r', '').split('\n')]
    lines = [l for l in lines if l.strip()]
    for i, l in enumerate(lines):          # drop title/preamble before first [section]
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

if nlines < 8:
    print(f"REJECT: only {nlines} lines — incomplete/empty"); sys.exit(2)
if not re.search(r'\[(verse|chorus|pre-?chorus|bridge|intro|outro|hook)', body, re.I):
    print(f"REJECT: no section tags — not a Suno lyric set?"); sys.exit(2)

new_bg = bigrams(body)
for f in sorted(glob.glob(os.path.join(DIR, f'{MODEL}_*.txt'))):
    s = jaccard(new_bg, bigrams(open(f, encoding='utf-8', errors='replace').read()))
    if s >= SIM_THRESHOLD:
        print(f"REJECT: {s:.0%} bigram-similar to {os.path.basename(f)} — near-duplicate"); sys.exit(3)

n = len(glob.glob(os.path.join(DIR, f'{MODEL}_*.txt')))
out = os.path.join(DIR, f"{MODEL}_{n+1:04d}_{SLUG}.txt")
open(out, 'w', encoding='utf-8').write(body + '\n')
print(f"SAVED {os.path.relpath(out)}  ({nlines} lines, bucket {MODEL} now {n+1})")
