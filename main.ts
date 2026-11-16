// mdbolt driver: one read, one indexed render loop, one write.
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from './parse.js';
import { setFlagsFromString } from 'node:v8';

// Limit optimizer compilation work in a fresh one-CPU process. The exported
// parser leaves process-wide engine settings untouched.
setFlagsFromString('--max-opt=1');

const inDir: string = process.env.MAKEFUN_INPUT_DIR || '/input';
const outDir: string = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const cases: { id: string; markdown: string }[] = JSON.parse(readFileSync(inDir + '/cases.json', 'utf8'));
const n = cases.length;
const out: string[] = new Array(n);
for (let i = 0; i < n; i++) out[i] = parse(cases[i].markdown);
writeFileSync(outDir + '/html.json', JSON.stringify(out));
