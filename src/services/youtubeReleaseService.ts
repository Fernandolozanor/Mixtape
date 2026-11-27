import type { Track, YouTubeRelease } from '../types/music';
import { streamResolver } from './streamResolver';

class YouTubeReleaseService {
  private releaseCache = new Map<string, YouTubeRelease>();
  private searchCache = new Map<string, YouTubeRelease[]>();

  /**
   * Normalize thumbnail URL safely without breaking signed proxy/sqp URLs
   */
  private normalizeThumbnail(rawThumb: string | undefined, fallbackId: string): string {
    const thumb = (rawThumb || '').trim();
    if (!thumb) {
      return `https://i.ytimg.com/vi/${fallbackId}/hqdefault.jpg`;
    }
    // Only upgrade bare YouTube hqdefault URLs (never mutate signed ?sqp= or Piped proxy URLs)
    if (
      thumb.includes('i.ytimg.com/') &&
      thumb.includes('hqdefault.jpg') &&
      !thumb.includes('?')
    ) {
      return thumb.replace('hqdefault.jpg', 'maxresdefault.jpg');
    }
    return thumb;
  }

  /**
   * Filter out obvious non-music video playlists (trailers, movie clips, full movies, reactions)
   */
  private isLikelyNonMusicPlaylist(title: string, videoCount?: number): boolean {
    if (typeof videoCount === 'number' && videoCount > 0 && (videoCount < 2 || videoCount > 85)) {
      return true;
    }
    const lower = (title || '').toLowerCase();
    return /\b(clips?|trailers?|pel[ií]cula completa|full movie|scenes?|escenas?|cast|explained|reaction|review|unboxing|gameplay|walkthrough|episodes?|cap[ií]tulos?)\b/i.test(
      lower
    );
  }

  /**
   * Relevance & authenticity scoring so official albums and real OST/full-album playlists
   * rank ahead of unrelated covers, audiobooks, or sped-up/slowed-down spam.
   */
  private scoreRelease(
    item: YouTubeRelease,
    query: string,
    origin: 'channel' | 'music_album' | 'music_playlist' | 'invidious_playlist'
  ): number {
    const qTokens = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[\s,.\-_:;()]+/)
      .filter((w) => w.length >= 2 && !['the', 'and', 'del', 'los', 'las', 'for', 'con'].includes(w));

    const titleNorm = (item.title || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const artistNorm = (item.artist || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const combined = `${titleNorm} ${artistNorm}`;

    let score = 0;
    if (origin === 'channel') score += 60;
    else if (origin === 'music_album') score += 45;
    else if (origin === 'music_playlist') score += 36;
    else score += 32;

    if (qTokens.length > 0) {
      const matchedInTitle = qTokens.filter((t) => titleNorm.includes(t)).length;
      const matchedInCombined = qTokens.filter((t) => combined.includes(t)).length;
      const titleRatio = matchedInTitle / qTokens.length;
      const combinedRatio = matchedInCombined / qTokens.length;

      score += Math.round(titleRatio * 35 + combinedRatio * 20);
      if (matchedInCombined === 0) score -= 45;
    }

    // Boost authentic soundtrack / full-album / remaster signals
    if (
      /\b(original motion picture soundtrack|soundtrack|ost|bso|full album|complete score|score|philharmonic|orchestra|deluxe|remaster|expanded edition|anthology)\b/i.test(
        combined
      )
    ) {
      score += 22;
    }

    // Penalize non-album noise (audiobook chapters, sped-up/slowed-down remixes, single-track movie covers)
    if (
      /\b(sped[- ]?up|slowed down|nightcore|8d audio|tiktok|karaoke|8[- ]?bit|lullaby|piano cover|ringtone)\b/i.test(
        combined
      )
    ) {
      score -= 40;
    }
    if (/\bfrom\s+(the\s+)?(soundtrack|movie|film)\s+of\b|\(from\s+["“]/i.test(titleNorm)) {
      score -= 25;
    }
    if (/\b(chapter|audiobook|devil in iron|gods of the north|witch shall be born|jewels of gwahlur|shadows in)\b/i.test(combined)) {
      score -= 35;
    }
    if (item.trackCount && item.trackCount >= 5 && item.trackCount <= 45) {
      score += 10;
    }

    return score;
  }

  /**
   * Search for official YouTube Music Releases / Albums / Soundtracks / Full-Album Playlists
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
        signal: AbortSignal.timeout(6500),
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

    // 2. Parallel extraction across:
    //    - Official Artist Channel /releases tab (Invidious)
    //    - Official YouTube Music Albums (Piped filter=music_albums)
    //    - YouTube Music Full-Album / OST Playlists (Piped filter=music_playlists)
    //    - YouTube Album / Soundtrack Playlists (Invidious type=playlist)
    try {
      const [fromChannel, fromPipedAlbums, fromPipedPlaylists, fromInvidiousPlaylists] =
        await Promise.all([
          this.fetchChannelReleasesInvidious(term).catch(() => []),
          this.fetchPipedMusicAlbums(term).catch(() => []),
          this.fetchPipedMusicPlaylists(term).catch(() => []),
          this.fetchInvidiousAlbumPlaylists(term).catch(() => []),
        ]);

      type TaggedRelease = {
        item: YouTubeRelease;
        origin: 'channel' | 'music_album' | 'music_playlist' | 'invidious_playlist';
        score: number;
      };

      const candidates: TaggedRelease[] = [
        ...fromChannel.map((item) => ({
          item,
          origin: 'channel' as const,
          score: this.scoreRelease(item, term, 'channel'),
        })),
        ...fromPipedAlbums.map((item) => ({
          item,
          origin: 'music_album' as const,
          score: this.scoreRelease(item, term, 'music_album'),
        })),
        ...fromPipedPlaylists.map((item) => ({
          item,
          origin: 'music_playlist' as const,
          score: this.scoreRelease(item, term, 'music_playlist'),
        })),
        ...fromInvidiousPlaylists.map((item) => ({
          item,
          origin: 'invidious_playlist' as const,
          score: this.scoreRelease(item, term, 'invidious_playlist'),
        })),
      ];

      // Secondary fallback: if nothing was found at all, retry with "<term> full album" on Invidious playlists
      if (candidates.length === 0) {
        const extra = await this.fetchInvidiousAlbumPlaylists(`${term} full album`).catch(() => []);
        extra.forEach((item) =>
          candidates.push({
            item,
            origin: 'invidious_playlist',
            score: this.scoreRelease(item, term, 'invidious_playlist'),
          })
        );
      }

      // Sort by relevance score descending while keeping stable priority among ties
      candidates.sort((a, b) => b.score - a.score);

      const merged: YouTubeRelease[] = [];
      const seenIds = new Set<string>();
      const seenTitleArtist = new Set<string>();

      for (const { item } of candidates) {
        if (!item.id || seenIds.has(item.id)) continue;
        const normTitle = (item.title || '')
          .toLowerCase()
          .replace(/[^\w\s]/gi, '')
          .trim();
        const normArtist = (item.artist || '')
          .toLowerCase()
          .replace(/[^\w\s]/gi, '')
          .trim();
        const dedupeKey = `${normTitle}::${normArtist}`;
        if (normTitle && seenTitleArtist.has(dedupeKey)) continue;

        seenIds.add(item.id);
        if (normTitle) seenTitleArtist.add(dedupeKey);
        merged.push(item);

        if (merged.length >= 30) break;
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
        const count = typeof p.videoCount === 'number' && p.videoCount > 0 ? p.videoCount : undefined;
        const thumb = this.normalizeThumbnail(p.playlistThumbnail, p.playlistId);

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
    return this.racePipedPlaylistSearch(term, 'music_albums', false);
  }

  /**
   * Race Piped CORS instances with filter=music_playlists to capture OSTs, classic LPs,
   * and albums that lack an official YouTube Music OLAK5uy_ Topic release.
   */
  private async fetchPipedMusicPlaylists(term: string): Promise<YouTubeRelease[]> {
    return this.racePipedPlaylistSearch(term, 'music_playlists', true);
  }

  private async racePipedPlaylistSearch(
    term: string,
    filter: 'music_albums' | 'music_playlists',
    filterNonMusic: boolean
  ): Promise<YouTubeRelease[]> {
    const pipedEndpoints = [
      `https://api.piped.private.coffee/search?q=${encodeURIComponent(term)}&filter=${filter}`,
      `https://pipedapi.ducks.party/search?q=${encodeURIComponent(term)}&filter=${filter}`,
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

        const cleanName = (it.name || '').replace(/^Album\s*[-–:]\s*/i, '').trim();
        const videosCount = typeof it.videos === 'number' && it.videos > 0 ? it.videos : undefined;
        if (filterNonMusic && this.isLikelyNonMusicPlaylist(cleanName, videosCount)) {
          continue;
        }

        const yearMatch = cleanName.match(/[\(\[]\s*(\d{4})\s*[\)\]]/) || cleanName.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
        const year = yearMatch ? yearMatch[1] : undefined;
        const thumb = this.normalizeThumbnail(it.thumbnail, listId);

        albums.push({
          id: listId,
          title: cleanName,
          artist: it.uploaderName || term,
          year,
          thumbnail: thumb,
          trackCount: videosCount,
          type: 'album',
          url: it.url.startsWith('http') ? it.url : `https://www.youtube.com${it.url}`,
        });
      }

      if (albums.length === 0) throw new Error('No albums parsed');
      return albums;
    };

    return await Promise.any(
      pipedEndpoints.map(async (url) => {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 6000);
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
   * Search YouTube playlists directly via Invidious CORS API as resilient source for
   * soundtracks, full-album uploads, and albums missing from YouTube Music's OLAK catalog.
   */
  private async fetchInvidiousAlbumPlaylists(term: string): Promise<YouTubeRelease[]> {
    const needsMusicHint = !/\b(album|álbum|soundtrack|ost|bso|discography|lp|ep)\b/i.test(term);
    const searchQuery = needsMusicHint ? `${term} album soundtrack` : term;
    const url = `https://yt.chocolatemoo53.com/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=playlist`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5500) });
    if (!res.ok) throw new Error(`Invidious playlist search HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const results: YouTubeRelease[] = [];
    for (const p of data) {
      if (!p.playlistId || !p.title) continue;
      const title = (p.title || '').replace(/^Album\s*[-–:]\s*/i, '').trim();
      const count = typeof p.videoCount === 'number' && p.videoCount > 0 ? p.videoCount : undefined;
      if (this.isLikelyNonMusicPlaylist(title, count)) continue;

      const yearMatch = title.match(/[\(\[]\s*(\d{4})\s*[\)\]]/) || title.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
      const thumb = this.normalizeThumbnail(p.playlistThumbnail, p.playlistId);

      results.push({
        id: p.playlistId,
        title,
        artist: p.author || term,
        year: yearMatch ? yearMatch[1] : undefined,
        thumbnail: thumb,
        trackCount: count,
        type: 'album',
        url: `https://www.youtube.com/playlist?list=${p.playlistId}`,
      });
    }

    return results;
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
          const rawThumb = v.videoThumbnails?.[0]?.url;
          const safeThumb =
            rawThumb && rawThumb.startsWith('http')
              ? rawThumb
              : `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
          return {
            id: vidId,
            title: v.title,
            artist: v.author || albumArtist,
            album: albumTitle,
            duration: dur,
            thumbnail: safeThumb,
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
          const tid = setTimeout(() => controller.abort(), 7500);
          try {
            // Simple GET without custom headers so browsers never trigger CORS preflight
            const res = await fetch(`${base}/api/v1/playlists/${releaseId}`, {
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

    // 3. Race Piped playlist instances as fallback
    const pipedInstances = [
      'https://api.piped.private.coffee',
      'https://pipedapi.ducks.party',
    ];

    const parsePipedPlaylist = async (res: Response): Promise<YouTubeRelease> => {
      if (!res.ok) throw new Error(`Piped HTTP ${res.status}`);
      const data = await res.json();
      const streams = data.relatedStreams || [];
      if (!Array.isArray(streams) || streams.length === 0) {
        throw new Error('No tracks found in Piped playlist');
      }

      const albumTitle =
        (data.name || fallbackMeta?.title || '')
          .replace(/^Album\s*[-–:]\s*/i, '')
          .trim() || 'Álbum Oficial';

      const albumArtist =
        data.uploader || fallbackMeta?.artist || 'Artista Oficial';

      const tracks: Track[] = streams
        .filter((s: any) => s.url && s.title)
        .map((s: any) => {
          const vidId = s.url.includes('v=') ? s.url.split('v=')[1].split('&')[0] : s.url.replace('/watch?v=', '');
          const dur = typeof s.duration === 'number' ? s.duration : 210;
          return {
            id: vidId,
            title: s.title,
            artist: s.uploaderName || albumArtist,
            album: albumTitle,
            duration: dur,
            thumbnail: s.thumbnail || fallbackMeta?.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
            source: 'youtube' as const,
            youtubeId: vidId,
          };
        });

      return {
        id: releaseId,
        title: albumTitle,
        artist: albumArtist,
        year: fallbackMeta?.year,
        thumbnail: fallbackMeta?.thumbnail || data.thumbnailUrl || data.bannerUrl || tracks[0]?.thumbnail || '',
        trackCount: tracks.length,
        type: 'album',
        tracks,
      };
    };

    try {
      const pipedDetails = await Promise.any(
        pipedInstances.map(async (base) => {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 6000);
          try {
            const res = await fetch(`${base}/playlists/${releaseId}`, {
              signal: controller.signal,
            });
            clearTimeout(tid);
            return await parsePipedPlaylist(res);
          } catch (e) {
            clearTimeout(tid);
            throw e;
          }
        })
      );

      if (pipedDetails) {
        this.releaseCache.set(releaseId, pipedDetails);
        return pipedDetails;
      }
    } catch (e) {
      console.warn('Piped playlist fallback error:', e);
    }

    // 4. Ultimate fallback: Search tracks using query artist + album title
    try {
      const searchTerms = `${fallbackMeta?.artist || ''} ${fallbackMeta?.title || releaseId}`.trim();
      if (searchTerms) {
        const found = await streamResolver.search(searchTerms, 'youtube', 1);
        if (found && found.length > 0) {
          const albumTitle = fallbackMeta?.title || 'Álbum Oficial';
          const albumArtist = fallbackMeta?.artist || 'Artista Oficial';
          const tracks: Track[] = found.slice(0, 16).map((t) => ({
            ...t,
            album: albumTitle,
            artist: t.artist || albumArtist,
          }));
          const fallbackRelease: YouTubeRelease = {
            id: releaseId,
            title: albumTitle,
            artist: albumArtist,
            year: fallbackMeta?.year,
            thumbnail: fallbackMeta?.thumbnail || tracks[0]?.thumbnail || '',
            trackCount: tracks.length,
            type: 'album',
            tracks,
          };
          this.releaseCache.set(releaseId, fallbackRelease);
          return fallbackRelease;
        }
      }
    } catch (e) {
      console.warn('Search fallback error for album tracks:', e);
    }

    return null;
  }
}

export const youtubeReleaseService = new YouTubeReleaseService();
