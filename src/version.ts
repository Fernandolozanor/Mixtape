export const APP_VERSION = '2.5.1';
export const APP_BUILD = '2026.11.15.2';
export const APP_RELEASE_NAME = 'Mixtape Hi-Fi Deck';

/**
 * Checks for updates against the network and Service Worker.
 * Returns true if an update was found and applied (or reloading), false if already up to date.
 */
export async function checkAppUpdate(): Promise<{ hasUpdate: boolean; message: string }> {
  if (typeof window === 'undefined') {
    return { hasUpdate: false, message: 'Entorno no compatible' };
  }

  try {
    // 1. Force Service Worker check
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const waitingWorker = (reg as any).waiting;
        if (waitingWorker) {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
          return { hasUpdate: true, message: 'Nueva versión lista. Aplicando...' };
        }
        await reg.update().catch(() => {});
        const updatedWaiting = (reg as any).waiting;
        if (updatedWaiting) {
          updatedWaiting.postMessage({ type: 'SKIP_WAITING' });
          return { hasUpdate: true, message: 'Nueva versión encontrada. Actualizando...' };
        }
      }
    }

    // 2. Fetch fresh index.html to compare assets
    const currentScripts = Array.from(document.querySelectorAll('script[type="module"][src]'))
      .map((s) => s.getAttribute('src') || '')
      .find((src) => src.includes('assets/index-'));

    if (currentScripts) {
      const res = await fetch(`./index.html?_sync=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (res.ok) {
        const html = await res.text();
        const match = html.match(/src="([^"]*assets\/index-[^"]+\.js)"/);
        const remoteScript = match?.[1];

        if (remoteScript && remoteScript !== currentScripts) {
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.update().catch(() => {})));
          }
          window.location.reload();
          return { hasUpdate: true, message: 'Actualizando a la última versión...' };
        }
      }
    }

    return { hasUpdate: false, message: 'Tienes la versión más reciente instalada' };
  } catch (err: any) {
    return { hasUpdate: false, message: 'No se pudo conectar al servidor para verificar' };
  }
}
