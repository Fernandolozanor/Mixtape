import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Sincronización automática de actualizaciones para la PWA instalada en escritorio/móvil
function setupPWAUpdateSync() {
  if (typeof window === 'undefined' || import.meta.env.DEV) return;

  let isRefreshing = false;

  if ('serviceWorker' in navigator) {
    // Cuando el nuevo Service Worker toma el control, recargamos automáticamente para aplicar cambios
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    });
  }

  const checkForUpdates = async () => {
    try {
      // 1. Forzar comprobación del Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await registration.update().catch(() => {});
        }
      }

      // 2. Comprobar directamente contra la red si hay un nuevo bundle desplegado
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
            const lastReloadedTarget = sessionStorage.getItem('mixtape_sync_target');
            if (lastReloadedTarget !== remoteScript) {
              sessionStorage.setItem('mixtape_sync_target', remoteScript);

              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.update().catch(() => {})));
              }
              if (!isRefreshing) {
                isRefreshing = true;
                window.location.reload();
              }
            }
          }
        }
      }
    } catch {
      // Ignorar errores de red si se abre sin conexión
    }
  };

  // Comprobar inmediatamente al abrir la aplicación
  checkForUpdates();

  // Comprobar cada vez que la ventana de escritorio recupera el foco o vuelve a estar visible
  window.addEventListener('focus', checkForUpdates);
  window.addEventListener('online', checkForUpdates);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
    }
  });
}

// Inicializar escala de tamaño de texto antes de pintar
const initialTextSize = localStorage.getItem('pulse_text_size') || 'medium';
document.documentElement.setAttribute('data-text-size', initialTextSize);

// Inicializar modo de apariencia (oscuro / claro satinado) antes de pintar
const initialThemeMode = localStorage.getItem('pulse_theme_mode') || 'dark';
document.documentElement.setAttribute('data-theme-mode', initialThemeMode);
if (initialThemeMode === 'light') {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
} else {
  document.documentElement.classList.remove('light');
  document.documentElement.classList.add('dark');
}

setupPWAUpdateSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
