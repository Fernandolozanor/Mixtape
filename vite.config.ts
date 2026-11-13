import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Custom Vite plugin to search YouTube directly with view counts and popularity ranking
function youtubeSearchPlugin(): Plugin {
  return {
    name: 'youtube-search-middleware',
    configureServer(server) {
      server.middlewares.use('/api/yt/search', async (req, res) => {
        const urlObj = new URL(req.url || '', 'http://localhost:3030');
        const query = urlObj.searchParams.get('q') || '';
        const page = parseInt(urlObj.searchParams.get('page') || '1', 10);

        if (!query.trim()) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([]));
          return;
        }

        try {
          // Generate rich multi-angle queries to eliminate any search limits
          let searchTerms: string[] = [];
          if (page === 1) {
            searchTerms = [
              query,
              `${query} songs`,
              `${query} greatest hits`,
              `${query} official video`,
              `${query} album full`,
              `${query} audio`,
              `${query} live`,
              `${query} discography`,
            ];
          } else if (page === 2) {
            searchTerms = [
              `${query} concert`,
              `${query} acoustic`,
              `${query} remaster`,
              `${query} session`,
              `${query} remix`,
              `${query} best tracks`,
              `${query} lyrics`,
              `${query} cover`,
            ];
          } else {
            searchTerms = [
              `${query} instrumental`,
              `${query} unreleased`,
              `${query} radio edit`,
              `${query} live performance`,
              `${query} compilation`,
              `${query} extended mix`,
            ];
          }

          const map = new Map<string, any>();

          await Promise.all(
            searchTerms.map(async (term) => {
              try {
                const sUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`;
                const response = await fetch(sUrl, {
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

                if (!jsonMatch) return;

                const data = JSON.parse(jsonMatch[1]);
                const sectionList =
                  data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

                for (const sec of sectionList) {
                  const items = sec.itemSectionRenderer?.contents || [];
                  for (const item of items) {
                    // 1. Direct videoRenderer
                    const v = item.videoRenderer;
                    if (v && v.videoId && !map.has(v.videoId)) {
                      const durText = v.lengthText?.simpleText || '3:30';
                      const parts = durText.split(':').map(Number);
                      let durSec = 210;
                      if (parts.length === 2) durSec = parts[0] * 60 + parts[1];
                      else if (parts.length === 3) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];

                      const viewRaw = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '';
                      let viewNum = 0;
                      const clean = viewRaw.toLowerCase().replace(/visualizaciones|vistas|views/g, '').trim();
                      if (clean.includes('b')) viewNum = parseFloat(clean.replace(',', '.')) * 1_000_000_000;
                      else if (clean.includes('m')) viewNum = parseFloat(clean.replace(',', '.')) * 1_000_000;
                      else if (clean.includes('k')) viewNum = parseFloat(clean.replace(',', '.')) * 1_000;
                      else viewNum = parseInt(clean.replace(/\D/g, ''), 10) || 0;

                      let viewsFormatted = '';
                      if (viewNum >= 1_000_000_000) {
                        viewsFormatted = (viewNum / 1_000_000_000).toFixed(1) + 'B vistas';
                      } else if (viewNum >= 1_000_000) {
                        viewsFormatted = (viewNum / 1_000_000).toFixed(1) + 'M vistas';
                      } else if (viewNum >= 1_000) {
                        viewsFormatted = Math.round(viewNum / 1_000) + 'K vistas';
                      } else if (viewNum > 0) {
                        viewsFormatted = viewNum.toLocaleString() + ' vistas';
                      }

                      const thumb =
                        v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
                        `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

                      map.set(v.videoId, {
                        id: v.videoId,
                        title: v.title?.runs?.[0]?.text || '',
                        artist: v.ownerText?.runs?.[0]?.text || 'YouTube',
                        album: 'YouTube Music',
                        duration: durSec,
                        thumbnail: thumb,
                        source: 'youtube',
                        youtubeId: v.videoId,
                        views: viewNum,
                        viewsFormatted,
                      });
                    }

                    // 2. ShelfRenderer items
                    const shelf = item.shelfRenderer?.content?.verticalListRenderer?.items;
                    if (Array.isArray(shelf)) {
                      for (const sub of shelf) {
                        const sv = sub.videoRenderer;
                        if (sv && sv.videoId && !map.has(sv.videoId)) {
                          const sDurText = sv.lengthText?.simpleText || '3:30';
                          const sParts = sDurText.split(':').map(Number);
                          let sDurSec = 210;
                          if (sParts.length === 2) sDurSec = sParts[0] * 60 + sParts[1];
                          else if (sParts.length === 3) sDurSec = sParts[0] * 3600 + sParts[1] * 60 + sParts[2];

                          map.set(sv.videoId, {
                            id: sv.videoId,
                            title: sv.title?.runs?.[0]?.text || '',
                            artist: sv.ownerText?.runs?.[0]?.text || 'YouTube',
                            album: 'YouTube Music',
                            duration: sDurSec,
                            thumbnail: `https://i.ytimg.com/vi/${sv.videoId}/hqdefault.jpg`,
                            source: 'youtube',
                            youtubeId: sv.videoId,
                            views: 20_000_000,
                            viewsFormatted: 'Destacado',
                          });
                        }
                      }
                    }

                    // 3. LockupViewModel items (Playlists & Collections)
                    if (item.lockupViewModel) {
                      const rows =
                        item.lockupViewModel.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel
                          ?.metadataRows || [];
                      for (const row of rows) {
                        for (const part of row.metadataParts || []) {
                          const runs = part.text?.commandRuns || [];
                          for (const run of runs) {
                            const vid = run.onTap?.innertubeCommand?.watchEndpoint?.videoId;
                            if (vid && !map.has(vid)) {
                              const rawTitle = part.text?.content || 'Pista de Álbum';
                              const titleClean = rawTitle.split('·')[0].trim();
                              map.set(vid, {
                                id: vid,
                                title: titleClean,
                                artist: query,
                                album: 'YouTube Music',
                                duration: 240,
                                thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                                source: 'youtube',
                                youtubeId: vid,
                                views: 15_000_000,
                                viewsFormatted: 'Álbum / Colección',
                              });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch (err: any) {
                console.warn('Sub-query fetch failed:', err.message);
              }
            })
          );

          const videos = Array.from(map.values());
          // Sort by views descending (Most played first!)
          videos.sort((a, b) => (b.views || 0) - (a.views || 0));

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
