// Print the total number of non-qwen AI songs in the corpus (daemon uses this).
const fs = require("fs"), d = "corpus/models/";
let t = 0;
for (const f of fs.readdirSync(d).filter(x => x.endsWith(".json") && !/qwen/i.test(x))) {
  try { const j = JSON.parse(fs.readFileSync(d + f)); t += (j.songs || j).length; } catch (e) {}
}
console.log(t);
