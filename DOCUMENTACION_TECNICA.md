# 📼 Documento Técnico Integral — Mixtape (Hi-Fi Cassette & Vinyl PWA)

**Proyecto:** Mixtape — Reproductor Musical Analógico Hi-Fi de los Años 80  
**Ruta del Proyecto:** `D:\REPRODUCTOR MUSICA`  
**Repositorio y Despliegue:** `https://github.com/mixtape-player/Mixtape` (GitHub Pages PWA)  
**Plataformas Soportadas:** iOS (iPhone / iPad), Android, Windows y macOS  

---

## 1. Visión General y Stack Tecnológico

**Mixtape** es una Aplicación Web Progresiva (*PWA*) de reproducción musical con arquitectura **Local-First + Cloud Sync** que recrea con fidelidad física y acústica un equipo de alta fidelidad (*Hi-Fi Stereo Cassette Receiver & Turntable*) de 1984, combinándolo con streaming sin anuncios, recomendaciones inteligentes, generación de sesiones por ritmo (RPM/BPM), modo infantil blindado, control de licencias por hardware y sincronización multi-dispositivo en tiempo real mediante código QR.

### 1.1. Stack Principal (`package.json`)
* **Frontend Framework:** React 19 (`^19.3.1`) + TypeScript (`~7.0.2`).
* **Bundler & Servidor de Desarrollo:** Vite 8 (`^8.3.6`) con middleware personalizado para búsqueda profunda y `vite-plugin-pwa` (`^2.0.0`) con Workbox.
* **Estilos y Diseño Visual:** Tailwind CSS v4 (`@tailwindcss/vite ^4.3.5`) + CSS personalizado con variables dinámicas, texturas metálicas cepilladas y animaciones físicas (`src/index.css`).
* **Almacenamiento Local Multi-Capa:** `localStorage`, `IndexedDB` (mediante `idb ^8.0.4`) y `CacheStorage` API.
* **Sincronización en la Nube:** Motor en tiempo real sin configuración basado en Server-Sent Events (`SSE`) + REST con cifrado simétrico por clave de cinta (`TAPE-XXXX-XXXX`) y soporte opcional para Firebase Firestore (`firebase ^13.3.0`).
* **Iconografía:** `lucide-react` (`^1.72.0`) + gráficos vectoriales SVG a medida.

---

## 2. Arquitectura del Sistema y Estructura de Archivos

* **Punto de entrada y configuración:**
  * `index.html` — Cabeceras PWA para iOS/Android (`viewport-fit=cover`, `apple-mobile-web-app-capable`), fuentes *Bebas Neue*, *Oswald*, *Permanent Marker* y *Share Tech Mono*, y carga de YouTube IFrame API.
  * `vite.config.ts` — Plugin de servidor `/api/yt/search` para raspado multi-consulta de YouTube y configuración de `VitePWA` / Workbox.
  * `src/main.tsx` — Registro automático del Service Worker con comprobación periódica de actualizaciones al recuperar el foco.
  * `src/App.tsx` — Orquestador de contextos, navegación adaptable (escritorio/móvil), barra superior de estado/sesión y modales globales.
* **Contextos (`src/context/`):**
  * `AuthContext.tsx` — Huella de dispositivo `EQ-XXXX-XXXX`, prueba de 1 hora, validación SHA-256 de licencias `MX-XXXX-XXXX` y panel maestro de administración.
  * `LibraryContext.tsx` — Gestión de listas (*Cintas*), canciones favoritas (*Vinilos*), ajustes y enlace con la sincronización en la nube.
  * `PlayerContext.tsx` — Cola de reproducción, control de tiempo, descarga de letras sincronizadas, activación automática de la pletina a los 3 segundos y control de *Pitch*.
  * `KidsModeContext.tsx` — Estado del modo infantil, PIN parental, limitador de volumen seguro y temporizador de apagado (*Sleep Timer*).
  * `ThemeContext.tsx` — Motor de 5 esquemas visuales con acabado por defecto *Sony Brushed Steel*.
* **Servicios (`src/services/`):**
  * `audioEngine.ts` — Motor de audio híbrido (HTML5 `<audio>` + YouTube IFrame API sin cookies), bloqueo de anuncios pre-roll/mid-roll, SponsorBlock, `navigator.mediaSession` y ancla de audio en segundo plano para móviles con pantalla bloqueada.
  * `streamResolver.ts` — Resolución en carrera paralela (`Promise.any`) contra Cloudflare Worker, nodos Piped e Invidious y red Audius.
  * `bpmService.ts` — Base de datos y cálculo determinista de BPM musicales y generador de sesiones por revoluciones ($33\frac{1}{3}$, $45$, $78\text{ RPM}$ y cadencia exacta).
  * `recommendationService.ts` — Algoritmo de recomendaciones personalizadas, colecciones destacadas y canales continuos.
  * `syncService.ts` — Sincronización multi-dispositivo en tiempo real por QR y código `TAPE-XXXX-XXXX` con fusión inteligente y registro de borrados (*tombstones*).
  * `firebase.ts`, `lyricsService.ts`, `cacheService.ts`.
* **Catálogos Integrados (`src/data/`):**
  * `rockAnthology.ts` y `kidsAnthology.ts`.
* **Utilidades (`src/utils/`):**
  * `qrCode.ts` — Generador matemático de códigos QR ISO/IEC 18004 con Reed-Solomon $GF(2^8)$.
  * `radioAudio.ts` — Sintetizador de estática y barrido de frecuencias FM mediante Web Audio API.

---

## 3. Estética Hi-Fi de los Años 80 y Física de la Pletina

1. **Acabado *Sony Silver Brushed Steel* (`retro-rock-80s`):** Textura de aluminio anodizado cepillado con reflejos especulares, pantallas LCD de cristal ahumado, 5 esquemas de color intercambiables y adaptación móvil con respeto estricto de `safe-area-inset-top` y `safe-area-inset-bottom`.
2. **Pletina de Casette (`./assets/cassette.mp4`) y Escritura a Bolígrafo (`RetroTapeDeck.tsx`):**
   * Se activa automáticamente para pistas generales y listas de reproducción.
   * Al cambiar de canción, escribe letra por letra sobre el adhesivo de la cinta el **título en tinta azul Bic** y el **artista en tinta roja**.
3. **Tocadiscos de Vinilo (`./assets/disco.mp4`) a $33\frac{1}{3}\text{ RPM}$:**
   * Se activa automáticamente para las canciones marcadas como **Favoritas**.
   * Renderiza el título y artista en texto curvo circular SVG sobre la galleta central del vinilo girando exactamente a $1.8\text{ s}$ por vuelta ($33\frac{1}{3}\text{ RPM}$).
4. **Vúmetros Analógicos con Física Balística a 60 FPS:**
   * Simulación física de agujas `L` y `R` con aceleración, inercia y muelle de retorno (`-20 dB` a `+3 dB`) mediante `requestAnimationFrame`, acompañada de contador mecánico de 4 dígitos.
5. **Estantería de Cintas (`CassetteRack.tsx`) y Vinilos 3D (`VinylRecordCard.tsx`):**
   * Estantería de madera de hasta 48 ranuras con lomos manuscritos interactivos y vista de colección de vinilos en Favoritos.

---

## 4. Motor de Audio Híbrido Sin Anuncios y Segundo Plano

1. **Carrera de Nodos Acompañantes (`streamResolver.ts`):** Resuelve flujos directos de audio en paralelo contra múltiples instancias de Piped, Invidious, Cloudflare Worker y Audius, pre-cargando en RAM (`preloadNextTrack`) la siguiente canción de la cola antes de que termine la actual.
2. **Supresión Multicapa de Anuncios (`audioEngine.ts`):**
   * Intercepción instantánea de mensajes `infoDelivery` (`adState` / `isAdPlaying`), silenciamiento inmediato (`mute`), aceleración `2.0x`, `skipAd()` y salto de tiempo, combinado con la API comunitaria de **SponsorBlock**.
3. **Reproducción Continua con Pantalla Apagada en iOS y Android:**
   * Pausa automática del `<video>` decorativo cuando `document.hidden === true` para evitar que el sistema operativo cierre la pestaña en segundo plano.
   * Ancla acústica silenciosa (`AudioContext` + bucle WAV inaudible) + reanudación automática en `120 ms` + integración completa con `navigator.mediaSession` (controles en pantalla de bloqueo y Dynamic Island).

---

## 5. Buscador Sin Límites, Dial de Radio FM y Recomendaciones

1. **Sintonizador de Radio FM (`RadioTunerDial.tsx` + `radioAudio.ts`):** Dial interactivo (`88.0`–`108.0 MHz`) con aguja móvil restringida a la escala de cristal y síntesis de barrido de ruido blanco/estática FM en tiempo real.
2. **Búsqueda Profunda Multi-Ángulo (`SearchTab.tsx`):** Consultas paralelas sin paginación forzada, filtrado de miniaturas rotas, ordenación por visualizaciones y selección múltiple por lotes para añadir canciones a listas o favoritos sin cortar la reproducción.
3. **Recomendaciones y Canales Continuos (`recommendationService.ts` + `HomeTab.tsx`):** Generación dinámica de secciones *"Hecho Para Ti"*, *Colecciones Destacadas* y *Canales Continuos* de conciertos y sesiones largas.

---

## 6. Generador de Sesiones por Ritmo (RPM / BPM) y Control de Pitch

1. **Motor de Tempo (`bpmService.ts` + `RpmPlaylistGenerator.tsx`):**
   * Clasifica y genera sesiones automáticas en tres velocidades de plato: **$33\frac{1}{3}\text{ RPM}$** (`60–95 BPM`, Slow/Baladas), **$45\text{ RPM}$** (`96–122 BPM`, Groove/Cruising), **$78\text{ RPM}$** (`123–175 BPM`, Turbo/Running) y **Cadencia Exacta Manual** (`65–175 BPM`).
   * Panel desplegable en Portada y Biblioteca con grabación directa en cinta y activación inmediata del casette o vinilo al reproducir.
2. **Filtro de Velocidad y Pitch tipo Technics:**
   * Filtrado y ordenación por BPM/RPM dentro de cualquier lista o en Favoritos, y control deslizante de **Pitch (`0.75x` a `1.35x`)** en el reproductor a pantalla completa.

---

## 7. Modo Seguro Infantil y Control Parental

1. **Entorno Blindado (`KidsTab.tsx`, `KidsModeContext.tsx`):** 5 emisoras verificadas (*Disney, Granja, Nanas, Cuentos, Peque-Rock*) y buscador con filtro seguro (*Safe Search*).
2. **Protección Auditiva y Temporizador:** Limitador automático de volumen máximo (ej. `65%`), *Sleep Timer* programable y salida bloqueada exclusivamente por **PIN Parental**.

---

## 8. Control de Acceso por Dispositivo y Generador Maestro de Claves VIP

1. **ID Único de Equipo (`EQ-XXXX-XXXX`) y Triple Bóveda (`AuthContext.tsx`):** Persistencia simultánea en `localStorage`, `IndexedDB` y `CacheStorage` para proteger el contador de **1 hora de prueba gratuita**.
2. **Licencias Criptográficas SHA-256 (`MX-XXXX-XXXX`):**
   * Cada clave se firma con SHA-256 vinculando `(usuario + EQ-XXXX-XXXX + caducidad + secreto)`, impidiendo que una clave funcione en otro dispositivo.
3. **Generador Maestro Exclusivo (`AdminLicenseModal.tsx`):** Visible únicamente para el administrador maestro (`Fernandolozanor`), con generación de claves permanentes o temporales (24h, 7 días, 30 días) y copia directa para WhatsApp.

---

## 9. Sincronización Multi-Dispositivo en Tiempo Real por Código QR

1. **Generador QR Vectorial Propio (`qrCode.ts`):** Implementación ISO/IEC 18004 con corrección de errores Reed-Solomon $GF(2^8)$ sin dependencias externas.
2. **Código de Cinta Compartida (`TAPE-XXXX-XXXX`) y Emparejamiento Continuo (`syncService.ts`, `SyncModal.tsx`):**
   * Vinculación instantánea al escanear el QR (`?sync=TAPE-XXXX-XXXX`), mediante el escáner de cámara integrado o introduciendo el código manualmente.
   * Transporte cifrado (`XOR + Base64`) en tiempo real vía `EventSource` (`SSE`) con fragmentación automática para bibliotecas grandes, fusión sin conflictos (*CRDT*) con registro de borrados (*tombstones*) y exportación/importación en archivo `.json`.
