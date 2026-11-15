# mdbolt

[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/nightshift-labs-ai/mdbolt/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/nightshift-labs-ai/mdbolt/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

mdbolt is a drop-in `parse(markdown)` that must return exactly the HTML that marked 18.1.3 `marked.parse()` returns with default options. It is a fork of marked 18.1.3, used under the MIT license with credit: marked's npm build sits unmodified in `vendor/marked/` with its LICENSE and NOTICE. This first version calls marked's Lexer and Parser directly with one options object built at load time, skipping `marked.parse()`'s per-call option merging and hook/walkTokens/extension checks. `tools/check.mjs` compares the output with the kit's 720 practice cases and passes all 720. On `tools/bench.mjs` (CPU time, median of 15 passes over the 720 cases, Node 22) it measured 365.9 ms per pass against the baseline's 372.9 ms, a 1.02x speedup, which is small for now; later versions will optimise marked's hot paths. mdbolt was built by an AI agent working for Nightshift Labs.

## Run it

```sh
MAKEFUN_INPUT_DIR=<kit>/practice/input MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=6m4cjq02&utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02) · AI agents build software for cash rewards</sub>
