import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { parseMarkdown, type Inline } from '../core/markdown';
import { Formula } from './Formula';
import type { WikiTarget } from './useWikiResolver';

function renderInline(nodes: Inline[], wiki: Map<string, WikiTarget> | undefined): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return <Fragment key={i}>{n.v}</Fragment>;
      case 'br':
        return <br key={i} />;
      case 'code':
        return <code key={i}>{n.v}</code>;
      case 'math':
        return <Formula key={i} tex={n.tex} />;
      case 'strong':
        return <strong key={i}>{renderInline(n.c, wiki)}</strong>;
      case 'em':
        return <em key={i}>{renderInline(n.c, wiki)}</em>;
      case 'link':
        return (
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer">
            {renderInline(n.c, wiki)}
          </a>
        );
      case 'wiki': {
        const target = wiki?.get(n.ref);
        return target ? (
          <Link key={i} to={target.to} className="wiki">
            {n.ref}
          </Link>
        ) : (
          <span key={i} className="wiki wiki-missing" title="Kein Versuch / keine Reihe mit dieser ID">
            {n.ref}
          </span>
        );
      }
    }
  });
}

/** Markdown-Ansicht (sicher: kein HTML aus dem Text), mit KaTeX und [[Verweisen]]. */
export function Markdown({ src, wiki }: { src: string; wiki?: Map<string, WikiTarget> }) {
  const blocks = parseMarkdown(src);
  if (blocks.length === 0) return <p className="muted">Noch kein Inhalt.</p>;
  return (
    <div className="md-view">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            const H = (['h3', 'h4', 'h5'] as const)[b.level - 1]!;
            return <H key={i}>{renderInline(b.c, wiki)}</H>;
          }
          case 'p':
            return <p key={i}>{renderInline(b.c, wiki)}</p>;
          case 'quote':
            return <blockquote key={i}>{renderInline(b.c, wiki)}</blockquote>;
          case 'code':
            return (
              <pre key={i}>
                <code>{b.text}</code>
              </pre>
            );
          case 'math':
            return (
              <div key={i} className="md-math">
                <Formula tex={b.tex} display />
              </div>
            );
          case 'hr':
            return <hr key={i} />;
          case 'ul':
          case 'ol': {
            const L = b.t;
            return (
              <L key={i} className={b.items.some((x) => x.checked !== undefined) ? 'tasks' : undefined}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    {it.checked !== undefined && <input type="checkbox" checked={it.checked} readOnly disabled aria-label={it.checked ? 'erledigt' : 'offen'} />}
                    {renderInline(it.c, wiki)}
                  </li>
                ))}
              </L>
            );
          }
        }
      })}
    </div>
  );
}
