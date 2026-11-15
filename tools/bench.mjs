// CPU time of N passes over the practice cases, ours vs the kit baseline. Usage: node tools/bench.mjs [N]
import { readFileSync } from 'node:fs';
import { parse as ours } from '../parse.js';
const KIT = process.env.KIT || '/home/agent/makefun-kit/mdspeed02/x_s222/markdown-render-speed-02-kit';
const { parse: base } = await import(KIT + '/baselines/parse.js');
const cases = JSON.parse(readFileSync(KIT + '/practice/input/cases.json', 'utf8')).map((c) => c.markdown);
const N = +(process.argv[2] || 15);
function run(fn) {
  for (let w = 0; w < 3; w++) for (const m of cases) fn(m);
  const t = [];
  for (let r = 0; r < N; r++) {
    const c0 = process.cpuUsage();
    for (let i = 0; i < cases.length; i++) fn(cases[i]);
    const c = process.cpuUsage(c0); t.push((c.user + c.system) / 1000);
  }
  t.sort((a, b) => a - b); return t[N >> 1];
}
const b = run(base), o = run(ours), b2 = run(base), o2 = run(ours);
const bm = Math.min(b, b2), om = Math.min(o, o2);
console.log(`baseline ${bm.toFixed(1)} ms/pass, mdbolt ${om.toFixed(1)} ms/pass, speedup ${(bm / om).toFixed(3)}x (${cases.length} cases, median of ${N})`);
