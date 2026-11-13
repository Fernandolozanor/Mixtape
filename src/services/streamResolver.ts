import type { Track, AudioSourceType, SponsorSegment } from '../types/music';

// Public high-reliability Invidious & Piped instances
export const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.privacyredirect.com',
  'https://yewtu.be',
  'https://invidious.flokinet.to',
  'https://iv.ggtyler.dev',
];

export const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://piped-api.lunar.icu',
  'https://pipedapi.leptons.xyz',
];

class StreamResolver {
  private currentInvidiousIndex = 0;
  private currentPipedIndex = 0;

  private getInvidiousHost(): string {
    return INVIDIOUS_INSTANCES[this.currentInvidiousIndex % INVIDIOUS_INSTANCES.length];
  }

  private rotateInvidiousHost(): void {
    this.currentInvidiousIndex = (this.currentInvidiousIndex + 1) % INVIDIOUS_INSTANCES.length;
    console.log(`Rotating to Invidious instance: ${this.getInvidiousHost()}`);
  }

  private getPipedHost(): string {
    return PIPED_INSTANCES[this.currentPipedIndex % PIPED_INSTANCES.length];
  }

  private rotatePipedHost(): void {
    this.currentPipedIndex = (this.currentPipedIndex + 1) % PIPED_INSTANCES.length;
    console.log(`Rotating to Piped instance: ${this.getPipedHost()}`);
  }

  /**
   * Search tracks across YouTube / Music sources
   */
  async search(query: string, source: AudioSourceType = 'youtube'): Promise<Track[]> {
    if (!query.trim()) return [];

    if (source === 'youtube') {
      return this.searchYouTube(query);
    }

    return [];
  }

  private async searchYouTube(query: string): Promise<Track[]> {
    // Try Invidious first
    for (let attempts = 0; attempts < INVIDIOUS_INSTANCES.length; attempts++) {
      const host = this.getInvidiousHost();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const url = `${host}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          return data
            .filter((item: any) => item.type === 'video' && item.videoId)
            .map((item: any) => ({
              id: item.videoId,
              title: item.title,
              artist: item.author || 'Artista Desconocido',
              duration: item.lengthSeconds || 0,
              thumbnail: item.videoThumbnails?.find((t: any) => t.quality === 'medium' || t.quality === 'high')?.url 
                || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
              source: 'youtube' as AudioSourceType,
            }));
        }
      } catch (err) {
        console.warn(`Search attempt on ${host} failed:`, err);
        this.rotateInvidiousHost();
      }
    }

    // Fallback to Piped search
    for (let attempts = 0; attempts < PIPED_INSTANCES.length; attempts++) {
      const host = this.getPipedHost();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const url = `${host}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        if (data && Array.isArray(data.items)) {
          return data.items
            .filter((item: any) => item.type === 'stream')
            .map((item: any) => {
              const videoId = item.url?.replace('/watch?v=', '') || '';
              return {
                id: videoId,
                title: item.title,
                artist: item.uploaderName || 'Artista Desconocido',
                duration: item.duration || 0,
                thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                source: 'youtube' as AudioSourceType,
              };
            });
        }
      } catch (err) {
        console.warn(`Piped search attempt on ${host} failed:`, err);
        this.rotatePipedHost();
      }
    }

    return [];
  }

  /**
   * Resolve direct, playable audio stream URL for a given track
   */
  async resolveAudioStream(track: Track): Promise<string | null> {
    if (track.source === 'radio' || track.source === 'custom') {
      return track.audioUrl || null;
    }

    const videoId = track.id;

    // 1. Try Piped API (usually provides clean direct audio streams)
    for (let i = 0; i < PIPED_INSTANCES.length; i++) {
      const host = this.getPipedHost();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${host}/streams/${videoId}`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data.audioStreams && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
            // Sort by bitrate descending or prefer m4a / opus
            const sorted = [...data.audioStreams].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            // Prefer m4a (better compatibility on iOS/Safari)
            const m4a = sorted.find((s) => s.mimeType?.includes('audio/mp4') || s.format === 'M4A');
            const chosen = m4a || sorted[0];
            if (chosen && chosen.url) {
              return chosen.url;
            }
          }
        }
      } catch (err) {
        this.rotatePipedHost();
      }
    }

    // 2. Try Invidious API
    for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
      const host = this.getInvidiousHost();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${host}/api/v1/videos/${videoId}`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data.adaptiveFormats && Array.isArray(data.adaptiveFormats)) {
            const audioFormats = data.adaptiveFormats.filter((f: any) => f.type?.includes('audio'));
            // Prefer m4a (audio/mp4)
            const m4a = audioFormats.find((f: any) => f.type?.includes('audio/mp4'));
            const chosen = m4a || audioFormats[0];
            if (chosen && chosen.url) {
              return chosen.url;
            }
          }
        }
      } catch (err) {
        this.rotateInvidiousHost();
      }
    }

    return null;
  }

  /**
   * Fetch SponsorBlock segments to automatically skip intros / sponsors
   */
  async getSponsorSegments(videoId: string): Promise<SponsorSegment[]> {
    try {
      const categories = encodeURIComponent('["sponsor","intro","outro","music_offtopic"]');
      const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${categories}`;
      const res = await fetch(url);
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
      // SponsorBlock not found or offline - silent fallback
    }
    return [];
  }
}

export const streamResolver = new StreamResolver();
