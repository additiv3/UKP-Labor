/**
 * Kleiner, sicherer Markdown-Parser für Notizen (kein HTML-Durchreichen).
 * Unterstützt: # Überschriften, Absätze (einfacher Zeilenumbruch = Umbruch), - / * / 1. Listen, - [ ] / - [x] Aufgaben,
 * > Zitat, ``` Code ```, $$ Formel $$, ---, Inline: `code`, $Formel$, **fett**, *kursiv* / _kursiv_,
 * [[Versuchs-ID oder Reihen-Code]], [Text](https://…).
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'br' }
  | { t: 'code'; v: string }
  | { t: 'math'; tex: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'wiki'; ref: string }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { t: 'h'; level: 1 | 2 | 3; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | { t: 'ul' | 'ol'; items: { c: Inline[]; checked?: boolean }[] }
  | { t: 'quote'; c: Inline[] }
  | { t: 'code'; text: string }
  | { t: 'math'; tex: string }
  | { t: 'hr' };

// ---------------------------------------------------------------- Inline

interface Rule {
  re: RegExp;
  make: (m: RegExpExecArray) => Inline;
}

const SAFE_URL = /^(https?:\/\/|mailto:)/i;

const RULES: Rule[] = [
  { re: /`([^`\n]+)`/, make: (m) => ({ t: 'code', v: m[1]! }) },
  { re: /\[\[([^\]\n]{1,80})\]\]/, make: (m) => ({ t: 'wiki', ref: m[1]!.trim() }) },
  // $…$: kein Leerzeichen direkt innen, keine Ziffer direkt nach dem schließenden $ (Geldbeträge)
  { re: /\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/, make: (m) => ({ t: 'math', tex: m[1]! }) },
  {
    re: /\[([^\]\n]+)\]\(([^)\s]+)\)/,
    make: (m) =>
      SAFE_URL.test(m[2]!) ? { t: 'link', href: m[2]!, c: parseInline(m[1]!) } : { t: 'text', v: m[0] },
  },
  { re: /\*\*(?!\s)([^\n]+?)(?<!\s)\*\*/, make: (m) => ({ t: 'strong', c: parseInline(m[1]!) }) },
  { re: /(?<![\w*])\*(?![\s*])([^*\n]+?)(?<!\s)\*(?![\w*])/, make: (m) => ({ t: 'em', c: parseInline(m[1]!) }) },
  { re: /(?<!\w)_(?!\s)([^_\n]+?)(?<!\s)_(?!\w)/, make: (m) => ({ t: 'em', c: parseInline(m[1]!) }) },
];

function pushText(out: Inline[], v: string): void {
  if (!v) return;
  const parts = v.split('\n');
  parts.forEach((p, i) => {
    if (i > 0) out.push({ t: 'br' });
    if (!p) return;
    const last = out[out.length - 1];
    if (last?.t === 'text') last.v += p;
    else out.push({ t: 'text', v: p });
  });
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;
  while (rest) {
    let best: { i: number; m: RegExpExecArray; rule: Rule } | undefined;
    for (const rule of RULES) {
      const m = rule.re.exec(rest);
      if (m && (best === undefined || m.index < best.i)) best = { i: m.index, m, rule };
    }
    if (!best) {
      pushText(out, rest);
      break;
    }
    pushText(out, rest.slice(0, best.i));
    const node = best.rule.make(best.m);
    if (node.t === 'text') pushText(out, node.v);
    else out.push(node);
    rest = rest.slice(best.i + best.m[0].length);
  }
  return out;
}

// ---------------------------------------------------------------- Blöcke

const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*\d+[.)]\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  const isBlank = (l: string | undefined) => l === undefined || l.trim() === '';

  while (i < lines.length) {
    const line = lines[i]!;
    if (isBlank(line)) {
      i++;
      continue;
    }
    // Code-Block
    if (/^\s*```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) body.push(lines[i++]!);
      i++; // schließende ```
      blocks.push({ t: 'code', text: body.join('\n') });
      continue;
    }
    // Formelblock $$ … $$ (einzeilig oder mehrzeilig)
    const one = /^\s*\$\$(.+)\$\$\s*$/.exec(line);
    if (one) {
      blocks.push({ t: 'math', tex: one[1]!.trim() });
      i++;
      continue;
    }
    if (/^\s*\$\$\s*$/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i]!)) body.push(lines[i++]!);
      i++;
      blocks.push({ t: 'math', tex: body.join('\n').trim() });
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ t: 'h', level: h[1]!.length as 1 | 2 | 3, c: parseInline(h[2]!.trim()) });
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ t: 'hr' });
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) body.push(lines[i++]!.replace(/^\s*>\s?/, ''));
      blocks.push({ t: 'quote', c: parseInline(body.join('\n')) });
      continue;
    }
    const listKind = UL.test(line) ? 'ul' : OL.test(line) ? 'ol' : undefined;
    if (listKind) {
      const re = listKind === 'ul' ? UL : OL;
      const items: { c: Inline[]; checked?: boolean }[] = [];
      while (i < lines.length && re.test(lines[i]!)) {
        const text = re.exec(lines[i]!)![1]!;
        const task = listKind === 'ul' ? TASK.exec(text) : null;
        items.push(task ? { c: parseInline(task[2]!), checked: task[1] !== ' ' } : { c: parseInline(text) });
        i++;
      }
      blocks.push({ t: listKind, items });
      continue;
    }
    // Absatz bis Leerzeile oder Blockbeginn
    const body: string[] = [];
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !/^(#{1,3})\s|^\s*```|^\s*\$\$|^\s*>|^\s*(-{3,}|\*{3,})\s*$/.test(lines[i]!) &&
      !UL.test(lines[i]!) &&
      !OL.test(lines[i]!)
    )
      body.push(lines[i++]!);
    blocks.push({ t: 'p', c: parseInline(body.join('\n')) });
  }
  return blocks;
}

// ---------------------------------------------------------------- Verweise

function walkInline(nodes: Inline[], f: (n: Inline) => void): void {
  for (const n of nodes) {
    f(n);
    if (n.t === 'strong' || n.t === 'em' || n.t === 'link') walkInline(n.c, f);
  }
}

/** Alle [[…]]-Verweise in Reihenfolge des ersten Auftretens (ohne Code-Blöcke/-Spans). */
export function extractLinks(src: string): string[] {
  const out: string[] = [];
  const add = (n: Inline) => {
    if (n.t === 'wiki' && !out.includes(n.ref)) out.push(n.ref);
  };
  for (const b of parseMarkdown(src)) {
    if (b.t === 'h' || b.t === 'p' || b.t === 'quote') walkInline(b.c, add);
    else if (b.t === 'ul' || b.t === 'ol') for (const it of b.items) walkInline(it.c, add);
  }
  return out;
}

/** Klartext für Suche/Vorschau (ohne Markdown-Zeichen). */
export function plainText(src: string, max = 160): string {
  const t = src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' (Formel) ')
    .replace(/\$(?!\s)[^$\n]+?\$/g, '(Formel)')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`$]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
