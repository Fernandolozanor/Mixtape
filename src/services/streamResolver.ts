import type { Track, AudioSourceType, SponsorSegment } from '../types/music';

class StreamResolver {
  /**
   * Search tracks reliably across global music catalogs with open CORS
   */
  async search(query: string, _source: AudioSourceType = 'youtube'): Promise<Track[]> {
    const term = query.trim();
    if (!term) return [];

    const tracks: Track[] = [];

    // 1. Search iTunes / Apple Music Catalog (Instant, open CORS, covers, duration)
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=25`;
      const res = await fetch(itunesUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results)) {
          for (const item of data.results) {
            if (!item.trackName || !item.artistName) continue;
            // High resolution 600x600 artwork
            const hiResCover = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb', '600x600bb')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

            tracks.push({
              id: `yt_${item.trackId}`,
              title: item.trackName,
              artist: item.artistName,
              album: item.collectionName || 'Sencillo',
              duration: Math.round((item.trackTimeMillis || 180000) / 1000),
              thumbnail: hiResCover,
              source: 'youtube',
              audioUrl: item.previewUrl || undefined,
            });
          }
        }
      }
    } catch (e) {
      console.warn('iTunes search fallback:', e);
    }

    // 2. Search Audius (Decentralized streaming with direct full audio URLs, open CORS)
    try {
      const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(term)}&app_name=pulse_music`;
      const res = await fetch(audiusUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          for (const item of data.data.slice(0, 10)) {
            if (!item.title) continue;
            const cover =
              item.artwork?.['480x480'] ||
              item.artwork?.['150x150'] ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

            tracks.push({
              id: `audius_${item.id}`,
              title: item.title,
              artist: item.user?.name || 'Artista Independiente',
              duration: Math.round(item.duration || 180),
              thumbnail: cover,
              source: 'custom',
              audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=pulse_music`,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Audius search fallback:', e);
    }

    return tracks;
  }

  /**
   * Fetch SponsorBlock segments
   */
  async getSponsorSegments(videoId: string): Promise<SponsorSegment[]> {
    if (!videoId || videoId.startsWith('audius_') || videoId.startsWith('yt_')) {
      return [];
    }

    try {
      const categories = encodeURIComponent('["sponsor","intro","outro","music_offtopic"]');
      const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${categories}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((seg: any) => ({
          start: seg.segment[0],
          end: seg.segment[1],
          category: seg.category,
        }));
      }
    } catch {
      // Ignore SponsorBlock error
    }
    return [];
  }
}

export const streamResolver = new StreamResolver();
