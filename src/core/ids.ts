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

/** Versuchs-ID `<Reihe>-<Material>-<lfd. Nr. 3-stellig>`, z. B. `B1-Si-001`. */
export function formatVersuchsId(reihe: string, material: string, nr: number): string {
  return `${sanitizeIdPart(reihe)}-${sanitizeIdPart(material)}-${String(nr).padStart(3, '0')}`;
}

/**
 * Nächste freie laufende Nummer für Präfix `<Reihe>-<Material>` anhand vorhandener Versuchs-IDs.
 * Berücksichtigt nur IDs mit exakt passendem Präfix; Konflikt-Suffixe (`-K1`) werden ignoriert.
 */
export function nextLaufnummer(existing: Iterable<string>, reihe: string, material: string): number {
  const prefix = `${sanitizeIdPart(reihe)}-${sanitizeIdPart(material)}-`;
  let max = 0;
  for (const id of existing) {
    if (!id.startsWith(prefix)) continue;
    const m = /^(\d+)(?:-K\d+)?$/.exec(id.slice(prefix.length));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export function nextVersuchsId(existing: Iterable<string>, reihe: string, material: string): string {
  return formatVersuchsId(reihe, material, nextLaufnummer(existing, reihe, material));
}
