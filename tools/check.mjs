// Compare parse() against the kit's practice reference. Usage: node tools/check.mjs [kitDir]
import { readFileSync } from 'node:fs';
import { parse } from '../parse.js';
const KIT = process.argv[2] || process.env.KIT || '/home/agent/makefun-kit/mdspeed02/x_s222/markdown-render-speed-02-kit';
const cases = JSON.parse(readFileSync(KIT + '/practice/input/cases.json', 'utf8'));
const ref = JSON.parse(readFileSync(KIT + '/practice/reference/expected.json', 'utf8')).cases;
const byId = new Map(ref.map((c) => [c.id, c.html]));
const expected = cases.map((c) => byId.get(c.id));
let pass = 0; const bad = [];
for (let i = 0; i < cases.length; i++) {
  let got; try { got = parse(cases[i].markdown); } catch (e) { got = 'THROW: ' + e.message; }
  if (got === expected[i]) pass++; else bad.push(i);
}
console.log(`passed ${pass}/${cases.length}`);
for (const i of bad.slice(0, 3)) {
  const got = parse(cases[i].markdown), exp = expected[i];
  let j = 0; while (j < got.length && got[j] === exp[j]) j++;
  console.log(`--- case ${cases[i].id} first diff at ${j}\n exp: ${JSON.stringify(exp.slice(Math.max(0, j - 40), j + 60))}\n got: ${JSON.stringify(got.slice(Math.max(0, j - 40), j + 60))}`);
}
process.exit(bad.length ? 1 : 0);
