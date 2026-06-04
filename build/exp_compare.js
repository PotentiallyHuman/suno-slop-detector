// Compare the 3 independently-trained models (same AI, disjoint human sets).
// Weight cosine similarity = how identical the learned models are -> answers "is the model
// stable across the choice of human songs?" (high cosine = stable; low = human-choice matters).
const fs = require('fs');
const M = [0, 1, 2].map(k => JSON.parse(fs.readFileSync(`/tmp/exp_model_${k}.json`)));
function cos(a, b) { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / (Math.sqrt(na) * Math.sqrt(nb) || 1); }

console.log('=== 3 independent models: same AI, disjoint human sets ===\n');
console.log('model   nAI   nHuman   bias');
M.forEach((m, k) => console.log(`  ${k}    ${String(m.nAI).padStart(4)}   ${String(m.nHuman).padStart(4)}    ${m.bias.toFixed(3)}`));

console.log('\npairwise cosine similarity of learned weights:');
for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
  console.log(`  M${i} ~ M${j}:   dense ${cos(M[i].wDense, M[j].wDense).toFixed(4)}    bow ${cos(M[i].wBow, M[j].wBow).toFixed(4)}`);
}

// top dense features per model — do they agree on what matters?
console.log('\ntop-8 dense drivers per model (do they agree?):');
M.forEach((m, k) => {
  const top = m.denseNames.map((n, i) => [n, m.wDense[i]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);
  console.log(`  M${k}: ` + top.map(([n, w]) => `${n}${w > 0 ? '+' : ''}${w.toFixed(1)}`).join('  '));
});
console.log('\n(see /tmp/exp_model_{0,1,2}.log for each 5-fold CV)');
