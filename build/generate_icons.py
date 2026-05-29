#!/usr/bin/env python3
"""Generate extension icons (robot head) at 16/32/48/128 px into icons/."""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (19, 19, 22, 255)
HEAD = (238, 238, 238, 255)
ACCENT = (255, 77, 77, 255)
DARK = (19, 19, 22, 255)

def rr(d, box, r, **kw):
    d.rounded_rectangle(box, radius=r, **kw)

for S in (16, 32, 48, 128):
    s = S * 4  # supersample for smooth edges
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rr(d, [0, 0, s - 1, s - 1], int(0.22 * s), fill=BG)          # rounded bg
    # antenna
    d.line([s * 0.5, s * 0.30, s * 0.5, s * 0.16], fill=ACCENT, width=max(1, int(0.05 * s)))
    r0 = int(0.055 * s)
    d.ellipse([s * 0.5 - r0, s * 0.13 - r0, s * 0.5 + r0, s * 0.13 + r0], fill=ACCENT)
    # head
    rr(d, [s * 0.20, s * 0.30, s * 0.80, s * 0.78], int(0.12 * s), fill=HEAD,
       outline=ACCENT, width=max(1, int(0.035 * s)))
    # eyes
    er = int(0.075 * s)
    for cx in (0.37, 0.63):
        d.ellipse([s * cx - er, s * 0.50 - er, s * cx + er, s * 0.50 + er], fill=ACCENT)
    # mouth
    rr(d, [s * 0.36, s * 0.64, s * 0.64, s * 0.69], int(0.02 * s), fill=DARK)
    img = img.resize((S, S), Image.LANCZOS)
    img.save(os.path.join(OUT, f"icon{S}.png"))
    print(f"wrote icons/icon{S}.png")
