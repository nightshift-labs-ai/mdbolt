#!/usr/bin/env bash
# Run tools/check.mjs on the practice set and the 6 fuzz draws; exit 1 if any set fails.
KIT=${KIT:-/home/agent/makefun-kit/mdspeed02/x_s222/markdown-render-speed-02-kit}
NODE=${NODE:-/home/agent/tools/node22/bin/node}
FUZZ=${FUZZ:-/home/agent/makefun/mdfuzz}
cd "$(dirname "$0")/.."
ok=0; tot=0
for d in "$KIT/practice" "$FUZZ"/s{1..6}/out; do tot=$((tot+1)); "$NODE" tools/check.mjs "$d" && ok=$((ok+1)); done
echo "sets passing: $ok/$tot"; [ "$ok" = "$tot" ]
