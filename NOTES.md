# Notes for the next session

## Session 4 (2026-11-15): inline plain-text fast path kept; block dispatch and list split reverted

| state | ours | baseline | ratio |
|---|---|---|---|
| + plain-text fast path in `#e` (A/B vs prior HEAD: 0.870 vs 0.900 s) | 0.790 s | 0.910 s | 1.152x (coldbench 9) |

- Kept: `#e` returns early when `mbPlain` (`/[\\<!\[`*_~@]|  \n|:\/\/|www\.|mailto:|xmpp:|http/i`) does not match.
  It emits the single text token that inlineText would produce (`Ie`-escaped unless inRawBlock, merged into a
  preceding text token). It is skipped when inline extensions exist. Note that the 18.1.3 text rule stops before any
  case-insensitive `http`, even without `://`, and `Ie` depends on context (`&...;`), so every split point has to be
  excluded, not only the rule start characters. 0 diffs in 80k random strings.
- Reverted (neutral in cold A/B, 0 diffs in random tests, so exact but not faster):
  - Block first-char dispatch (skip code..def when the first char is >32 and not ``#*+-_`~<>[`` or a digit):
    0.820 vs 0.800 s, then 0.870 vs 0.880 s.
  - The list loop uses `indexOf`+`slice` instead of `split("\n",1)[0]`: 0.840 vs 0.830 s.
- Tool: a random differential test against `vendor/marked/marked.esm.js` (inline it with `node --input-type=module -e`;
  keep it out of the repo, since fuzz data is not committed).
- Next, ranked: (1) extend the fast path inside `#t`: when the *remaining* run passes `mbPlain`, emit it as one text
  token there too (this catches tails after an emphasis or link). (2) A cheaper `#n` mask: build it only when the run
  really has `*`/`_` delimiters next to word boundaries. (3) Profile cold again with `--cpu-prof` to see what is left
  now. Block/list micro-cuts do not show up in cold runs.

## Session 3 (2026-11-15): list RegExp cache; two neutral attempts reverted

| state | ours | baseline | ratio |
|---|---|---|---|
| + list item RegExp cached per bullet (`liRe` Map) | 0.830 s | 0.900 s | 1.084x |
| same commit, re-measured at session end | 0.770 s | 0.840 s | 1.091x |

- Kept: `listItemRegex(r)` was rebuilt for every list. It now comes from a module-level Map keyed by the bullet
  pattern. The regex is not global/sticky, so sharing it is stateless. The per-indent regexes were already memoised
  by marked's `D()`.
- Reverted, because a direct cold A/B against HEAD (13 alternating runs) showed no difference:
  - emStrong without `[...str]` spreads (surrogate-aware `charCodeAt` arithmetic; exact, with 0 diffs in 60k random
    emoji/lone-surrogate strings): 1.010 s vs 1.000 s.
  - lheading pre-check `/\n(?: {0,3}[=-]|\s*?\n)/` (skip lheading when the first hit is a blank line; exact, with 0
    diffs in 80k random setext strings): 0.810 s vs 0.810 s.
  - list item loop skips its 6 break regexes when the line's first non-space char is not one of
    `` `~#<>*+-_ `` or a digit (exact, with 0 diffs in 80k random list strings): 0.850 s vs 0.820 s, so not faster.
- Measured: `node -e 0` and importing parse.js each cost ~10 ms CPU, so start-up does not matter. The ~0.8 s is
  parsing + JSON + JIT warm-up, about 2x the warm per-pass time. Changes worth ~1% are lost in cold-run noise.
  Only structural cuts in work done per character (fewer JS steps in interpreter/baseline tiers, fewer regex
  calls) will show up.
- A/B method: `git archive HEAD | tar -x -C /tmp/abhead`, then alternate `node main.ts` and `node /tmp/abhead/main.ts`
  (13 runs each, median user+sys). This is more sensitive than comparing the ratios of two coldbench runs.
- Next, ranked: (1) plain-text fast path in `#t`: when a run has none of ``\<[!*_`~`` and no `@`/`://`/`www.`/double
  space+newline, emit a single text token and skip the GFM text regex, `#n` and inlineText. This is the largest
  untouched inline cost (text RegExp 5.8% + `#n` 2.8% + inlineText 1.6%). (2) Block first-char dispatch, so that a
  line starting with a plain letter skips the code/fences/heading/hr/blockquote/list/html/def regexes (table and
  lheading can still start with a letter, so keep those).
  (3) Fewer allocations per token (GC is 9.3% of the baseline profile), e.g. avoid the per-line `split`/`substring`
  in the list loop by working with offsets.

## Session 2 (2026-11-15): cold numbers and what was done

Score = CPU of one cold `node main.ts` run, so measure with `tools/coldbench.sh [N]` (fresh processes, alternating
ours/baseline, median user+sys). Gate every parser change with `tools/checkall.sh` (practice + 6 fuzz draws in
/home/agent/makefun/mdfuzz/s1..s6/out, all must be 720/720).

| state | ours | baseline | ratio |
|---|---|---|---|
| start (lean pipeline only) | 1.150 s | 1.190 s | 1.035x |
| + fork, inline first-char dispatch | 1.060 s | 1.110 s | 1.047x |
| + fe() early return (no `*_~`) | 1.020 s | 1.060 s | 1.039x (noise) |

The machine drifts by about 5% between runs, so only compare ratios from the same coldbench run.
- marked is now forked as `marked-fork.js` (vendor/ stays as the untouched reference). The Lexer's inline loop uses private
  `#` methods, so overriding prototypes from outside cannot reach it; edit the fork instead (with node string replaces on
  unique anchors, since the file is minified).
- Done: first-character dispatch in `#t` (rule first chars checked: `\` escape/br, `<` tag/autolink, `[`/`!` link/reflink,
  `*`/`_` emStrong (+url for `_`), `` ` `` codespan, space br, `~` del, `[A-Za-z0-9._+-]` url); `fe()` early return.
- The gains are small because cold cost is dominated by start-up/JIT, not by the skipped regex calls.
- Next, ranked: (1) plain-text fast path that skips `#n`/Ae/inlineText for runs with no special chars; (2) cache the list
  tokenizer's per-list RegExps; (3) block first-char dispatch (skip lheading/table/etc.); (4) escape `P` quick return;
  (5) skip `#n` replace passes piecewise (reflinkSearch only when links non-empty is already done; blockSkip only if
  `` ` `` or `<` present).

## Where the time goes (practice set, `node --cpu-prof`, 20 passes x 720 cases, self time)

| self % | where |
|---|---|
| 11.9 | Tokenizer `list` (item splitting, re-lexing each item, per-item RegExp builds via `T.listItemRegex` etc.) |
| 7.4 | `inline.text` RegExp (GFM text rule with lookaheads for url/email/www) |
| 6.3 | GC |
| 6.0 | `Lexer.inlineTokens` |
| 5.2 | `#n` = emStrong/del mask (reflinkSearch, anyPunctuationOutsideCode, blockSkip replaces on every inline run) |
| 4.7 | `#t` inline loop |
| 4.7 | Tokenizer `emStrong` (`[...str]` spreads, RDelim regex) |
| 3.9 | `Lexer.lex` (CR normalisation + inline queue drain) |
| 3.0 | `#e` |
| 2.3 | `lheading` RegExp (runs before paragraph on every block) |
| ~2 each | `blockTokens`, `parseInline`, `link`, `inlineText`, escape `P` |

Dropping `marked.parse()`'s wrapper gained only ~2% (365.9 vs 372.9 ms/pass), so the real gains are inside the
lexer.

## Ranked exact-semantics optimisations

1. **First-character dispatch in the inline loop (`#t`).** Each rule only matches when it starts with a few
   characters (escape `\`, tag/autolink `<`, link/reflink `[`/`!`, emStrong `*`/`_`, codespan `` ` ``, br space/`\`,
   del `~`, url `h`/`w`/`f`/email chars). Look at `src.charCodeAt(0)` and skip rules that cannot match. Check that every
   rule really begins with `^` and a fixed set of first characters.
2. **Plain-text fast path.** When a run contains none of ``\<[!*_`~`` and no `@`, `://` or `www.`, emit one text token
   (escaped with `P`) and skip `#n`, the regexes and `inlineText`.
3. **Skip the `#n` mask** when the text has no `*`, `_` or `~` (marked already checks this); also cache the
   `reflinkSearch` pass when `links` is empty.
4. **`list` tokenizer:** cache the per-indent RegExps it builds for each list (keyed by indent/bullet), and avoid the
   `substring` re-slicing of the remaining source for every line.
5. **Block dispatch:** test only the block rules that can start with the first non-space character (`#`, `>`, `-*+`,
   digits, `` ` ``/`~`, `<`, `|`, 4 spaces/tab), and keep paragraph/lheading as the fallback. lheading costs 2.3%
   because it runs on every paragraph candidate.
6. **Faster escape `P`:** a single `charCodeAt` scan with a quick return when nothing needs escaping, building the
   string only if needed.
7. **Use offsets instead of `src = src.substring(raw.length)`** in the block and inline loops, using sticky (`y`)
   regexes with `lastIndex`. This is a bigger rewrite and needs careful checks against `^` anchors and lookbehinds.
8. Cut allocations (token objects, `[...s]` spreads in emStrong/del) to reduce the 6% GC share.

Every change must keep `tools/check.mjs` at 720/720. Also differentially fuzz it against vendor marked using the
kit's `program/generator`, because the scored set is a new draw.
