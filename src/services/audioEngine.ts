import type { Track, SponsorSegment } from '../types/music';
import { streamResolver } from './streamResolver';
import { cacheService } from './cacheService';

type PlaybackCallback = () => void;
type TimeUpdateCallback = (currentTime: number, duration: number, buffered: number) => void;
type ErrorCallback = (error: string) => void;

class AudioEngine {
  private audio: HTMLAudioElement;
  private currentTrack: Track | null = null;
  private sponsorSegments: SponsorSegment[] = [];
  private skipSponsors: boolean = true;
  private onTrackEndCallbacks: PlaybackCallback[] = [];
  private onTimeUpdateCallbacks: TimeUpdateCallback[] = [];
  private onStateChangeCallbacks: PlaybackCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];
  private nextTrackPreloadedUrl: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    this.setupListeners();
  }

  private setupListeners() {
    this.audio.addEventListener('play', () => this.notifyState());
    this.audio.addEventListener('pause', () => this.notifyState());
    this.audio.addEventListener('playing', () => this.notifyState());
    this.audio.addEventListener('waiting', () => this.notifyState());
    this.audio.addEventListener('ended', () => {
      this.onTrackEndCallbacks.forEach((cb) => cb());
    });

    this.audio.addEventListener('timeupdate', () => {
      const cur = this.audio.currentTime;
      const dur = this.audio.duration || 0;

      // Calculate buffered end
      let buf = 0;
      if (this.audio.buffered.length > 0) {
        buf = this.audio.buffered.end(this.audio.buffered.length - 1);
      }

      // Check SponsorBlock segments
      if (this.skipSponsors && this.sponsorSegments.length > 0) {
        for (const seg of this.sponsorSegments) {
          if (cur >= seg.start && cur < seg.end) {
            console.log(`[SponsorBlock] Skipping ${seg.category} (${seg.start.toFixed(1)}s -> ${seg.end.toFixed(1)}s)`);
            this.audio.currentTime = seg.end + 0.1;
            break;
          }
        }
      }

      this.updateMediaSessionPosition(cur, dur);
      this.onTimeUpdateCallbacks.forEach((cb) => cb(cur, dur, buf));
    });

    this.audio.addEventListener('error', () => {
      const err = this.audio.error;
      const msg = err ? `Error de audio: ${err.message || err.code}` : 'Error desconocido al reproducir stream';
      this.onErrorCallbacks.forEach((cb) => cb(msg));
    });
  }

  public setSkipSponsors(enabled: boolean) {
    this.skipSponsors = enabled;
  }

  /**
   * Set up MediaSession metadata and action handlers for iOS, Android, Windows & Mac
   */
  public setupMediaSession(actions: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (time: number) => void;
  }) {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', actions.onPlay);
      navigator.mediaSession.setActionHandler('pause', actions.onPause);
      navigator.mediaSession.setActionHandler('nexttrack', actions.onNext);
      navigator.mediaSession.setActionHandler('previoustrack', actions.onPrev);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          actions.onSeek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.max(0, this.audio.currentTime - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.min(this.audio.duration || 0, this.audio.currentTime + offset));
      });
    } catch (e) {
      console.warn('Could not register some MediaSession actions:', e);
    }
  }

  private updateMediaSessionMetadata(track: Track) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'Pulse Music',
      artwork: [
        { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: track.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
  }

  private updateMediaSessionPosition(currentTime: number, duration: number) {
    if (!('mediaSession' in navigator) || !duration || isNaN(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: this.audio.playbackRate,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // Ignored for non-finite position
    }
  }

  /**
   * Play a track by resolving its stream or using cache
   */
  public async playTrack(track: Track): Promise<boolean> {
    this.currentTrack = track;
    this.updateMediaSessionMetadata(track);
    this.sponsorSegments = [];

    // 1. Fetch SponsorBlock segments in parallel if applicable
    if (track.source === 'youtube') {
      streamResolver.getSponsorSegments(track.id).then((segments) => {
        this.sponsorSegments = segments;
      });
    }

    // 2. Check offline cache
    let streamUrl: string | null = await cacheService.getCachedAudioUrl(track.id);

    // 3. If not cached, resolve stream from Invidious/Piped
    if (!streamUrl) {
      streamUrl = await streamResolver.resolveAudioStream(track);
      // Auto cache if enabled
      if (streamUrl) {
        cacheService.cacheAudio(track.id, track.title, track.artist, streamUrl);
      }
    }

    if (!streamUrl) {
      this.onErrorCallbacks.forEach((cb) => cb('No se pudo obtener el audio de esta pista. Reintentando...'));
      return false;
    }

    try {
      this.audio.src = streamUrl;
      await this.audio.play();
      return true;
    } catch (err: any) {
      console.warn('Playback start error (user interaction might be required on iOS):', err);
      return false;
    }
  }

  /**
   * Preload the upcoming track to ensure gapless transition
   */
  public async preloadNextTrack(track: Track) {
    try {
      const url = await streamResolver.resolveAudioStream(track);
      if (url) {
        this.nextTrackPreloadedUrl = url;
        const preloadAudio = new Audio();
        preloadAudio.preload = 'auto';
        preloadAudio.src = url;
      }
    } catch {
      // Silent preload failure
    }
  }

  public play(): Promise<void> {
    return this.audio.play();
  }

  public pause(): void {
    this.audio.pause();
  }

  public seek(seconds: number): void {
    if (this.audio.duration && !isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
    }
  }

  public setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public getNextTrackPreloadedUrl(): string | null {
    return this.nextTrackPreloadedUrl;
  }

  public isPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 2;
  }

  public isBuffering(): boolean {
    return !this.audio.paused && this.audio.readyState < 3;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime;
  }

  public getDuration(): number {
    return this.audio.duration || 0;
  }

  public onTrackEnd(cb: PlaybackCallback) {
    this.onTrackEndCallbacks.push(cb);
  }

  public onTimeUpdate(cb: TimeUpdateCallback) {
    this.onTimeUpdateCallbacks.push(cb);
  }

  public onStateChange(cb: PlaybackCallback) {
    this.onStateChangeCallbacks.push(cb);
  }

  public onError(cb: ErrorCallback) {
    this.onErrorCallbacks.push(cb);
  }

  private notifyState() {
    this.onStateChangeCallbacks.forEach((cb) => cb());
  }
}

export const audioEngine = new AudioEngine();
