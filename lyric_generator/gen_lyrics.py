#!/usr/bin/env python3
"""
gen_lyrics.py — generate a batch of AI song lyrics for the detection corpus.

Design goals (per project constraints):
  * LOW MEMORY: short-lived process; one local model loaded at a time;
    model is UNLOADED at the end of every batch so idle RAM ~= 0.
  * DON'T STARVE THE GPU: ollama is invoked normally but the model is
    evicted right after, and the wrapper runs us at nice 19.
  * AUTONOMOUS: pure stdlib, no API keys, runs from cron forever.

Each song is written as its own markdown file with YAML frontmatter holding
the labeled features (strategy, genre, subject, model, etc.) + the lyrics body.

Usage:
    python3 gen_lyrics.py            # uses config.json
    python3 gen_lyrics.py --n 3      # override count (smoke test)
    python3 gen_lyrics.py --model qwen2.5:3b
"""
import argparse
import datetime as dt
import json
import os
import random
import re
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import briefs  # noqa: E402

CONFIG_PATH = os.path.join(HERE, "config.json")
STATE_PATH = os.path.join(HERE, "state.json")

DEFAULT_CONFIG = {
    "ollama_url": "http://localhost:11434",
    "output_dir": os.path.abspath(os.path.join(HERE, "..", "corpus", "ai_lyrics")),
    "n_per_run": 10,
    # weighted model rotation — mostly small (low memory), some bigger for
    # source diversity (a sharper detector baseline). One model per run.
    "models": [
        {"name": "qwen2.5:3b",       "weight": 4},
        {"name": "qwen2.5:14b",      "weight": 4},
        {"name": "qwen3-coder:30b",  "weight": 1},
        {"name": "llava:13b",        "weight": 1}
    ],
    "keep_alive": "8m",       # during the batch; explicit unload after
    "temperature_range": [0.7, 1.05],
    "num_predict": 700,       # cap tokens per song
    "timeout_s": 240
}

SYSTEM_PROMPT = (
    "You are a human songwriter writing lyrics to paste into Suno. "
    "Follow the request exactly, including any structure tags, rhyme schemes, "
    "or constraints. Output ONLY the finished song lyrics. Use Suno-style "
    "section tags like [Verse], [Chorus], [Bridge] where appropriate. "
    "Do not write any preamble, explanation, title line, or notes — just the lyrics."
)


def load_config():
    cfg = dict(DEFAULT_CONFIG)
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH) as f:
            cfg.update(json.load(f))
    return cfg


def pick_model(cfg):
    models = cfg["models"]
    pool = [m["name"] for m in models for _ in range(max(1, int(m.get("weight", 1))))]
    return random.choice(pool)


def ollama_chat(cfg, model, brief, temperature):
    url = cfg["ollama_url"].rstrip("/") + "/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": brief},
        ],
        "stream": False,
        "keep_alive": cfg["keep_alive"],
        "options": {
            "temperature": temperature,
            "num_predict": cfg["num_predict"],
        },
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=cfg["timeout_s"]) as resp:
        out = json.loads(resp.read().decode())
    return out["message"]["content"].strip()


def unload_model(cfg, model):
    """Free RAM/VRAM immediately so idle footprint is ~0 between hourly runs."""
    # Preferred: ask ollama to evict via keep_alive=0.
    try:
        url = cfg["ollama_url"].rstrip("/") + "/api/generate"
        payload = {"model": model, "prompt": "", "keep_alive": 0, "stream": False}
        req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=30).read()
    except Exception:
        pass
    # Belt-and-suspenders: CLI stop (no-op if already gone).
    try:
        subprocess.run(["ollama", "stop", model], timeout=30,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


def slugify(text, maxlen=40):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (s[:maxlen]).strip("-") or "song"


def yaml_escape(v):
    if isinstance(v, str) and (":" in v or v.startswith(("[", "{", "'", '"')) or "\n" in v):
        return json.dumps(v, ensure_ascii=False)
    return v


def write_song(cfg, ts, idx, brief, meta, model, lyrics, temperature):
    day = ts.strftime("%Y-%m-%d")
    out_dir = os.path.join(cfg["output_dir"], day)
    os.makedirs(out_dir, exist_ok=True)
    sid = ts.strftime("%Y%m%dT%H%M%S") + f"_{idx:02d}"
    subj = meta.get("subject") or meta.get("genre") or "song"
    fname = f"{sid}_{slugify(subj)}.md"
    path = os.path.join(out_dir, fname)

    fm = {
        "id": sid,
        "source": "ai",
        "engine": "ollama",
        "model": model,
        "generated_at": ts.isoformat(timespec="seconds"),
        "strategy": meta.get("strategy"),
        "genre": meta.get("genre"),
        "subject": meta.get("subject"),
        "mood": meta.get("mood"),
        "pov": meta.get("pov"),
        "constraint": meta.get("constraint"),
        "structure": meta.get("structure"),
        "title": meta.get("title"),
        "persona": meta.get("persona"),
        "occasion": meta.get("occasion"),
        "temperature": round(temperature, 3),
        "lang": "en",
    }
    lines = ["---"]
    for k, v in fm.items():
        if v in (None, ""):
            continue
        lines.append(f"{k}: {yaml_escape(v)}")
    # brief as a literal block (preserves the human-typed request verbatim)
    lines.append("brief: |")
    for bl in brief.splitlines() or [brief]:
        lines.append("  " + bl)
    lines.append("---")
    lines.append("")
    lines.append(lyrics)
    lines.append("")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    return path


def load_state():
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return {"total": 0, "runs": 0}


def save_state(state):
    tmp = STATE_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2)
    os.replace(tmp, STATE_PATH)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=None, help="songs this run")
    ap.add_argument("--model", default=None, help="force a single model")
    args = ap.parse_args()

    cfg = load_config()
    n = args.n if args.n is not None else cfg["n_per_run"]
    model = args.model or pick_model(cfg)

    ts0 = dt.datetime.now()
    print(f"[gen] {ts0.isoformat(timespec='seconds')} model={model} n={n}", flush=True)

    written, failures = [], 0
    try:
        for i in range(1, n + 1):
            brief, meta = briefs.make_brief()
            temp = round(random.uniform(*cfg["temperature_range"]), 3)
            ts = dt.datetime.now()
            try:
                lyrics = ollama_chat(cfg, model, brief, temp)
                if len(lyrics) < 40:
                    raise ValueError("output too short")
                path = write_song(cfg, ts, i, brief, meta, model, lyrics, temp)
                written.append(path)
                print(f"  [{i:02d}/{n}] {meta['strategy']:13s} -> {os.path.basename(path)}", flush=True)
            except Exception as e:
                failures += 1
                print(f"  [{i:02d}/{n}] FAILED ({meta.get('strategy')}): {e}", flush=True)
    finally:
        unload_model(cfg, model)  # always free memory, even on error

    state = load_state()
    state["total"] = state.get("total", 0) + len(written)
    state["runs"] = state.get("runs", 0) + 1
    state["last_run"] = ts0.isoformat(timespec="seconds")
    state["last_model"] = model
    save_state(state)

    dur = (dt.datetime.now() - ts0).total_seconds()
    print(f"[gen] done: {len(written)} written, {failures} failed, "
          f"{dur:.0f}s, corpus total={state['total']}", flush=True)
    return 0 if written else 1


if __name__ == "__main__":
    sys.exit(main())
