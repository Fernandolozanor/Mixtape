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

    // 1. Try local dev middleware if running on Vite dev server (fetches official channel /releases tab)
    try {
      const devRes = await fetch(`/api/yt/releases?q=${encodeURIComponent(term)}`, {
        signal: AbortSignal.timeout(5500),
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

    // 2. High-speed parallel extraction across official Channel Releases + Piped Music Albums
    try {
      const [fromChannel, fromPiped] = await Promise.all([
        this.fetchChannelReleasesInvidious(term).catch(() => []),
        this.fetchPipedMusicAlbums(term).catch(() => []),
      ]);

      const merged: YouTubeRelease[] = [];
      const seenIds = new Set<string>();
      const seenTitles = new Set<string>();

      // Prioritize official artist channel releases (includes both albums and singles)
      for (const item of [...fromChannel, ...fromPiped]) {
        if (!item.id || seenIds.has(item.id)) continue;
        const normTitle = (item.title || '')
          .toLowerCase()
          .replace(/[^\w\s]/gi, '')
          .trim();
        if (normTitle && seenTitles.has(normTitle)) continue;

        seenIds.add(item.id);
        if (normTitle) seenTitles.add(normTitle);
        merged.push(item);
      }

      if (merged.length > 0) {
        this.searchCache.set(cacheKey, merged);
        merged.forEach((r) => this.releaseCache.set(r.id, r));
        return merged;
      }
    } catch (e) {
      console.warn('YouTube release search error:', e);
    }

    return [];
  }

  /**
   * Search for artist channel and extract the complete discography from its /releases tab
   */
  private async fetchChannelReleasesInvidious(term: string): Promise<YouTubeRelease[]> {
    const sUrl = `https://yt.chocolatemoo53.com/api/v1/search?q=${encodeURIComponent(term)}&type=channel`;
    const sRes = await fetch(sUrl, { signal: AbortSignal.timeout(4500) });
    if (!sRes.ok) throw new Error(`Channel search HTTP ${sRes.status}`);
    const channels = await sRes.json();
    if (!Array.isArray(channels) || channels.length === 0) return [];

    const qNorm = term.toLowerCase().trim();
    const best =
      channels.find((c: any) => {
        const a = (c.author || '').toLowerCase();
        return (c.authorVerified && a.includes(qNorm)) || a === qNorm;
      }) ||
      channels.find((c: any) => (c.author || '').toLowerCase().includes(qNorm)) ||
      channels[0];

    if (!best || !best.authorId) return [];

    const rUrl = `https://yt.chocolatemoo53.com/api/v1/channels/${best.authorId}/releases`;
    const rRes = await fetch(rUrl, { signal: AbortSignal.timeout(5000) });
    if (!rRes.ok) throw new Error(`Channel releases HTTP ${rRes.status}`);
    const rData = await rRes.json();
    const playlists = rData.playlists || [];

    return playlists
      .filter((p: any) => p.playlistId)
      .map((p: any) => {
        const title = (p.title || '').replace(/^Album\s*[-–:]\s*/i, '').trim();
        const yearMatch = title.match(/[\(\[]\s*(\d{4})\s*[\)\]]/);
        const count = typeof p.videoCount === 'number' ? p.videoCount : undefined;
        let thumb = p.playlistThumbnail || `https://i.ytimg.com/vi/${p.playlistId}/hqdefault.jpg`;
        if (thumb.includes('hqdefault.jpg')) {
          thumb = thumb.replace('hqdefault.jpg', 'maxresdefault.jpg');
        }

        return {
          id: p.playlistId,
          title,
          artist: p.author || best.author || term,
          year: yearMatch ? yearMatch[1] : undefined,
          thumbnail: thumb,
          trackCount: count,
          type: count === 1 ? 'single' : 'album',
          url: `https://www.youtube.com/playlist?list=${p.playlistId}`,
        };
      });
  }

  /**
   * Race Piped CORS instances with filter=music_albums
   */
  private async fetchPipedMusicAlbums(term: string): Promise<YouTubeRelease[]> {
    const pipedEndpoints = [
      `https://api.piped.private.coffee/search?q=${encodeURIComponent(term)}&filter=music_albums`,
      `https://pipedapi.ducks.party/search?q=${encodeURIComponent(term)}&filter=music_albums`,
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

        let cleanName = (it.name || '').replace(/^Album\s*[-–:]\s*/i, '').trim();
        const yearMatch = cleanName.match(/[\(\[]\s*(\d{4})\s*[\)\]]/);
        const year = yearMatch ? yearMatch[1] : undefined;

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
          type: 'album',
          url: it.url,
        });
      }

      if (albums.length === 0) throw new Error('No albums parsed');
      return albums;
    };

    return await Promise.any(
      pipedEndpoints.map(async (url) => {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);
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
      'https://yt.chocolatemoo53.com',
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
