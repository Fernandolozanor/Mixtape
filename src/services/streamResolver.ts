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

    // 1. Search YouTube (Live Invidious search on GitHub Pages + Local Dev Middleware + Curated Local Matches)
    if (filterSource === 'all' || filterSource === 'youtube') {
      let ytEndpointLoaded = false;

      // 1a. Try local dev server proxy if available (localhost)
      try {
        const res = await fetch(
          `/api/yt/search?q=${encodeURIComponent(term)}&page=${page}`,
          { signal: AbortSignal.timeout(2000) }
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

      // 1b. If on static deployment (GitHub Pages), query live YouTube via public API
      if (!ytEndpointLoaded) {
        const liveYtTracks = await this.searchYouTubeLive(term, page);
        if (liveYtTracks.length > 0) {
          tracks.push(...liveYtTracks);
          ytEndpointLoaded = true;
        }
      }

      // 1c. Match against curated Rock Anthology (only when relevant to the actual query)
      const lower = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const words = lower.split(/[\s,.-]+/).filter((w) => w.length > 2);

      const isStrictRockCatalogQuery =
        lower.includes('rock 80') ||
        lower.includes('rock clasico') ||
        lower.includes('rock anthology') ||
        lower === 'rock';

      const matchedLocal = ROCK_ANTHOLOGY.filter((t) => {
        const text = `${t.title} ${t.artist} ${t.album || ''}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        if (isStrictRockCatalogQuery) return true;
        return words.length > 0 && words.some((w) => text.includes(w));
      });

      if (matchedLocal.length > 0) {
        const existingIds = new Set(tracks.map((t) => t.youtubeId || t.id));
        for (const localTrack of matchedLocal) {
          if (!existingIds.has(localTrack.youtubeId || localTrack.id)) {
            tracks.push(localTrack);
            existingIds.add(localTrack.youtubeId || localTrack.id);
          }
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
   * Live YouTube Search via open Invidious instances with CORS support for static hosting (GitHub Pages)
   */
  private async searchYouTubeLive(query: string, page: number = 1): Promise<Track[]> {
    const instances = [
      'https://yt.chocolatemoo53.com',
      'https://invidious.jing.rocks',
      'https://invidious.nerdvpn.de',
    ];

    for (const inst of instances) {
      try {
        const url = `${inst}/api/v1/search?q=${encodeURIComponent(query)}&type=video&page=${page}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5500) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data
              .filter((item: any) => item.videoId && item.title)
              .map((item: any) => {
                const vidId = item.videoId;
                const dur = item.lengthSeconds || 210;
                const views = item.viewCount || 0;
                let viewsFormatted = '';
                if (views >= 1_000_000_000) {
                  viewsFormatted = (views / 1_000_000_000).toFixed(1) + 'B reprod.';
                } else if (views >= 1_000_000) {
                  viewsFormatted = (views / 1_000_000).toFixed(1) + 'M reprod.';
                } else if (views >= 1_000) {
                  viewsFormatted = Math.round(views / 1_000) + 'K reprod.';
                }

                const thumb =
                  item.videoThumbnails?.find((t: any) => t.quality === 'medium' || t.quality === 'high')?.url ||
                  `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

                return {
                  id: vidId,
                  title: item.title,
                  artist: item.author || 'YouTube Music',
                  album: 'YouTube',
                  duration: dur,
                  thumbnail: thumb,
                  source: 'youtube' as const,
                  youtubeId: vidId,
                  views,
                  viewsFormatted,
                };
              });
          }
        }
      } catch {
        // Try next instance
      }
    }
    return [];
  }

  /**
   * Resolves direct, ad-free audio stream URL for a YouTube ID.
   * Extracts clean AAC/MP4 stream via CORS-enabled Invidious backend with Cloudflare Worker support.
   */
  async resolveDirectAudioStream(youtubeId: string): Promise<string | null> {
    if (!youtubeId) return null;

    // 1. Direct Invidious CORS resolution (fast, direct, zero intermediate latency)
    const instances = [
      'https://yt.chocolatemoo53.com',
      'https://invidious.nerdvpn.de',
      'https://inv.tux.pizza',
    ];

    for (const inst of instances) {
      try {
        const res = await fetch(`${inst}/api/v1/videos/${youtubeId}`, {
          signal: AbortSignal.timeout(3500),
        });
        if (res.ok) {
          const data = await res.json();
          const audios = (data.adaptiveFormats || []).filter((f: any) => f.type && f.type.includes('audio'));
          if (audios.length > 0) {
            const format140 = audios.find((f: any) => f.itag === 140 || f.itag === '140');
            const best = format140 || audios.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
            if (best && best.url) {
              return best.url.replace(/^https:\/\/[^\/]+/, inst);
            }
          }
        }
      } catch {
        // Try next instance
      }
    }

    // 2. Try User's Cloudflare Worker meta endpoint as fallback
    try {
      const res = await fetch(`https://mixtape-stream.fernandolozanor.workers.dev/?id=${youtubeId}&meta=true`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.streamUrl) return data.streamUrl;
      }
    } catch {
      // Ignored
    }

    return null;
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
