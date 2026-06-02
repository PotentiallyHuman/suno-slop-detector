"""
corpus_io.py — canonical writer for one AI-lyric data point.

Both engines (Claude-in-the-loop, and the optional ollama batch script) write
through here so every file has identical, ingestable frontmatter.
"""
import datetime as dt
import json
import os
import re


def slugify(text, maxlen=40):
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (s[:maxlen]).strip("-") or "song"


def _yaml_val(v):
    if isinstance(v, str) and (":" in v or v.startswith(("[", "{", "'", '"', "#"))
                               or "\n" in v):
        return json.dumps(v, ensure_ascii=False)
    return v


def write_song(output_dir, ts, idx, brief, meta, lyrics,
               model, engine="claude", lang="en"):
    """Write one labeled markdown data point. Returns the path."""
    if isinstance(ts, str):
        ts = dt.datetime.fromisoformat(ts)
    day = ts.strftime("%Y-%m-%d")
    out_dir = os.path.join(output_dir, day)
    os.makedirs(out_dir, exist_ok=True)
    sid = ts.strftime("%Y%m%dT%H%M%S") + f"_{idx:02d}"
    subj = meta.get("subject") or meta.get("genre") or "song"
    path = os.path.join(out_dir, f"{sid}_{slugify(subj)}.md")

    fm = {
        "id": sid,
        "source": "ai",
        "engine": engine,
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
        "lang": lang,
    }
    if meta.get("temperature") is not None:
        fm["temperature"] = meta["temperature"]

    lines = ["---"]
    for k, v in fm.items():
        if v in (None, ""):
            continue
        lines.append(f"{k}: {_yaml_val(v)}")
    lines.append("brief: |")
    for bl in (brief or "").splitlines() or [brief or ""]:
        lines.append("  " + bl)
    lines.append("---")
    lines.append("")
    lines.append((lyrics or "").strip())
    lines.append("")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    return path
