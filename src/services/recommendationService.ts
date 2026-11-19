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

// Affinity mapping between popular artists and musically related acts
const RELATED_ARTISTS_MAP: Record<string, string[]> = {
  // Spanish Rock & Urban Rock
  extremoduro: ['Marea', 'Robe', 'La Fuga', 'Poncho K', 'Sinkope', 'Barricada', 'Los Suaves', 'Transfer'],
  marea: ['Extremoduro', 'La Fuga', 'Poncho K', 'Sinkope', 'Desakato', 'Gritando en Silencio', 'Bocanada'],
  'platero y tu': ['Los Zigarros', 'Fito & Fitipaldis', 'Leiva', 'M-Clan', 'Tequila', 'Buenas Noches Rose', 'Extremoduro'],
  'fito & fitipaldis': ['Los Zigarros', 'Platero y Tú', 'M-Clan', 'Leiva', 'Quique Gonzalez', 'Los Secretos'],
  'heroes del silencio': ['Enrique Bunbury', 'Los Piratas', 'Nacho Vegas', 'Elefantes', '091', 'Radio Futura'],
  bunbury: ['Heroes del Silencio', 'Nacho Vegas', 'Los Piratas', 'Elefantes', 'Calamaro', 'Coque Malla'],
  barricada: ['Los Suaves', 'Extremoduro', 'Marea', 'Reincidentes', 'Leize', 'Hamlet'],
  'los suaves': ['Barricada', 'Extremoduro', 'Marea', 'Asfalto', 'Leize', 'Tierra Santa'],
  loquillo: ['Burning', 'Los Rebeldes', 'Ilegales', 'Gabinete Caligari', 'Los Enemigos', 'Los Rodriguez'],
  'los zigarros': ['Platero y Tú', 'Fito & Fitipaldis', 'Tequila', 'M-Clan', 'Burning', 'Sexy Zebras'],
  'ska-p': ['Boikot', 'Reincidentes', 'Talco', 'La Polla Records', 'Kortatu', 'Gatillazo'],
  'la fuga': ['Marea', 'Extremoduro', 'Poncho K', 'Despistaos', 'Celtas Cortos'],
  leiva: ['Pereza', 'Los Zigarros', 'Quique Gonzalez', 'Sidecars', 'Iván Ferreiro', 'Coque Malla'],
  pereza: ['Leiva', 'Sidecars', 'Los Zigarros', 'El Canto del Loco', 'Despistaos'],
  'arde bogota': ['Viva Suecia', 'Shinova', 'Siloé', 'Sexy Zebras', 'León Benavente', 'Second'],
  'viva suecia': ['Arde Bogotá', 'Shinova', 'Vetusta Morla', 'Izal', 'Love of Lesbian'],
  'vetusta morla': ['Izal', 'Love of Lesbian', 'Lori Meyers', 'Viva Suecia', 'Shinova', 'Miss Caffeina'],

  // Classic Hard Rock & Heavy Metal
  'ac/dc': ['Airbourne', 'Krokus', 'Rose Tattoo', 'Accept', 'Saxon', 'The Cult', 'Motorhead', 'Judas Priest'],
  'iron maiden': ['Judas Priest', 'Saxon', 'Helloween', 'Dio', 'Bruce Dickinson', 'Accept', 'Megadeth', 'Manowar'],
  'judas priest': ['Iron Maiden', 'Saxon', 'Accept', 'Dio', 'Halford', 'Motorhead', 'Primal Fear'],
  metallica: ['Megadeth', 'Pantera', 'Slayer', 'Anthrax', 'Ghost', 'Avenged Sevenfold', 'Testament'],
  megadeth: ['Metallica', 'Anthrax', 'Slayer', 'Pantera', 'Judas Priest'],
  'guns n roses': ['Velvet Revolver', 'Aerosmith', 'Motley Crue', 'Skid Row', 'Slash', 'Poison', 'Def Leppard'],
  aerosmith: ['Guns N\' Roses', 'Bon Jovi', 'Kiss', 'Alice Cooper', 'Def Leppard', 'The Rolling Stones'],
  'bon jovi': ['Europe', 'Whitesnake', 'Def Leppard', 'Scorpions', 'Bryan Adams', 'Journey', 'Foreigner'],
  scorpions: ['Europe', 'Whitesnake', 'Bon Jovi', 'Def Leppard', 'UFO', 'Michael Schenker Group'],
  'def leppard': ['Bon Jovi', 'Europe', 'Whitesnake', 'Motley Crue', 'Poison', 'Aerosmith'],
  queen: ['David Bowie', 'Electric Light Orchestra', 'The Darkness', 'Elton John', 'Supertramp', 'Led Zeppelin'],
  'led zeppelin': ['Deep Purple', 'Black Sabbath', 'Cream', 'Greta Van Fleet', 'The Who', 'Jimi Hendrix'],
  'deep purple': ['Rainbow', 'Led Zeppelin', 'Black Sabbath', 'Whitesnake', 'Uriah Heep', 'Cream'],
  'black sabbath': ['Ozzy Osbourne', 'Dio', 'Deep Purple', 'Judas Priest', 'Iron Maiden'],
  kiss: ['Alice Cooper', 'Motley Crue', 'Aerosmith', 'Twisted Sister', 'Judas Priest'],
  motorhead: ['Judas Priest', 'Saxon', 'Girlschool', 'Venom', 'AC/DC', 'Accept'],
  dio: ['Rainbow', 'Black Sabbath', 'Iron Maiden', 'Judas Priest', 'Accept'],

  // Classic Rock & Prog
  'dire straits': ['The Police', 'Eric Clapton', 'Chris Rea', 'J.J. Cale', 'Tom Petty', 'Fleetwood Mac'],
  'mark knopfler': ['Dire Straits', 'Eric Clapton', 'J.J. Cale', 'Chet Atkins', 'Chris Rea'],
  'the police': ['Dire Straits', 'Sting', 'Genesis', 'U2', 'Talking Heads', 'Men at Work'],
  'pink floyd': ['Genesis', 'Yes', 'King Crimson', 'Roger Waters', 'The Alan Parsons Project', 'Supertramp'],
  'the rolling stones': ['The Beatles', 'The Who', 'The Kinks', 'The Doors', 'Cream', 'Creedence Clearwater Revival'],
  'the beatles': ['The Rolling Stones', 'The Kinks', 'The Who', 'John Lennon', 'George Harrison', 'Paul McCartney'],
  'creedence clearwater revival': ['The Doors', 'The Rolling Stones', 'Lynyrd Skynyrd', 'ZZ Top', 'Bob Dylan'],
  'the doors': ['Creedence Clearwater Revival', 'Jimi Hendrix', 'The Rolling Stones', 'Led Zeppelin', 'The Who'],
  u2: ['The Police', 'Simple Minds', 'R.E.M.', 'INXS', 'Midnight Oil', 'Depeche Mode'],

  // Grunge & 90s Alternative
  nirvana: ['Pearl Jam', 'Soundgarden', 'Alice in Chains', 'Foo Fighters', 'Stone Temple Pilots', 'Silverchair'],
  'pearl jam': ['Soundgarden', 'Alice in Chains', 'Nirvana', 'Temple of the Dog', 'Eddie Vedder', 'Foo Fighters'],
  'foo fighters': ['Nirvana', 'Queens of the Stone Age', 'Red Hot Chili Peppers', 'Audioslave', 'The Offspring'],
  'red hot chili peppers': ['Rage Against the Machine', 'Faith No More', 'Jane\'s Addiction', 'Incubus', 'Foo Fighters'],
  'green day': ['The Offspring', 'Blink-182', 'Sum 41', 'Bad Religion', 'NOFX', 'Rancid'],
  'the offspring': ['Green Day', 'Blink-182', 'Sum 41', 'Bad Religion', 'Pennywise'],

  // 80s Pop & New Wave
  'depeche mode': ['The Cure', 'New Order', 'Tears for Fears', 'Pet Shop Boys', 'Duran Duran', 'INXS'],
  'the cure': ['Depeche Mode', 'Joy Division', 'The Smiths', 'Echo & the Bunnymen', 'Siouxsie and the Banshees'],
  'duran duran': ['Spandau Ballet', 'Tears for Fears', 'INXS', 'A-ha', 'Wham!'],
  'tears for fears': ['Simple Minds', 'Duran Duran', 'Talk Talk', 'The Police', 'INXS'],
};

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
      const topArtists = tastes.slice(0, 6);

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
              tracks: mixResults.slice(0, 10),
            });
          }
        } catch (e) {
          console.warn('Mix of favorite bands error:', e);
        }
      }

      // 3. Más cosas de mis grupos favoritos (canciones que aún no tienes guardadas)
      for (const item of topArtists) {
        if (groups.length >= 10) break;
        try {
          const query = `${item.artist} greatest hits full songs`;
          const results = await streamResolver.search(query, 'youtube');

          // Filter out tracks already liked or in playlists to give fresh discoveries
          const knownIds = new Set([
            ...likedTracks.map((t) => t.id),
            ...playlists.flatMap((p) => p.tracks.map((t) => t.id)),
          ]);

          const freshTracks = results.filter((t) => !knownIds.has(t.id)).slice(0, 10);

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
            tracks: rockClassics.slice(0, 10),
          });
        }
      } catch (e) {
        console.warn('Cold start fallback error:', e);
      }
    }

    // Ensure we have up to 10 groups in "Seleccionado para ti"
    const discoveryFillers = [
      { id: 'fill_rock_80', reason: 'Himnos Legendarios del Rock', genre: 'Grandes Clásicos del Rock 80s', query: '80s Rock Classics Greatest Hits' },
      { id: 'fill_ballads', reason: 'Grandes Baladas del Rock', genre: 'Baladas Inmortales', query: 'Classic Rock Ballads Greatest Hits' },
      { id: 'fill_rock_es', reason: 'Rock en Español Legendario', genre: 'Clásicos en Español', query: 'Rock en Español Grandes Exitos' },
      { id: 'fill_hard_rock', reason: 'Lo Mejor del Hard Rock', genre: 'Hard Rock & Metal 80s', query: 'Hard Rock 80s 90s Greatest Hits' },
      { id: 'fill_70s_rock', reason: 'Rock Setentero Inmortal', genre: 'Pioneros del Rock 70s', query: '70s Classic Rock Greatest Hits' },
      { id: 'fill_guitar_heroes', reason: 'Guitar Heroes y Solos Épicos', genre: 'Guitarras Legendarias', query: 'Rock Guitar Heroes Solos Anthems' },
      { id: 'fill_pop_rock', reason: 'Grandes Éxitos Pop Rock', genre: 'Pop Rock Clásico', query: 'Pop Rock 80s 90s Greatest Hits' },
      { id: 'fill_blues_rock', reason: 'Puro Blues Rock con Alma', genre: 'Blues Rock & Riffs', query: 'Blues Rock Greatest Hits' },
      { id: 'fill_live_anthems', reason: 'Himnos de Concierto en Directo', genre: 'Directos Legendarios', query: 'Classic Rock Live Concert Anthems' },
      { id: 'fill_acoustic_rock', reason: 'Sesión Acústica Esencial', genre: 'Rock Desenroscado Acústico', query: 'Acoustic Rock Hits Classics' },
    ];

    for (const item of discoveryFillers) {
      if (groups.length >= 10) break;
      if (groups.some((g) => g.id === item.id || g.reason === item.reason)) continue;
      try {
        const res = await streamResolver.search(item.query, 'youtube');
        if (res.length > 0) {
          groups.push({
            id: item.id,
            reason: item.reason,
            artistOrGenre: item.genre,
            tracks: res.slice(0, 10),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    this.cachedRecommendations = groups.slice(0, 10);
    this.lastAnalyzedSignature = signature;
    return this.cachedRecommendations;
  }

  /**
   * Generates 4 or 5 content windows for "Descubriendo para ti"
   * Surfaces bands matching the user's tastes that are STRICTLY NOT in their playlists or favorites.
   */
  async getDiscoveryForYouWindows(
    likedTracks: Track[],
    playlists: Playlist[],
    recentTracks: Track[] = []
  ): Promise<ContentWindow[]> {
    const searchHistory = this.getSearchHistory();
    const tastes = this.analyzeTastes(likedTracks, playlists, searchHistory, recentTracks);

    // 1. Gather all known artists and track IDs to strictly exclude them
    const knownArtists = new Set<string>();
    const knownTrackIds = new Set<string>();

    const registerArtist = (name: string) => {
      const clean = this.cleanArtistName(name).toLowerCase();
      if (clean) knownArtists.add(clean);
    };

    for (const t of likedTracks) {
      registerArtist(t.artist);
      knownTrackIds.add(t.id);
    }
    for (const pl of playlists) {
      for (const t of pl.tracks) {
        registerArtist(t.artist);
        knownTrackIds.add(t.id);
      }
    }
    for (const t of recentTracks) {
      registerArtist(t.artist);
      knownTrackIds.add(t.id);
    }

    const windows: ContentWindow[] = [];
    const usedNewArtists = new Set<string>();

    // 2. Discover related bands based on top tastes
    for (const item of tastes) {
      if (windows.length >= 8) break;
      const cleanTop = this.cleanArtistName(item.artist).toLowerCase();

      // Find candidates from affinity map
      let candidates: string[] = RELATED_ARTISTS_MAP[cleanTop] || [];
      if (candidates.length === 0) {
        // Fallback substring matching in keys
        for (const [key, list] of Object.entries(RELATED_ARTISTS_MAP)) {
          if (cleanTop.includes(key) || key.includes(cleanTop)) {
            candidates = list;
            break;
          }
        }
      }

      // Pick candidate bands that user does NOT have in their lists
      const freshCandidates = candidates.filter(
        (c) => !knownArtists.has(c.toLowerCase()) && !usedNewArtists.has(c.toLowerCase())
      );

      for (const candidate of freshCandidates) {
        if (windows.length >= 8) break;
        try {
          const res = await streamResolver.search(`${candidate} greatest hits full`, 'youtube');
          // Strict filter: make sure track is not already known and artist is candidate
          const freshTracks = res.filter(
            (t) =>
              !knownTrackIds.has(t.id) &&
              !knownArtists.has(this.cleanArtistName(t.artist).toLowerCase())
          ).slice(0, 10);

          if (freshTracks.length >= 3) {
            usedNewArtists.add(candidate.toLowerCase());
            windows.push({
              id: `disc_${candidate.replace(/\s+/g, '_')}`,
              title: `Descubre a ${candidate}`,
              subtitle: `Afín a tu gusto por ${item.artist}`,
              tracks: freshTracks,
            });
            break; // One band per taste artist for variety
          }
        } catch (e) {
          console.warn(`Error discovering ${candidate}:`, e);
        }
      }
    }

    // 3. Add a mix window: "Mix de bandas afines a tu estilo"
    if (tastes.length > 0 && windows.length < 10) {
      try {
        const topNames = tastes.slice(0, 3).map((t) => t.artist).join(' ');
        const mixRes = await streamResolver.search(`bands like ${topNames} rock greatest hits mix`, 'youtube');
        const freshMix = mixRes.filter(
          (t) =>
            !knownTrackIds.has(t.id) &&
            !knownArtists.has(this.cleanArtistName(t.artist).toLowerCase())
        ).slice(0, 10);

        if (freshMix.length >= 3) {
          windows.push({
            id: 'disc_mix_similar',
            title: 'Mix de grupos afines a tu estilo',
            subtitle: 'Bandas recomendadas que aún no tienes guardadas',
            tracks: freshMix,
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // 4. Fillers for cold-start or when fewer than 10 windows found
    const starterBands = [
      { name: 'Airbourne', ref: 'Hard Rock clásico y potente', query: 'Airbourne greatest hits full' },
      { name: 'Marea', ref: 'Rock urbano con poesía callejera', query: 'Marea mejores canciones hits' },
      { name: 'Los Zigarros', ref: 'Puro Rock and Roll en español', query: 'Los Zigarros grandes exitos' },
      { name: 'Greta Van Fleet', ref: 'Sonido setentero legendario', query: 'Greta Van Fleet greatest hits' },
      { name: 'Judas Priest', ref: 'Pioneros del heavy metal melódico', query: 'Judas Priest greatest hits full' },
      { name: 'The Darkness', ref: 'Glam Rock y falsetes épicos', query: 'The Darkness greatest hits' },
      { name: 'Rival Sons', ref: 'Blues Rock moderno de alta fidelidad', query: 'Rival Sons greatest hits' },
      { name: 'Ghost', ref: 'Hard Rock teatral y melódico', query: 'Ghost greatest hits full' },
      { name: 'Halestorm', ref: 'Hard rock moderno y voz arrolladora', query: 'Halestorm greatest hits' },
      { name: 'Alter Bridge', ref: 'Riffs demoledores y solos virtuosos', query: 'Alter Bridge greatest hits full' },
      { name: 'Extremoduro', ref: 'Rock transgresivo e inmortal', query: 'Extremoduro grandes exitos' },
      { name: 'Platero y Tú', ref: 'Rock and roll callejero y directo', query: 'Platero y Tu grandes exitos' },
      { name: 'The Black Keys', ref: 'Garage rock y blues contemporáneo', query: 'The Black Keys greatest hits' },
      { name: 'Wolfmother', ref: 'Hard rock psicodélico vintage', query: 'Wolfmother greatest hits' },
      { name: 'Whitesnake', ref: 'Hard rock melódico e himnos eternos', query: 'Whitesnake greatest hits full' },
      { name: 'Thin Lizzy', ref: 'Twin guitars y alma poética irlandesa', query: 'Thin Lizzy greatest hits' },
    ];

    for (const b of starterBands) {
      if (windows.length >= 10) break;
      if (knownArtists.has(b.name.toLowerCase()) || usedNewArtists.has(b.name.toLowerCase())) continue;

      try {
        const res = await streamResolver.search(b.query, 'youtube');
        const fresh = res.filter(
          (t) =>
            !knownTrackIds.has(t.id) &&
            !knownArtists.has(this.cleanArtistName(t.artist).toLowerCase())
        ).slice(0, 10);

        if (fresh.length >= 3) {
          usedNewArtists.add(b.name.toLowerCase());
          windows.push({
            id: `disc_${b.name.replace(/\s+/g, '_')}`,
            title: `Descubre a ${b.name}`,
            subtitle: b.ref,
            tracks: fresh,
          });
        }
      } catch (e) {
        // ignore
      }
    }

    return windows.slice(0, 10);
  }

  /**
   * Generates up to 10 content windows for "Reproducciones recientes"
   */
  async getRecentPlaybackWindows(recentTracks: Track[] = []): Promise<ContentWindow[]> {
    const windows: ContentWindow[] = [];

    // Window 1: Últimas canciones escuchadas (hasta 10 canciones recientes)
    if (recentTracks.length > 0) {
      windows.push({
        id: 'recent_top10',
        title: 'Últimas canciones escuchadas',
        subtitle: `${recentTracks.slice(0, 10).length} canciones recientes`,
        tracks: recentTracks.slice(0, 10),
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

    // Windows 2 to 5: Más de tus artistas recientes
    for (let i = 0; i < Math.min(recentArtists.length, 4); i++) {
      if (windows.length >= 10) break;
      const artist = recentArtists[i];
      try {
        const res = await streamResolver.search(`${artist} greatest hits full`, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: `recent_artist_${artist.replace(/\s+/g, '_')}`,
            title: `Más de ${artist}`,
            subtitle: i === 0 ? 'Inspirado en tu última escucha' : 'Inspirado en tus reproducciones recientes',
            tracks: res.slice(0, 10),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // Window: Mix de tu última sesión
    if (recentArtists.length >= 1 && windows.length < 10) {
      try {
        const query = `${recentArtists.slice(0, 3).join(' ')} session mix rock`;
        const res = await streamResolver.search(query, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: 'recent_session_mix',
            title: 'Mix de tu última sesión',
            subtitle: 'Pistas similares a tus recientes',
            tracks: res.slice(0, 10),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // Window: Directos de tus artistas recientes
    if (recentArtists.length > 0 && windows.length < 10) {
      try {
        const res = await streamResolver.search(`${recentArtists[0]} live concert full show`, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: 'recent_live_concerts',
            title: `En Directo: ${recentArtists[0]}`,
            subtitle: 'Conciertos y directos de tus artistas recientes',
            tracks: res.slice(0, 10),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // Window: Historial completo de escuchas
    const fullHistory = playbackHistoryService.getRecentTracks(30);
    if (fullHistory.length > 0 && windows.length < 10) {
      windows.push({
        id: 'recent_history_full',
        title: 'Historial completo de escuchas',
        subtitle: `${fullHistory.length} pistas en tu historial`,
        tracks: fullHistory,
      });
    }

    // Fallbacks if fewer than 10 windows (e.g. brand new user)
    const starterDefaults = [
      { id: 'recent_starter_1', title: 'Últimas canciones escuchadas', query: '80s Rock Greatest Hits' },
      { id: 'recent_starter_2', title: 'Sesión Rock de los 80', query: 'Classic 80s Rock Anthems' },
      { id: 'recent_starter_3', title: 'Sesión Baladas Legendarias', query: 'Legendary Rock Ballads' },
      { id: 'recent_starter_4', title: 'Sesión Hard Rock Clásico', query: 'Hard Rock 80s Classics' },
      { id: 'recent_starter_5', title: 'Sesión Grandes Himnos', query: 'Greatest Rock Anthems of all time' },
      { id: 'recent_starter_6', title: 'Sesión Rock en Español', query: 'Grandes Exitos Rock Español' },
      { id: 'recent_starter_7', title: 'Sesión Guitar Heroes', query: 'Legendary Guitar Solos Rock' },
      { id: 'recent_starter_8', title: 'Sesión Acústica Vintage', query: 'Classic Rock Acoustic Hits' },
      { id: 'recent_starter_9', title: 'Sesión Directos Míticos', query: 'Live Rock Concert Anthems' },
      { id: 'recent_starter_10', title: 'Sesión Rock Setentero', query: '70s Classic Rock Anthems' },
      { id: 'recent_starter_11', title: 'Sesión Blues & Soul Rock', query: 'Blues Rock Classics Hits' },
      { id: 'recent_starter_12', title: 'Sesión Conciertos Inolvidables', query: 'Classic Rock Stadium Anthems' },
    ];

    for (const def of starterDefaults) {
      if (windows.length >= 10) break;
      if (windows.some((w) => w.id === def.id || w.title === def.title)) continue;
      try {
        const res = await streamResolver.search(def.query, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: def.id,
            title: def.title,
            subtitle: 'Selección de bienvenida',
            tracks: res.slice(0, 10),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    return windows.slice(0, 10);
  }

  /**
   * Generates up to 10 content windows for "Novedades para ti"
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
      const topArtists = tastes.slice(0, 6);
      for (const item of topArtists) {
        if (windows.length >= 10) break;
        try {
          const res = await streamResolver.search(`${item.artist} new single official latest release`, 'youtube');
          if (res.length > 0) {
            windows.push({
              id: `news_${item.artist.replace(/\s+/g, '_')}`,
              title: `Novedades de ${item.artist}`,
              subtitle: 'Últimos singles y directos',
              tracks: res.slice(0, 10),
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
      { id: 'news_rarities', title: 'Nuevas Versiones y Rarezas', query: 'rock official new version rarities 2025 2026' },
      { id: 'news_hard_rock', title: 'Lo Nuevo del Hard Rock & Metal', query: 'hard rock heavy metal new releases official 2025 2026' },
      { id: 'news_deluxe', title: 'Grandes Ediciones Deluxe', query: 'rock deluxe edition remasters new' },
      { id: 'news_festivals', title: 'Festivales y Shows Recientes', query: 'rock festival live full show recent' },
      { id: 'news_modern_rock', title: 'Nuevas Bandas del Panorama Rock', query: 'new modern rock bands releases 2025 2026' },
      { id: 'news_studio', title: 'Sesiones de Estudio Recientes', query: 'in studio live rock session recent' },
      { id: 'news_full_albums', title: 'Álbumes Completos del Año', query: 'rock album full new release official' },
    ];

    for (const gen of thematicNews) {
      if (windows.length >= 10) break;
      if (windows.some((w) => w.id === gen.id || w.title === gen.title)) continue;
      try {
        const res = await streamResolver.search(gen.query, 'youtube');
        if (res.length > 0) {
          windows.push({
            id: gen.id,
            title: gen.title,
            subtitle: 'Últimas publicaciones',
            tracks: res.slice(0, 10),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    return windows.slice(0, 10);
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
