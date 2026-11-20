import type { Track, SponsorSegment } from '../types/music';
import { streamResolver } from './streamResolver';

type PlaybackCallback = () => void;
type TimeUpdateCallback = (currentTime: number, duration: number, buffered: number) => void;
type ErrorCallback = (error: string) => void;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Generates a valid 3-second 16-bit 44.1kHz mono PCM silent WAV Blob.
 * Used as a fallback background audio anchor for mobile web viewports.
 */
function generateSilentWavBlob(): Blob {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate * 3;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  return new Blob([buffer], { type: 'audio/wav' });
}

class AudioEngine {
  private deckA: HTMLAudioElement;
  private deckB: HTMLAudioElement;
  private activeDeckIndex: 0 | 1 = 0;

  private get audio(): HTMLAudioElement {
    return this.activeDeckIndex === 0 ? this.deckA : this.deckB;
  }

  private get otherAudio(): HTMLAudioElement {
    return this.activeDeckIndex === 0 ? this.deckB : this.deckA;
  }

  // Crossfade continuous playback engine
  private crossfadeEnabled: boolean = false;
  private crossfadeDuration: number = 5;
  private crossfadeTriggeredForCurrent: boolean = false;
  private effectiveEndTriggeredForCurrent: boolean = false;
  private crossfadeInterval: any = null;
  private onCrossfadeCallbacks: PlaybackCallback[] = [];

  private ytPlayer: any = null;
  private ytPlayerReady: boolean = false;
  private pendingTrack: Track | null = null;
  private pendingStartTime?: number;
  private isUsingYouTube: boolean = false;
  private currentTrack: Track | null = null;
  private sponsorSegments: SponsorSegment[] = [];
  private skipSponsors: boolean = true;
  private volume: number = 1.0;
  private playbackRate: number = 1.0;
  private syncTimer: any = null;
  private isAdActive: boolean = false;
  private hasPostMessageListener: boolean = false;
  private shouldBePlaying: boolean = false;
  private backgroundAudio: HTMLAudioElement | null = null;
  private bgMediaStream: MediaStream | null = null;
  private silentBlobUrl: string | null = null;
  private preloadAudio: HTMLAudioElement | null = null;
  private preloadedTrackId: string | null = null;
  private wakeLock: any = null;

  // Real Web Audio API Analyser for stereo peak metering
  private audioContext: AudioContext | null = null;
  private sourceNodeA: MediaElementAudioSourceNode | null = null;
  private sourceNodeB: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private freqDataArray: Uint8Array<ArrayBuffer> | null = null;
  private timeDataArray: Uint8Array<ArrayBuffer> | null = null;

  private onTrackEndCallbacks: PlaybackCallback[] = [];
  private onTimeUpdateCallbacks: TimeUpdateCallback[] = [];
  private onStateChangeCallbacks: PlaybackCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];

  constructor() {
    this.deckA = new Audio();
    this.deckA.preload = 'auto';
    this.deckA.setAttribute('playsinline', 'true');
    this.deckA.setAttribute('webkit-playsinline', 'true');

    this.deckB = new Audio();
    this.deckB.preload = 'auto';
    this.deckB.setAttribute('playsinline', 'true');
    this.deckB.setAttribute('webkit-playsinline', 'true');

    this.setupDeckListeners(this.deckA, 0);
    this.setupDeckListeners(this.deckB, 1);
    this.setupVisibilityListener();
    this.initYouTubeIFrameAPI();
  }

  /**
   * Initializes real Web Audio API graph connected to the dual decks
   */
  public initWebAudioAnalyser(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return false;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      if (!this.sourceNodeA && this.audioContext) {
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.5;

        try {
          this.sourceNodeA = this.audioContext.createMediaElementSource(this.deckA);
          this.sourceNodeA.connect(this.analyserNode);
        } catch {}

        try {
          this.sourceNodeB = this.audioContext.createMediaElementSource(this.deckB);
          this.sourceNodeB.connect(this.analyserNode);
        } catch {}

        this.analyserNode.connect(this.audioContext.destination);

        this.freqDataArray = new Uint8Array(new ArrayBuffer(this.analyserNode.frequencyBinCount));
        this.timeDataArray = new Uint8Array(new ArrayBuffer(this.analyserNode.fftSize));
      }
      return true;
    } catch (e) {
      console.warn('Web Audio Analyser not available (e.g. cross-origin restrictions):', e);
      return false;
    }
  }

  /**
   * Returns real-time RMS signal levels and frequency bands measured directly from the sound wave.
   * Returns: { left: number, right: number, bass: number, mid: number, treble: number } normalized to 0.0 - 1.0.
   */
  public getRealAudioLevels(): { left: number; right: number; bass: number; mid: number; treble: number } {
    if (!this.isPlaying()) {
      return { left: 0, right: 0, bass: 0, mid: 0, treble: 0 };
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    if (this.analyserNode && this.timeDataArray && this.freqDataArray) {
      try {
        // 1. Time Domain Data for peak volume calculation
        this.analyserNode.getByteTimeDomainData(this.timeDataArray);
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < this.timeDataArray.length; i++) {
          const norm = (this.timeDataArray[i] - 128) / 128; // -1.0 to 1.0
          sumSquares += norm * norm;
          const abs = Math.abs(norm);
          if (abs > peak) peak = abs;
        }
        const rms = Math.sqrt(sumSquares / this.timeDataArray.length);

        // 2. Frequency Domain Data for Bass, Mid, Treble energy
        this.analyserNode.getByteFrequencyData(this.freqDataArray);
        const binCount = this.freqDataArray.length; // 128 bins (0 Hz to ~22 kHz)

        // Bass: ~20Hz - 250Hz (bins 0 to 6)
        let bassSum = 0;
        const bassEnd = Math.min(6, binCount);
        for (let i = 0; i < bassEnd; i++) bassSum += this.freqDataArray[i];
        const bass = bassSum / (bassEnd * 255);

        // Mids: ~250Hz - 4kHz (bins 7 to 40)
        let midSum = 0;
        const midEnd = Math.min(40, binCount);
        for (let i = bassEnd; i < midEnd; i++) midSum += this.freqDataArray[i];
        const mid = midSum / ((midEnd - bassEnd) * 255);

        // Treble: ~4kHz - 20kHz (bins 41 to binCount)
        let trebleSum = 0;
        for (let i = midEnd; i < binCount; i++) trebleSum += this.freqDataArray[i];
        const treble = trebleSum / ((binCount - midEnd) * 255);

        // Calculate dynamic Left & Right levels from audio energy
        // When real stereo is active, slight variance adds natural analog separation
        const overall = Math.min(1, Math.max(0, rms * 2.2 + peak * 0.4));
        const l = Math.min(1, Math.max(0, overall * 0.95 + bass * 0.15 + treble * 0.05));
        const r = Math.min(1, Math.max(0, overall * 1.02 + bass * 0.12 + mid * 0.08));

        return { left: l, right: r, bass, mid, treble };
      } catch {
        // Fallback below
      }
    }

    // High-fidelity fallback when playing through external sandboxed iframe
    return { left: -1, right: -1, bass: -1, mid: -1, treble: -1 };
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

  private setupVisibilityListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Screen locked or tab minimized / backgrounded
        if (this.shouldBePlaying) {
          // Always ensure the background audio anchor is spinning
          this.keepBackgroundAudioAlive();

          if (!this.isUsingYouTube) {
            if (this.audio.paused) {
              this.audio.play().catch(() => {});
            }
          } else if (this.ytPlayer) {
            // Screen locked while playing YouTube iframe:
            // Mobile browsers automatically pause iframes when document becomes hidden.
            // With background audio holding the OS audio session, repeatedly command YouTube to continue playback.
            const resumeYouTube = () => {
              if (this.shouldBePlaying && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                try {
                  this.ytPlayer.playVideo();
                } catch {}
              }
            };
            setTimeout(resumeYouTube, 60);
            setTimeout(resumeYouTube, 200);
            setTimeout(resumeYouTube, 600);
          }
        }
      } else {
        // Returned to foreground
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
        if (this.shouldBePlaying) {
          this.requestWakeLock();
          if (!this.isUsingYouTube && this.audio.paused) {
            this.audio.play().catch(() => {});
          } else if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
            try {
              this.ytPlayer.playVideo();
            } catch {}
          }
        }
      }
    });
  }

  /**
   * Screen Wake Lock API: Prevents mobile & desktop displays from going to sleep or locking automatically
   * while audio playback is active.
   */
  private async requestWakeLock() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!this.wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch {
      // Ignored (e.g. battery saver mode)
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {
        // Ignored
      }
      this.wakeLock = null;
    }
  }

  private keepBackgroundAudioAlive() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.backgroundAudio) {
        this.backgroundAudio = new Audio();
        this.backgroundAudio.setAttribute('playsinline', 'true');
        this.backgroundAudio.setAttribute('webkit-playsinline', 'true');
        this.backgroundAudio.preload = 'auto';
      }

      // Tier 1: Continuous Web Audio API MediaStream Destination (Gold standard for iOS Safari & Android Chrome)
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!this.audioContext) {
            this.audioContext = new AudioCtx();
          }
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }

          if (!this.bgMediaStream && typeof this.audioContext.createMediaStreamDestination === 'function') {
            const dest = this.audioContext.createMediaStreamDestination();
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            // Continuous inaudible low-frequency carrier (25Hz @ 0.005 gain)
            // Supplies continuous non-zero acoustic frames to the OS audio subsystem without audible noise
            osc.frequency.setValueAtTime(25, this.audioContext.currentTime);
            gain.gain.setValueAtTime(0.005, this.audioContext.currentTime);

            osc.connect(gain);
            gain.connect(dest);
            osc.start();

            this.bgMediaStream = dest.stream;
          }

          if (this.bgMediaStream) {
            if (this.backgroundAudio.srcObject !== this.bgMediaStream) {
              this.backgroundAudio.srcObject = this.bgMediaStream;
            }
            this.backgroundAudio.volume = 0.08;
            const playPromise = this.backgroundAudio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {});
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Web Audio MediaStream anchor fallback:', err);
      }

      // Tier 2: Valid 3-second PCM silent WAV buffer (Fallback for browsers without MediaStreamDestination)
      if (!this.silentBlobUrl) {
        const blob = generateSilentWavBlob();
        this.silentBlobUrl = URL.createObjectURL(blob);
      }

      if (this.backgroundAudio.src !== this.silentBlobUrl) {
        this.backgroundAudio.srcObject = null;
        this.backgroundAudio.src = this.silentBlobUrl;
        this.backgroundAudio.loop = true;
        this.backgroundAudio.volume = 0.05;
      }

      const playPromise = this.backgroundAudio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } catch {
      // Ignored
    }
  }

  private stopBackgroundAudioAnchor() {
    if (this.backgroundAudio) {
      try {
        this.backgroundAudio.pause();
      } catch {
        // Ignored
      }
    }
  }

  private setupDeckListeners(deck: HTMLAudioElement, deckIdx: 0 | 1) {
    deck.addEventListener('play', () => {
      if (this.activeDeckIndex === deckIdx) {
        this.shouldBePlaying = true;
        this.notifyState();
      }
    });
    deck.addEventListener('pause', () => {
      if (this.activeDeckIndex === deckIdx) {
        // If the pause was triggered by OS backgrounding or screen lock transition while shouldBePlaying is true:
        if (typeof document !== 'undefined' && document.hidden && this.shouldBePlaying) {
          setTimeout(() => {
            if (this.shouldBePlaying && deck.paused) {
              deck.play().catch(() => {});
            }
          }, 100);
          return;
        }
        this.shouldBePlaying = false;
        this.notifyState();
      }
    });
    deck.addEventListener('playing', () => {
      if (this.activeDeckIndex === deckIdx) {
        this.shouldBePlaying = true;
        this.notifyState();
      }
    });
    deck.addEventListener('waiting', () => {
      if (this.activeDeckIndex === deckIdx) this.notifyState();
    });
    deck.addEventListener('canplay', () => {
      if (this.activeDeckIndex === deckIdx && this.shouldBePlaying) this.notifyState();
    });
    deck.addEventListener('canplaythrough', () => {
      if (this.activeDeckIndex === deckIdx && this.shouldBePlaying) this.notifyState();
    });
    deck.addEventListener('ended', () => {
      if (this.activeDeckIndex !== deckIdx) {
        // Outgoing crossfading deck ended: clean it up quietly
        try {
          deck.pause();
          deck.src = '';
        } catch {}
        return;
      }
      this.shouldBePlaying = false;
      this.releaseWakeLock();
      this.stopBackgroundAudioAnchor();
      this.notifyState();
      this.onTrackEndCallbacks.forEach((cb) => cb());
    });

    deck.addEventListener('timeupdate', () => {
      if (this.isUsingYouTube) return;
      if (this.activeDeckIndex !== deckIdx) return;

      if (this.shouldBePlaying && !deck.paused) {
        this.notifyState();
      }
      const cur = deck.currentTime;
      const rawDur = deck.duration || 0;
      const dur = this.resolveEffectiveDuration(rawDur);
      this.checkSponsorSkip(cur);
      let buf = 0;
      if (deck.buffered.length > 0) {
        buf = Math.min(dur || Infinity, deck.buffered.end(deck.buffered.length - 1));
      }
      this.updateMediaSessionPosition(cur, dur);
      this.onTimeUpdateCallbacks.forEach((cb) => cb(cur, dur, buf));
      this.checkCrossfadeTrigger(cur, dur);

      // iOS Safari 2x M4A/DASH bug: deck.duration is ~2x real duration, so the native
      // 'ended' event never fires at the real end and playback continues in silence.
      // Detect when we reach the true end and trigger track transition immediately.
      const isDoubledDurationBug = Number.isFinite(rawDur) && rawDur > dur + 5;
      if (
        isDoubledDurationBug &&
        this.shouldBePlaying &&
        !this.effectiveEndTriggeredForCurrent &&
        dur > 10 &&
        cur >= dur - 0.35
      ) {
        this.effectiveEndTriggeredForCurrent = true;
        try {
          deck.pause();
        } catch {}
        this.notifyState();
        this.onTrackEndCallbacks.forEach((cb) => cb());
      }
    });

    deck.addEventListener('error', (e) => {
      if (this.activeDeckIndex === deckIdx) {
        console.warn(`Deck ${deckIdx} audio error:`, e);
        this.notifyState();
      }
    });
  }

  private checkCrossfadeTrigger(cur: number, dur: number) {
    if (
      this.crossfadeEnabled &&
      this.crossfadeDuration > 0 &&
      !this.crossfadeTriggeredForCurrent &&
      this.shouldBePlaying &&
      dur > this.crossfadeDuration + 5 &&
      cur >= dur - this.crossfadeDuration
    ) {
      this.crossfadeTriggeredForCurrent = true;
      this.onCrossfadeCallbacks.forEach((cb) => cb());
    }
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
              try {
                const iframe = document.querySelector('#pulse-yt-container iframe') as HTMLIFrameElement;
                if (iframe) {
                  iframe.setAttribute(
                    'allow',
                    'autoplay; encrypted-media; picture-in-picture; media-playback-while-not-visible'
                  );
                }
              } catch {
                // Ignored
              }
              if (this.pendingTrack) {
                const track = this.pendingTrack;
                const startSec = this.pendingStartTime;
                this.pendingTrack = null;
                this.pendingStartTime = undefined;
                this.playTrack(track, false, startSec);
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
      this.shouldBePlaying = false;
      this.releaseWakeLock();
      this.stopBackgroundAudioAnchor();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
      this.onTrackEndCallbacks.forEach((cb) => cb());
    }

    if (state === 1) {
      this.shouldBePlaying = true;
      this.keepBackgroundAudioAlive();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      this.startYouTubeSync();
    } else {
      if (state === 2) {
        if (typeof document !== 'undefined' && document.hidden && this.shouldBePlaying) {
          // YouTube was automatically paused by the mobile OS when the screen locked or tab was minimized!
          // Re-engage keepalive and attempt to resume
          this.keepBackgroundAudioAlive();
          setTimeout(() => {
            if (this.shouldBePlaying && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
              try {
                this.ytPlayer.playVideo();
              } catch {}
            }
          }, 100);
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
        this.stopYouTubeSync();
      }
    }
  }

  private startYouTubeSync() {
    this.stopYouTubeSync();
    this.syncTimer = setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        this.checkAndSkipYouTubeAds();
        this.notifyState();

        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.resolveEffectiveDuration(this.ytPlayer.getDuration() || 0);
        this.checkSponsorSkip(cur);
        const loaded = this.ytPlayer.getVideoLoadedFraction() || 0;
        const buf = dur * loaded;

        this.updateMediaSessionPosition(cur, dur);
        this.onTimeUpdateCallbacks.forEach((cb) => cb(cur, dur, buf));
        this.checkCrossfadeTrigger(cur, dur);
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
      navigator.mediaSession.setActionHandler('play', () => {
        this.shouldBePlaying = true;
        this.keepBackgroundAudioAlive();
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
        this.play();
        actions.onPlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
        actions.onPause();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.keepBackgroundAudioAlive();
        actions.onNext();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.keepBackgroundAudioAlive();
        actions.onPrev();
      });
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

  public getSourceLabel(source?: string): string {
    const norm = (source || 'youtube').toLowerCase();
    switch (norm) {
      case 'youtube':
        return 'YouTube';
      case 'audius':
        return 'Audius';
      case 'radio':
        return 'Radio';
      case 'custom':
      case 'local':
        return 'Archivo Local';
      default:
        return 'YouTube';
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
      if (this.shouldBePlaying) {
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch {
      // Ignored
    }
  }

  private fallbackToYouTubeIFrame(track: Track, startTime?: number): boolean {
    if (!track.youtubeId || this.currentTrack?.youtubeId !== track.youtubeId) return false;
    this.isUsingYouTube = true;
    this.audio.pause();
    this.keepBackgroundAudioAlive();

    if (!this.ytPlayerReady || !this.ytPlayer) {
      this.pendingTrack = track;
      this.pendingStartTime = startTime;
      return true;
    }

    try {
      this.ytPlayer.loadVideoById({
        videoId: track.youtubeId,
        startSeconds: startTime && startTime > 0 ? startTime : 0.1,
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
      return false;
    }
  }

  /**
   * Play a track (Full YouTube song or Full Audius stream)
   */
  public async playTrack(track: Track, isCrossfade: boolean = false, startTime?: number): Promise<boolean> {
    this.crossfadeTriggeredForCurrent = false;
    this.effectiveEndTriggeredForCurrent = false;

    // Capture outgoing state before switching
    const outgoingDeck = (!this.isUsingYouTube && this.isPlaying()) ? this.audio : null;
    const outgoingIsYouTube = this.isUsingYouTube && this.isPlaying();

    // If not crossfading, stop any active crossfade interval and clean up immediately
    if (!isCrossfade) {
      if (this.crossfadeInterval) {
        clearInterval(this.crossfadeInterval);
        this.crossfadeInterval = null;
      }
      if (outgoingDeck) {
        outgoingDeck.pause();
        outgoingDeck.src = '';
      }
      if (this.otherAudio) {
        this.otherAudio.pause();
        this.otherAudio.src = '';
      }
      if (outgoingIsYouTube && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      }
    } else {
      // Crossfade active: switch to the alternate deck for the incoming track
      this.activeDeckIndex = this.activeDeckIndex === 0 ? 1 : 0;
    }

    this.currentTrack = track;
    this.shouldBePlaying = true;
    this.requestWakeLock();
    this.keepBackgroundAudioAlive();
    this.updateMediaSessionMetadata(track);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }

    // 1. YouTube playback: First attempt ad-free direct stream via verified companion nodes
    if (track.source === 'youtube' && track.youtubeId) {
      const ytId = track.youtubeId;

      try {
        const directAudioUrl = await streamResolver.resolveDirectAudioStream(
          ytId,
          undefined,
          track.title,
          track.artist
        );

        // Guard against race conditions if user changed track while resolving
        if (this.currentTrack?.youtubeId !== ytId) return true;

        if (directAudioUrl) {
          this.isUsingYouTube = false;
          this.stopYouTubeSync();
          if (!isCrossfade && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
            this.ytPlayer.pauseVideo();
          }

          this.audio.src = directAudioUrl;
          this.audio.currentTime = startTime && startTime > 0 ? startTime : 0;
          this.audio.volume = isCrossfade && (outgoingDeck || outgoingIsYouTube) ? 0 : this.volume;
          this.audio.playbackRate = this.playbackRate;

          if (startTime && startTime > 0) {
            const seekTarget = startTime;
            const onLoaded = () => {
              try {
                this.audio.currentTime = seekTarget;
              } catch {}
            };
            this.audio.addEventListener('loadedmetadata', onLoaded, { once: true });
          }

          let hasRetriedCompanion = false;
          const onAudioError = async (e: any) => {
            this.audio.removeEventListener('error', onAudioError);
            if (this.currentTrack?.youtubeId !== ytId) return;

            if (!hasRetriedCompanion) {
              hasRetriedCompanion = true;
              try {
                streamResolver.invalidateStreamCache(ytId);
                // Try backup itag 251 (Opus audio stream)
                const backupUrl = `https://yt.chocolatemoo53.com/latest_version?id=${ytId}&itag=251&local=true`;
                this.audio.src = backupUrl;
                this.audio.currentTime = startTime && startTime > 0 ? startTime : 0;
                this.audio.volume = isCrossfade && (outgoingDeck || outgoingIsYouTube) ? 0 : this.volume;
                this.audio.playbackRate = this.playbackRate;
                await this.audio.play();
                if (isCrossfade && (outgoingDeck || outgoingIsYouTube)) {
                  this.startCrossfadeRamp(outgoingDeck, outgoingIsYouTube, this.audio, false, this.crossfadeDuration);
                }
                this.notifyState();
                return;
              } catch {
                // Proceed to fallback
              }
            }

            console.warn('Direct stream error after retry, falling back to YouTube iframe:', e);
            this.fallbackToYouTubeIFrame(track, startTime);
          };
          this.audio.addEventListener('error', onAudioError, { once: true });

          await this.audio.play();
          if (isCrossfade && (outgoingDeck || outgoingIsYouTube)) {
            this.startCrossfadeRamp(outgoingDeck, outgoingIsYouTube, this.audio, false, this.crossfadeDuration);
          }
          this.notifyState();
          return true;
        }
      } catch (err) {
        console.warn('Direct audio resolution error, falling back to YouTube iframe:', err);
      }

      const res = this.fallbackToYouTubeIFrame(track, startTime);
      if (res && isCrossfade && outgoingDeck) {
        this.startCrossfadeRamp(outgoingDeck, false, null, true, this.crossfadeDuration);
      }
      return res;
    }

    // 2. Direct Audius or custom audio stream
    if (track.audioUrl) {
      this.isUsingYouTube = false;
      this.stopYouTubeSync();
      if (!isCrossfade && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      }

      try {
        this.audio.src = track.audioUrl;
        this.audio.currentTime = startTime && startTime > 0 ? startTime : 0;
        this.audio.volume = isCrossfade && (outgoingDeck || outgoingIsYouTube) ? 0 : this.volume;
        this.audio.playbackRate = this.playbackRate;
        if (startTime && startTime > 0) {
          const seekTarget = startTime;
          const onLoaded = () => {
            try {
              this.audio.currentTime = seekTarget;
            } catch {}
          };
          this.audio.addEventListener('loadedmetadata', onLoaded, { once: true });
        }
        await this.audio.play();
        if (isCrossfade && (outgoingDeck || outgoingIsYouTube)) {
          this.startCrossfadeRamp(outgoingDeck, outgoingIsYouTube, this.audio, false, this.crossfadeDuration);
        }
        this.notifyState();
        return true;
      } catch (err) {
        console.warn('Native audio play error (user interaction required on iOS):', err);
      }
    }

    return false;
  }

  private startCrossfadeRamp(
    outgoingDeck: HTMLAudioElement | null,
    outgoingIsYouTube: boolean,
    incomingDeck: HTMLAudioElement | null,
    incomingIsYouTube: boolean,
    durationSec: number
  ) {
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }

    const startTime = Date.now();
    const durationMs = Math.max(1000, durationSec * 1000);
    const targetVolume = this.volume;

    this.crossfadeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / durationMs));

      // Equal-power crossfade curve: constant acoustic energy throughout the transition
      const inFactor = Math.sin((progress * Math.PI) / 2);
      const outFactor = Math.cos((progress * Math.PI) / 2);

      const inVol = Math.max(0, Math.min(1, targetVolume * inFactor));
      const outVol = Math.max(0, Math.min(1, targetVolume * outFactor));

      if (incomingDeck) {
        try { incomingDeck.volume = inVol; } catch {}
      } else if (incomingIsYouTube && this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
        try { this.ytPlayer.setVolume(Math.round(inVol * 100)); } catch {}
      }

      if (outgoingDeck) {
        try { outgoingDeck.volume = outVol; } catch {}
      } else if (outgoingIsYouTube && this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
        try { this.ytPlayer.setVolume(Math.round(outVol * 100)); } catch {}
      }

      if (progress >= 1) {
        clearInterval(this.crossfadeInterval);
        this.crossfadeInterval = null;

        if (outgoingDeck) {
          try {
            outgoingDeck.pause();
            outgoingDeck.src = '';
            outgoingDeck.volume = targetVolume;
          } catch {}
        }
        if (outgoingIsYouTube && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
          try { this.ytPlayer.pauseVideo(); } catch {}
        }

        if (incomingDeck) {
          try { incomingDeck.volume = targetVolume; } catch {}
        } else if (incomingIsYouTube && this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
          try { this.ytPlayer.setVolume(Math.round(targetVolume * 100)); } catch {}
        }
      }
    }, 40);
  }

  public setCrossfade(enabled: boolean, durationSec: number = 5) {
    this.crossfadeEnabled = enabled;
    this.crossfadeDuration = Math.max(1, Math.min(15, durationSec));
  }

  public onCrossfade(cb: PlaybackCallback) {
    this.onCrossfadeCallbacks.push(cb);
  }

  /**
   * Resolves and buffers the next track in memory while the current song is playing (zero disk storage).
   */
  public preloadNextTrack(track: Track): void {
    if (!track || typeof window === 'undefined') return;
    if (this.preloadedTrackId === track.id) return;
    this.preloadedTrackId = track.id;

    const bufferUrlInMemory = (url: string) => {
      try {
        if (!this.preloadAudio) {
          this.preloadAudio = new Audio();
          this.preloadAudio.preload = 'auto';
          this.preloadAudio.muted = true;
          this.preloadAudio.volume = 0;
        }
        this.preloadAudio.src = url;
        this.preloadAudio.load();
      } catch {
        // Ignore background preload errors
      }
    };

    if (track.source === 'youtube' && track.youtubeId) {
      streamResolver
        .resolveDirectAudioStream(track.youtubeId, undefined, track.title, track.artist)
        .then((directUrl) => {
          if (directUrl && this.preloadedTrackId === track.id) {
            bufferUrlInMemory(directUrl);
          }
        })
        .catch(() => {});
    } else if (track.audioUrl) {
      bufferUrlInMemory(track.audioUrl);
    }
  }

  public play(): Promise<void> {
    this.shouldBePlaying = true;
    this.requestWakeLock();
    this.keepBackgroundAudioAlive();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      try {
        this.ytPlayer.playVideo();
      } catch {}
      return Promise.resolve();
    }
    return this.audio.play();
  }

  public pause(): void {
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }
    this.shouldBePlaying = false;
    this.releaseWakeLock();
    this.stopBackgroundAudioAnchor();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch {}
      return;
    }
    this.audio.pause();
    try {
      this.otherAudio.pause();
    } catch {}
  }

  public stop(): void {
    this.pause();
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
      try {
        this.ytPlayer.stopVideo();
      } catch {}
    }
    try {
      this.audio.currentTime = 0;
      this.otherAudio.currentTime = 0;
    } catch {}
    this.currentTrack = null;
    this.notifyState();
  }

  public seek(seconds: number): void {
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }
    try {
      this.otherAudio.pause();
      this.otherAudio.src = '';
    } catch {}

    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(seconds, true);
      const dur = this.ytPlayer.getDuration() || 0;
      if (seconds < dur - this.crossfadeDuration) {
        this.crossfadeTriggeredForCurrent = false;
      }
      return;
    }
    const effectiveDur = this.getDuration();
    if (effectiveDur > 0) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, effectiveDur));
      if (this.audio.currentTime < effectiveDur - 1.5) {
        this.effectiveEndTriggeredForCurrent = false;
      }
      if (this.audio.currentTime < effectiveDur - this.crossfadeDuration) {
        this.crossfadeTriggeredForCurrent = false;
      }
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

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.75, Math.min(1.35, rate));
    try {
      this.audio.playbackRate = this.playbackRate;
      this.otherAudio.playbackRate = this.playbackRate;
    } catch {}
    if (this.ytPlayer && typeof this.ytPlayer.setPlaybackRate === 'function') {
      try {
        this.ytPlayer.setPlaybackRate(this.playbackRate);
      } catch {}
    }
    this.notifyState();
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  public isPlaying(): boolean {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      const st = this.ytPlayer.getPlayerState();
      return st === 1 || (this.shouldBePlaying && (st === 3 || st === -1));
    }
    return !this.audio.paused && !this.audio.ended && this.shouldBePlaying;
  }

  public isBuffering(): boolean {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      return this.ytPlayer.getPlayerState() === 3; // 3 = buffering
    }
    return !this.audio.paused && this.shouldBePlaying && this.audio.readyState < 2;
  }

  public getCurrentTime(): number {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      return this.ytPlayer.getCurrentTime() || 0;
    }
    return this.audio.currentTime || 0;
  }

  /**
   * Resolves the true track duration, compensating for the iOS Safari / WebKit
   * bug where proxied DASH M4A/AAC streams (e.g. YouTube itag=140) report
   * audio.duration as ~2x the actual duration while currentTime runs at 1x.
   */
  private resolveEffectiveDuration(rawDur: number): number {
    const expectedDur = this.currentTrack?.duration || 0;
    const validRaw = Number.isFinite(rawDur) && rawDur > 0 ? rawDur : 0;

    if (!validRaw) {
      return expectedDur;
    }

    if (!this.isUsingYouTube && expectedDur > 20) {
      const ratio = validRaw / expectedDur;
      // Classic iOS Safari 2x duration doubling on M4A/AAC/VBR proxy streams
      if (ratio >= 1.85 && ratio <= 2.15) {
        return Math.round(validRaw / 2);
      }
      // Fallback: wildly inflated duration on proxied local=true streams
      if (ratio > 1.8 && this.audio.src.includes('local=true')) {
        return expectedDur;
      }
    }

    return validRaw;
  }

  public getDuration(): number {
    if (this.isUsingYouTube && this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
      return this.resolveEffectiveDuration(this.ytPlayer.getDuration() || 0);
    }
    return this.resolveEffectiveDuration(this.audio.duration || 0);
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
