# Notes for the next session

## Session 11 (2026-11-16): list allocation cuts neutral, reverted; `#n` pass counts

No parser change kept. Cold numbers unchanged from session 10 (HEAD pinned A/B runs this session: 0.630-0.660 s).

- Reverted (exact: 7/7 + s7-s10, 0/60k diffs in a random-list fuzz vs vendor/marked, but NOT faster): in `list`,
  `t[2].split("\n",1)[0]` and `e.split("\n",1)[0]` replaced by indexOf/slice, and the loose check's
  `filter(type==="space")` + `some(anyLine.test)` replaced by one loop (`anyLine` is `/\n.*\n/`, not global, so it
  is a pure predicate). Pinned A/B (13/13/13/13/21 runs): medians 0.620 vs 0.630, 0.650/0.650, 0.630/0.630,
  0.640 vs 0.650, 0.660/0.660; means within +-0.007 s either way. Small per-item allocations in `list` are not
  where the GC time goes. The per-indent regex factories (`nextBulletRegex` etc.) are already cached by `D()`.
- `#n` pass counts on the practice set (instrumented /tmp copy): 11,894 calls over 2.19 MB of inline source
  (avg 184 chars). Reflink replace runs 5,191 times, only 46 of them with an empty `tokens.links` (that is why
  session 10's empty-links skip was neutral). Punctuation pass 5,628 runs, blockSkip pass 7,059 runs.
- Next: (1) `#n` reflink pass: most docs define refs, so a skip needs something else, e.g. run it only when the
  source has `]` followed by `[` or a label that is in `links` (prove it exactly; the callback is a no-op for
  labels not in `links`). (2) GC 13.5%: allocation-profile first (`--heap-prof` or `--trace-gc` counts on a cold
  run) to find the real allocators before cutting; guessing at `list` failed. (3) SYNTHESIS item 7 (block
  first-char dispatch), `blockTokens` self 5.4%.

## Session 10 (2026-11-16): cold profile of HEAD; no-@/: text regex kept; bigger semi-space no gain

| state | ours | baseline | ratio |
|---|---|---|---|
| + text regex without email/mailto/xmpp/ftp:// alternatives when the rest of the source has no `@`/`:` (pinned A/B vs prior HEAD: 0.670 vs 0.690 s, then 0.690 vs 0.700 s; means 0.712/0.728, 0.732/0.756) | 0.690 s | 0.910 s | 1.319x (coldbench 9, pinned; baseline ran faster than session 9's 0.990 s) |

- Cold `--cpu-prof` of 8a60d74 (pinned, one run, 726 ms sampled), self time, top 12:
  GC 13.5% (98 ms) | `list` 7.5% | main.ts top level 6.5% (47 ms: JSON parse/stringify + loop) | mask `#n` 5.9% |
  `blockTokens` 5.4% | `#t` 4.8% | GFM text RegExp 3.5% | `emStrong` 2.9% | `parseInline` 2.6% | `link` 2.3% |
  `__require` (Node's internal loader for TS stripping, 15 ms; also paid by any .ts null entry) 2.0% | `#e` 1.8%.
  Non-lexing share: GC + main.ts + loader ~22%. Block-rule RegExp (paragraph interrupt) 1.6%, `table` 1.4%, `lex` 1.3%.
- Kept: `inlineText(l, l.length<nE)` with `nE=e.length-max(lastIndexOf("@"),lastIndexOf(":"))` computed at `#t`
  entry (the remaining `e` is a suffix, so it holds `@`/`:` iff its length >= nE). `textNE` drops only alternatives
  that need `@` or `:`. Pitfall found by the fuzz: marked's `protocol` expands UNGROUPED, so `protocol:\/\/` is
  really `[hH][tT][tT][pP][sS]?|[fF][tT][pP]:\/\/` (bare "http"/"https" ends a text run); keep that alternative.
  `zt` (breaks) sets `textNE:null` so it falls back to its own text rule. 0 diffs in 200k regex-vs-regex + 50k docs.
- Tried, no gain: `--max-semi-space-size=32/64` on the command line (5 pinned runs each, all within noise), so
  setting it from inside the program is not worth pursuing.
- Reverted (exact, 11/11 + 0 fuzz diffs, but not clearly faster): skip the `#n` reflinkSearch replace when
  `tokens.links` has no keys (`#hk` for-in check; with no links the callback returns every match unchanged).
  A/B 0.740 vs 0.700 s, then 0.750 vs 0.800 s (noisy machine, means 0.85/0.80 and 0.81/0.84).
- Next: (1) GC 13.5% is the largest item: cut allocations per token (list item `split`/`substring`, token object
  shapes, the mask string copies in `#n`). (2) `#n` 5.9% self: profile which pass dominates now. (3) SYNTHESIS item 7
  (block first-char dispatch) since `blockTokens` self is 5.4%. main.ts JSON work (47 ms) has no exact cut found.

## Session 9 (2026-11-16): emStrong `test` + group 5||6 once kept; fast text-run scan and punctuation `test` reverted

| state | ours | baseline | ratio |
|---|---|---|---|
| + emStrong `unicodeAlphaNumeric.test(n)` and `z=s[5]\|\|s[6]` read once (pinned A/B vs prior HEAD: 0.670 vs 0.700 s, means 0.716/0.735) | 0.690 s | 0.990 s | 1.435x (coldbench 9, pinned `NODE` wrapper `exec taskset -c 3 node "$@"`) |

- Kept: `unicodeAlphaNumeric` is `/[\p{L}\p{N}]/u` (not g/y), so `test` has the same truthiness as `match`. The RDelim
  loop's `else if(s[5]||s[6]||R){if(o&&(s[5]||s[6]))` becomes `let z=s[5]||s[6];if(z||R){if(o&&z)` (the branch
  before it always `continue`s). Keep truthiness here, not `!==void 0`, unless you prove that groups 5/6 never match "".
- Reverted, exact (0/300k diffs in a direct inlineText-vs-regex fuzz plus full docs, 11/11 sets) but SLOWER: SYNTHESIS
  item 6, a charCode scan for the end of the GFM text run (stop chars, ci "http", "www." after `[\s*_~(]`, a 2+ space
  run before `\n`, fallback to the regex on `@`/`:` or on an email-char run from the stop that reaches `@`). Pinned A/B
  0.750 vs 0.670 s twice. In cold runs the JS loop (interpreter/baseline tier) costs more than irregexp's native
  code. Do not retry it as a JS scan. A cheaper regex without the email/mailto alternatives when there is no `@`/`:`
  is still untested.
- Reverted (neutral): `punctuation.test` instead of `!!punctuation.exec` in emStrong (x2) and del (`/u`, exact):
  0.620 vs 0.630, then 0.640 vs 0.620 s.
- Pitfall: re-run `git archive HEAD` into /tmp/abhead after every commit, or the A/B compares against a stale HEAD.
- Next: (1) SYNTHESIS item 7 (block first-char dispatch with table/setext pre-filters; sessions 3-4 found the plain
  forms neutral, so only try it combined with a measured cold profile). (2) A fresh cold `--cpu-prof` to re-rank
  what is left. (3) The text regex without email/mailto alternatives, gated by `@`/`:` absence via `lastIndexOf`
  offsets at `#t` entry.

## Session 8 (2026-11-16): mask pass guards kept; url and "!" guards neutral, reverted

| state | ours | baseline | ratio |
|---|---|---|---|
| + mask passes guarded (pinned A/B vs prior HEAD: 0.690 vs 0.710 s, means 0.705/0.717) | 0.760 s | 1.000 s | 1.316x (coldbench 9, pinned; the machine was slower than in session 7, baseline 1.000 vs 0.770 s) |

- Kept (INLINE item 6): in the mask `#n`, the anyPunctuationOutsideCode replace runs only if `t` has a backtick or a
  backslash, and the blockSkip replace only if `t` has `[`, a backtick or `<`. Exact: every alternative of those
  regexes starts at those characters, the test is on the string actually being replaced, and a global replace with
  no match returns the same string (lastIndex ends at 0 either way; linkInText uses matchAll, which clones).
- Reverted (INLINE items 7-8, all 7/7 + s7-s10 and 0/150k fuzz diffs, but not faster): url only when `@` is at/after
  the offset (`aT=e.length-e.lastIndexOf("@")` at #t entry, test `e.length>=aT`) or the char is h/H/f/F/w; "!" skips
  link/reflink unless `[` follows. A/B: 0.640/0.640 then 0.650 vs 0.630; url guard alone 0.640 vs 0.620, 0.630/0.630.
- Fuzz: throwaway /tmp/s8fz/fz.mjs (random strings of brackets, backticks, backslashes, `<`, `!`, `@`, urls,
  emails, emphasis, refs) against vendor/marked/marked.esm.js: 0 diffs.
- Next: (1) INLINE item 4 / SYNTHESIS item 6, the fast end-of-text-run search instead of the GFM text regex (medium
  risk; needs a differential fuzz around `@`, `  \n`, `_` word boundaries, www./http(s)/ftp). (2) emStrong: read group
  5||6 once and `test` for unicodeAlphaNumeric. (3) BLOCK item 2 (first-char dispatch, table/setext pre-filters).

## Session 7 (2026-11-15): list continuation fast path and fe/mask stack kept; list header cleanup and emStrong spreads neutral, reverted

| state | ours | baseline | ratio |
|---|---|---|---|
| + list continuation fast path (pinned A/B vs prior HEAD: 0.710 vs 0.730 s, means 0.723/0.740) | | | |
| + fe() by lastIndexOf, mask stack field `mS`, no push/try without `*_~` (pinned A/B: 0.670/0.670 s, means 0.676/0.692; rerun 0.620 vs 0.640 s) | 0.590 s | 0.770 s | 1.305x (coldbench 9, pinned `NODE=taskset -c 3 node` wrapper) |

- Unpinned coldbench gave 0.700 vs 0.970 s (1.386x), but the baseline swung from 0.84 to 0.97 s, so the README
  quotes the pinned 1.31x.
- List fast path (inner continuation loop, non-pedantic only): the line comes from indexOf/slice. Count the leading
  spaces `c`. If the line is empty, or `c>=R` and the next char is not a tab (all-space lines included), append
  `"\n"+U.slice(R)`, set `m` to that slice, set `y` (true if all spaces, false if the first non-space char is
  33..126, else `!U.trim()`), and continue. This is exact because each break regex is `^ {0,min(3,R-1)}` followed
  by a non-space char, and `leadingSpaceTab` is `/^[ \t]+/`, so J is the identity when the run has no tab.
- Reverted, all 7/7 and 0 fuzz diffs but not faster (pinned 0.740/0.740 then 0.740 vs HEAD 0.700): drop the `s`
  closure (inline `n.length-e.length`), header newline drop by charCode, a backward scan instead of
  `doubleBlankLine`, a plain loop for looseness.
- fe: for each delimiter, start at lastIndexOf, walk back to the run start, reject if it is at index 0 or the char
  before is space/\t/\n/\r/\f, else search again before the run. This gives the same result as the forward loop
  (the last qualifying maximal run start). Ae/Ee/ze/Me use `tokenizer.mS` (declared as a class field). The inline
  entry returns `#t(e,e,t)` directly when `e` has no `*_~` and n===e. ze/Me still fall back to fe() when the top
  does not match, so the stack is only a cache.
- Reverted (neutral: 0.610/0.620, then 0.650/0.640 s with a worse mean): emStrong without code-point spreads
  (cpL helper, surrogate-pair checks). With these spreads in, a cold `--trace-deopt` shows only 1 emStrong and
  1 blockquote eager deopt.
- Fuzz (throwaway scripts in /tmp/s7fz, not in the repo): 540k list docs (tabs, NBSP, \v, wide bullets, blank
  lines) and 600k emphasis docs (including lone surrogates and astral chars): 0 diffs against vendor/marked.
- Next: (1) Items 5-6 of the SYNTHESIS (cheap guards, a fast text-run end search). (2) emStrong: read group 5||6 once
  and use `test` for unicodeAlphaNumeric (check its flags first); the spreads alone were neutral. (3) Item 2 of the
  BLOCK report (first-char dispatch plus table/setext pre-filters) if it has not been tried in this form.

## Session 6 (2026-11-15): blockTokens deopt fixed (3 commits kept, all faster)

| state | ours | baseline | ratio |
|---|---|---|---|
| + no extension closures in blockTokens (pinned A/B vs prior HEAD: 0.720 vs 0.740 s) | | | |
| + last block type in Lexer field `lbt` (pinned A/B: 0.700 vs 0.710 s, means 0.689/0.707) | | | |
| + list skips tab-expansion replace when line has no tab (pinned A/B: 0.660 vs 0.690 s) | 0.700 s | 0.840 s | 1.200x (coldbench 9, unpinned) |

- Plan source: SYNTHESIS of /home/agent/makefun/briefs/mdbolt_wf_plan_s224.md. Item 1 is done; item 2 is partly done
  (tab skip only).
- Removed `extensions?.block?.some(closure)` and the `startBlock` closure from blockTokens. Both are always null with
  default options, and the closures forced `e`, `t`, `r` and `this` into a heap context. `o===e` now, so the
  paragraph branch sets `n=!1`.
- `lbt`: the Lexer constructor declares `this.lbt=""`. blockTokens seeds a local `bt` (from `lbt` if `t` is not
  empty, else ""), sets it at each push to that tokenizer's fixed type (fences and code give "code", lheading gives
  "heading"; merges leave it unchanged), fetches `t[t.length-1]` only inside merge branches, and writes `bt` back to
  `lbt` on return. The blockquote tokenizer reads `this.lexer.lbt` instead of `o.at(-1)?.type`, and after replacing
  `o`'s last token with a re-tokenized blockquote or list it sets `lbt` to that type. This is exact because only
  blockquote passes a non-empty array (lists pass `[]`, and lex passes a fresh `this.tokens`). A cold
  `--trace-deopt` now shows no blockTokens bailout (only blockquote: 1 insufficient-feedback deopt, emStrong: 1).
- Tab skip: `J` returns a tab-free string unchanged, so `f.indexOf("\t")<0?f:f.replace(leadingSpaceTab,...)` is
  exact (both in the item header and in the continuation loop).
- Checked: the six list break regexes are already memoized per min(3,R-1) by marked's `D()`, so caching them gains
  nothing.
- Differential fuzz (throwaway script in /tmp, not in the repo): 200k random quote/list/fence/setext/table/lazy-line
  documents and 200k tab/NBSP/wide-bullet list documents compared with vendor/marked: 0 diffs each.
- Next (in order): (1) the rest of item 2, the list continuation fast path (indexOf/slice lines, a leading-space
  count with the fast path when the run is >= R and the next character is not a tab, a backward scan instead of
  the double-blank regex, a plain loop for looseness). (2) Item 3: fe() by lastIndexOf per delimiter, the mask
  stack as a Tokenizer array field instead of the WeakMap, and no push/try when the source has no `*_~`.
  (3) Item 4: emStrong deopt (no spreads, `test`, group 5||6 read once). (4) Items 5-6: cheap guards, fast text-run
  end search.

## Session 5 (2026-11-15): #t last-text local kept; same fix in blockTokens neutral, reverted

| state | ours | baseline | ratio |
|---|---|---|---|
| + `#t` keeps the last text token in a local (pinned A/B vs prior HEAD: 0.750 vs 0.770 s) | 0.730 s | 0.820 s | 1.123x (coldbench 9, unpinned, noisy) |

- Plan source: /home/agent/makefun/briefs/mdbolt_wf_plan_s224.md (8 ranked inline items). Item 1 is done.
- Kept: `#t` holds `mL` (last pushed text token) and `mN` (`n.length` right after that push). It merges only when
  `mN===n.length`. Any other push changes the length, so the local becomes invalid without touching every push
  site. It is refreshed from the array at entry and after an extension push. This is exact because `n` is only
  appended to inside this loop and default tokenizers only push text from reflink and inlineText.
- Reverted: the same idea in `blockTokens` (`bT/bK/bN` for the last paragraph/text, refreshed at entry because the
  blockquote tokenizer passes back its own `o`). 7/7 pass but pinned A/B gave 0.680 vs 0.670 s, so not faster.
- A/B now runs pinned: `taskset -c 3` around each `node` in the alternating loop, 13 runs each. That is less noisy
  than unpinned runs.
- Next, in the brief's order: (1) fe() with `lastIndexOf` per delimiter and the mask stack as an array field
  instead of the WeakMap. (2) emStrong/del without `[...]` spreads, using `test` instead of exec/match for booleans,
  reading group 5||6 once, with no short-circuit surrogate compares. Check `--trace-deopt` for a single compile.
  (3) Fast text-run end search (lastIndexOf "@" guard, one global stop search). (4) Skip mask push/try when there is
  no `*_~`. (5) Skip mask passes that cannot match. (6) url pre-check. (7) `!` not followed by `[`.

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
  - The same fast path inside `#t` for the remaining run (a tail after emphasis/link), as an `mbPlain` test at the top
    of each iteration: 0.880 vs 0.880 s, then 0.990 vs 0.970 s. The extra regex test per iteration cancels the gain.
- Next, ranked: (1) A cheaper `#n` mask: build it only when the run
  really has `*`/`_` delimiters next to word boundaries. (2) Profile cold again with `--cpu-prof` to see what is left
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
