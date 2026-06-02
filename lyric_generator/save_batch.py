#!/usr/bin/env python3
"""
save_batch.py — write a batch of Claude-written songs to the corpus.

Input: a JSON file (--json PATH) shaped as:
{
  "ts": "2026-05-30T14:30:00",        # optional; defaults to now
  "model": "claude-opus-4-8",          # which model wrote them
  "songs": [
    {"index": 1, "brief": "...", "meta": {...}, "lyrics": "..."},
    ...
  ]
}

Writes one labeled .md per song via corpus_io and prints the paths + a count.
"""
import argparse
import datetime as dt
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import corpus_io  # noqa: E402

CONFIG = os.path.join(HERE, "config.json")
STATE = os.path.join(HERE, "state.json")


def out_dir():
    d = os.path.abspath(os.path.join(HERE, "..", "corpus", "ai_lyrics"))
    if os.path.exists(CONFIG):
        try:
            with open(CONFIG) as f:
                d = json.load(f).get("output_dir", d)
        except Exception:
            pass
    return d


def bump_state(n, model):
    st = {"total": 0, "runs": 0}
    if os.path.exists(STATE):
        try:
            with open(STATE) as f:
                st = json.load(f)
        except Exception:
            pass
    st["total"] = st.get("total", 0) + n
    st["runs"] = st.get("runs", 0) + 1
    st["last_run"] = dt.datetime.now().isoformat(timespec="seconds")
    st["last_model"] = model
    tmp = STATE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(st, f, indent=2)
    os.replace(tmp, STATE)
    return st


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", required=True)
    args = ap.parse_args()
    with open(args.json) as f:
        batch = json.load(f)

    model = batch.get("model", "claude")
    base_ts = batch.get("ts")
    od = out_dir()
    written = []
    for song in batch["songs"]:
        ts = dt.datetime.fromisoformat(base_ts) if base_ts else dt.datetime.now()
        path = corpus_io.write_song(
            od, ts, song["index"], song.get("brief", ""),
            song.get("meta", {}), song["lyrics"],
            model=model, engine="claude")
        written.append(path)
        print("wrote", path)

    st = bump_state(len(written), model)
    print(f"[save_batch] {len(written)} songs; corpus total={st['total']}")


if __name__ == "__main__":
    main()
