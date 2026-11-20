import type { PodcastShow, Track } from '../types/music';

export interface EpisodeProgress {
  episodeId: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

const PROGRESS_STORAGE_KEY = 'mixtape_podcast_progress_v1';

class PodcastService {
  private searchCache = new Map<string, { data: PodcastShow[]; expiresAt: number }>();
  private episodesCache = new Map<string, { data: Track[]; expiresAt: number }>();

  /**
   * Search podcasts via Apple iTunes Search API (free, no API key, CORS enabled)
   */
  async searchPodcasts(query: string, limit: number = 20): Promise<PodcastShow[]> {
    const clean = query.trim();
    if (!clean) return [];

    const cacheKey = `${clean.toLowerCase()}_${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const url = `https://itunes.apple.com/search?media=podcast&entity=podcast&country=es&limit=${limit}&term=${encodeURIComponent(
        clean
      )}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!res.ok) return [];
      const json = await res.json();
      const results: PodcastShow[] = (json.results || [])
        .filter((item: any) => item.collectionId && item.collectionName)
        .map((item: any) => ({
          id: String(item.collectionId),
          title: item.collectionName,
          author: item.artistName || 'Podcast',
          artwork: item.artworkUrl600 || item.artworkUrl100 || '',
          genre: item.primaryGenreName || 'Podcast',
          trackCount: item.trackCount || undefined,
          feedUrl: item.feedUrl || undefined,
        }));

      this.searchCache.set(cacheKey, {
        data: results,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
      return results;
    } catch (err) {
      console.warn('Podcast search error:', err);
      return [];
    }
  }

  /**
   * Fetch episodes for a podcast show with direct MP3/M4A episodeUrl (zero RSS CORS issues)
   */
  async getPodcastEpisodes(show: PodcastShow, limit: number = 30): Promise<Track[]> {
    if (!show?.id) return [];

    const cacheKey = `${show.id}_${limit}`;
    const cached = this.episodesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(
        show.id
      )}&entity=podcastEpisode&limit=${limit}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return [];
      const json = await res.json();

      const episodes: Track[] = (json.results || [])
        .filter((item: any) => item.wrapperType === 'podcastEpisode' && item.episodeUrl)
        .map((ep: any) => ({
          id: `pod_${ep.trackId}`,
          title: ep.trackName || 'Episodio',
          artist: show.title,
          album: show.author,
          duration: Math.round((ep.trackTimeMillis || 0) / 1000),
          thumbnail: ep.artworkUrl600 || ep.artworkUrl160 || show.artwork,
          source: 'podcast' as const,
          audioUrl: ep.episodeUrl,
          releaseDate: ep.releaseDate || undefined,
          podcastDescription: ep.description || ep.shortDescription || undefined,
          showId: show.id,
        }));

      this.episodesCache.set(cacheKey, {
        data: episodes,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
      return episodes;
    } catch (err) {
      console.warn('Podcast episodes fetch error:', err);
      return [];
    }
  }

  /**
   * Per-episode playback progress persistence (resume long episodes right where you left off)
   */
  private loadProgressMap(): Record<string, EpisodeProgress> {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  saveEpisodeProgress(episodeId: string, currentTime: number, duration: number): void {
    if (!episodeId || currentTime < 5) return;
    try {
      const map = this.loadProgressMap();
      // If finished (within last 20 seconds), clear progress
      if (duration > 60 && currentTime >= duration - 20) {
        delete map[episodeId];
      } else {
        map[episodeId] = {
          episodeId,
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration || 0),
          updatedAt: Date.now(),
        };
      }
      // Keep at most 150 recent episodes
      const entries = Object.entries(map).sort((a, b) => b[1].updatedAt - a[1].updatedAt);
      const trimmed = Object.fromEntries(entries.slice(0, 150));
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  getEpisodeProgress(episodeId: string): EpisodeProgress | null {
    if (!episodeId) return null;
    const map = this.loadProgressMap();
    return map[episodeId] || null;
  }

  clearEpisodeProgress(episodeId: string): void {
    try {
      const map = this.loadProgressMap();
      if (map[episodeId]) {
        delete map[episodeId];
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
      }
    } catch {}
  }
}

export const podcastService = new PodcastService();
