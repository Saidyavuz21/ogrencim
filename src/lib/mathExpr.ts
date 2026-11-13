/**
 * Güvenli matematik ifade ayrıştırıcı (eval / new Function kullanmaz).
 * Desteklenenler: + - * / ^, parantez, sin cos tan sqrt abs log ln, pi, e, x, örtük çarpma (2x).
 */

type Tok =
  | { kind: 'num'; v: number }
  | { kind: 'id'; v: string }
  | { kind: 'op'; v: '+' | '-' | '*' | '/' | '^' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

const FUNCS = new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'ln']);

function tokenize(raw: string): { ok: true; tokens: Tok[] } | { ok: false; error: string } {
  const s = raw.trim().replace(/−/g, '-').replace(/,/g, '.');
  if (!s) return { ok: false, error: 'İfade boş.' };
  const rawTokens: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i;
      let dots = 0;
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) {
        if (s[j] === '.') dots += 1;
        j += 1;
      }
      if (dots > 1) return { ok: false, error: 'Geçersiz sayı biçimi.' };
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) return { ok: false, error: 'Geçersiz sayı.' };
      rawTokens.push({ kind: 'num', v: num });
      i = j;
      continue;
    }
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      let j = i;
      while (j < s.length && ((s[j] >= 'a' && s[j] <= 'z') || (s[j] >= 'A' && s[j] <= 'Z'))) {
        j += 1;
      }
      const word = s.slice(i, j).toLowerCase();
      if (FUNCS.has(word) || word === 'pi' || word === 'e' || word === 'x') {
        rawTokens.push({ kind: 'id', v: word });
      } else if (word.length > 1) {
        // Örn. "ax" gibi değil ama "pix" veya "xe" gibi bitişik tek harfleri ayır
        for (const c of word) {
          if (c === 'x' || c === 'e') rawTokens.push({ kind: 'id', v: c });
          else return { ok: false, error: `Bilinmeyen ad: ${word}` };
        }
      } else {
        return { ok: false, error: `Bilinmeyen değişken: ${word}` };
      }
      i = j;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      rawTokens.push({ kind: 'op', v: ch });
      i += 1;
      continue;
    }
    if (ch === '(') {
      rawTokens.push({ kind: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      rawTokens.push({ kind: 'rparen' });
      i += 1;
      continue;
    }
    return { ok: false, error: `Geçersiz karakter: ${ch}` };
  }

  // Örtük çarpma ekle: 2x, 2(x), (x)(y), x sin(x), 2pi
  const tokens: Tok[] = [];
  const isValueEnd = (t: Tok) =>
    t.kind === 'num' || t.kind === 'rparen' || (t.kind === 'id' && !FUNCS.has(t.v));
  const isValueStart = (t: Tok) =>
    t.kind === 'num' || t.kind === 'lparen' || t.kind === 'id';

  for (let k = 0; k < rawTokens.length; k += 1) {
    const cur = rawTokens[k];
    if (tokens.length > 0) {
      const prev = tokens[tokens.length - 1];
      if (isValueEnd(prev) && isValueStart(cur)) {
        tokens.push({ kind: 'op', v: '*' });
      }
    }
    tokens.push(cur);
  }
  return { ok: true, tokens };
}

type AstNode =
  | { type: 'num'; v: number }
  | { type: 'x' }
  | { type: 'neg'; arg: AstNode }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | '^'; l: AstNode; r: AstNode }
  | { type: 'call'; fn: string; arg: AstNode };

export function compileMathExpr(
  raw: string
): { ok: true; eval: (x: number) => number } | { ok: false; error: string } {
  const tokRes = tokenize(raw);
  if (!tokRes.ok) return tokRes;
  const toks = tokRes.tokens;
  let pos = 0;

  const peek = () => toks[pos];
  const consume = () => toks[pos++];

  function parseExpr(): AstNode {
    let node = parseTerm();
    while (peek()?.kind === 'op' && (peek() as Extract<Tok, { kind: 'op' }>).v.match(/^[+-]$/)) {
      const op = (consume() as Extract<Tok, { kind: 'op' }>).v as '+' | '-';
      node = { type: 'bin', op, l: node, r: parseTerm() };
    }
    return node;
  }

  function parseTerm(): AstNode {
    let node = parseUnary();
    while (peek()?.kind === 'op' && (peek() as Extract<Tok, { kind: 'op' }>).v.match(/^[*/]$/)) {
      const op = (consume() as Extract<Tok, { kind: 'op' }>).v as '*' | '/';
      node = { type: 'bin', op, l: node, r: parseUnary() };
    }
    return node;
  }

  function parseUnary(): AstNode {
    const p = peek();
    if (p?.kind === 'op' && (p.v === '+' || p.v === '-')) {
      consume();
      const arg = parseUnary();
      return p.v === '-' ? { type: 'neg', arg } : arg;
    }
    return parsePow();
  }

  function parsePow(): AstNode {
    const base = parsePrimary();
    const p = peek();
    if (p?.kind === 'op' && p.v === '^') {
      consume();
      return { type: 'bin', op: '^', l: base, r: parseUnary() };
    }
    return base;
  }

  function parsePrimary(): AstNode {
    const p = peek();
    if (!p) throw new Error('Eksik ifade.');
    if (p.kind === 'num') {
      consume();
      return { type: 'num', v: p.v };
    }
    if (p.kind === 'lparen') {
      consume();
      const inner = parseExpr();
      if (peek()?.kind !== 'rparen') throw new Error('Parantez kapatılmamış.');
      consume();
      return inner;
    }
    if (p.kind === 'id') {
      consume();
      if (p.v === 'x') return { type: 'x' };
      if (p.v === 'pi') return { type: 'num', v: Math.PI };
      if (p.v === 'e') return { type: 'num', v: Math.E };
      if (FUNCS.has(p.v)) {
        if (peek()?.kind !== 'lparen') throw new Error(`${p.v}(...) parantez gerektirir.`);
        consume();
        const arg = parseExpr();
        if (peek()?.kind !== 'rparen') throw new Error('Parantez kapatılmamış.');
        consume();
        return { type: 'call', fn: p.v, arg };
      }
    }
    throw new Error('Beklenmeyen ifade.');
  }

  let ast: AstNode;
  try {
    ast = parseExpr();
    if (pos < toks.length) {
      return { ok: false, error: 'İfade sonu anlaşılamadı.' };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Geçersiz ifade.' };
  }

  const evalNode = (n: AstNode, x: number): number => {
    switch (n.type) {
      case 'num':
        return n.v;
      case 'x':
        return x;
      case 'neg':
        return -evalNode(n.arg, x);
      case 'bin': {
        const l = evalNode(n.l, x);
        const r = evalNode(n.r, x);
        if (!Number.isFinite(l) || !Number.isFinite(r)) return NaN;
        if (n.op === '+') return l + r;
        if (n.op === '-') return l - r;
        if (n.op === '*') return l * r;
        if (n.op === '/') return Math.abs(r) < 1e-12 ? NaN : l / r;
        return Math.pow(l, r);
      }
      case 'call': {
        const a = evalNode(n.arg, x);
        if (!Number.isFinite(a)) return NaN;
        if (n.fn === 'sin') return Math.sin(a);
        if (n.fn === 'cos') return Math.cos(a);
        if (n.fn === 'tan') {
          const c = Math.cos(a);
          return Math.abs(c) < 1e-7 ? NaN : Math.tan(a);
        }
        if (n.fn === 'sqrt') return a < 0 ? NaN : Math.sqrt(a);
        if (n.fn === 'abs') return Math.abs(a);
        if (n.fn === 'log') return a <= 0 ? NaN : Math.log10(a);
        if (n.fn === 'ln') return a <= 0 ? NaN : Math.log(a);
        return NaN;
      }
    }
  };

  return {
    ok: true,
    eval: (x: number) => {
      const y = evalNode(ast, x);
      return Number.isFinite(y) && Math.abs(y) < 1e6 ? y : NaN;
    },
  };
}

