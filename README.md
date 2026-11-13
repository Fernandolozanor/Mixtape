# 🎵 Pulse Music (PWA)

> Reproductor de música elegante estilo **Apple Music**, sin anuncios, con extracción de audio en streaming, letras sincronizadas en tiempo real, base de datos en Firebase y soporte completo para **iPhone (iOS), Android, Windows y macOS**.

![Pulse Music Banner](public/favicon.svg)

---

## ✨ Características Principales

1. **Diseño Gráfico Refinado (Estilo Apple Music):**
   - Interfaz translúcida con efectos *Glassmorphism* y desenfoque dinámico adaptativo (*ambient background*) basado en la carátula del álbum.
   - Mini-reproductor flotante y vista expandida con gestos táctiles.
   - Tipografía moderna inspirada en SF Pro y animaciones fluidas a 60 FPS.

2. **Cero Anuncios y Streaming Nativo:**
   - Reproducción directa de streams de audio de YouTube y otras fuentes a través de instancias de APIs descentralizadas (**Invidious / Piped**).
   - Integración automática con **SponsorBlock** para omitir intros, patrocinios y silencios reportados por la comunidad.
   - **No almacena archivos multimedia:** Únicamente reproduce streams bajo demanda y almacena referencias y metadatos.

3. **Letras Sincronizadas en Tiempo Real:**
   - Integración nativa con la API de **LRCLIB**.
   - Desplazamiento automático karaoke y opción de tocar cualquier verso para saltar la canción directamente a ese segundo.

4. **Sincronización en la Nube con Firebase:**
   - Autenticación rápida (modo anónimo o cuenta de Google).
   - Almacenamiento y sincronización instantánea de **listas de reproducción**, **canciones favoritas** y preferencias entre todos tus dispositivos mediante **Cloud Firestore**.
   - Fallback local transparente (*LocalStorage* e *IndexedDB*) si aún no has vinculado Firebase.

5. **Multiplataforma y PWA (iOS, Android, Windows, macOS):**
   - Soporte nativo para la API `navigator.mediaSession`: visualiza carátulas y controla pistas desde la pantalla de bloqueo de tu iPhone, Dynamic Island, barra de notificaciones de Android o controles multimedia de Windows/Mac.
   - Caché local con **IndexedDB** para reproducción resistente a pérdidas de cobertura (metro, túneles o viajes).

---

## 🚀 Inicio Rápido en Local

Para probar la aplicación en tu equipo:

```bash
# 1. Accede al directorio del proyecto
cd "D:\REPRODUCTOR MUSICA"

# 2. Inicia el servidor de desarrollo local
npm run dev
```

Abre tu navegador en `http://localhost:5173`.

---

## 📱 Cómo Instalar como PWA en tus Dispositivos

### En iPhone / iPad (iOS):
1. Abre la URL en **Safari**.
2. Toca el botón **Compartir** (icono de cuadrado con flecha hacia arriba).
3. Selecciona **"Añadir a la pantalla de inicio"** (Add to Home Screen).
4. Ábrela desde tu pantalla de inicio: funcionará como una app nativa a pantalla completa y con controles en la pantalla de bloqueo.

### En Android:
1. Abre la URL en **Chrome** o **Brave**.
2. Pulsa en el menú de los 3 puntos y selecciona **"Instalar aplicación"** o pulsa el banner que aparecerá abajo.

### En Windows y macOS:
1. Abre la URL en **Google Chrome**, **Microsoft Edge** o **Brave**.
2. Haz clic en el icono de instalación (pantalla con flecha) situado en la barra de direcciones superior derecha.
3. Se integrará como una app independiente en tu menú Inicio / Launchpad.

---

## ☁️ Conexión con Firebase (Base de Datos en la Nube)

1. Ve a [Firebase Console](https://console.firebase.google.com/) y crea un proyecto gratuito (**Plan Spark**).
2. Activa **Authentication** (habilita *Proveedor Anónimo* y/o *Google*).
3. Activa **Cloud Firestore** en modo de producción o prueba.
4. En la configuración del proyecto, añade una aplicación Web y copia el objeto JSON de configuración:
   ```json
   {
     "apiKey": "AIzaSy...",
     "authDomain": "tu-proyecto.firebaseapp.com",
     "projectId": "tu-proyecto",
     "storageBucket": "tu-proyecto.appspot.com",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```
5. En la app **Pulse Music**, pulsa en **Ajustes** (icono de engranaje), pega el JSON y pulsa **Guardar Configuración**. ¡Tus listas quedarán sincronizadas automáticamente!

---

## 🌐 Publicación en GitHub Pages

Este proyecto ya incluye el flujo de trabajo automatizado de GitHub Actions en `.github/workflows/deploy.yml`.

Para subirlo y tenerlo publicado en internet de forma gratuita:

```bash
# Inicializa git
git init
git add .
git commit -m "Initial release of Pulse Music PWA"

# Vincula tu repositorio de GitHub (sustituye TU-USUARIO y TU-REPOSITORIO)
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

Una vez subido:
1. En tu repositorio en GitHub, ve a **Settings** > **Pages**.
2. En **Build and deployment** > **Source**, selecciona **GitHub Actions**.
3. En unos 60 segundos tu reproductor estará publicado y accesible en `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.
