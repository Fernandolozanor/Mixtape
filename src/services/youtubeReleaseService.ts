import type { Track, YouTubeRelease } from '../types/music';

class YouTubeReleaseService {
  private releaseCache = new Map<string, YouTubeRelease>();
  private searchCache = new Map<string, YouTubeRelease[]>();

  /**
   * Search for official YouTube Music Releases / Albums / Discography
   */
  async searchReleases(query: string): Promise<YouTubeRelease[]> {
    const term = query.trim();
    if (!term) return [];

    const cacheKey = term.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    // 1. Try local dev middleware if running on Vite dev server
    try {
      const devRes = await fetch(`/api/yt/releases?q=${encodeURIComponent(term)}`, {
        signal: AbortSignal.timeout(2500),
      });
      if (devRes.ok) {
        const devData = await devRes.json();
        if (Array.isArray(devData) && devData.length > 0) {
          this.searchCache.set(cacheKey, devData);
          devData.forEach((r) => this.releaseCache.set(r.id, r));
          return devData;
        }
      }
    } catch {
      // Ignored in static/production
    }

    // 2. High-speed parallel race across verified CORS Piped endpoints with filter=music_albums
    const pipedEndpoints = [
      `https://api.piped.private.coffee/search?q=${encodeURIComponent(term)}&filter=music_albums`,
      `https://pipedapi.ducks.party/search?q=${encodeURIComponent(term)}&filter=music_albums`,
      `https://api.piped.private.coffee/search?q=${encodeURIComponent(term + ' album')}&filter=playlists`,
      `https://pipedapi.ducks.party/search?q=${encodeURIComponent(term + ' album')}&filter=playlists`,
    ];

    const parsePipedAlbums = async (res: Response): Promise<YouTubeRelease[]> => {
      if (!res.ok) throw new Error(`Piped HTTP ${res.status}`);
      const data = await res.json();
      const items = data.items || [];
      const albums: YouTubeRelease[] = [];

      for (const it of items) {
        if (!it.url || !it.name) continue;
        const listId = it.url.includes('list=')
          ? it.url.split('list=')[1].split('&')[0]
          : '';
        if (!listId) continue;

        // Clean album name: remove "Album – ", "Album - ", etc.
        let cleanName = (it.name || '').replace(/^Album\s*[-–:]\s*/i, '').trim();

        // Extract year if present in title (e.g. "Abbey Road (1969)" or "Thriller [1982]")
        const yearMatch = cleanName.match(/[\(\[]\s*(\d{4})\s*[\)\]]/);
        const year = yearMatch ? yearMatch[1] : undefined;

        // High resolution square cover
        let thumb = it.thumbnail || '';
        if (thumb.includes('hqdefault.jpg')) {
          thumb = thumb.replace('hqdefault.jpg', 'maxresdefault.jpg');
        }

        albums.push({
          id: listId,
          title: cleanName,
          artist: it.uploaderName || term,
          year,
          thumbnail: thumb || `https://i.ytimg.com/vi/${listId}/hqdefault.jpg`,
          trackCount: it.videos > 0 ? it.videos : undefined,
          type: listId.startsWith('OLAK5uy_') ? 'album' : 'album',
          url: it.url,
        });
      }

      if (albums.length === 0) throw new Error('No albums parsed');

      // Sort official releases (OLAK5uy_...) to the top
      albums.sort((a, b) => {
        const aIsOfficial = a.id.startsWith('OLAK5uy_') ? 1 : 0;
        const bIsOfficial = b.id.startsWith('OLAK5uy_') ? 1 : 0;
        return bIsOfficial - aIsOfficial;
      });

      return albums;
    };

    try {
      const results = await Promise.any(
        pipedEndpoints.map(async (url) => {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 6500);
          try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(tid);
            return await parsePipedAlbums(res);
          } catch (e) {
            clearTimeout(tid);
            throw e;
          }
        })
      );

      if (Array.isArray(results) && results.length > 0) {
        // Deduplicate by ID
        const seen = new Set<string>();
        const unique = results.filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });

        this.searchCache.set(cacheKey, unique);
        unique.forEach((r) => this.releaseCache.set(r.id, r));
        return unique;
      }
    } catch (e) {
      console.warn('YouTube release search error:', e);
    }

    return [];
  }

  /**
   * Fetch full tracklist and details for an official YouTube Release / Album
   */
  async getReleaseDetails(
    releaseId: string,
    fallbackMeta?: Partial<YouTubeRelease>
  ): Promise<YouTubeRelease | null> {
    const cached = this.releaseCache.get(releaseId);
    if (cached && cached.tracks && cached.tracks.length > 0) {
      return cached;
    }

    // 1. Try local dev middleware if running on Vite dev server
    try {
      const devRes = await fetch(
        `/api/yt/release-tracks?id=${encodeURIComponent(releaseId)}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (devRes.ok) {
        const devData: YouTubeRelease = await devRes.json();
        if (devData && devData.tracks && devData.tracks.length > 0) {
          this.releaseCache.set(releaseId, devData);
          return devData;
        }
      }
    } catch {
      // Ignored
    }

    // 2. High-speed parallel race across verified Invidious playlist endpoints
    const invidiousInstances = [
      'https://inv.nadeko.net',
      'https://invidious.nerdvpn.de',
      'https://inv.tux.pizza',
      'https://invidious.f5.si',
    ];

    const parseInvidiousPlaylist = async (
      res: Response
    ): Promise<YouTubeRelease> => {
      if (!res.ok) throw new Error(`Invidious HTTP ${res.status}`);
      const data = await res.json();
      const vids = data.videos || [];
      if (!Array.isArray(vids) || vids.length === 0) {
        throw new Error('No tracks found in playlist');
      }

      const albumTitle =
        (data.title || fallbackMeta?.title || '')
          .replace(/^Album\s*[-–:]\s*/i, '')
          .trim() || 'Álbum Oficial';

      const albumArtist =
        data.author || fallbackMeta?.artist || 'Artista Oficial';

      const tracks: Track[] = vids
        .filter((v: any) => v.videoId && v.title)
        .map((v: any) => {
          const vidId = v.videoId;
          const dur = v.lengthSeconds || 210;
          return {
            id: vidId,
            title: v.title,
            artist: v.author || albumArtist,
            album: albumTitle,
            duration: dur,
            thumbnail:
              v.videoThumbnails?.[0]?.url ||
              fallbackMeta?.thumbnail ||
              `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
            source: 'youtube' as const,
            youtubeId: vidId,
          };
        });

      return {
        id: releaseId,
        title: albumTitle,
        artist: albumArtist,
        year: fallbackMeta?.year,
        thumbnail:
          fallbackMeta?.thumbnail ||
          data.playlistThumbnail ||
          `https://i.ytimg.com/vi/${tracks[0]?.id}/hqdefault.jpg`,
        trackCount: tracks.length,
        type: 'album',
        tracks,
      };
    };

    try {
      const details = await Promise.any(
        invidiousInstances.map(async (base) => {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 6000);
          try {
            const res = await fetch(`${base}/api/v1/playlists/${releaseId}`, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
              signal: controller.signal,
            });
            clearTimeout(tid);
            return await parseInvidiousPlaylist(res);
          } catch (e) {
            clearTimeout(tid);
            throw e;
          }
        })
      );

      if (details) {
        this.releaseCache.set(releaseId, details);
        return details;
      }
    } catch (e) {
      console.warn('Invidious album tracks race error:', e);
    }

    return null;
  }
}

export const youtubeReleaseService = new YouTubeReleaseService();
