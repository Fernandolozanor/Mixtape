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
          // Generate tailored queries (focused for specific song/artist pairs, multi-angle for general queries)
          const wordCount = query.trim().split(/\s+/).length;
          let searchTerms: string[] = [query];
          if (wordCount <= 2) {
            if (page === 1) {
              searchTerms.push(
                `${query} songs`,
                `${query} greatest hits`,
                `${query} official video`,
                `${query} audio`
              );
            } else if (page === 2) {
              searchTerms.push(`${query} album`, `${query} live`, `${query} remaster`);
            }
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

                      const fullTitle = v.title?.runs
                        ? v.title.runs.map((r: any) => r.text).join('')
                        : v.title?.simpleText || '';
                      const fullArtist = v.ownerText?.runs
                        ? v.ownerText.runs.map((r: any) => r.text).join('')
                        : v.ownerText?.simpleText || 'YouTube';

                      map.set(v.videoId, {
                        id: v.videoId,
                        title: fullTitle,
                        artist: fullArtist,
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

                          const svTitle = sv.title?.runs
                            ? sv.title.runs.map((r: any) => r.text).join('')
                            : sv.title?.simpleText || '';
                          const svArtist = sv.ownerText?.runs
                            ? sv.ownerText.runs.map((r: any) => r.text).join('')
                            : sv.ownerText?.simpleText || 'YouTube';

                          map.set(sv.videoId, {
                            id: sv.videoId,
                            title: svTitle,
                            artist: svArtist,
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

        // 2. Complementary search via Piped music_albums + music_playlists + Invidious playlists
        const isNonMusicPlaylist = (title: string, count?: number) => {
          if (typeof count === 'number' && count > 0 && (count < 2 || count > 85)) return true;
          return /\b(clips?|trailers?|pel[ií]cula completa|full movie|scenes?|escenas?|cast|explained|reaction|review|unboxing|gameplay|walkthrough|episodes?|cap[ií]tulos?)\b/i.test(
            title || ''
          );
        };

        const pipedSearchUrls = [
          { url: `https://api.piped.private.coffee/search?q=${encodeURIComponent(query)}&filter=music_albums`, filterNonMusic: false },
          { url: `https://pipedapi.ducks.party/search?q=${encodeURIComponent(query)}&filter=music_albums`, filterNonMusic: false },
          { url: `https://api.piped.private.coffee/search?q=${encodeURIComponent(query)}&filter=music_playlists`, filterNonMusic: true },
          { url: `https://pipedapi.ducks.party/search?q=${encodeURIComponent(query)}&filter=music_playlists`, filterNonMusic: true },
        ];

        const needsHint = !/\b(album|álbum|soundtrack|ost|bso|discography|lp|ep)\b/i.test(query);
        const invPlUrl = `https://yt.chocolatemoo53.com/api/v1/search?q=${encodeURIComponent(
          needsHint ? `${query} album soundtrack` : query
        )}&type=playlist`;

        await Promise.all([
          ...pipedSearchUrls.map(async ({ url: pUrl, filterNonMusic }) => {
            try {
              const response = await fetch(pUrl, { signal: AbortSignal.timeout(5000) });
              if (!response.ok) return;
              const data: any = await response.json();
              const items = data.items || [];
              for (const it of items) {
                if (!it.url || !it.name) continue;
                const listId = it.url.includes('list=')
                  ? it.url.split('list=')[1].split('&')[0]
                  : '';
                if (!listId || seenIds.has(listId)) continue;

                const cleanName = (it.name || '').replace(/^Album\s*[-–:]\s*/i, '').trim();
                const videosCount = it.videos > 0 ? it.videos : undefined;
                if (filterNonMusic && isNonMusicPlaylist(cleanName, videosCount)) continue;
                seenIds.add(listId);

                const yearMatch =
                  cleanName.match(/[\(\[]\s*(\d{4})\s*[\)\]]/) ||
                  cleanName.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
                albums.push({
                  id: listId,
                  title: cleanName,
                  artist: it.uploaderName || query,
                  year: yearMatch ? yearMatch[1] : undefined,
                  thumbnail: it.thumbnail || `https://i.ytimg.com/vi/${listId}/hqdefault.jpg`,
                  trackCount: videosCount,
                  type: 'album',
                  url: it.url.startsWith('http') ? it.url : `https://www.youtube.com${it.url}`,
                });
              }
            } catch (err: any) {
              console.warn('Piped release search error:', err.message);
            }
          }),
          (async () => {
            try {
              const invRes = await fetch(invPlUrl, { signal: AbortSignal.timeout(5000) });
              if (!invRes.ok) return;
              const invItems: any = await invRes.json();
              if (!Array.isArray(invItems)) return;
              for (const p of invItems) {
                const listId = p.playlistId;
                if (!listId || seenIds.has(listId) || !p.title) continue;
                const cleanName = (p.title || '').replace(/^Album\s*[-–:]\s*/i, '').trim();
                const videosCount = typeof p.videoCount === 'number' && p.videoCount > 0 ? p.videoCount : undefined;
                if (isNonMusicPlaylist(cleanName, videosCount)) continue;
                seenIds.add(listId);

                const yearMatch =
                  cleanName.match(/[\(\[]\s*(\d{4})\s*[\)\]]/) ||
                  cleanName.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
                albums.push({
                  id: listId,
                  title: cleanName,
                  artist: p.author || query,
                  year: yearMatch ? yearMatch[1] : undefined,
                  thumbnail: p.playlistThumbnail || `https://i.ytimg.com/vi/${listId}/hqdefault.jpg`,
                  trackCount: videosCount,
                  type: 'album',
                  url: `https://www.youtube.com/playlist?list=${listId}`,
                });
              }
            } catch (err: any) {
              console.warn('Invidious playlist release search error:', err.message);
            }
          })(),
        ]);

        // Relevance sort so OSTs/soundtracks and official albums rank above unrelated covers/audiobooks
        const qTokens = query
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(/[\s,.\-_:;()]+/)
          .filter((w) => w.length >= 2 && !['the', 'and', 'del', 'los', 'las', 'for', 'con'].includes(w));

        albums.sort((a, b) => {
          const scoreItem = (it: any) => {
            const text = `${it.title || ''} ${it.artist || ''}`
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            let sc = 0;
            if (qTokens.length > 0) {
              const hits = qTokens.filter((t) => text.includes(t)).length;
              sc += Math.round((hits / qTokens.length) * 40);
            }
            if (/\b(original motion picture soundtrack|soundtrack|ost|bso|full album|complete score|score|philharmonic|orchestra|deluxe|remaster|expanded edition)\b/i.test(text)) {
              sc += 25;
            }
            if (/\b(sped[- ]?up|slowed down|nightcore|karaoke|chapter|audiobook|devil in iron|gods of the north|witch shall be born|jewels of gwahlur|shadows in)\b/i.test(text)) {
              sc -= 35;
            }
            if (/\bfrom\s+(the\s+)?(soundtrack|movie|film)\s+of\b|\(from\s+["“]/i.test(text)) {
              sc -= 25;
            }
            if (it.trackCount && it.trackCount >= 5 && it.trackCount <= 45) sc += 10;
            return sc;
          };
          return scoreItem(b) - scoreItem(a);
        });

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(albums.slice(0, 30)));
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
            signal: AbortSignal.timeout(5000),
          });
          const html = await response.text();
          const match =
            html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
            html.match(/ytInitialData\s*=\s*({.*?});/s);

          let tracks: any[] = [];
          let albumTitle = 'Álbum Oficial';
          let albumCover = '';

          if (match) {
            const data = JSON.parse(match[1]);

            const findKey = (obj: any, target: string, results: any[] = []): any[] => {
              if (!obj || typeof obj !== 'object') return results;
              if (obj[target]) results.push(obj[target]);
              for (const k of Object.keys(obj)) findKey(obj[k], target, results);
              return results;
            };

            albumTitle =
              data.metadata?.playlistMetadataRenderer?.title ||
              data.header?.playlistHeaderRenderer?.title?.simpleText ||
              data.microformat?.microformatDataRenderer?.title ||
              'Álbum Oficial';

            // Support standard PL... playlists (playlistVideoRenderer) AND OLAK5uy_ layouts (lockupViewModel)
            const videoRenderers = findKey(data, 'playlistVideoRenderer');
            if (videoRenderers.length > 0) {
              tracks = videoRenderers
                .filter((v: any) => v.videoId)
                .map((v: any, i: number) => {
                  const vidId = v.videoId;
                  const title =
                    v.title?.runs?.map((r: any) => r.text).join('') ||
                    v.title?.simpleText ||
                    `Pista ${i + 1}`;
                  const artist =
                    v.shortBylineText?.runs?.map((r: any) => r.text).join('') || '';
                  const durSec = parseInt(v.lengthSeconds || '0', 10) || 210;
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
            }

            if (tracks.length === 0) {
              const lockups = findKey(data, 'lockupViewModel');
              tracks = lockups
                .filter((l: any) => l.contentId)
                .map((l: any, i: number) => {
                  const vidId = l.contentId;
                  const title = l.metadata?.lockupMetadataViewModel?.title?.content || `Pista ${i + 1}`;
                  const artist =
                    l.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel
                      ?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || '';

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
            }

            albumCover =
              data.microformat?.microformatDataRenderer?.thumbnail?.thumbnails?.[0]?.url ||
              data.sidebar?.playlistSidebarRenderer?.items?.[0]
                ?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer
                ?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url ||
              (tracks[0] ? `https://i.ytimg.com/vi/${tracks[0].id}/hqdefault.jpg` : '');
          }

          // Fallback to Invidious playlist API if YouTube returned consent wall or empty list
          if (tracks.length === 0) {
            const invRes = await fetch(
              `https://yt.chocolatemoo53.com/api/v1/playlists/${encodeURIComponent(releaseId)}`,
              { signal: AbortSignal.timeout(6000) }
            );
            if (invRes.ok) {
              const invData: any = await invRes.json();
              const vids = invData.videos || [];
              if (Array.isArray(vids) && vids.length > 0) {
                albumTitle = (invData.title || albumTitle).replace(/^Album\s*[-–:]\s*/i, '').trim();
                const invAuthor = invData.author || 'Artista Oficial';
                tracks = vids
                  .filter((v: any) => v.videoId && v.title)
                  .map((v: any) => ({
                    id: v.videoId,
                    title: v.title,
                    artist: v.author || invAuthor,
                    album: albumTitle,
                    duration: v.lengthSeconds || 210,
                    thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                    source: 'youtube',
                    youtubeId: v.videoId,
                  }));
                albumCover =
                  invData.playlistThumbnail ||
                  `https://i.ytimg.com/vi/${tracks[0]?.id}/hqdefault.jpg`;
              }
            }
          }

          if (tracks.length === 0) throw new Error('No tracks found in playlist');

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
    configurePreviewServer(server) {
      // Re-use API endpoints in preview mode
      (this as any).configureServer?.(server);
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
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,webp,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:webp|png|jpg|jpeg|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-visual-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbnails',
              expiration: {
                maxEntries: 250,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
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
