import type { Track, AudioSourceType, SponsorSegment } from '../types/music';

class StreamResolver {
  /**
   * Search full-length tracks across YouTube and Audius, sorted by most played/prominent
   */
  async search(
    query: string,
    filterSource: AudioSourceType | 'all' = 'all',
    expand: boolean = true
  ): Promise<Track[]> {
    const term = query.trim();
    if (!term) return [];

    const tracks: Track[] = [];

    // Check if query is a direct YouTube URL
    const ytMatch = term.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      const videoId = ytMatch[1];
      return [
        {
          id: videoId,
          title: `Vídeo de YouTube (${videoId})`,
          artist: 'YouTube',
          album: 'YouTube Music',
          duration: 240,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          source: 'youtube',
          youtubeId: videoId,
          views: 1_000_000,
          viewsFormatted: 'Enlace Directo',
        },
      ];
    }

    // 1. Search YouTube (Full Songs with view counts)
    if (filterSource === 'all' || filterSource === 'youtube') {
      try {
        const res = await fetch(
          `/api/yt/search?q=${encodeURIComponent(term)}&expand=${expand ? 'true' : 'false'}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (res.ok) {
          const ytVideos = await res.json();
          if (Array.isArray(ytVideos) && ytVideos.length > 0) {
            tracks.push(...ytVideos);
          }
        }
      } catch (e) {
        console.warn('Local YouTube search endpoint unavailable:', e);
      }
    }

    // 2. Search Audius (Full-length free streaming tracks)
    if (filterSource === 'all' || filterSource === 'audius') {
      try {
        const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(term)}&app_name=pulse_music`;
        const res = await fetch(audiusUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.data)) {
            for (const item of data.data.slice(0, 15)) {
              if (!item.title) continue;
              const cover =
                item.artwork?.['480x480'] ||
                item.artwork?.['150x150'] ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

              const plays = item.play_count || 10000;
              let viewsFormatted = '';
              if (plays >= 1_000_000) {
                viewsFormatted = (plays / 1_000_000).toFixed(1) + 'M reprod.';
              } else if (plays >= 1000) {
                viewsFormatted = Math.round(plays / 1000) + 'K reprod.';
              }

              tracks.push({
                id: `audius_${item.id}`,
                title: item.title,
                artist: item.user?.name || 'Artista Independiente',
                album: 'Audius Stream',
                duration: Math.round(item.duration || 180),
                thumbnail: cover,
                source: 'audius',
                audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=pulse_music`,
                views: plays,
                viewsFormatted,
              });
            }
          }
        }
      } catch (e) {
        console.warn('Audius search error:', e);
      }
    }

    // Sort combined results by views descending
    tracks.sort((a, b) => (b.views || 0) - (a.views || 0));

    return tracks;
  }

  /**
   * Fetch SponsorBlock segments
   */
  async getSponsorSegments(videoId: string): Promise<SponsorSegment[]> {
    if (!videoId || videoId.startsWith('audius_')) {
      return [];
    }

    try {
      const categories = encodeURIComponent('["sponsor","intro","outro","music_offtopic"]');
      const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${categories}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
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
