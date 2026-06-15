#!/usr/bin/env node
/* Wire corpus/model_v9.json into the browser as globalThis.SLOP_MODEL_V8.
 * The detector model file is named model_v8.browser.js for load-order stability, but it CARRIES v9
 * (deterministic full-batch + Platt calibration + bands). v8-score.browser.js reads platt/bandLow/bandHigh
 * generically from the model object, so no scorer change is needed on a retrain — just regenerate this file.
 *
 * Writes src/ext/model_v8.browser.js (the single source). Run app/sync_engine.sh afterwards to copy
 * src/ -> app/engine, then build/package*.sh to rebuild dist/. ~1.1MB < AMO's 4MB limit, so NO split needed.
 */
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/model_v9.json'), 'utf8'));
const hdr = `/* model_${m.version} — DETERMINISTIC ${m.solver}, min_df=${m.minDF}, Platt-calibrated. ` +
  `CV ${m.cvAcc}%, AUC ${m.auc}, MCC ${m.mcc}, ${Object.keys(m.wBow).length} bow + ${m.denseNames.length} dense. ` +
  `globalThis.SLOP_MODEL_V8 (carries v9). */\n`;
const body = hdr + 'globalThis.SLOP_MODEL_V8 = ' + JSON.stringify(m) + ';\n';
const target = path.join(ROOT, 'src/ext/model_v8.browser.js');
fs.writeFileSync(target, body);
console.log('wired', m.version, '->', target, '(' + body.length + ' bytes,', Object.keys(m.wBow).length, 'bow,', m.denseNames.length, 'dense)');
console.log('next: bash app/sync_engine.sh && bash build/package.sh && bash build/package_chrome.sh');
