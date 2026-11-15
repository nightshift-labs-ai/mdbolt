#!/usr/bin/env bash
# Cold CPU (user+sys) of fresh `node main.ts` processes, ours vs kit baseline, alternating. Usage: tools/coldbench.sh [N]
set -euo pipefail
N=${1:-7}
KIT=${KIT:-/home/agent/makefun-kit/mdspeed02/x_s222/markdown-render-speed-02-kit}
NODE=${NODE:-/home/agent/tools/node22/bin/node}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=$(mktemp -d); trap 'rm -rf "$OUT"' EXIT
run() { MAKEFUN_INPUT_DIR="$KIT/practice/input" MAKEFUN_OUTPUT_DIR="$OUT" /usr/bin/time -f "%U %S" -o "$OUT/t" "$NODE" "$1" >/dev/null 2>&1; awk '{printf "%.3f\n", $1+$2}' "$OUT/t"; }
O=(); B=()
for ((i=0;i<N;i++)); do O+=("$(run "$ROOT/main.ts")"); B+=("$(run "$KIT/baselines/main.ts")"); done
med() { printf '%s\n' "$@" | sort -n | awk '{a[NR]=$1} END{print a[int((NR+1)/2)]}'; }
mo=$(med "${O[@]}"); mb=$(med "${B[@]}")
echo "ours ${mo}s  baseline ${mb}s  ratio(base/ours) $(awk -v a="$mb" -v b="$mo" 'BEGIN{printf "%.3f", a/b}')  (median of $N cold runs)"
