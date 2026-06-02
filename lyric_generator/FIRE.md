# FIRE.md — what to do each 60-minute fire

You (Claude) are the AI lyric generator. Local memory cost must stay ~0:
**do NOT start ollama or any local model.** You write the lyrics yourself.

Each fire produces **10 full songs** for project 28's AI-lyrics detection corpus.

## Steps

1. Get 10 human-style Suno briefs:
   ```bash
   cd ~/projects/28_suno_slop_detector/lyric_generator && python3 next_briefs.py 10
   ```
   This prints `{ts, briefs:[{index, brief, meta}]}`.

2. **Write 10 complete songs**, one per brief. Pretend you are a human typing
   into Suno. Honor each brief's genre / persona / mood / POV / structure /
   constraint. Use Suno section tags (`[Verse] [Chorus] [Bridge] [Outro]`).
   Vary length, rhyme, and quality like real people do — some polished, some
   rough, some that lean into the gimmick. Real variety beats uniform polish.

3. Save the batch. Write a throwaway python file (avoids JSON escaping pain)
   modeled on `_batch_seed.py`: set `TS` to the `ts` from step 1, `MODEL` to
   the current model id, then list `(index, brief, meta, lyrics)` tuples using
   triple-quoted strings, and let it call `corpus_io.write_song(...)` +
   `bump_state(...)`. Run it:
   ```bash
   cd ~/projects/28_suno_slop_detector/lyric_generator && python3 _batch_<ts>.py
   ```

4. Report one line: `N written, corpus total=X` and the day folder.
   Then the loop sleeps until the next hour.

## Rules
- 10 songs, every fire. If a brief is awkward, write it anyway — awkward human
  prompts are real data points.
- Keep the `meta` from `next_briefs.py` verbatim in the saved file (those are
  the labels). Only the `lyrics` are yours to write.
- Never load a local model. Never block on GPU. This is pure text.
- Output lands in `../corpus/ai_lyrics/YYYY-MM-DD/`.
