// Direct default inline rendering, derived from marked 18.1.3's lexer loop.
// Copyright (c) 2018-2026 MarkedJS, 2011-2018 Christopher Jeffrey. MIT;
// see vendor/marked/LICENSE. Syntax decisions use the original tokenizers.
// Rendered children are strings; image-alt children keep the original tokens.
const plain = /[\\<!\[`*_~@]|  \n|:\/\/|www\.|mailto:|xmpp:|http/i;
const stop = /[\\<!\[`*_~]| {2,}\n|[hH][tT][tT][pP][sS]?:\/\/|[fF][tT][pP]:\/\/|(?<![^\s*_~(])www\./g;
const easyFormat=/^(\*\*|__|\*|_|~~|~)([^\s*_~\\<!\[`](?:[^\n*_~\\<!\[`]*[^\s*_~\\<!\[`])?)\1(?![*_~])/;
const urlText=/@|http|www\.|mailto:|xmpp:|:\/\//i;
export function fastInline(source, lexer, escape, numeric) {
  const tk=lexer.tokenizer, state=lexer.state, parser=lexer.directParser;
  if(!plain.test(source))return state.inRawBlock?source:escape(numeric(source));
  let src=source, masked=null, pushed=false, wasText=false, previous='';
  let html='', pending='', hasPending=false, pendingEscaped=false;
  // Numeric references and malformed email candidates make marked's exact
  // text-run boundaries observable. Use its text rule for those entire runs.
  const scan=!source.includes('@')&&!source.includes('&#');
  const paren=state.linkParenPossible;
  state.linkParenPossible=paren&&source.includes(')');
  try {
    while(src) {
      if(!wasText)previous='';
      wasText=false;
      const c=src.charCodeAt(0);let token;
      if(c===92)token=tk.escape(src)||tk.br(src);
      else if(c===60)token=tk.tag(src)||tk.autolink(src);
      else if(c===91||c===33)token=tk.link(src)||tk.reflink(src,lexer.tokens.links);
      else if(c===42||c===95||c===126) {
        if(masked===null){masked=lexer.fastPushMask(source);pushed=true;}
        // An isolated delimiter pair around plain content has no competing
        // delimiter. Require whitespace/opening and closing boundaries, and
        // verify the exact reference mask has not hidden this span.
        const pos=source.length-src.length, easy=easyFormat.exec(src);
        if(easy&&(!pos||/\s/.test(source[pos-1]))&&
           (easy[0].length===src.length||/[\s.,!?;:)]/.test(src[easy[0].length]))&&
           !urlText.test(easy[2])&&
           masked.slice(Math.max(0,pos-1),pos+easy[0].length)===source.slice(Math.max(0,pos-1),pos+easy[0].length)) {
          if(hasPending){html+=pendingEscaped?pending:escape(pending);pending='';hasPending=false;}
          const tag=c===126?'del':easy[1].length===2?'strong':'em';
          const body=state.inRawBlock?easy[2]:escape(numeric(easy[2]));
          html+='<'+tag+'>'+body+'</'+tag+'>';
          src=src.slice(easy[0].length);continue;
        }
        token=c===126?tk.del(src,masked,previous):tk.emStrong(src,masked,previous);
        if(!token&&c===95&&!state.inLink)token=tk.url(src);
      } else if(c===96)token=tk.codespan(src);
      else if(c===32)token=tk.br(src);
      else if((c>=97&&c<=122)||(c>=65&&c<=90)||(c>=48&&c<=57)||c===46||c===43||c===45) {
        if(!state.inLink)token=tk.url(src);
      }
      if(token) {
        src=src.slice(token.raw.length);
        if(token.type==='text') {
          if(!hasPending){hasPending=true;pendingEscaped=!!token.escaped;}
          pending+=token.text;
        } else {
          if(hasPending){html+=pendingEscaped?pending:escape(pending);pending='';hasPending=false;}
          html+=token.type==='escape'?escape(token.text):parser.renderer[token.type](token);
        }
        continue;
      }
      let raw;
      if(scan) {
        let first=1;
        if(c===96||c===126)while(first<src.length&&src.charCodeAt(first)===c)first++;
        stop.lastIndex=first;const match=stop.exec(src);
        raw=match?src.slice(0,match.index):src;
      } else {
        const match=tk.rules.inline.text.exec(src);
        if(!match||!match[0].length){lexer.infiniteLoopError(c);break;}
        raw=match[0];
      }
      if(!hasPending){hasPending=true;pendingEscaped=state.inRawBlock;}
      pending+=state.inRawBlock||scan?raw:numeric(raw);
      src=src.slice(raw.length);
      if(raw.slice(-1)!=='_')previous=raw.slice(-1);
      wasText=true;
    }
    if(hasPending)html+=pendingEscaped?pending:escape(pending);
    return html;
  } finally {
    state.linkParenPossible=paren;
    if(pushed)lexer.fastPopMask();
  }
}
