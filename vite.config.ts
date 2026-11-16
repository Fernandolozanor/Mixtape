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

      // Search YouTube Releases / Albums (Channel Releases Tab + Album Search)
      server.middlewares.use('/api/yt/releases', async (req, res) => {
        const urlObj = new URL(req.url || '', 'http://localhost:3030');
        const query = urlObj.searchParams.get('q') || '';
        if (!query.trim()) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([]));
          return;
        }

        const albums: any[] = [];
        const seenIds = new Set<string>();

        const findObjectsWith = (obj: any, key: string, results: any[] = []): any[] => {
          if (!obj || typeof obj !== 'object') return results;
          if (obj[key] !== undefined) results.push(obj);
          for (const k of Object.keys(obj)) findObjectsWith(obj[k], key, results);
          return results;
        };

        // 1. Check artist / group channel releases tab on YouTube
        try {
          const sUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`;
          const sRes = await fetch(sUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            },
            signal: AbortSignal.timeout(4500),
          });
          if (sRes.ok) {
            const sHtml = await sRes.text();
            const sMatch =
              sHtml.match(/var ytInitialData = ({.*?});<\/script>/s) ||
              sHtml.match(/ytInitialData\s*=\s*({.*?});/s);
            if (sMatch) {
              const sData = JSON.parse(sMatch[1]);
              const channels = findObjectsWith(sData, 'channelRenderer').map((c) => c.channelRenderer);
              if (channels.length > 0) {
                const qNorm = query.toLowerCase().trim();
                const best =
                  channels.find((c: any) => {
                    const badges = JSON.stringify(c.ownerBadges || []);
                    const title = (c.title?.simpleText || '').toLowerCase();
                    return (
                      (badges.includes('OFFICIAL') || badges.includes('ARTIST') || badges.includes('VERIFIED')) &&
                      (title.includes(qNorm) || qNorm.includes(title))
                    );
                  }) ||
                  channels.find((c: any) => {
                    const title = (c.title?.simpleText || '').toLowerCase();
                    return title === qNorm || title.includes(qNorm) || qNorm.includes(title);
                  }) ||
                  channels[0];

                const channelPath =
                  best.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl ||
                  (best.channelId ? `/channel/${best.channelId}` : '');
                const channelName = best.title?.simpleText || query;

                if (channelPath) {
                  const relUrl = `https://www.youtube.com${channelPath}/releases`;
                  const relRes = await fetch(relUrl, {
                    headers: {
                      'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                    },
                    signal: AbortSignal.timeout(5000),
                  });
                  if (relRes.ok) {
                    const relHtml = await relRes.text();
                    const relMatch =
                      relHtml.match(/var ytInitialData = ({.*?});<\/script>/s) ||
                      relHtml.match(/ytInitialData\s*=\s*({.*?});/s);
                    if (relMatch) {
                      const relData = JSON.parse(relMatch[1]);
                      const playlists = findObjectsWith(relData, 'playlistRenderer').map((p) => p.playlistRenderer);
                      for (const pl of playlists) {
                        const id = pl.playlistId;
                        if (!id || seenIds.has(id)) continue;
                        seenIds.add(id);

                        const title = pl.title?.simpleText || pl.title?.runs?.[0]?.text || 'Álbum Oficial';
                        const yearMatch = title.match(/[\(\[]\s*(\d{4})\s*[\)\]]/);
                        const thumbs =
                          pl.thumbnailRenderer?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails ||
                          pl.thumbnails?.[0]?.thumbnails ||
                          [];
                        const thumb =
                          thumbs[thumbs.length - 1]?.url ||
                          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
                        const tracksText =
                          pl.videoCount ||
                          pl.thumbnailOverlays?.[0]?.thumbnailOverlayBottomPanelRenderer?.text?.simpleText ||
                          '';
                        const tracksCount = parseInt(tracksText.replace(/[^0-9]/g, ''), 10) || undefined;

                        albums.push({
                          id,
                          title,
                          artist: channelName,
                          year: yearMatch ? yearMatch[1] : undefined,
                          thumbnail: thumb,
                          trackCount: tracksCount,
                          type: 'album',
                          url: `https://www.youtube.com/playlist?list=${id}`,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (err: any) {
          console.warn('Channel releases search error:', err.message);
        }

        // 2. Complementary search via Piped music_albums (for direct album searches or fallback)
        try {
          const pUrl = `https://api.piped.private.coffee/search?q=${encodeURIComponent(query)}&filter=music_albums`;
          const response = await fetch(pUrl, { signal: AbortSignal.timeout(4500) });
          if (response.ok) {
            const data: any = await response.json();
            const items = data.items || [];
            for (const it of items) {
              if (!it.url || !it.name) continue;
              const listId = it.url.includes('list=')
                ? it.url.split('list=')[1].split('&')[0]
                : '';
              if (!listId || seenIds.has(listId)) continue;
              seenIds.add(listId);

              let cleanName = (it.name || '').replace(/^Album\s*[-–:]\s*/i, '').trim();
              const yearMatch = cleanName.match(/[\(\[]\s*(\d{4})\s*[\)\]]/);
              albums.push({
                id: listId,
                title: cleanName,
                artist: it.uploaderName || query,
                year: yearMatch ? yearMatch[1] : undefined,
                thumbnail: it.thumbnail || `https://i.ytimg.com/vi/${listId}/hqdefault.jpg`,
                trackCount: it.videos > 0 ? it.videos : undefined,
                type: 'album',
                url: it.url,
              });
            }
          }
        } catch (err: any) {
          console.warn('Piped release search error:', err.message);
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(albums));
      });

      // Get YouTube Release / Album Tracks
      server.middlewares.use('/api/yt/release-tracks', async (req, res) => {
        const urlObj = new URL(req.url || '', 'http://localhost:3030');
        const releaseId = urlObj.searchParams.get('id') || '';
        if (!releaseId) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing id parameter' }));
          return;
        }

        try {
          const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(releaseId)}`;
          const response = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            },
          });
          const html = await response.text();
          const match =
            html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
            html.match(/ytInitialData\s*=\s*({.*?});/s);

          if (!match) throw new Error('No ytInitialData');
          const data = JSON.parse(match[1]);

          const findKey = (obj: any, target: string, results: any[] = []): any[] => {
            if (!obj || typeof obj !== 'object') return results;
            if (obj[target]) results.push(obj[target]);
            for (const k of Object.keys(obj)) findKey(obj[k], target, results);
            return results;
          };

          const albumTitle =
            data.metadata?.playlistMetadataRenderer?.title ||
            data.header?.playlistHeaderRenderer?.title?.simpleText ||
            data.microformat?.microformatDataRenderer?.title ||
            'Álbum Oficial';

          const lockups = findKey(data, 'lockupViewModel');
          const tracks = lockups
            .filter((l: any) => l.contentId)
            .map((l: any, i: number) => {
              const vidId = l.contentId;
              const title = l.metadata?.lockupMetadataViewModel?.title?.content || `Pista ${i + 1}`;
              const artist =
                l.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel
                  ?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || '';

              // Extract duration from overlay badges
              let durSec = 210;
              try {
                const badgeText =
                  l.contentImage?.thumbnailViewModel?.overlays?.[0]
                    ?.thumbnailBottomOverlayViewModel?.badges?.[0]
                    ?.thumbnailBadgeViewModel?.text;
                if (badgeText) {
                  const parts = badgeText.split(':').map(Number);
                  if (parts.length === 2) durSec = parts[0] * 60 + parts[1];
                  else if (parts.length === 3) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                }
              } catch {}

              return {
                id: vidId,
                title,
                artist: artist || albumTitle,
                album: albumTitle,
                duration: durSec,
                thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                source: 'youtube',
                youtubeId: vidId,
              };
            });

          const albumCover =
            data.microformat?.microformatDataRenderer?.thumbnail?.thumbnails?.[0]?.url ||
            data.sidebar?.playlistSidebarRenderer?.items?.[0]
              ?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer
              ?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url ||
            `https://i.ytimg.com/vi/${tracks[0]?.id}/hqdefault.jpg`;

          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              id: releaseId,
              title: albumTitle,
              artist: tracks[0]?.artist || 'Artista Oficial',
              thumbnail: albumCover,
              trackCount: tracks.length,
              type: 'album',
              tracks,
            })
          );
        } catch (err: any) {
          console.warn('Dev release-tracks error:', err.message);
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
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-1024.jpg'],
      manifest: {
        name: 'Mixtape',
        short_name: 'Mixtape',
        description: 'Reproductor de música retro rock de los 80 con pletina de casette analógica',
        theme_color: '#0a0a0c',
        background_color: '#0a0a0c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
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
