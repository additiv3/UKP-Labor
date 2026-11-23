/** UUID v4. Nutzt crypto.randomUUID, Fallback über getRandomValues (ältere iOS-Safari / unsicherer Kontext). */
export function uuid(): string {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}

/** Bereinigt einen ID-Bestandteil: keine Leerzeichen, kein Bindestrich (der ist Trenner). */
export function sanitizeIdPart(s: string): string {
  return s.trim().replace(/[\s-]+/g, '');
}

/**
 * Höchste laufende Nummer hinter `prefix` (z. B. `K-SPOT-`). Konflikt-Suffixe (`-K1`) werden ignoriert, die Nummer
 * dahinter zählt trotzdem. Die Aufrufer übergeben alle IDs inkl. gelöschter und verworfener Datensätze, damit eine Nummer
 * nie zweimal vergeben wird.
 */
function maxNummer(existing: Iterable<string>, prefix: string): number {
  let max = 0;
  for (const id of existing) {
    if (!id.startsWith(prefix)) continue;
    const m = /^(\d+)(?:-K\d+)?$/.exec(id.slice(prefix.length));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

const nr3 = (nr: number) => String(nr).padStart(3, '0');

/** Versuchs-ID `<Reihe>-<Art>-<lfd. Nr. 3-stellig>`, z. B. `K-SPOT-001`. */
export function formatVersuchsId(reihe: string, art: string, nr: number): string {
  return `${sanitizeIdPart(reihe)}-${sanitizeIdPart(art)}-${nr3(nr)}`;
}

/** Präfix `<Reihe>-<Art>-` einer Versuchs-ID. */
export function versuchsIdPrefix(reihe: string, art: string): string {
  return `${sanitizeIdPart(reihe)}-${sanitizeIdPart(art)}-`;
}

/** Nächste freie laufende Nummer für Präfix `<Reihe>-<Art>` anhand vorhandener Versuchs-IDs (inkl. gelöschter). */
export function nextLaufnummer(existing: Iterable<string>, reihe: string, art: string): number {
  return maxNummer(existing, versuchsIdPrefix(reihe, art)) + 1;
}

export function nextVersuchsId(existing: Iterable<string>, reihe: string, art: string): string {
  return formatVersuchsId(reihe, art, nextLaufnummer(existing, reihe, art));
}

/** Proben-ID `<Werkstoffkürzel>-<lfd. Nr. 3-stellig>`, z. B. `FS-001`. */
export function formatProbenId(kurz: string, nr: number): string {
  return `${sanitizeIdPart(kurz)}-${nr3(nr)}`;
}

/** Nächste freie Proben-ID je Werkstoffkürzel anhand vorhandener Proben-IDs (inkl. gelöschter). */
export function nextProbenId(existing: Iterable<string>, kurz: string): string {
  return formatProbenId(kurz, maxNummer(existing, `${sanitizeIdPart(kurz)}-`) + 1);
}

/** Kürzel einer Versuchsart: 2–6 Zeichen, nur A–Z und 0–9. Fehlertext oder undefined. */
export function validateArtKuerzel(k: string): string | undefined {
  if (k === '') return 'Kürzel fehlt';
  if (!/^[A-Z0-9]+$/.test(k)) return 'Kürzel nur aus A–Z und 0–9 (ohne Bindestrich)';
  if (k.length < 2 || k.length > 6) return 'Kürzel mit 2 bis 6 Zeichen';
  return undefined;
}
