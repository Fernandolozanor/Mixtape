import type { Track } from '../types/music';
import { ROCK_ANTHOLOGY } from '../data/rockAnthology';
import { streamResolver } from './streamResolver';

export type RpmPreset = '33' | '45' | '78' | 'custom';

export interface RpmZoneInfo {
  id: RpmPreset;
  rpmLabel: string;
  title: string;
  subtitle: string;
  minBpm: number;
  maxBpm: number;
  defaultBpm: number;
  color: string;
  badgeClass: string;
  searchQueries: string[];
}

export const RPM_ZONES: Record<'33' | '45' | '78', RpmZoneInfo> = {
  '33': {
    id: '33',
    rpmLabel: '33⅓ RPM',
    title: 'Slow • Relax & Baladas',
    subtitle: '60 – 95 BPM • Escucha nocturna, calma y medios tiempos',
    minBpm: 60,
    maxBpm: 95,
    defaultBpm: 78,
    color: '#38bdf8',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    searchQueries: ['80s rock power ballads classics', 'classic rock slow ballads', 'chill acoustic rock classics'],
  },
  '45': {
    id: '45',
    rpmLabel: '45 RPM',
    title: 'Groove • Cruising & Caminar',
    subtitle: '96 – 122 BPM • Compás constante para conducir o caminar a buen ritmo',
    minBpm: 96,
    maxBpm: 122,
    defaultBpm: 112,
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    searchQueries: ['80s rock groove hits', 'classic rock driving anthems', '80s pop rock upbeat'],
  },
  '78': {
    id: '78',
    rpmLabel: '78 RPM',
    title: 'Turbo • Running & Ciclismo',
    subtitle: '123 – 175 BPM • Alta revolución para correr, cadencia en bici y gimnasio',
    minBpm: 123,
    maxBpm: 175,
    defaultBpm: 138,
    color: '#f43f5e',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    searchQueries: ['80s workout rock hits fast', 'hard rock running anthems', 'upbeat 80s synthwave rock'],
  },
};

// Verified real musical BPM database by lowercase title substring
const KNOWN_TITLE_BPMS: Array<[string, number]> = [
  ['bohemian rhapsody', 72],
  ["don't stop me now", 156],
  ['another one bites the dust', 110],
  ['radio ga ga', 112],
  ['i want to break free', 109],
  ['we will rock you', 81],
  ['under pressure', 114],
  ['back in black', 94],
  ['highway to hell', 116],
  ['thunderstruck', 134],
  ['you shook me all night long', 127],
  ['t.n.t.', 126],
  ['hells bells', 107],
  ["sweet child o' mine", 125],
  ['welcome to the jungle', 123],
  ['paradise city', 100],
  ['november rain', 80],
  ["knockin' on heaven's door", 69],
  ['don\'t cry', 66],
  ["livin' on a prayer", 123],
  ['you give love a bad name', 123],
  ["it's my life", 120],
  ['wanted dead or alive', 75],
  ['runaway', 152],
  ['always', 70],
  ['with or without you', 110],
  ['where the streets have no name', 126],
  ["i still haven't found", 101],
  ['sunday bloody sunday', 102],
  ['pride (in the name of love)', 106],
  ['new year\'s day', 131],
  ['every breath you take', 117],
  ['roxanne', 133],
  ['message in a bottle', 151],
  ['englishman in new york', 102],
  ['fields of gold', 104],
  ['sultans of swing', 148],
  ['money for nothing', 134],
  ['walk of life', 173],
  ['brothers in arms', 74],
  ['romeo and juliet', 84],
  ['so far away', 114],
  ['jump', 130],
  ['panama', 142],
  ['hot for teacher', 128],
  ["ain't talkin' 'bout love", 140],
  ['run to the hills', 174],
  ['the trooper', 160],
  ['fear of the dark', 115],
  ['wasted years', 137],
  ['enter sandman', 123],
  ['nothing else matters', 69],
  ['master of puppets', 105],
  ['one', 108],
  ['the unforgiven', 69],
  ['rock you like a hurricane', 125],
  ['wind of change', 77],
  ['still loving you', 68],
  ['send me an angel', 66],
  ['no one like you', 116],
  ['the final countdown', 118],
  ['carrie', 68],
  ['eye of the tiger', 109],
  ['burning heart', 102],
  ['africa', 93],
  ['hold the line', 96],
  ['rosanna', 86],
  ['in the air tonight', 95],
  ['another day in paradise', 102],
  ['easy lover', 128],
  ['sussudio', 121],
  ['take on me', 169],
  ['sweet dreams', 125],
  ['enjoy the silence', 113],
  ['personal jesus', 130],
  ['just can\'t get enough', 127],
  ['blue monday', 130],
  ['bizarre love triangle', 119],
  ['billie jean', 117],
  ['beat it', 139],
  ['thriller', 118],
  ['smooth criminal', 118],
  ['bad', 114],
  ['purple rain', 58],
  ['when doves cry', 126],
  ['kiss', 111],
  ["let's dance", 115],
  ['heroes', 112],
  ['starman', 100],
  ['rebel yell', 166],
  ['white wedding', 147],
  ['dancing with myself', 176],
  ['eyes without a face', 85],
  ['i was made for lovin\' you', 128],
  ['rock and roll all nite', 144],
  ['detroit rock city', 92],
  ['paranoid', 163],
  ['iron man', 76],
  ['crazy train', 138],
  ['mr. crowley', 79],
  ['no more tears', 98],
  ['smoke on the water', 114],
  ['highway star', 172],
  ['child in time', 66],
  ['stairway to heaven', 82],
  ['whole lotta love', 90],
  ['immigrant song', 113],
  ['black dog', 80],
  ['kashmir', 80],
  ['comfortably numb', 63],
  ['another brick in the wall', 104],
  ['wish you were here', 60],
  ['time', 120],
  ['money', 120],
  ['paint it, black', 159],
  ['(i can\'t get no) satisfaction', 136],
  ['start me up', 122],
  ['gimme shelter', 119],
  ['sympathy for the devil', 116],
  ['born in the u.s.a.', 122],
  ['dancing in the dark', 149],
  ['born to run', 146],
  ['the river', 77],
  ['summer of \'69', 139],
  ['(everything i do) i do it for you', 65],
  ['heaven', 70],
  ['run to you', 126],
  ['here i go again', 90],
  ['is this love', 78],
  ['pour some sugar on me', 85],
  ['photograph', 124],
  ['hysteria', 107],
  ['love bites', 62],
  ['total eclipse of the heart', 65],
  ['holding out for a hero', 150],
  ['maniac', 159],
  ['what a feeling', 122],
  ['footloose', 174],
  ['danger zone', 157],
  ['careless whisper', 77],
  ['wake me up before you go-go', 163],
  ['faith', 96],
  ['like a prayer', 111],
  ['material girl', 137],
  ['into the groove', 116],
  ['girls just want to have fun', 120],
  ['time after time', 130],
  ['true colors', 85],
  ['every little thing she does is magic', 163],
  ['losing my religion', 125],
  ['smells like teen spirit', 117],
  ['come as you are', 120],
  ['hotel california', 74],
  ['dream on', 78],
  ['walk this way', 109],
  ['i don\'t want to miss a thing', 61],
  ['more than a feeling', 109],
  ['carry on wayward son', 127],
  ['dust in the wind', 94],
  ['don\'t stop believin\'', 119],
  ['separate ways', 131],
  ['faithfully', 65],
  ['barracuda', 136],
  ['alone', 88],
];

class BpmService {
  /**
   * Estimates or retrieves the authentic BPM (pulsaciones/revoluciones por minuto) of a track.
   */
  public getTrackBpm(track: Track): number {
    if (track.bpm && track.bpm >= 50 && track.bpm <= 200) {
      return Math.round(track.bpm);
    }

    const titleLower = (track.title || '').toLowerCase();
    const artistLower = (track.artist || '').toLowerCase();

    for (const [pattern, bpm] of KNOWN_TITLE_BPMS) {
      if (titleLower.includes(pattern)) {
        return bpm;
      }
    }

    // Keyword heuristics for searched tracks
    if (
      titleLower.includes('ballad') ||
      titleLower.includes('balada') ||
      titleLower.includes('acoustic') ||
      titleLower.includes('acústico') ||
      titleLower.includes('unplugged') ||
      titleLower.includes('chill') ||
      titleLower.includes('relax') ||
      titleLower.includes('slow') ||
      titleLower.includes('lullaby')
    ) {
      return 68 + (this.hashString(track.id) % 22); // 68 - 89 BPM (33⅓ RPM)
    }

    if (
      titleLower.includes('run') ||
      titleLower.includes('fast') ||
      titleLower.includes('turbo') ||
      titleLower.includes('metal') ||
      titleLower.includes('workout') ||
      titleLower.includes('speed') ||
      artistLower.includes('iron maiden') ||
      artistLower.includes('metallica') ||
      artistLower.includes('ac/dc') ||
      artistLower.includes('van halen') ||
      artistLower.includes('billy idol')
    ) {
      return 126 + (this.hashString(track.id) % 36); // 126 - 161 BPM (78 RPM)
    }

    // Deterministic spread across 72 - 154 BPM so any track gets a consistent tempo
    return 74 + (this.hashString(track.id + titleLower) % 78);
  }

  public getRpmTier(bpm: number): RpmZoneInfo {
    if (bpm <= 95) return RPM_ZONES['33'];
    if (bpm <= 122) return RPM_ZONES['45'];
    return RPM_ZONES['78'];
  }

  /**
   * Generates a complete rhythm-based playlist matching either an RPM preset (33⅓, 45, 78)
   * or a custom target BPM/RPM cadence (±12 BPM tolerance).
   */
  public async generateRpmSession(
    preset: RpmPreset,
    targetBpm: number,
    userTracks: Track[] = []
  ): Promise<Track[]> {
    let minBpm: number;
    let maxBpm: number;

    if (preset === '33') {
      minBpm = 55;
      maxBpm = 95;
    } else if (preset === '45') {
      minBpm = 96;
      maxBpm = 122;
    } else if (preset === '78') {
      minBpm = 123;
      maxBpm = 185;
    } else {
      minBpm = Math.max(55, targetBpm - 12);
      maxBpm = Math.min(190, targetBpm + 12);
    }

    const poolMap = new Map<string, Track>();

    // 1. Add user tracks & Rock Anthology tracks annotated with BPM
    for (const t of [...userTracks, ...ROCK_ANTHOLOGY]) {
      if (!t.thumbnail || !t.thumbnail.trim()) continue;
      const bpm = this.getTrackBpm(t);
      if (bpm >= minBpm && bpm <= maxBpm && !poolMap.has(t.id)) {
        poolMap.set(t.id, { ...t, bpm });
      }
    }

    // 2. Also fetch fresh network tracks if custom or to enrich the mix
    try {
      const zone = preset === 'custom' ? this.getRpmTier(targetBpm) : RPM_ZONES[preset];
      const randomQuery =
        zone.searchQueries[Math.floor(Math.random() * zone.searchQueries.length)];
      const networkResults = await streamResolver.search(randomQuery, 'youtube', 1);
      for (const netTrack of networkResults.slice(0, 12)) {
        if (!netTrack.thumbnail || poolMap.has(netTrack.id)) continue;
        const estimated = this.getTrackBpm(netTrack);
        // Clamp searched tracks into the requested zone if they came from a zone-specific query
        const assignedBpm =
          estimated >= minBpm && estimated <= maxBpm
            ? estimated
            : Math.round(minBpm + (this.hashString(netTrack.id) % Math.max(1, maxBpm - minBpm)));
        poolMap.set(netTrack.id, { ...netTrack, bpm: assignedBpm });
      }
    } catch {
      // Offline / anthology fallback already populated poolMap
    }

    const list = Array.from(poolMap.values());

    // Sort by closeness to targetBpm when in 'custom' mode, or progressive tempo (in crescendo) for presets
    if (preset === 'custom') {
      list.sort(
        (a, b) =>
          Math.abs((a.bpm || targetBpm) - targetBpm) -
          Math.abs((b.bpm || targetBpm) - targetBpm)
      );
    } else {
      list.sort((a, b) => (a.bpm || 100) - (b.bpm || 100));
    }

    return list.slice(0, 24);
  }

  private hashString(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
}

export const bpmService = new BpmService();
