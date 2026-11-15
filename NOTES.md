# Notes for the next session

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
