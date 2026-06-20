#!/usr/bin/env python3
"""Build the shareable 'AI lyric tells' lead graphic for the r/SunoAI post.
Content is the REAL model output (analysis/CLICHES_50.md). On-brand dark theme.
1080x1080 (square, shares well on reddit/anywhere)."""
from PIL import Image, ImageDraw, ImageFont

W = H = 1080
BG = (20, 22, 28)
CARD = (30, 33, 41)
RED = (255, 92, 92)      # %AI accent
AMBER = (240, 180, 70)
GREEN = (90, 200, 130)
FG = (230, 232, 238)
DIM = (150, 155, 165)
F = "/usr/share/fonts/truetype/dejavu/"
def font(name, sz): return ImageFont.truetype(F + name, sz)
big   = font("DejaVuSans-Bold.ttf", 52)
sub   = font("DejaVuSans.ttf", 25)
hdr   = font("DejaVuSans-Bold.ttf", 28)
item  = font("DejaVuSans.ttf", 26)
itemb = font("DejaVuSans-Bold.ttf", 26)
small = font("DejaVuSans.ttf", 22)
foot  = font("DejaVuSans.ttf", 21)

im = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(im)

# title
d.text((50, 44), "25 phrases that out", font=big, fill=FG)
d.text((50, 104), "your lyrics as ", font=big, fill=FG)
w = d.textlength("your lyrics as ", font=big)
d.text((50 + w, 104), "AI", font=big, fill=RED)
d.text((52, 176), "measured on 2,000 human songs vs. a pile of AI songs", font=sub, fill=DIM)

def card(x, y, w, h):
    d.rounded_rectangle([x, y, x+w, y+h], radius=16, fill=CARD)

def section(x, y, w, h, color, title, items, mono_note=None):
    card(x, y, w, h)
    d.rounded_rectangle([x, y, x+8, y+h], radius=4, fill=color)
    d.text((x+26, y+18), title, font=hdr, fill=color)
    yy = y + 60
    for it in items:
        d.text((x+30, yy), "•", font=item, fill=color)
        d.text((x+52, yy), it, font=item, fill=FG)
        yy += 38

PAD = 50
COLW = (W - PAD*3) // 2
top = 230
# left: stock imagery
section(PAD, top, COLW, 558, RED, "Stock imagery", [
    "neon / city / street lights",
    "shadows dance",
    "whisper in the wind",
    "echoes in the night",
    "rise from the ashes",
    "chasing the horizon",
    "concrete jungle",
    "fire in my veins",
    "frozen in time",
    "weight of the world",
    "demons in my head",
    "calm before the storm",
])
# right top: sentence shapes
rx = PAD*2 + COLW
section(rx, top, COLW, 240, AMBER, "Sentence shapes", [
    "not A, not B, just C",
    "it's not A, it's B",
    "maybe X, maybe Y",
    "every X, every Y",
    "in the ___, in the ___",
])
# right bottom: single-word tells with lift
section(rx, top+260, COLW, 288, GREEN, "Word tells (AI lift)", [
    "night 86x   light 71x",
    "sky 58x   maybe 56x",
    "quiet 55x   love 55x",
    "heart 53x   time 50x",
])

# bottom strip: the real insight + soft attribution (NO beta ask)
by = top + 578
card(PAD, by, W - PAD*2, 240)
d.text((PAD+26, by+22), "the #1 tell isn't a cliché — it's predictability.", font=itemb, fill=FG)
lines = [
    "AI picks the most likely next word so often the lyrics flatten out.",
    "Clichés are just the visible tip. (Plenty of beloved human songs",
    "score high too — it's a mirror, not a verdict.)",
]
yy = by+64
for ln in lines:
    d.text((PAD+26, yy), ln, font=small, fill=DIM); yy += 32
d.text((PAD+26, by+200), "free + on-device · Humanize AI Slop Lyrics", font=foot, fill=(120,125,135))

out = "/home/potentiallyhumanspark/projects/28_suno_slop_detector/store/reddit_0_tells.png"
im.save(out)
print("saved", out, im.size)
