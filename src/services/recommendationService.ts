import type { Track, Playlist } from '../types/music';
import { streamResolver } from './streamResolver';
import { playbackHistoryService } from './playbackHistoryService';

export interface RecommendationGroup {
  id: string;
  reason: string; // e.g., "Porque te gusta Queen", "Basado en tus favoritos"
  artistOrGenre: string;
  tracks: Track[];
}

export interface ContentWindow {
  id: string;
  title: string;
  subtitle?: string;
  tracks: Track[];
}

/**
 * Calculates a stable epoch week number, rotating every Monday at 00:00 UTC.
 */
export function getEpochWeek(): number {
  const now = Date.now();
  const FOUR_DAYS_MS = 4 * 86400000;
  const ONE_WEEK_MS = 7 * 86400000;
  return Math.floor((now + FOUR_DAYS_MS) / ONE_WEEK_MS);
}

/**
 * Deterministically picks a cover from a tracklist that stays stable for 7 days,
 * then rotates automatically to another track next week.
 */
export function getWeeklyCover(tracks: Track[], saltKey: string): string {
  if (!tracks || tracks.length === 0) return '';
  const valid = tracks.filter((t) => t.thumbnail && t.thumbnail.trim().length > 0);
  const pool = valid.length > 0 ? valid : tracks;
  if (pool.length === 0) return '';

  const week = getEpochWeek();
  let hash = 0;
  const str = `${saltKey}_wk_${week}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index]?.thumbnail || '';
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
    searchHistory: string[],
    recentTracks: Track[] = []
  ): { artist: string; score: number }[] {
    const scores: Record<string, number> = {};

    // 1. Liked tracks (weight 3)
    for (const track of likedTracks) {
      const artist = this.cleanArtistName(track.artist);
      if (artist) {
        scores[artist] = (scores[artist] || 0) + 3;
      }
    }

    // 2. Recent plays (weight 3 - strong current listener intent)
    for (const track of recentTracks) {
      const artist = this.cleanArtistName(track.artist);
      if (artist) {
        scores[artist] = (scores[artist] || 0) + 3;
      }
    }

    // 3. Playlist tracks (weight 2)
    for (const pl of playlists) {
      for (const track of pl.tracks) {
        const artist = this.cleanArtistName(track.artist);
        if (artist) {
          scores[artist] = (scores[artist] || 0) + 2;
        }
      }
    }

    // 4. Search history (weight 1)
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
   * Section: "Seleccionado para ti"
   */
  async getPersonalizedRecommendations(
    likedTracks: Track[],
    playlists: Playlist[],
    forceRefresh: boolean = false
  ): Promise<RecommendationGroup[]> {
    const searchHistory = this.getSearchHistory();
    const recentTracks = playbackHistoryService.getRecentTracks(10);

    // Generate a signature of user profile to avoid redundant calls
    const signature = `${likedTracks.length}_${playlists.reduce((acc, p) => acc + p.tracks.length, 0)}_${recentTracks.length}_${searchHistory.slice(0, 5).join('|')}`;

    if (!forceRefresh && this.cachedRecommendations.length > 0 && this.lastAnalyzedSignature === signature) {
      return this.cachedRecommendations;
    }

    const tastes = this.analyzeTastes(likedTracks, playlists, searchHistory, recentTracks);
    const groups: RecommendationGroup[] = [];

    // 1. Todas mis canciones favoritas (if user has marked any favorites)
    if (likedTracks.length > 0) {
      groups.push({
        id: 'group_all_favorites',
        reason: 'Todas mis canciones favoritas',
        artistOrGenre: `${likedTracks.length} canciones guardadas`,
        tracks: [...likedTracks],
      });
    }

    // Case 1: User has tastes detected
    if (tastes.length > 0) {
      const topArtists = tastes.slice(0, 3);

      // 2. Mix de mis grupos favoritos (combinación de tus artistas top)
      if (topArtists.length >= 2) {
        try {
          const names = topArtists.map((a) => a.artist).slice(0, 3).join(' ');
          const discoveryQuery = `${names} greatest hits mix`;
          const mixResults = await streamResolver.search(discoveryQuery, 'youtube');
          if (mixResults.length > 0) {
            groups.push({
              id: 'mix_favorite_bands',
              reason: 'Mix de mis grupos favoritos',
              artistOrGenre: topArtists.map((a) => a.artist).slice(0, 3).join(', '),
              tracks: mixResults.slice(0, 9),
            });
          }
        } catch (e) {
          console.warn('Mix of favorite bands error:', e);
        }
      }

      // 3. Más cosas de mis grupos favoritos (canciones que aún no tienes guardadas)
      for (const item of topArtists) {
        try {
          const query = `${item.artist} greatest hits full songs`;
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
              reason: `Más cosas de ${item.artist}`,
              artistOrGenre: item.artist,
              tracks: freshTracks,
            });
          }
        } catch (e) {
          console.warn(`Failed to fetch recommendations for ${item.artist}:`, e);
        }
      }
    }

    // Case 2: User is brand new (cold start) or tastes yielded no results
    if (groups.length === 0) {
      try {
        const rockClassics = await streamResolver.search('80s Rock Classics Greatest Hits', 'youtube');
        if (rockClassics.length > 0) {
          groups.push({
            id: 'popular_discovery',
            reason: 'Himnos Legendarios para estrenar tu pletina',
            artistOrGenre: 'Grandes Clásicos del Rock 80s',
            tracks: rockClassics.slice(0, 8),
          });
        }
      } catch (e) {
        console.warn('Cold start fallback error:', e);
      }
    }

    // Ensure we have 4 or 5 groups in "Seleccionado para ti"
    const discoveryFillers = [
      { id: 'fill_rock_80', reason: 'Himnos Legendarios del Rock', genre: 'Grandes Clásicos del Rock 80s', query: '80s Rock Classics Greatest Hits' },
      { id: 'fill_ballads', reason: 'Grandes Baladas del Rock', genre: 'Baladas Inmortales', query: 'Classic Rock Ballads Greatest Hits' },
      { id: 'fill_rock_es', reason: 'Rock en Español Legendario', genre: 'Clásicos en Español', query: 'Rock en Español Grandes Exitos' },
      { id: 'fill_hard_rock', reason: 'Lo Mejor del Hard Rock', genre: 'Hard Rock & Metal 80s', query: 'Hard Rock 80s 90s Greatest Hits' },
    ];

    for (const item of discoveryFillers) {
      if (groups.length >= 5) break;
      if (groups.some((g) => g.id === item.id || g.reason === item.reason)) continue;
      try {
        const res = await streamResolver.search(item.query, 'youtube');
        if (res.length > 0) {
          groups.push({
            id: item.id,
            reason: item.reason,
            artistOrGenre: item.genre,
            tracks: res.slice(0, 8),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    this.cachedRecommendations = groups.slice(0, 5);
    this.lastAnalyzedSignature = signature;
    return this.cachedRecommendations;
  }

  /**
   * Generates 4 or 5 content windows for "Reproducciones recientes"
   */
  async getRecentPlaybackWindows(recentTracks: Track[] = []): Promise<ContentWindow[]> {
    const windows: ContentWindow[] = [];

    // Window 1: Últimas canciones escuchadas (las últimas 4 o 5)
    if (recentTracks.length > 0) {
      windows.push({
        id: 'recent_top5',
        title: 'Últimas canciones escuchadas',
        subtitle: `${recentTracks.slice(0, 5).length} canciones recientes`,
        tracks: recentTracks.slice(0, 5),
      });
    }

    // Extract unique recent artists
    const recentArtists = Array.from(
      new Set(
        recentTracks
          .map((t) => this.cleanArtistName(t.artist))
          .filter((a) => a && a.length > 1)
      )
    );

    // Window 2: Más de recentArtist[0]
    if (recentArtists.length > 0) {
      try {
        const artist = recentArtists[0];
        const res = await streamResolver.search(`${artist} greatest hits full`, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: `recent_artist_${artist.replace(/\s+/g, '_')}`,
            title: `Más de ${artist}`,
            subtitle: 'Inspirado en tu última escucha',
            tracks: res.slice(0, 8),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // Window 3: Más de recentArtist[1]
    if (recentArtists.length > 1) {
      try {
        const artist = recentArtists[1];
        const res = await streamResolver.search(`${artist} greatest hits full`, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: `recent_artist_${artist.replace(/\s+/g, '_')}`,
            title: `Más de ${artist}`,
            subtitle: 'Inspirado en tus reproducciones',
            tracks: res.slice(0, 8),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // Window 4: Mix de tu última sesión
    if (recentArtists.length >= 1) {
      try {
        const query = `${recentArtists.slice(0, 2).join(' ')} session mix rock`;
        const res = await streamResolver.search(query, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: 'recent_session_mix',
            title: 'Mix de tu última sesión',
            subtitle: 'Pistas similares a tus recientes',
            tracks: res.slice(0, 8),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // Window 5: Historial completo de escuchas
    const fullHistory = playbackHistoryService.getRecentTracks(20);
    if (fullHistory.length > 0) {
      windows.push({
        id: 'recent_history_full',
        title: 'Historial completo de escuchas',
        subtitle: `${fullHistory.length} pistas en tu historial`,
        tracks: fullHistory,
      });
    }

    // Fallbacks if fewer than 4 windows (e.g. brand new user)
    const starterDefaults = [
      { id: 'recent_starter_1', title: 'Últimas canciones escuchadas', query: '80s Rock Greatest Hits' },
      { id: 'recent_starter_2', title: 'Sesión Rock de los 80', query: 'Classic 80s Rock Anthems' },
      { id: 'recent_starter_3', title: 'Sesión Baladas Legendarias', query: 'Legendary Rock Ballads' },
      { id: 'recent_starter_4', title: 'Sesión Hard Rock Clásico', query: 'Hard Rock 80s Classics' },
      { id: 'recent_starter_5', title: 'Sesión Grandes Himnos', query: 'Greatest Rock Anthems of all time' },
    ];

    for (const def of starterDefaults) {
      if (windows.length >= 5) break;
      if (windows.some((w) => w.id === def.id || w.title === def.title)) continue;
      try {
        const res = await streamResolver.search(def.query, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: def.id,
            title: def.title,
            subtitle: 'Selección de bienvenida',
            tracks: res.slice(0, 6),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    return windows.slice(0, 5);
  }

  /**
   * Generates 4 or 5 content windows for "Novedades para ti"
   */
  async getNewReleasesWindows(
    likedTracks: Track[],
    playlists: Playlist[],
    recentTracks: Track[] = []
  ): Promise<ContentWindow[]> {
    const searchHistory = this.getSearchHistory();
    const tastes = this.analyzeTastes(likedTracks, playlists, searchHistory, recentTracks);
    const windows: ContentWindow[] = [];

    if (tastes.length > 0) {
      const topArtists = tastes.slice(0, 3);
      for (const item of topArtists) {
        try {
          const res = await streamResolver.search(`${item.artist} new single official latest release`, 'youtube');
          if (res.length > 0) {
            windows.push({
              id: `news_${item.artist.replace(/\s+/g, '_')}`,
              title: `Novedades de ${item.artist}`,
              subtitle: 'Últimos singles y directos',
              tracks: res.slice(0, 8),
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }

    const thematicNews = [
      { id: 'news_singles', title: 'Nuevos Singles y Remasters', query: 'rock new single official 2026 remaster' },
      { id: 'news_live', title: 'Directos y Conciertos Recientes', query: 'classic rock live concert full 2025 2026' },
      { id: 'news_rock_es', title: 'Novedades de Rock en Español', query: 'rock en español nuevo single oficial 2025 2026' },
      { id: 'news_acoustic', title: 'Sesiones Acústicas Recientes', query: 'rock acoustic live session recent official' },
      { id: 'news_anthems', title: 'Lanzamientos del Mes', query: 'rock metal new releases monthly compilation' },
    ];

    for (const gen of thematicNews) {
      if (windows.length >= 5) break;
      if (windows.some((w) => w.id === gen.id || w.title === gen.title)) continue;
      try {
        const res = await streamResolver.search(gen.query, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: gen.id,
            title: gen.title,
            subtitle: 'Últimas publicaciones',
            tracks: res.slice(0, 8),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    return windows.slice(0, 5);
  }

  /**
   * Fetch new releases, latest singles and modern updates for groups that match user tastes
   * Section: "Novedades para ti"
   */
  async getNewReleasesForYou(
    likedTracks: Track[],
    playlists: Playlist[],
    recentTracks: Track[] = []
  ): Promise<Track[]> {
    const searchHistory = this.getSearchHistory();
    const tastes = this.analyzeTastes(likedTracks, playlists, searchHistory, recentTracks);

    const queries: string[] = [];
    if (tastes.length > 0) {
      const topArtists = tastes.slice(0, 3);
      for (const item of topArtists) {
        queries.push(`${item.artist} new single official`);
        queries.push(`${item.artist} latest release`);
      }
    } else {
      queries.push('80s rock remastered 2026 new release');
      queries.push('classic rock latest official release');
    }

    const newTracks: Track[] = [];
    const seenIds = new Set<string>();

    try {
      const results = await Promise.allSettled(
        queries.slice(0, 3).map((q) => streamResolver.search(q, 'youtube', 1))
      );

      for (const res of results) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          for (const track of res.value) {
            if (!seenIds.has(track.id)) {
              seenIds.add(track.id);
              newTracks.push(track);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch new releases for user:', e);
    }

    // Filter out tracks already in likedTracks so they are genuinely new
    const likedIds = new Set(likedTracks.map((t) => t.id));
    const filtered = newTracks.filter((t) => !likedIds.has(t.id));

    return (filtered.length > 0 ? filtered : newTracks).slice(0, 9);
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
