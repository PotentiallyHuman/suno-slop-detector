#!/usr/bin/env python3
"""
next_briefs.py — print N human-style Suno requests as JSON for Claude to write.

Each line of the run-loop calls this, reads the briefs, then writes the actual
lyrics (Claude IS the AI generator here — no local model, ~0 memory).

    python3 next_briefs.py 10

Output: a JSON object {"ts": iso, "briefs": [{index, brief, meta}, ...]}
Feed each brief's lyrics back via save_batch.py.
"""
import datetime as dt
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import briefs  # noqa: E402


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    ts = dt.datetime.now()
    items = []
    for i in range(1, n + 1):
        text, meta = briefs.make_brief()
        items.append({"index": i, "brief": text, "meta": meta})
    print(json.dumps({"ts": ts.isoformat(timespec="seconds"), "briefs": items},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
