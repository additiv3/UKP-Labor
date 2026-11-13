import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Service Worker mit `registerType: 'prompt'`: Hinweis „Neue Version verfügbar“. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  // „Offline verfügbar“ ist nur eine Info → nach einigen Sekunden ausblenden.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 6000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="toast" role="status">
      {needRefresh ? (
        <>
          <span>Neue Version verfügbar.</span>
          <button className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>
            Aktualisieren
          </button>
          <button className="btn" onClick={() => setNeedRefresh(false)}>
            Später
          </button>
        </>
      ) : (
        <>
          <span>App ist jetzt offline verfügbar.</span>
          <button className="btn" onClick={() => setOfflineReady(false)}>
            OK
          </button>
        </>
      )}
    </div>
  );
}
