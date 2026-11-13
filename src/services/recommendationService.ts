import type { Track, Playlist } from '../types/music';
import { streamResolver } from './streamResolver';

export interface RecommendationGroup {
  id: string;
  reason: string; // e.g., "Porque te gusta Queen", "Basado en tus favoritos"
  artistOrGenre: string;
  tracks: Track[];
}

class RecommendationService {
  private cachedRecommendations: RecommendationGroup[] = [];
  private lastAnalyzedSignature: string = '';

  /**
   * Save a search query into search history
   */
  recordSearch(query: string): void {
    const term = query.trim().toLowerCase();
    if (!term || term.length < 2) return;

    try {
      const stored = localStorage.getItem('pulse_search_history');
      const history: { query: string; timestamp: number }[] = stored ? JSON.parse(stored) : [];

      // Prepend and keep unique up to 20
      const filtered = history.filter((h) => h.query.toLowerCase() !== term);
      const updated = [{ query, timestamp: Date.now() }, ...filtered].slice(0, 20);

      localStorage.setItem('pulse_search_history', JSON.stringify(updated));
    } catch {
      // LocalStorage error fallback
    }
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    try {
      const stored = localStorage.getItem('pulse_search_history');
      if (!stored) return [];
      const history: { query: string }[] = JSON.parse(stored);
      return history.map((h) => h.query);
    } catch {
      return [];
    }
  }

  /**
   * Analyze user tastes and return weighted top artists & keywords
   */
  analyzeTastes(
    likedTracks: Track[],
    playlists: Playlist[],
    searchHistory: string[]
  ): { artist: string; score: number }[] {
    const scores: Record<string, number> = {};

    // 1. Liked tracks (weight 3)
    for (const track of likedTracks) {
      const artist = this.cleanArtistName(track.artist);
      if (artist) {
        scores[artist] = (scores[artist] || 0) + 3;
      }
    }

    // 2. Playlist tracks (weight 2)
    for (const pl of playlists) {
      for (const track of pl.tracks) {
        const artist = this.cleanArtistName(track.artist);
        if (artist) {
          scores[artist] = (scores[artist] || 0) + 2;
        }
      }
    }

    // 3. Search history (weight 1)
    for (const query of searchHistory) {
      const term = query.trim();
      if (term.length > 2) {
        // Simple heuristic: query might be an artist
        const clean = this.cleanArtistName(term);
        scores[clean] = (scores[clean] || 0) + 1;
      }
    }

    // Sort descending by score
    return Object.entries(scores)
      .map(([artist, score]) => ({ artist, score }))
      .sort((a, b) => b.score - a.score)
      .filter((item) => item.artist.length > 1);
  }

  private cleanArtistName(raw: string): string {
    return raw
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*VEVO$/i, '')
      .replace(/\s*Official$/i, '')
      .replace(/\(.*\)/g, '')
      .replace(/\[.*\]/g, '')
      .trim();
  }

  /**
   * Fetch personalized recommendations based on the user's profile
   */
  async getPersonalizedRecommendations(
    likedTracks: Track[],
    playlists: Playlist[],
    forceRefresh: boolean = false
  ): Promise<RecommendationGroup[]> {
    const searchHistory = this.getSearchHistory();

    // Generate a signature of user profile to avoid redundant calls
    const signature = `${likedTracks.length}_${playlists.reduce((acc, p) => acc + p.tracks.length, 0)}_${searchHistory.slice(0, 5).join('|')}`;

    if (!forceRefresh && this.cachedRecommendations.length > 0 && this.lastAnalyzedSignature === signature) {
      return this.cachedRecommendations;
    }

    const tastes = this.analyzeTastes(likedTracks, playlists, searchHistory);
    const groups: RecommendationGroup[] = [];

    // Case 1: User has tastes detected
    if (tastes.length > 0) {
      const topArtists = tastes.slice(0, 3);

      for (const item of topArtists) {
        try {
          const query = `${item.artist} hits`;
          const results = await streamResolver.search(query, 'youtube');

          // Filter out tracks already liked or in playlists to give fresh discoveries
          const knownIds = new Set([
            ...likedTracks.map((t) => t.id),
            ...playlists.flatMap((p) => p.tracks.map((t) => t.id)),
          ]);

          const freshTracks = results.filter((t) => !knownIds.has(t.id)).slice(0, 6);

          if (freshTracks.length > 0) {
            groups.push({
              id: `rec_${item.artist.replace(/\s+/g, '_')}`,
              reason: `Porque te gusta ${item.artist}`,
              artistOrGenre: item.artist,
              tracks: freshTracks,
            });
          }
        } catch (e) {
          console.warn(`Failed to fetch recommendations for ${item.artist}:`, e);
        }
      }

      // Also create a "Mix Descubrimiento" combining top tastes
      if (topArtists.length >= 2) {
        try {
          const discoveryQuery = `${topArtists[0].artist} ${topArtists[1].artist} playlist`;
          const mixResults = await streamResolver.search(discoveryQuery, 'youtube');
          if (mixResults.length > 0) {
            groups.unshift({
              id: 'mix_discovery',
              reason: 'Tu Mix Personalizado de Descubrimiento',
              artistOrGenre: `${topArtists[0].artist} & ${topArtists[1].artist}`,
              tracks: mixResults.slice(0, 8),
            });
          }
        } catch (e) {
          // Ignore mix error
        }
      }
    }

    // Case 2: User is brand new (cold start) or tastes yielded no results
    if (groups.length === 0) {
      try {
        const globalHits = await streamResolver.search('Top music hits 2026', 'youtube');
        if (globalHits.length > 0) {
          groups.push({
            id: 'popular_discovery',
            reason: 'Populares para empezar a afinar tus gustos',
            artistOrGenre: 'Tendencias Globales',
            tracks: globalHits.slice(0, 8),
          });
        }
      } catch (e) {
        console.warn('Cold start fallback error:', e);
      }
    }

    this.cachedRecommendations = groups;
    this.lastAnalyzedSignature = signature;
    return groups;
  }
}

export const recommendationService = new RecommendationService();
