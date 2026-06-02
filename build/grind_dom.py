#!/usr/bin/env python3
"""Grind Suno lyrics via the Firefox DevTools console (DOM-based, no pixel clicking).
Usage: python3 build/grind_dom.py concepts.txt
Requires: Firefox maximized, console open + paste-enabled, on suno.com/create wizard."""
import sys, os, subprocess, time, json, random, re, glob, functools
print=functools.partial(print,flush=True)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT,'corpus','suno_capture','simple','suno')
SW = "10485783"
def x(*a): subprocess.run(["env","DISPLAY=:1","xdotool",*a],capture_output=True)
def setclip(s): subprocess.run(["env","DISPLAY=:1","xclip","-selection","clipboard"],input=s.encode(),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def getclip(): return subprocess.run(["env","DISPLAY=:1","xclip","-selection","clipboard","-o"],capture_output=True).text if False else subprocess.run(["env","DISPLAY=:1","xclip","-selection","clipboard","-o"],capture_output=True,text=True).stdout

def mem_ok(min_mb=3500):
    try:
        m=open("/proc/meminfo").read()
        import re; a=int(re.search(r"MemAvailable:\s+(\d+)",m).group(1))//1024
        return a>=min_mb, a
    except: return True, 99999

def run_js(js):
    x("windowactivate",SW); time.sleep(0.15)
    setclip(js); time.sleep(0.1)
    x("mousemove","250","1890","click","1"); time.sleep(0.25)
    x("key","--clearmodifiers","ctrl+v"); time.sleep(0.25)
    x("key","--clearmodifiers","Return"); time.sleep(0.7)
    return getclip()

GEN = '''(function(c){
 var ta=[...document.querySelectorAll('textarea')].find(e=>/describe the lyrics you want/i.test(e.placeholder||''));
 var s=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
 s.call(ta,c); ta.dispatchEvent(new Event('input',{bubbles:true}));
 var b=[...document.querySelectorAll('button')].find(x=>/^write lyrics$/i.test(x.innerText.trim()));
 b.click(); copy('OK');})(%s)'''

LENS = '''copy([...document.querySelectorAll('.whitespace-pre-wrap')].filter(e=>/\\[(Verse|Intro|Chorus|Pre-?Chorus)\\]/i.test(e.innerText)).map(e=>e.innerText.length).join(','))'''
EXTRACT = '''copy([...document.querySelectorAll('.whitespace-pre-wrap')].filter(e=>/\\[(Verse|Intro|Chorus|Pre-?Chorus)\\]/i.test(e.innerText)).map(e=>e.innerText).join('\\n=====SPLIT=====\\n'))'''

def capture(text, slug):
    open('/tmp/opt.txt','w').write(text)
    r = subprocess.run(['python3',os.path.join(ROOT,'build','capture_suno.py'),'/tmp/opt.txt',slug],capture_output=True,text=True)
    return (r.stdout or r.stderr).strip()

concepts = [l.strip() for l in open(sys.argv[1]) if l.strip()]
for n,concept in enumerate(concepts,1):
    if len(glob.glob(os.path.join(DIR,'*.txt'))) >= 100:
        print('REACHED 100 — stopping'); break
    if n>1: 
        w=random.randint(5,30); print(f"...pace {w}s..."); time.sleep(w)
    slug = re.sub(r'[^a-z0-9]+','-',concept.lower())[:26]
    ok,avail=mem_ok()              # MEMGUARD: never push the shared RAM/VRAM toward OOM (LTX in other terminal)
    waited=0
    while not ok and waited<1800:
        print(f"   [MEMGUARD] only {avail}MB free — pausing 60s"); time.sleep(60); waited+=60; ok,avail=mem_ok()
    run_js(GEN % json.dumps(concept))
    print(f"[{n}/{len(concepts)}] GEN: {concept}")
    # poll until lyric box lengths are stable (streaming done)
    time.sleep(11); prev=None; stable=0
    for _ in range(12):
        lens = run_js(LENS).strip()
        if lens and lens==prev: stable+=1
        else: stable=0
        prev=lens
        if stable>=2 and lens and lens!='0': break
        time.sleep(3)
    # extract + capture both options
    res = run_js(EXTRACT)
    parts=[p.strip() for p in res.split('=====SPLIT=====') if p.strip() and '[' in p]
    for i,p in enumerate(parts):
        print("  ", capture(p, f"{slug}-{i+1}"))
    print(f"  corpus: {len(glob.glob(os.path.join(DIR,'*.txt')))}/100")
print("BATCH DONE")
