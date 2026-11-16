// Default-only pipeline over the MIT marked 18.1.3 fork (vendor/marked holds
// the credited reference). Construct the renderer before deferred inline work
// so inline children can become HTML strings instead of retained token trees.
// Image labels keep marked's tokens because TextRenderer needs their plain text.
// Lexer/Parser and all document state are fresh per call; shared defaults only
// retain reusable tokenizer/renderer objects whose back-pointers are reset.
import { Lexer, Parser, getDefaults } from './marked-fork.js';

const opts = getDefaults();

/** The HTML marked 18.1.3 renders for `markdown` with default options. */
export function parse(markdown) {
  const parser = new Parser(opts);
  const lexer = new Lexer(opts);
  lexer.directParser = parser;
  lexer.directAlt = false;
  return parser.parse(lexer.lex(markdown));
}
