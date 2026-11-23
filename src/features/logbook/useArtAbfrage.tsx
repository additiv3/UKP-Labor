import { useState } from 'react';
import { ArtAbfrage } from './ArtAbfrage';

/**
 * `ask(titel, run)` zeigt die Abfrage und ruft danach `run(artId)` auf; `element` an passender Stelle rendern.
 * Ist die Art schon bekannt (Standard-Art der Reihe, Art der Vorlage), direkt `run` aufrufen statt zu fragen.
 */
export function useArtAbfrage() {
  const [pending, setPending] = useState<{ title: string; run: (artId: string) => Promise<void> }>();
  const element = pending ? (
    <ArtAbfrage
      title={pending.title}
      onCancel={() => setPending(undefined)}
      onPick={(id) => {
        setPending(undefined);
        void pending.run(id);
      }}
    />
  ) : null;
  return { ask: (title: string, run: (artId: string) => Promise<void>) => setPending({ title, run }), element };
}
