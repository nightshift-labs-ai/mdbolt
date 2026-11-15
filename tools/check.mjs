// Compare parse() against a set's reference. Usage: node tools/check.mjs [setDir]  (setDir has input/cases.json, reference/expected.json; default KIT/practice)
import { readFileSync } from 'node:fs';
import { parse } from '../parse.js';
const KIT = process.env.KIT || '/home/agent/makefun-kit/mdspeed02/x_s222/markdown-render-speed-02-kit';
const SET = process.argv[2] || KIT + '/practice';
const cases = JSON.parse(readFileSync(SET + '/input/cases.json', 'utf8'));
const ref = JSON.parse(readFileSync(SET + '/reference/expected.json', 'utf8')).cases;
const byId = new Map(ref.map((c) => [c.id, c.html]));
const expected = cases.map((c) => byId.get(c.id));
let pass = 0; const bad = [];
for (let i = 0; i < cases.length; i++) {
  let got; try { got = parse(cases[i].markdown); } catch (e) { got = 'THROW: ' + e.message; }
  if (got === expected[i]) pass++; else bad.push(i);
}
console.log(`${SET}: passed ${pass}/${cases.length}`);
for (const i of bad.slice(0, 3)) {
  const got = parse(cases[i].markdown), exp = expected[i];
  let j = 0; while (j < got.length && got[j] === exp[j]) j++;
  console.log(`--- case ${cases[i].id} first diff at ${j}\n exp: ${JSON.stringify(exp.slice(Math.max(0, j - 40), j + 60))}\n got: ${JSON.stringify(got.slice(Math.max(0, j - 40), j + 60))}`);
}
process.exit(bad.length ? 1 : 0);
