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
  private isUsingYouTube: boolean = false;
  private currentTrack: Track | null = null;
  private sponsorSegments: SponsorSegment[] = [];
  private skipSponsors: boolean = true;
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

    this.audio.addEventListener('error', () => {
      if (!this.isUsingYouTube) {
        console.warn('Native audio error, falling back to YouTube if available');
      }
    });
  }

  private initYouTubeIFrameAPI() {
    if (typeof window === 'undefined') return;

    // Create hidden DOM container for YouTube player
    let ytContainer = document.getElementById('pulse-yt-container');
    if (!ytContainer) {
      ytContainer = document.createElement('div');
      ytContainer.id = 'pulse-yt-container';
      ytContainer.style.position = 'fixed';
      ytContainer.style.bottom = '-9999px';
      ytContainer.style.left = '-9999px';
      ytContainer.style.width = '240px';
      ytContainer.style.height = '180px';
      ytContainer.style.opacity = '0.001';
      ytContainer.style.pointerEvents = 'none';
      ytContainer.style.zIndex = '-999';
      document.body.appendChild(ytContainer);
    }

    const initPlayer = () => {
      if (this.ytPlayer) return;
      try {
        this.ytPlayer = new window.YT.Player('pulse-yt-container', {
          height: '180',
          width: '240',
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
            },
            onStateChange: (event: any) => {
              this.handleYouTubeStateChange(event.data);
            },
            onError: (err: any) => {
              console.warn('YouTube Player error:', err);
              this.onErrorCallbacks.forEach((cb) => cb('Error al reproducir desde YouTube'));
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
      // Inject script
      if (!document.getElementById('yt-iframe-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }
  }

  private handleYouTubeStateChange(state: number) {
    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    this.notifyState();

    if (state === 0) {
      // Ended
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
   * Play a track using either YouTube or Direct Audio stream
   */
  public async playTrack(track: Track): Promise<boolean> {
    this.currentTrack = track;
    this.updateMediaSessionMetadata(track);

    // 1. Direct stream available (Audius, direct stream, radio)
    if (track.source === 'custom' && track.audioUrl) {
      this.isUsingYouTube = false;
      this.stopYouTubeSync();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      }

      try {
        this.audio.src = track.audioUrl;
        await this.audio.play();
        return true;
      } catch (err) {
        console.warn('Native audio play error:', err);
      }
    }

    // 2. Play via YouTube IFrame Engine (Search or Video ID)
    if (this.ytPlayerReady && this.ytPlayer) {
      this.isUsingYouTube = true;
      this.audio.pause();

      try {
        const query = `${track.title} ${track.artist}`;
        if (track.id.length === 11 && !track.id.startsWith('yt_')) {
          this.ytPlayer.loadVideoById(track.id);
        } else {
          // Native YouTube search playlist
          this.ytPlayer.loadPlaylist({
            listType: 'search',
            list: query,
            index: 0,
            suggestedQuality: 'small',
          });
        }
        return true;
      } catch (err) {
        console.warn('YouTube loadPlaylist error:', err);
      }
    }

    // 3. Fallback: If preview audio is available on track
    if (track.audioUrl) {
      this.isUsingYouTube = false;
      try {
        this.audio.src = track.audioUrl;
        await this.audio.play();
        return true;
      } catch (e) {
        console.warn('Fallback preview audio failed:', e);
      }
    }

    return false;
  }

  public async preloadNextTrack(_track: Track) {
    // Gapless preloading stub
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
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(Math.round(clamped * 100));
    }
    this.audio.volume = clamped;
  }

  public isPlaying(): boolean {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      return this.ytPlayer.getPlayerState() === 1; // 1 = playing
    }
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 2;
  }

  public isBuffering(): boolean {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      return this.ytPlayer.getPlayerState() === 3; // 3 = buffering
    }
    return !this.audio.paused && this.audio.readyState < 3;
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
