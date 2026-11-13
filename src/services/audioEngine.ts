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
  private isAdActive: boolean = false;
  private hasPostMessageListener: boolean = false;

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

    if (!this.hasPostMessageListener && typeof window !== 'undefined') {
      this.hasPostMessageListener = true;
      window.addEventListener('message', (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.event === 'infoDelivery' && data.info) {
            const info = data.info;
            const isAd =
              info.adState === 1 ||
              info.isAdPlaying === true ||
              (typeof info.adDuration === 'number' && info.adDuration > 0 && info.adDuration < 60);

            if (isAd) {
              this.handleAdDetected(info);
            } else if (info.adState === 0 || info.isAdPlaying === false) {
              this.handleAdFinished();
            }
          }
        } catch {
          // Ignored
        }
      });
    }

    let ytContainer = document.getElementById('pulse-yt-container');
    if (!ytContainer) {
      ytContainer = document.createElement('div');
      ytContainer.id = 'pulse-yt-container';
      // YouTube requires positive viewport dimensions and visibility for audio playback
      ytContainer.style.position = 'fixed';
      ytContainer.style.bottom = '0';
      ytContainer.style.right = '0';
      ytContainer.style.width = '200px';
      ytContainer.style.height = '120px';
      ytContainer.style.opacity = '0.005';
      ytContainer.style.pointerEvents = 'auto';
      ytContainer.style.zIndex = '1';
      document.body.appendChild(ytContainer);
    }

    const initPlayer = () => {
      if (this.ytPlayer) return;
      try {
        const originUrl =
          typeof window !== 'undefined' && window.location && window.location.origin
            ? window.location.origin
            : 'http://localhost:3030';

        this.ytPlayer = new window.YT.Player('pulse-yt-container', {
          height: '120',
          width: '200',
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            playsinline: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            autoplay: 1,
            enablejsapi: 1,
            origin: originUrl,
            widget_referrer: originUrl,
            iv_load_policy: 3,
            modestbranding: 1,
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
              this.notifyState();
              this.onErrorCallbacks.forEach((cb) =>
                cb('Este vídeo tiene restricciones de reproducción externa en móviles.')
              );
            },
          },
        });
      } catch (e) {
        console.warn('Failed to initialize YT.Player:', e);
      }
    };

    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      initPlayer();
    } else if (typeof window !== 'undefined') {
      const prevHandler = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevHandler === 'function') prevHandler();
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

  /**
   * Instantly silences and fast-forwards ads when detected via postMessage or player inspect
   */
  private handleAdDetected(info?: any) {
    if (!this.ytPlayer) return;
    this.isAdActive = true;
    try {
      // 1. Instantly mute so ad audio never reaches the user's ears
      this.ytPlayer.mute();

      // 2. Accelerate ad to maximum rate (2.0x)
      if (typeof this.ytPlayer.setPlaybackRate === 'function') {
        this.ytPlayer.setPlaybackRate(2.0);
      }

      // 3. Programmatic skip if supported by player version
      if (typeof (this.ytPlayer as any).skipAd === 'function') {
        (this.ytPlayer as any).skipAd();
      }

      // 4. Seek past the ad
      if (info && typeof info.adDuration === 'number' && info.adDuration > 0) {
        if (typeof this.ytPlayer.seekTo === 'function') {
          this.ytPlayer.seekTo(info.adDuration + 2, true);
        }
      }
    } catch {
      // Ignored
    }
  }

  private handleAdFinished() {
    if (!this.ytPlayer || !this.isAdActive) return;
    this.isAdActive = false;
    try {
      this.ytPlayer.unMute();
      this.ytPlayer.setVolume(Math.round(this.volume * 100));
      if (typeof this.ytPlayer.setPlaybackRate === 'function') {
        this.ytPlayer.setPlaybackRate(1.0);
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Automatically detects and skips/mutes YouTube pre-roll & mid-roll advertisements
   */
  private checkAndSkipYouTubeAds() {
    if (!this.ytPlayer || !this.isUsingYouTube || !this.currentTrack) return;

    try {
      const adState =
        typeof (this.ytPlayer as any).getAdState === 'function'
          ? (this.ytPlayer as any).getAdState()
          : 0;
      const isAdPlaying =
        typeof (this.ytPlayer as any).isAdPlaying === 'function'
          ? (this.ytPlayer as any).isAdPlaying()
          : false;

      const videoData =
        typeof this.ytPlayer.getVideoData === 'function' ? this.ytPlayer.getVideoData() : null;
      const curDur =
        typeof this.ytPlayer.getDuration === 'function' ? this.ytPlayer.getDuration() : 0;
      const curTime =
        typeof this.ytPlayer.getCurrentTime === 'function' ? this.ytPlayer.getCurrentTime() : 0;
      const expectedId = this.currentTrack.youtubeId;
      const expectedDur = this.currentTrack.duration || 0;

      // An ad is identified if:
      // a) adState is active (1) or isAdPlaying is true
      // b) The currently loaded video_id is different from the desired song ID
      // c) The video duration is an ad length (<= 45s) while our song is longer (> 80s)
      const isAd =
        adState === 1 ||
        isAdPlaying === true ||
        (videoData && videoData.video_id && expectedId && videoData.video_id !== expectedId) ||
        (expectedDur > 80 && curDur > 0 && curDur <= 45 && Math.abs(curDur - expectedDur) > 10);

      if (isAd) {
        this.handleAdDetected();
        if (typeof this.ytPlayer.seekTo === 'function' && curDur > 0 && curTime < curDur) {
          this.ytPlayer.seekTo(curDur + 1, true);
        }
      } else if (this.isAdActive) {
        this.handleAdFinished();
      }
    } catch {
      // Ignored
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
        this.checkAndSkipYouTubeAds();

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
      album: track.album || "Mixtape",
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
          startSeconds: 0.1,
          suggestedQuality: 'small',
        });
        this.ytPlayer.unMute();
        this.ytPlayer.setVolume(Math.round(this.volume * 100));
        const res = this.ytPlayer.playVideo();
        if (res && typeof res.catch === 'function') {
          res.catch((e: any) => console.warn('YouTube playVideo rejected on mobile:', e));
        }
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
      try {
        this.ytPlayer.setVolume(Math.round(this.volume * 100));
        if (this.volume === 0) {
          if (typeof this.ytPlayer.mute === 'function') this.ytPlayer.mute();
        } else {
          if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
        }
      } catch (e) {
        console.warn('ytPlayer setVolume error:', e);
      }
    }
    this.audio.volume = this.volume;
    this.audio.muted = this.volume === 0;
    this.notifyState();
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
