import type { Track, Playlist } from '../types/music';
import { streamResolver } from './streamResolver';

export interface RecommendationGroup {
  id: string;
  reason: string; // e.g., "Porque te gusta Queen", "Basado en tus favoritos"
  artistOrGenre: string;
  tracks: Track[];
}

export interface FeaturedCollection {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  accent: string;
  query: string;
  badge?: string;
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

  /**
   * Generate personalized featured collections based on user tastes
   */
  getPersonalizedCollections(
    likedTracks: Track[],
    playlists: Playlist[]
  ): FeaturedCollection[] {
    const searchHistory = this.getSearchHistory();
    const tastes = this.analyzeTastes(likedTracks, playlists, searchHistory);

    if (tastes.length > 0) {
      const top1 = tastes[0].artist;
      const top2 = tastes.length > 1 ? tastes[1].artist : null;
      const top3 = tastes.length > 2 ? tastes[2].artist : null;

      return [
        {
          id: `col_${top1.replace(/\s+/g, '_')}`,
          title: `Esenciales de ${top1}`,
          subtitle: `Grandes éxitos, himnos y discografía cumbre de tu artista preferido`,
          gradient: 'from-blue-950/80 via-slate-900/60 to-black',
          accent: '#38bdf8',
          query: `${top1} greatest hits`,
          badge: 'Basado en tus gustos',
        },
        {
          id: `col_live_${(top2 || top1).replace(/\s+/g, '_')}`,
          title: `Directos & Giras: ${top2 || top1}`,
          subtitle: `Actuaciones legendarias en vivo, festivales y conciertos completos`,
          gradient: 'from-amber-950/80 via-stone-900/60 to-black',
          accent: '#f59e0b',
          query: `${top2 || top1} live concert`,
          badge: 'Conciertos en vivo',
        },
        {
          id: `col_era_${top1.replace(/\s+/g, '_')}`,
          title: top3 ? `Rock Mix: ${top1} & ${top3}` : `Rock & Clásicos de la Época`,
          subtitle: `Música contemporánea y artistas afines para expandir tu biblioteca`,
          gradient: 'from-cyan-950/80 via-slate-900/60 to-black',
          accent: '#06b6d4',
          query: top3 ? `${top1} ${top3} playlist` : `${top1} 80s rock classics playlist`,
          badge: 'Mix de Época',
        },
      ];
    }

    // Default / Cold-start rock collections
    return [
      {
        id: 'col_rock_anthems',
        title: 'Grandes Himnos del Rock 80s',
        subtitle: 'Queen, AC/DC, Scorpions, Bon Jovi y los riffs que marcaron la historia',
        gradient: 'from-blue-950/80 via-slate-900/60 to-black',
        accent: '#38bdf8',
        query: '80s rock anthems greatest hits',
        badge: 'Colección Rock',
      },
      {
        id: 'col_rock_ballads',
        title: 'Baladas Legendarias del Rock',
        subtitle: 'Guns N Roses, Aerosmith, Whitesnake y clásicos lentos atemporales',
        gradient: 'from-amber-950/80 via-stone-900/60 to-black',
        accent: '#f59e0b',
        query: '80s power ballads rock',
        badge: 'Pletina Dorada',
      },
      {
        id: 'col_live_concerts',
        title: 'Conciertos Míticos en Directo',
        subtitle: 'Live Aid 1985, Wembley Stadium y directos que hicieron temblar al mundo',
        gradient: 'from-cyan-950/80 via-slate-900/60 to-black',
        accent: '#06b6d4',
        query: '80s rock full concert live',
        badge: 'En Vivo',
      },
    ];
  }

  /**
   * Fetch continuous channels (long-play concerts, radio mixes) based on preferences
   */
  async getPersonalizedChannels(
    likedTracks: Track[],
    playlists: Playlist[]
  ): Promise<Track[]> {
    const searchHistory = this.getSearchHistory();
    const tastes = this.analyzeTastes(likedTracks, playlists, searchHistory);

    let query1 = '80s rock greatest hits full album';
    let query2 = 'Queen Live at Wembley full concert';
    let query3 = 'Classic rock radio live continuous';

    if (tastes.length > 0) {
      const top1 = tastes[0].artist;
      const top2 = tastes.length > 1 ? tastes[1].artist : top1;
      query1 = `${top1} full concert live`;
      query2 = `${top2} greatest hits full album`;
      query3 = `${top1} ${top2} radio mix continuous`;
    }

    const channels: Track[] = [];

    try {
      const [res1, res2, res3] = await Promise.allSettled([
        streamResolver.search(query1, 'youtube', 1),
        streamResolver.search(query2, 'youtube', 1),
        streamResolver.search(query3, 'youtube', 1),
      ]);

      const pickBestLongPlay = (res: PromiseSettledResult<Track[]>): Track | null => {
        if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) {
          // Prefer tracks that are long (> 600s or containing "full" / "live" / "album")
          const longTrack = res.value.find(
            (t) =>
              (t.duration && t.duration >= 600) ||
              t.title.toLowerCase().includes('concert') ||
              t.title.toLowerCase().includes('album') ||
              t.title.toLowerCase().includes('live')
          );
          return longTrack || res.value[0];
        }
        return null;
      };

      const c1 = pickBestLongPlay(res1);
      const c2 = pickBestLongPlay(res2);
      const c3 = pickBestLongPlay(res3);

      const seenIds = new Set<string>();
      [c1, c2, c3].forEach((t) => {
        if (t && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          channels.push(t);
        }
      });
    } catch (e) {
      console.warn('Failed to load personalized continuous channels:', e);
    }

    // Fallback if network was slow
    if (channels.length === 0) {
      channels.push({
        id: 'vbvyNnw8Qjg',
        title: 'Queen - Live Aid 1985 (Concierto Completo Legendario)',
        artist: 'Queen',
        album: 'Live Aid 1985',
        duration: 1500,
        thumbnail: 'https://i.ytimg.com/vi/vbvyNnw8Qjg/hqdefault.jpg',
        source: 'youtube',
        youtubeId: 'vbvyNnw8Qjg',
        views: 120000000,
        viewsFormatted: 'Concierto Legendario',
      });
    }

    return channels;
  }
}

export const recommendationService = new RecommendationService();
