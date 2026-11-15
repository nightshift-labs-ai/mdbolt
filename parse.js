// mdbolt: marked 18.1.3 (MIT, vendor/marked) without marked.parse()'s per-call overhead.
// With default options marked.parse() is exactly Lexer.lex(src, opts) followed by Parser.parse(tokens, opts),
// where opts is a fresh copy of the defaults (hooks null, walkTokens null, no extensions). We build the
// options once. The Lexer and Parser are still constructed per call, so no per-document state (tokens,
// links map, inline queue, lexer state) survives between calls; the Tokenizer and Renderer cached on the
// shared options are stateless apart from back-pointers that every Lexer/Parser constructor resets.
import { Lexer, Parser, getDefaults } from './vendor/marked/marked.esm.js';

const opts = getDefaults();

/** The HTML marked 18.1.3 renders for `markdown` with default options. */
export function parse(markdown) {
  return new Parser(opts).parse(new Lexer(opts).lex(markdown));
}
