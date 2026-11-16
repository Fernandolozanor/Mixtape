export type AudioSourceType = 'youtube' | 'audius' | 'radio' | 'custom';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  thumbnail: string;
  source: AudioSourceType;
  audioUrl?: string;
  youtubeId?: string;
  views?: number;
  viewsFormatted?: string;
  streamExpiry?: number;
  addedAt?: number;
  bpm?: number;
}

export type MediaFormat = 'tape' | 'vinyl';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
  mediaType?: 'tape' | 'vinyl';
  artist?: string;
  year?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface SponsorSegment {
  start: number;
  end: number;
  category: string;
}

export interface YouTubeRelease {
  id: string;
  title: string;
  artist: string;
  year?: string;
  thumbnail: string;
  trackCount?: number;
  type: 'album' | 'single' | 'ep';
  url?: string;
  tracks?: Track[];
}

export type TextSizeType = 'small' | 'medium' | 'large' | 'xlarge';

export interface UserSettings {
  skipSponsors: boolean;
  audioQuality: 'auto' | 'high' | 'medium' | 'low';
  enableLrcLyrics: boolean;
  normalizeVolume: boolean;
  cacheSongsOffline: boolean;
  activeInstanceIndex: number;
  vuMeterStyle?: 'analog' | 'led';
  textSize?: TextSizeType;
  crossfadeEnabled?: boolean;
  crossfadeDuration?: number; // in seconds (e.g. 2 - 12)
  autoOpenPlayerDeck?: boolean; // Abrir automáticamente el dispositivo de reproducción (cinta o vinilo) a los 2 segundos
  favoritesViewMode?: 'jukebox' | 'vinyl' | 'list';
  jukeboxCredits?: number;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}
