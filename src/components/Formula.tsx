import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/** KaTeX-Formel (lokal gebündelt, offline). */
export function Formula({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' }),
    [tex, display],
  );
  return <span className="formula" dangerouslySetInnerHTML={{ __html: html }} />;
}
