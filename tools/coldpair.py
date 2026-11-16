#!/usr/bin/env python3
"""Paired fresh-process CPU benchmark; compare every output byte as well.

python3 tools/coldpair.py --node /path/to/node22 --cpu 3 --rounds 21 \
  --input /path/to/cases-directory --baseline /tmp/submitted/main.ts \
  --report /tmp/cpu-report.json
"""
import argparse
import json
import os
from pathlib import Path
import resource
import statistics
import subprocess
import tempfile

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--node', default='node')
p.add_argument('--cpu', type=int, required=True)
p.add_argument('--rounds', type=int, default=21)
p.add_argument('--input', type=Path, required=True)
p.add_argument('--candidate', type=Path, default=Path(__file__).resolve().parent.parent / 'main.ts')
p.add_argument('--baseline', type=Path, required=True)
p.add_argument('--report', type=Path, required=True)
a = p.parse_args()
if a.rounds < 1:
    p.error('--rounds must be positive')
paths = [a.candidate.resolve(), a.baseline.resolve()]
samples = [[], []]
with tempfile.TemporaryDirectory(prefix='mdbolt-coldpair-') as scratch:
    outs = [Path(scratch) / str(i) for i in range(2)]
    for out in outs:
        out.mkdir()
    for round_index in range(a.rounds):
        for k in range(2):
            i = (round_index + k) % 2
            env = dict(os.environ, MAKEFUN_INPUT_DIR=str(a.input.resolve()), MAKEFUN_OUTPUT_DIR=str(outs[i]))
            before = resource.getrusage(resource.RUSAGE_CHILDREN)
            run = subprocess.run(['taskset', '-c', str(a.cpu), a.node, str(paths[i])],
                                 env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            after = resource.getrusage(resource.RUSAGE_CHILDREN)
            if run.returncode:
                raise RuntimeError(f'{paths[i]} exited {run.returncode}: {run.stderr.decode()}')
            samples[i].append(after.ru_utime + after.ru_stime - before.ru_utime - before.ru_stime)
        if (outs[0] / 'html.json').read_bytes() != (outs[1] / 'html.json').read_bytes():
            raise RuntimeError(f'Output bytes differ in pair {round_index + 1}')
trim = a.rounds // 5
report = {'rounds': a.rounds, 'cpu': a.cpu, 'node': a.node, 'trim_each_tail': trim,
          'input': str(a.input.resolve()), 'outputs_identical_every_pair': True, 'entries': []}
for path, values in zip(paths, samples):
    central = sorted(values)[trim:len(values)-trim] if trim else values
    report['entries'].append({'path': str(path), 'samples': values,
                              'median': statistics.median(values),
                              'mean': statistics.mean(values),
                              'trimmed_mean': statistics.mean(central)})
a.report.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
