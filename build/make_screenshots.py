#!/usr/bin/env python3
"""Render store screenshots (1280x800) + a promo tile using SYNTHETIC lyrics and
real engine numbers from /tmp/shot_data.json — so no real Suno user is shown."""
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "store")
os.makedirs(OUT, exist_ok=True)
data = json.load(open("/tmp/shot_data.json"))
bot = Image.open(os.path.join(ROOT, "icons", "icon128.png")).convert("RGBA")

def F(sz, bold=False):
    return ImageFont.truetype("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", sz)

def color(score):
    return (255,77,77) if score>=70 else (255,159,28) if score>=45 else (255,210,63) if score>=25 else (95,208,104)

def rr(d, box, r, **kw): d.rounded_rectangle(box, radius=r, **kw)

def chip(d, x, y, text, fnt, fg=(230,230,230)):
    w = d.textlength(text, font=fnt); pad=10; h=26
    rr(d, [x, y, x+w+pad*2, y+h], 8, fill=(32,32,38), outline=(70,70,78))
    d.text((x+pad, y+5), text, font=fnt, fill=fg); return w+pad*2+6

def render(shot, path, caption):
    W,H = 1280,800
    img = Image.new("RGB",(W,H),(14,14,17)); d=ImageDraw.Draw(img)
    acc = color(shot["final"])
    # caption band
    d.rectangle([0,0,W,70], fill=(20,20,25))
    d.text((40,22), caption, font=F(26,True), fill=(235,235,235))
    # faux suno header
    d.rectangle([0,70,W,126], fill=(23,23,28))
    d.ellipse([40,84,72,116], fill=(60,60,70)); d.text((84,90),"suno.com / song",font=F(18),fill=(140,140,150))
    # lyrics card (left) — clearly synthetic
    rr(d,[60,160,640,740],16,fill=(23,23,28))
    d.text((84,184),"“Demo Song”  ·  synthetic lyrics (not a real song)",font=F(16),fill=(150,150,160))
    y=240
    for line in shot["text"].split("\n"):
        d.text((84,y),line,font=F(21),fill=(205,205,210)); y+=40
    # badge (top-right)
    bx,by=1090,150; bs=28
    botr=bot.resize((bs,bs)); pct=f'{shot["final"]}%'
    pw=d.textlength(pct,font=F(20,True)); bw=bs+12+pw+28
    rr(d,[1200-bw,by,1200,by+44],22,fill=(18,18,22),outline=acc,width=2)
    img.paste(botr,(int(1200-bw+14),by+8),botr)
    d.text((1200-bw+14+bs+8,by+11),pct,font=F(20,True),fill=acc)
    # panel
    px,py,pw2=720,212,480; d.rounded_rectangle([px,py,px+pw2,py+520],14,fill=(18,18,22),outline=(40,40,46))
    d.text((px+20,py+18),f'{shot["final"]}% AI',font=F(46,True),fill=acc)
    verdict=shot["verdict"].encode("ascii","ignore").decode().strip()
    d.text((px+200,py+40),verdict,font=F(18),fill=(200,200,200))
    d.text((px+22,py+82),f'cliche lexicon {shot["lexicon"]}%   ·   vs AI corpus {shot["corpus"]}%',font=F(14),fill=(140,140,140))
    # bars
    bd=shot["breakdown"]; rows=[("Cliche words",bd["words"]),("Stock phrases",bd["phrases"]),("Lazy rhymes",bd["rhymes"]),("Repetition",bd["repetition"]),("Section tags",bd["sectionTags"])]
    mx=max(0.5,*[v for _,v in rows]); yy=py+120
    for name,v in rows:
        d.text((px+22,yy),name,font=F(14),fill=(185,185,185))
        tx=px+170; tw=pw2-190
        rr(d,[tx,yy+3,tx+tw,yy+15],6,fill=(40,40,46))
        fillw=int(tw*max(0,v)/mx)
        if fillw>4: rr(d,[tx,yy+3,tx+fillw,yy+15],6,fill=acc)
        yy+=30
    # chips
    yy+=14; d.text((px+22,yy),"CLICHE WORDS FOUND",font=F(12,True),fill=(130,130,130)); yy+=24
    cx=px+22
    words=shot["words"]
    if words:
        for w in words:
            adv=chip(d,cx,yy,w,F(14),fg=(255,123,123))
            cx+=adv
            if cx>px+pw2-90: cx=px+22; yy+=34
    else:
        d.text((px+22,yy),"none — refreshingly original",font=F(15),fill=(108,192,112))
    yy+=46
    if shot["phrases"]:
        d.text((px+22,yy),"STOCK PHRASES",font=F(12,True),fill=(130,130,130)); yy+=24
        cx=px+22
        for p in shot["phrases"][:3]:
            cx+=chip(d,cx,yy,f'“{p}”',F(14),fg=(255,123,123))
    d.text((px+20,py+498),"Reads only the lyrics box  ·  heuristic, not a verdict",font=F(12),fill=(120,120,120))
    img.save(path); print("wrote",os.path.relpath(path,ROOT))

render(data["ai"], os.path.join(OUT,"screenshot_1_ai.png"), "How AI do your Suno lyrics read?")
render(data["hu"], os.path.join(OUT,"screenshot_2_human.png"), "Real-songwriting style scores low — it's fair, not a witch hunt")

# promo tile 440x280
img=Image.new("RGB",(440,280),(14,14,17)); d=ImageDraw.Draw(img)
b=bot.resize((96,96)); img.paste(b,(28,40),b)
d.text((140,52),"Suno Slop",font=F(34,True),fill=(235,235,235))
d.text((140,92),"Detector",font=F(34,True),fill=(255,77,77))
d.text((30,170),"How AI do the lyrics read?",font=F(19),fill=(180,180,185))
d.text((30,205),"Private · on-device · for fun",font=F(16),fill=(130,130,140))
img.save(os.path.join(OUT,"promo_tile_440x280.png")); print("wrote store/promo_tile_440x280.png")
