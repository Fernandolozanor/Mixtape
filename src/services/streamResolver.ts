import type { Track, AudioSourceType, SponsorSegment } from '../types/music';
import { ROCK_ANTHOLOGY } from '../data/rockAnthology';

class StreamResolver {
  /**
   * Search full-length tracks across YouTube, Built-in 80s Rock Anthology, and Audius.
   * Seamlessly works on desktop local dev, GitHub Pages, and mobile devices with zero backend requirement.
   */
  async search(
    query: string,
    filterSource: AudioSourceType | 'all' = 'all',
    page: number = 1
  ): Promise<Track[]> {
    const term = query.trim();
    if (!term) return [];

    const tracks: Track[] = [];

    // Check if query is a direct YouTube URL or 11-char Video ID
    const ytMatch =
      term.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/) ||
      (term.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(term) ? [null, term] : null);

    if (ytMatch && ytMatch[1]) {
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

    // 1. Search YouTube (Local Dev Proxy OR Built-in 80s Rock Anthology for Static/Mobile)
    if (filterSource === 'all' || filterSource === 'youtube') {
      let ytEndpointLoaded = false;
      try {
        const res = await fetch(
          `/api/yt/search?q=${encodeURIComponent(term)}&page=${page}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const ytVideos = await res.json();
          if (Array.isArray(ytVideos) && ytVideos.length > 0) {
            tracks.push(...ytVideos);
            ytEndpointLoaded = true;
          }
        }
      } catch {
        // Expected on GitHub Pages / Static production
      }

      // If local dev server proxy was not available (e.g. deployed on GitHub Pages),
      // match against our curated, instant Rock Anthology catalog!
      if (!ytEndpointLoaded) {
        const lower = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const words = lower.split(/[\s,.-]+/).filter((w) => w.length > 1);

        const isBroadQuery =
          words.length === 0 ||
          lower.includes('rock') ||
          lower.includes('80') ||
          lower.includes('hit') ||
          lower.includes('exito') ||
          lower.includes('clasic') ||
          lower.includes('top') ||
          lower.includes('metal') ||
          lower.includes('music') ||
          lower.includes('cancion') ||
          lower.includes('directo') ||
          lower.includes('live') ||
          lower.includes('concert');

        const matched = ROCK_ANTHOLOGY.filter((t) => {
          const text = `${t.title} ${t.artist} ${t.album || ''}`
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          if (isBroadQuery) return true;
          return words.some((w) => text.includes(w));
        });

        if (matched.length > 0) {
          // Sort by relevance to user query words and views
          matched.sort((a, b) => {
            const textA = `${a.title} ${a.artist}`.toLowerCase();
            const textB = `${b.title} ${b.artist}`.toLowerCase();
            const scoreA =
              words.reduce((acc, w) => acc + (textA.includes(w) ? 3 : 0), 0) +
              (a.views ? a.views / 1e9 : 0);
            const scoreB =
              words.reduce((acc, w) => acc + (textB.includes(w) ? 3 : 0), 0) +
              (b.views ? b.views / 1e9 : 0);
            return scoreB - scoreA;
          });

          // Slice pagination for anthology
          const pageSize = 20;
          const start = (page - 1) * pageSize;
          const paged = matched.slice(start, start + pageSize);
          tracks.push(...paged);
        } else if (filterSource === 'youtube') {
          // Return sample of top classics if nothing strictly matched
          tracks.push(...ROCK_ANTHOLOGY.slice(0, 15));
        }
      }
    }

    // 2. Search Audius (Full-length free streaming tracks)
    if (filterSource === 'all' || filterSource === 'audius') {
      try {
        const offset = (page - 1) * 30;
        const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(term)}&app_name=mixtape_music&limit=60&offset=${offset}`;
        const res = await fetch(audiusUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.data)) {
            for (const item of data.data) {
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
