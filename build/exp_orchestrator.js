// Autonomous overnight state-machine for the 3-independent-model experiment.
// Run by cron every few minutes. Each tick advances ONE step:
//   pipeline already running?            -> skip (no overlap)
//   all 3 models trained?               -> run compare once, then idle
//   next set's humans ready in cache?   -> train that model (standalone, EXP_OUT)
//   else                                -> run one gentle fetch pass (resumes cache)
// Same AI (all 2056) for every model; 3 DISJOINT human ranges. Survives SIGKILL (cron re-fires).
const fs = require('fs'), cp = require('child_process');
const ROOT = require('path').join(__dirname, '..');
const CACHE = '/tmp/human_lyrics_cache.json';
const NODE = process.execPath;
const LOG = '/tmp/exp_orch.log';
const log = (m) => { try { fs.appendFileSync(LOG, new Date().toISOString().slice(11, 19) + ' ' + m + '\n'); } catch (_) {} };
const sh = (cmd) => cp.execSync(cmd, { cwd: ROOT, stdio: 'ignore' });

// guard: never overlap a running pipeline
try { if (cp.execSync('pgrep -f "pipeline_tier3.js" || true').toString().trim()) { log('pipeline running — skip tick'); process.exit(0); } } catch (_) {}

const SETS = [[0, 2350], [2350, 2350], [4700, 2350]];   // disjoint queue ranges -> ~2056 usable each
const have = [0, 1, 2].map(k => fs.existsSync(`/tmp/exp_model_${k}.json`));

// all models done -> compare once, then idle
if (have.every(Boolean)) {
  if (!fs.existsSync('/tmp/exp_compare_done')) {
    log('all 3 models present -> running compare');
    try { const out = cp.execSync(`${NODE} ${ROOT}/build/exp_compare.js`, { cwd: ROOT }).toString();
      fs.writeFileSync('/tmp/exp_compare.out', out); fs.writeFileSync('/tmp/exp_compare_done', '1');
      log('COMPARE DONE -> /tmp/exp_compare.out'); } catch (e) { log('compare failed: ' + e.message); }
    process.exit(0);
  }
  if (!fs.existsSync('/tmp/v4_finalized')) {        // compare done -> finalize production v4 (train+bake+redteam)
    log('compare done -> finalizing production v4');
    try { sh(`bash ${ROOT}/build/finalize_v4.sh`); log('finalize_v4 pass ran'); } catch (e) { log('finalize err ' + e.message); }
    process.exit(0);
  }
  log('ALL DONE (experiment + v4 finalized) — idle');
  process.exit(0);
}

// replicate the pipeline's seeded human order so range checks align with HUMAN_RANGE slices
const hp = JSON.parse(fs.readFileSync(ROOT + '/corpus/human_profiles.json'));
let list = hp.profiles.filter(p => p.artist && p.title);
let _seed = 1234567; const _rnd = () => { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; };
for (let i = list.length - 1; i > 0; i--) { const j = (_rnd() * (i + 1)) | 0;[list[i], list[j]] = [list[j], list[i]]; }
const cache = JSON.parse(fs.readFileSync(CACHE));
const has = (k) => Object.prototype.hasOwnProperty.call(cache, k);
function setStat(st, ct) { let res = 0, us = 0; for (let i = st; i < st + ct && i < list.length; i++) { const k = list[i].artist + '' + list[i].title; if (has(k)) { res++; if (cache[k] && cache[k].length > 60) us++; } } return { res, us }; }

const k = have.findIndex(h => !h);          // lowest missing model
const [st, ct] = SETS[k];
const s = setStat(st, ct);
log(`model ${k} missing; set ${st}:${ct} resolved ${s.res}/${ct} usable ${s.us}`);

if (s.us >= 2000 || s.res >= ct - 25) {     // set k fetched enough -> train it
  log(`TRAINING model ${k} (humans ${st}:${ct}, ~${s.us} usable)`);
  try { sh(`NO_EMBED=1 CLAUDE_CAP=400 HUMAN_RANGE="${st}:${ct}" EXP_OUT="/tmp/exp_model_${k}.json" ${NODE} pipeline_tier3.js >> /tmp/exp_model_${k}.log 2>&1`);
    log(`model ${k} trained`); } catch (e) { log(`model ${k} train killed — cron will retry`); }
} else {                                     // not enough yet -> one gentle fetch pass
  log(`fetching (set ${k} not ready: ${s.us}/${ct})`);
  try { sh(`NO_EMBED=1 CLAUDE_CAP=400 FETCH_ONLY=1 FETCH_POOL=3 HUMAN_RANGE="0:7050" ${NODE} pipeline_tier3.js >> /tmp/fetch_humans.log 2>&1`); } catch (_) {}
}
