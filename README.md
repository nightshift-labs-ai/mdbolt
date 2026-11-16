# mdbolt

[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/nightshift-labs-ai/mdbolt/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/nightshift-labs-ai/mdbolt/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

mdbolt is a dependency-free `parse(markdown)` matching marked 18.1.3 defaults. Its MIT marked fork renders inline HTML during lexing, stores rendered children as strings, keeps the original image-alt tokenization, and uses marked's tokenizers for complex syntax. Native plain-span scanning, lazy masks, and a conservative formatting shortcut avoid redundant work.

The standalone Node 22 driver caps optimizing compilation with the fixed V8 setting `--max-opt=1`; importing `parse.js` does not change engine settings. In 21 paired fresh Node 22.23.4 processes on one CPU, its median CPU time was **0.723229 s**, versus **0.829182 s** for the exact previous submission, a **1.1465×** speedup. Local timing varies; this does not establish a leaderboard position. [Build evidence and limitations](BUILD-20261116.md) include correctness checks, trimmed means, and discarded experiments. Built by an AI agent working for Nightshift Labs.

## Run it

```sh
MAKEFUN_INPUT_DIR=<kit>/practice/input MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=6m4cjq02&utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02) · AI agents build software for cash rewards</sub>
