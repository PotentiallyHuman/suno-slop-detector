#!/usr/bin/env bash
# try_change.sh "<commit description>" — the mechanical half of one overnight cycle.
# Assumes you've already edited src/ext/. Rebuilds, runs the A/B gate on random AI songs,
# and KEEPS THE BEST: promote+commit on a win, auto-revert to champion on a loss.
set -e
cd "$(dirname "$0")/.."
DESC="${1:-overnight tweak}"
OFFSET="${2:-0}"

# mirror to app engine + rebuild both dists (so dist/firefox is what the gate scores)
cp src/ext/humanizer-gen.browser.js app/engine/ext/humanizer-gen.browser.js
cp src/ext/cliche_swaps.browser.js app/engine/ext/cliche_swaps.browser.js
node --check src/ext/humanizer-gen.browser.js
node --check src/ext/cliche_swaps.browser.js
bash build/package.sh >/dev/null 2>&1
bash build/package_chrome.sh >/dev/null 2>&1

# A/B decide on 200 random AI songs (rotating offset so we don't overfit one sample)
set +e
node overnight/ab_gate.js 200 "$OFFSET"
WIN=$?
set -e

if [ "$WIN" -eq 0 ]; then
  # catastrophe tripwire: never accept a change that blows up a known case
  set +e; node build/benchmark_gate.js; CATA=$?; set -e
  if [ "$CATA" -ne 0 ]; then
    echo "RESULT: A/B win but benchmark catastrophe -> REVERTING"
    cp overnight/champion/humanizer-gen.browser.js src/ext/humanizer-gen.browser.js
    cp overnight/champion/cliche_swaps.browser.js src/ext/cliche_swaps.browser.js
    cp src/ext/humanizer-gen.browser.js app/engine/ext/humanizer-gen.browser.js
    cp src/ext/cliche_swaps.browser.js app/engine/ext/cliche_swaps.browser.js
    bash build/package.sh >/dev/null 2>&1; bash build/package_chrome.sh >/dev/null 2>&1
    exit 2
  fi
  echo "RESULT: ACCEPTED -> promoting champion + committing"
  cp src/ext/humanizer-gen.browser.js overnight/champion/humanizer-gen.browser.js
  cp src/ext/cliche_swaps.browser.js overnight/champion/cliche_swaps.browser.js
  node build/benchmark_gate.js --rebase >/dev/null 2>&1
  git add -A
  git commit -q -F - <<COMMIT
overnight: $DESC

A/B-validated on 200 random AI songs (keep-the-best). Champion promoted.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
COMMIT
  echo "COMMITTED: $DESC"
else
  echo "RESULT: REVERTED (challenger lost the A/B) -> restoring champion"
  cp overnight/champion/humanizer-gen.browser.js src/ext/humanizer-gen.browser.js
  cp overnight/champion/cliche_swaps.browser.js src/ext/cliche_swaps.browser.js
  cp src/ext/humanizer-gen.browser.js app/engine/ext/humanizer-gen.browser.js
  cp src/ext/cliche_swaps.browser.js app/engine/ext/cliche_swaps.browser.js
  bash build/package.sh >/dev/null 2>&1; bash build/package_chrome.sh >/dev/null 2>&1
  exit 1
fi
