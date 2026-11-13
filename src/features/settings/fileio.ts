/** Dateiausgabe: Teilen-Menü (iPhone/Android), sonst Download; Hauptlogbuch-Ordner (Chrome/Edge). */

export type ShareResult = 'geteilt' | 'heruntergeladen' | 'abgebrochen';

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Mobil: Web Share API mit Datei (→ „In Dateien sichern“), sonst Download. */
export async function shareOrDownload(text: string, name: string, mime: string): Promise<ShareResult> {
  const blob = new Blob([text], { type: mime });
  const file = new File([blob], name, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  if (mobile && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'geteilt';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'abgebrochen';
      // z. B. NotAllowedError (Nutzergeste abgelaufen) → Download als Rückfall
    }
  }
  download(blob, name);
  return 'heruntergeladen';
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}

// ---------------------------------------------------------------- Hauptlogbuch (File System Access API)

export function supportsMasterFolder(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export async function pickMasterFolder(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker!({ id: 'ukp-labor', mode: 'readwrite' });
}

/** Schreibrecht sicherstellen (fragt nach, falls nötig – braucht eine Nutzergeste). */
export async function ensurePermission(dir: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as const };
  if ((await dir.queryPermission?.(opts)) === 'granted') return true;
  return (await dir.requestPermission?.(opts)) === 'granted';
}
