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
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
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

export interface UserSettings {
  skipSponsors: boolean;
  audioQuality: 'auto' | 'high' | 'medium' | 'low';
  enableLrcLyrics: boolean;
  normalizeVolume: boolean;
  cacheSongsOffline: boolean;
  activeInstanceIndex: number;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}
