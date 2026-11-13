import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Custom Vite plugin to search YouTube directly without CORS restrictions during local development
function youtubeSearchPlugin(): Plugin {
  return {
    name: 'youtube-search-middleware',
    configureServer(server) {
      server.middlewares.use('/api/yt/search', async (req, res) => {
        const urlObj = new URL(req.url || '', 'http://localhost:3030');
        const query = urlObj.searchParams.get('q') || '';

        if (!query.trim()) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([]));
          return;
        }

        try {
          const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          const response = await fetch(ytUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            },
          });
          const html = await response.text();
          const jsonMatch =
            html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
            html.match(/ytInitialData\s*=\s*({.*?});/s);

          if (!jsonMatch) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
            return;
          }

          const data = JSON.parse(jsonMatch[1]);
          const contents =
            data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
          const items = contents?.[0]?.itemSectionRenderer?.contents || [];

          const videos = [];
          for (const item of items) {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const durText = v.lengthText?.simpleText || '3:30';
              const parts = durText.split(':').map(Number);
              let durSec = 210;
              if (parts.length === 2) durSec = parts[0] * 60 + parts[1];
              else if (parts.length === 3) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];

              // Clean high-res thumbnail
              const thumb =
                v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
                `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

              videos.push({
                id: v.videoId,
                title: v.title?.runs?.[0]?.text || '',
                artist: v.ownerText?.runs?.[0]?.text || 'YouTube',
                album: 'YouTube Music',
                duration: durSec,
                thumbnail: thumb,
                source: 'youtube',
                youtubeId: v.videoId,
              });
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(videos));
        } catch (err: any) {
          console.error('YouTube search error:', err.message);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensures relative assets work on GitHub Pages out of the box
  server: {
    port: 3030,
    strictPort: true,
    open: false,
  },
  plugins: [
    react(),
    tailwindcss(),
    youtubeSearchPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Pulse Music',
        short_name: 'Pulse',
        description: 'Reproductor de música elegante estilo Apple Music sin anuncios con sincronización en la nube',
        theme_color: '#0a0a0c',
        background_color: '#0a0a0c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
})
