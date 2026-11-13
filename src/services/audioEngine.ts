import type { Track, SponsorSegment } from '../types/music';

type PlaybackCallback = () => void;
type TimeUpdateCallback = (currentTime: number, duration: number, buffered: number) => void;
type ErrorCallback = (error: string) => void;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

class AudioEngine {
  private audio: HTMLAudioElement;
  private ytPlayer: any = null;
  private ytPlayerReady: boolean = false;
  private pendingTrack: Track | null = null;
  private isUsingYouTube: boolean = false;
  private currentTrack: Track | null = null;
  private sponsorSegments: SponsorSegment[] = [];
  private skipSponsors: boolean = true;
  private volume: number = 1.0;
  private syncTimer: any = null;

  private onTrackEndCallbacks: PlaybackCallback[] = [];
  private onTimeUpdateCallbacks: TimeUpdateCallback[] = [];
  private onStateChangeCallbacks: PlaybackCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    this.setupAudioListeners();
    this.initYouTubeIFrameAPI();
  }

  private checkSponsorSkip(cur: number) {
    if (this.skipSponsors && this.sponsorSegments.length > 0) {
      for (const seg of this.sponsorSegments) {
        if (cur >= seg.start && cur < seg.end) {
          this.seek(seg.end + 0.1);
          break;
        }
      }
    }
  }

  private setupAudioListeners() {
    this.audio.addEventListener('play', () => this.notifyState());
    this.audio.addEventListener('pause', () => this.notifyState());
    this.audio.addEventListener('playing', () => this.notifyState());
    this.audio.addEventListener('waiting', () => this.notifyState());
    this.audio.addEventListener('ended', () => {
      this.onTrackEndCallbacks.forEach((cb) => cb());
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.isUsingYouTube) return;
      const cur = this.audio.currentTime;
      const dur = this.audio.duration || 0;
      this.checkSponsorSkip(cur);
      let buf = 0;
      if (this.audio.buffered.length > 0) {
        buf = this.audio.buffered.end(this.audio.buffered.length - 1);
      }
      this.updateMediaSessionPosition(cur, dur);
      this.onTimeUpdateCallbacks.forEach((cb) => cb(cur, dur, buf));
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Native audio error:', e);
      this.notifyState();
    });
  }

  private initYouTubeIFrameAPI() {
    if (typeof window === 'undefined') return;

    let ytContainer = document.getElementById('pulse-yt-container');
    if (!ytContainer) {
      ytContainer = document.createElement('div');
      ytContainer.id = 'pulse-yt-container';
      // YouTube requires positive viewport dimensions and visibility for audio playback
      ytContainer.style.position = 'fixed';
      ytContainer.style.bottom = '4px';
      ytContainer.style.right = '4px';
      ytContainer.style.width = '180px';
      ytContainer.style.height = '100px';
      ytContainer.style.opacity = '0.02';
      ytContainer.style.pointerEvents = 'none';
      ytContainer.style.zIndex = '1';
      document.body.appendChild(ytContainer);
    }

    const initPlayer = () => {
      if (this.ytPlayer) return;
      try {
        this.ytPlayer = new window.YT.Player('pulse-yt-container', {
          height: '100',
          width: '180',
          playerVars: {
            playsinline: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            autoplay: 1,
          },
          events: {
            onReady: () => {
              this.ytPlayerReady = true;
              if (this.pendingTrack) {
                const track = this.pendingTrack;
                this.pendingTrack = null;
                this.playTrack(track);
              }
            },
            onStateChange: (event: any) => {
              this.handleYouTubeStateChange(event.data);
            },
            onError: (err: any) => {
              console.warn('YouTube Player error code:', err.data);
              this.onErrorCallbacks.forEach((cb) =>
                cb('Este vídeo de YouTube tiene restricciones de reproducción externa.')
              );
            },
          },
        });
      } catch (e) {
        console.warn('Failed to initialize YT.Player:', e);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
      if (!document.getElementById('yt-iframe-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }
  }

  private handleYouTubeStateChange(state: number) {
    this.notifyState();

    if (state === 0) {
      this.onTrackEndCallbacks.forEach((cb) => cb());
    }

    if (state === 1) {
      this.startYouTubeSync();
    } else {
      this.stopYouTubeSync();
    }
  }

  private startYouTubeSync() {
    this.stopYouTubeSync();
    this.syncTimer = setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || 0;
        this.checkSponsorSkip(cur);
        const loaded = this.ytPlayer.getVideoLoadedFraction() || 0;
        const buf = dur * loaded;

        this.updateMediaSessionPosition(cur, dur);
        this.onTimeUpdateCallbacks.forEach((cb) => cb(cur, dur, buf));
      }
    }, 250);
  }

  private stopYouTubeSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public setSkipSponsors(enabled: boolean) {
    this.skipSponsors = enabled;
  }

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
        this.seek(Math.max(0, this.getCurrentTime() - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.min(this.getDuration() || 0, this.getCurrentTime() + offset));
      });
    } catch (e) {
      console.warn('MediaSession handler warning:', e);
    }
  }

  private updateMediaSessionMetadata(track: Track) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: `${track.artist} (${this.getSourceLabel(track.source)})`,
      album: track.album || "Mixtape '84",
      artwork: [
        { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: track.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
  }

  public getSourceLabel(source: string): string {
    switch (source) {
      case 'youtube':
        return 'YouTube (Canción Completa)';
      case 'audius':
        return 'Audius (Libre Completa)';
      case 'radio':
        return 'Radio en Vivo';
      default:
        return 'Audio Directo';
    }
  }

  private updateMediaSessionPosition(currentTime: number, duration: number) {
    if (!('mediaSession' in navigator) || !duration || isNaN(duration) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1.0,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // Ignored
    }
  }

  /**
   * Play a track (Full YouTube song or Full Audius stream)
   */
  public async playTrack(track: Track): Promise<boolean> {
    this.currentTrack = track;
    this.updateMediaSessionMetadata(track);

    // 1. YouTube playback
    if (track.source === 'youtube' && track.youtubeId) {
      this.isUsingYouTube = true;
      this.audio.pause();

      if (!this.ytPlayerReady || !this.ytPlayer) {
        this.pendingTrack = track;
        return true;
      }

      try {
        this.ytPlayer.loadVideoById({
          videoId: track.youtubeId,
          suggestedQuality: 'small',
        });
        this.ytPlayer.unMute();
        this.ytPlayer.setVolume(Math.round(this.volume * 100));
        this.ytPlayer.playVideo();
        this.notifyState();
        return true;
      } catch (err) {
        console.warn('YouTube loadVideoById error:', err);
      }
    }

    // 2. Direct Audius or custom audio stream
    if (track.audioUrl) {
      this.isUsingYouTube = false;
      this.stopYouTubeSync();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      }

      try {
        this.audio.src = track.audioUrl;
        this.audio.currentTime = 0;
        this.audio.volume = this.volume;
        await this.audio.play();
        this.notifyState();
        return true;
      } catch (err) {
        console.warn('Native audio play error (user interaction required on iOS):', err);
      }
    }

    return false;
  }

  public preloadNextTrack(_track: Track): void {
    // Gapless preloading
  }

  public play(): Promise<void> {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.ytPlayer.playVideo();
      return Promise.resolve();
    }
    return this.audio.play();
  }

  public pause(): void {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
      return;
    }
    this.audio.pause();
  }

  public seek(seconds: number): void {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(seconds, true);
      return;
    }
    if (this.audio.duration && !isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(Math.round(this.volume * 100));
    }
    this.audio.volume = this.volume;
  }

  public isPlaying(): boolean {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      return this.ytPlayer.getPlayerState() === 1; // 1 = playing
    }
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 1;
  }

  public isBuffering(): boolean {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      return this.ytPlayer.getPlayerState() === 3; // 3 = buffering
    }
    return !this.audio.paused && this.audio.readyState < 2;
  }

  public getCurrentTime(): number {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      return this.ytPlayer.getCurrentTime() || 0;
    }
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
      return this.ytPlayer.getDuration() || 0;
    }
    return this.audio.duration || 0;
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
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
