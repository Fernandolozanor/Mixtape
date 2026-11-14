import React, { useEffect, useRef, useState, useId } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { Play, Pause, Disc3, Maximize2 } from 'lucide-react';
import { MarqueeTitle } from './MarqueeTitle';

interface RetroTapeDeckProps {
  variant?: 'sidebar' | 'ambient-lateral' | 'fullscreen' | 'compact';
  onExpand?: () => void;
  className?: string;
  forceMedia?: 'cassette' | 'vinyl';
}

export const RetroTapeDeck: React.FC<RetroTapeDeckProps> = ({
  variant = 'sidebar',
  onExpand,
  className = '',
  forceMedia,
}) => {
  const { currentTrack, isPlaying, togglePlay, currentTime, volume } = usePlayer();
  const { isLiked } = useLibrary();
  const { currentTheme } = useTheme();
  const isSteel = currentTheme.id === 'retro-rock-80s';
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback mode: forceMedia prop overrides, or automatic: DISCO.mp4 for Favorites, cassette.mp4 for normal tracks
  const isFavorite = forceMedia
    ? forceMedia === 'vinyl'
    : currentTrack
    ? isLiked(currentTrack.id)
    : false;
  const videoSrc = isFavorite ? './assets/disco.mp4' : './assets/cassette.mp4';
  const videoPoster = isFavorite ? './assets/disco.png' : './assets/cassette-poster.webp';

  // Moving analog VU needles for Left and Right channels (direct DOM refs for 60fps physics)
  const needleLeftRef = useRef<HTMLDivElement>(null);
  const needleRightRef = useRef<HTMLDivElement>(null);

  // Simulated VU Meter bouncing levels
  const [vuLeft, setVuLeft] = useState<number>(0);
  const [vuRight, setVuRight] = useState<number>(0);

  // Dynamic Handwriting state (simulates pen writing on the blank cassette label)
  const [writtenTitle, setWrittenTitle] = useState<string>('');
  const [writtenArtist, setWrittenArtist] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Synchronize video playback strictly with audio isPlaying state & mobile screen lock / backgrounding
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Explicitly enforce muted and inline attributes for iOS Safari / Mobile WebKit
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');

    const handleVisibility = () => {
      if (document.hidden) {
        // Crucial for mobile background audio: pause decorative video so iOS/Android doesn't terminate background audio!
        video.pause();
      } else if (isPlaying) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    if (isPlaying && !document.hidden) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented or interrupted, ignore safely
        });
      }
    } else {
      video.pause();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isPlaying, videoSrc]);

  // Handwriting simulation on the cassette tape label
  useEffect(() => {
    if (!currentTrack) {
      setWrittenTitle('MIXTAPE');
      setWrittenArtist('SIDE A • 1984');
      setIsTyping(false);
      return;
    }

    const title = currentTrack.title.trim();
    const artist = currentTrack.artist.trim();

    setWrittenTitle('');
    setWrittenArtist('');
    setIsTyping(true);

    let tIndex = 0;
    const titleTimer = setInterval(() => {
      tIndex++;
      setWrittenTitle(title.slice(0, tIndex));
      if (tIndex >= title.length) {
        clearInterval(titleTimer);

        // After title is written, write artist with pen
        let aIndex = 0;
        const artistTimer = setInterval(() => {
          aIndex++;
          setWrittenArtist(artist.slice(0, aIndex));
          if (aIndex >= artist.length) {
            clearInterval(artistTimer);
            setIsTyping(false);
          }
        }, 32);
      }
    }, 38);

    return () => {
      clearInterval(titleTimer);
    };
  }, [currentTrack?.id]);

  // Ultra-realistic Ballistic Analog VU Needle Physics Engine (ANSI C16.5-1954 standard)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    // Needle positions and angular velocities (degrees & deg/s)
    let angleL = -34;
    let angleR = -34;
    let velL = 0;
    let velR = 0;

    const MIN_ANGLE = -34; // Rest stop pin (-20dB)
    const MAX_ANGLE = 34;  // Peak saturation stop pin (+3dB)

    const updatePhysics = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // Cap delta time at 50ms
      lastTime = now;

      let targetL = MIN_ANGLE;
      let targetR = MIN_ANGLE;

      if (isPlaying && volume > 0) {
        const t = now / 1000;

        // 1. Bass / Kick drum pulse (approx 125 BPM = 2.08 Hz)
        const kickPhase = (t * 2.08) % 1;
        const kick = Math.pow(Math.max(0, 1 - kickPhase * 2.8), 2.2) * 29;

        // 2. Snare / backbeat hit on alternating beats
        const snarePhase = ((t * 2.08 + 0.5) % 1);
        const snare = Math.pow(Math.max(0, 1 - snarePhase * 3.2), 2.5) * 23;

        // 3. Fast high-frequency hi-hat & guitar flutter
        const flutter = (Math.sin(t * 19.3) * 0.5 + 0.5) * (Math.cos(t * 8.7) * 0.5 + 0.5) * 15;

        // 4. Musical dynamic swell (measures of verse/chorus)
        const swell = (Math.sin(t * 0.45) * 0.5 + 0.5) * 12 + 6;

        // 5. Stereo panning differences
        const panDiff = Math.sin(t * 1.9) * 6;

        // Combine components scaled by volume
        const volScale = Math.min(1, Math.max(0.25, volume));
        const rawTargetL = MIN_ANGLE + (kick + snare * 0.75 + flutter + swell + panDiff) * volScale * 1.15;
        const rawTargetR = MIN_ANGLE + (kick * 0.95 + snare + flutter * 1.1 + swell - panDiff) * volScale * 1.15;

        targetL = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, rawTargetL));
        targetR = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, rawTargetR));
      }

      // Ballistic spring-damper physics with authentic mechanical inertia & overshoot
      const isRisingL = targetL > angleL;
      const kSpringL = isRisingL ? 360 : 190;
      const dampingL = isRisingL ? 25 : 19;
      const forceL = (targetL - angleL) * kSpringL - velL * dampingL;
      velL += forceL * dt;
      angleL += velL * dt;

      if (angleL < MIN_ANGLE) {
        angleL = MIN_ANGLE;
        velL = 0;
      } else if (angleL > MAX_ANGLE) {
        angleL = MAX_ANGLE;
        velL = -velL * 0.35; // Authentic mechanical pin bounce
      }

      const isRisingR = targetR > angleR;
      const kSpringR = isRisingR ? 360 : 190;
      const dampingR = isRisingR ? 25 : 19;
      const forceR = (targetR - angleR) * kSpringR - velR * dampingR;
      velR += forceR * dt;
      angleR += velR * dt;

      if (angleR < MIN_ANGLE) {
        angleR = MIN_ANGLE;
        velR = 0;
      } else if (angleR > MAX_ANGLE) {
        angleR = MAX_ANGLE;
        velR = -velR * 0.35;
      }

      // Direct DOM update: ultra-smooth 60fps/120fps with zero React re-render!
      if (needleLeftRef.current) {
        needleLeftRef.current.style.transform = `translateX(-50%) rotate(${angleL.toFixed(2)}deg)`;
      }
      if (needleRightRef.current) {
        needleRightRef.current.style.transform = `translateX(-50%) rotate(${angleR.toFixed(2)}deg)`;
      }

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, volume]);

  // Periodic update for LED Segment Meters (Sidebar / Lateral variants)
  useEffect(() => {
    if (!isPlaying) {
      setVuLeft(0);
      setVuRight(0);
      return;
    }

    const interval = setInterval(() => {
      const base = 4 + Math.random() * 4;
      const l = Math.min(10, Math.max(1, Math.round(base + (Math.random() * 2 - 1))));
      const r = Math.min(10, Math.max(1, Math.round(base + (Math.random() * 2 - 1))));
      setVuLeft(l);
      setVuRight(r);
    }, 110);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Format 4-digit mechanical tape counter
  const counterStr = Math.floor(currentTime).toString().padStart(4, '0');

  // VU Meter segment renderer
  const renderMeterBar = (level: number) => {
    const totalSegments = 10;
    return (
      <div className="flex items-center gap-[1.5px] h-2">
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isActive = i < level;
          let activeColor = '#22c55e'; // Green
          let glowColor = 'rgba(34, 197, 94, 0.6)';
          if (i >= 6 && i <= 7) {
            activeColor = '#f59e0b'; // Amber
            glowColor = 'rgba(245, 158, 11, 0.6)';
          } else if (i >= 8) {
            activeColor = '#ef4444'; // Red
            glowColor = 'rgba(239, 68, 68, 0.8)';
          }

          return (
            <div
              key={i}
              className="w-1.5 h-full rounded-[1px] transition-all duration-75"
              style={{
                backgroundColor: isActive ? activeColor : 'rgba(255, 255, 255, 0.08)',
                boxShadow: isActive ? `0 0 4px ${glowColor}` : 'none',
              }}
            />
          );
        })}
      </div>
    );
  };

  /**
   * Warm Analog Backlit Incandescent Needle VU Meter (Sony SQD-2020 / TA-1150 style)
   * Direct DOM ref driven with physical ballistic spring inertia.
   */
  const renderNeedleMeter = (channel: 'left' | 'right', label: string) => {
    return (
      <div className="flex flex-col items-center">
        <div className="w-16 sm:w-24 h-8 sm:h-11 retro-vu-meter-incandescent rounded-md p-0.5 sm:p-1 relative flex flex-col justify-between overflow-hidden shadow-inner border border-zinc-900 select-none">
          {/* Subtle Glass glare highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-black/20 pointer-events-none z-20" />

          {/* Scale curved arc & markings */}
          <div className="relative z-10 flex justify-between items-center text-[7px] sm:text-[8.5px] font-mono-retro font-black px-0.5 sm:px-1 text-amber-950">
            <span>-20</span>
            <span>-7</span>
            <span>0</span>
            <span className="text-rose-700 font-extrabold">+3dB</span>
          </div>

          {/* Moving Physical Needle */}
          <div
            ref={channel === 'left' ? needleLeftRef : needleRightRef}
            className="absolute bottom-[-1px] left-1/2 w-[1.5px] sm:w-[2px] h-6 sm:h-9 bg-zinc-950 origin-bottom z-10 will-change-transform"
            style={{
              transform: 'translateX(-50%) rotate(-34deg)',
              boxShadow: '0 0 1.5px rgba(0,0,0,0.9)',
            }}
          />

          {/* Pivot Black Round Cap */}
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-zinc-950 border border-amber-600/60 z-20 shadow-md" />

          {/* Channel Label */}
          <span className="absolute bottom-0.5 right-1 text-[7px] sm:text-[8.5px] font-mono-retro font-bold text-amber-950/80 z-10">
            {label}
          </span>
        </div>
      </div>
    );
  };

  /**
   * Renders the handwritten blue ballpoint pen ink directly onto the video's blank masking tape.
   * Proportions and font sizes are tuned to sit strictly within the cassette's paper label.
   */
  const renderHandwrittenTapeLabel = (size: 'sm' | 'md' | 'lg') => {
    const titleText = writtenTitle || (currentTrack ? '' : 'MIXTAPE');
    const artistText = writtenArtist || (currentTrack ? '' : 'MIXTAPE');

    return (
      <div
        className="absolute pointer-events-none flex flex-col justify-center items-center text-center overflow-hidden z-20"
        style={{
          top: '10.5%',
          left: '14%',
          width: '72%',
          height: '14%',
          transform: 'rotate(-0.25deg)',
        }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center px-1 overflow-hidden">
          {/* Track Title in Bic Blue Ballpoint Pen with Auto-Scroll if long */}
          <div className="w-full max-w-full overflow-hidden flex justify-center">
            {isTyping ? (
              <p
                className="font-marker font-bold truncate max-w-full px-1"
                style={{
                  color: '#153b6e', // Authentic Bic Blue Ink
                  fontSize:
                    size === 'sm'
                      ? '9px'
                      : size === 'lg'
                      ? 'clamp(10px, 2.7vw, 13px)'
                      : '10px',
                  lineHeight: 1.1,
                  textShadow: '0 0 0.5px rgba(21, 59, 110, 0.7), 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.15)',
                  mixBlendMode: 'multiply',
                }}
              >
                {titleText}
                <span className="inline-block w-1 h-2.5 bg-[#153b6e] ml-0.5 animate-pulse rounded-sm" />
              </p>
            ) : (
              <MarqueeTitle
                text={titleText}
                centered={true}
                className="font-marker font-bold px-1"
                style={{
                  color: '#153b6e',
                  fontSize:
                    size === 'sm'
                      ? '9px'
                      : size === 'lg'
                      ? 'clamp(10px, 2.7vw, 13px)'
                      : '10px',
                  lineHeight: 1.1,
                  textShadow: '0 0 0.5px rgba(21, 59, 110, 0.7), 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.15)',
                  mixBlendMode: 'multiply',
                }}
              />
            )}
          </div>

          {/* Artist / Group Name in handwritten Red Ballpoint Pen right underneath */}
          {(writtenArtist || !currentTrack) && (
            <div className="w-full max-w-full overflow-hidden flex justify-center mt-0.5">
              {isTyping ? (
                <p
                  className="font-marker font-bold truncate max-w-full px-1"
                  style={{
                    color: '#b91c1c', // Authentic Bic / Pilot Red Pen Ink
                    fontSize:
                      size === 'sm'
                        ? '7.5px'
                        : size === 'lg'
                        ? 'clamp(7.5px, 2.1vw, 10px)'
                        : '8px',
                    lineHeight: 1.05,
                    textShadow: '0 0 0.5px rgba(185, 28, 28, 0.7), 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.15)',
                    mixBlendMode: 'multiply',
                  }}
                >
                  {artistText}
                  <span className="inline-block w-0.5 h-2 bg-[#b91c1c] ml-0.5 animate-pulse rounded-sm" />
                </p>
              ) : (
                <MarqueeTitle
                  text={artistText}
                  centered={true}
                  className="font-marker font-bold px-1"
                  style={{
                    color: '#b91c1c', // Authentic Bic / Pilot Red Pen Ink
                    fontSize:
                      size === 'sm'
                        ? '7.5px'
                        : size === 'lg'
                        ? 'clamp(7.5px, 2.1vw, 10px)'
                        : '8px',
                    lineHeight: 1.05,
                    textShadow: '0 0 0.5px rgba(185, 28, 28, 0.7), 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.15)',
                    mixBlendMode: 'multiply',
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Authentic Spinning Vinyl Center Label with Circular Text:
   * Curves the complete song title circularly along the upper arc of the label,
   * fitting even long song titles without clipping, rotating at exact 33⅓ RPM.
   */
  const labelUniqueId = useId().replace(/:/g, '');

  const renderSpinningVinylLabel = (size: 'sm' | 'md' | 'lg') => {
    const titleText = (writtenTitle || currentTrack?.title || 'VINILO MASTER').trim().toUpperCase();
    const artistText = (writtenArtist || currentTrack?.artist || 'COLECCIÓN EXCLUSIVA').trim().toUpperCase();

    const titleArcId = `titleArc-${labelUniqueId}-${size}`;
    const artistArcId = `artistArc-${labelUniqueId}-${size}`;

    // Dynamic font sizing proportional to string length so complete title fits comfortably
    const titleLen = titleText.length;
    const titleFontSize =
      titleLen <= 16
        ? 12
        : titleLen <= 26
        ? 10.5
        : titleLen <= 38
        ? 9
        : titleLen <= 52
        ? 7.8
        : 6.8;

    const artistLen = artistText.length;
    const artistFontSize =
      artistLen <= 14
        ? 10
        : artistLen <= 24
        ? 8.5
        : artistLen <= 36
        ? 7.2
        : 6.2;

    return (
      <div
        className="absolute pointer-events-none select-none z-20"
        style={{
          left: '45.37%',
          top: '51.22%',
          transform: 'translate(-50%, -50%)',
          width: '20.63%',
          aspectRatio: '1 / 1',
        }}
      >
        {/* Rotating Circular Vinyl Label: Exact 33⅓ RPM speed (1.8s per revolution) */}
        <div
          className="w-full h-full rounded-full relative overflow-hidden will-change-transform"
          style={{
            animation: 'vinyl-spin 1.8s linear infinite',
            animationPlayState: isPlaying ? 'running' : 'paused',
            transformOrigin: 'center center',
          }}
        >
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full"
            style={{
              mixBlendMode: 'multiply',
              filter: 'drop-shadow(0 0 0.5px rgba(0,0,0,0.4))',
            }}
          >
            <defs>
              {/* Upper Circular Arc for Title (spans 260 deg clockwise, centered at top apex) */}
              <path
                id={titleArcId}
                d="M 47.9,143.7 A 68,68 0 1,1 152.1,143.7"
                fill="none"
              />
              {/* Lower Circular Arc for Artist (spans 100 deg, centered at bottom apex) */}
              <path
                id={artistArcId}
                d="M 47.9,143.7 A 68,68 0 0,0 152.1,143.7"
                fill="none"
              />
            </defs>

            {/* Concentric authentic record label grooves */}
            <circle
              cx="100"
              cy="100"
              r="96"
              fill="none"
              stroke="#52525b"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
            <circle
              cx="100"
              cy="100"
              r="92"
              fill="none"
              stroke="#71717a"
              strokeWidth="0.8"
              strokeOpacity="0.3"
            />
            <circle
              cx="100"
              cy="100"
              r="34"
              fill="none"
              stroke="#a1a1aa"
              strokeWidth="0.8"
              strokeOpacity="0.35"
            />

            {/* Circular Song Title curved along the upper arc */}
            <text
              fontFamily="Georgia, 'Times New Roman', serif"
              fontSize={titleFontSize}
              fontWeight="bold"
              fill="#09090b"
              letterSpacing={titleLen > 40 ? '0.4' : '0.8'}
            >
              <textPath href={`#${titleArcId}`} startOffset="50%" textAnchor="middle">
                {titleText}
              </textPath>
            </text>

            {/* Technical Silkscreen Markings above & below spindle */}
            <text
              x="100"
              y="85"
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="6.5"
              fontWeight="bold"
              fill="#52525b"
              letterSpacing="1.5"
            >
              STEREO
            </text>

            {/* Spindle hole grommet in the exact center */}
            <circle
              cx="100"
              cy="100"
              r="8.5"
              fill="#09090b"
              stroke="#d97706"
              strokeWidth="2.2"
            />
            <circle cx="100" cy="100" r="3.5" fill="#000000" />

            <text
              x="100"
              y="118"
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="5.8"
              fontWeight="bold"
              fill="#71717a"
              letterSpacing="1"
            >
              33⅓ RPM • LP
            </text>

            {/* Circular Artist Name curved along the lower arc */}
            <text
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize={artistFontSize}
              fontWeight="bold"
              fill="#991b1b"
              letterSpacing="0.8"
            >
              <textPath href={`#${artistArcId}`} startOffset="50%" textAnchor="middle">
                {artistText}
              </textPath>
            </text>
          </svg>
        </div>
      </div>
    );
  };

  /**
   * Adaptive Media Overlay:
   * When playing a Favorite track, renders the Vinyl record 33⅓ RPM spinning center label.
   * When playing standard tracks, renders the handwritten cassette tape label.
   */
  const renderMediaOverlay = (size: 'sm' | 'md' | 'lg') => {
    if (isFavorite) {
      return renderSpinningVinylLabel(size);
    }
    return renderHandwrittenTapeLabel(size);
  };

  /* -------------------------------------------------------------
     VARIANT A: SIDEBAR CASSETTE DECK (Pinned in Left Sidebar)
     ------------------------------------------------------------- */
  if (variant === 'sidebar') {
    return (
      <div
        className={`retro-tape-chassis rounded-2xl p-2.5 relative select-none transition-all duration-200 group ${className}`}
      >
        {/* Deck Header: Brand & Counter */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Disc3
              className={`w-3.5 h-3.5 ${isFavorite ? 'text-rose-400' : 'text-amber-500'} ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '3s' }}
            />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-zinc-300">
              {isFavorite ? 'VINILO DECK' : 'MIXTAPE DECK'}
            </span>
            <span
              className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${
                isFavorite ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isFavorite ? 'FAV' : 'CrO2'}
            </span>
          </div>

          {/* Mechanical Tape Counter */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold tracking-tighter text-zinc-500">TAPE</span>
            <div className="retro-counter-display px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono-retro text-[11px] font-bold text-amber-400 tracking-wider">
              {counterStr.split('').map((digit, idx) => (
                <span
                  key={idx}
                  className="bg-zinc-900/90 px-0.5 rounded text-center min-w-[9px] border-b border-black/80"
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Cassette / Vinyl Window with Video and Adaptive Label */}
        <div className="retro-tape-window rounded-xl aspect-[16/9] w-full relative overflow-hidden group/video shadow-inner">
          <video
            key={videoSrc}
            ref={videoRef}
            src={videoSrc}
            poster={videoPoster}
            loop
            muted
            playsInline
            autoPlay={isPlaying}
            preload="auto"
            onLoadedData={(e) => {
              if (isPlaying) {
                (e.target as HTMLVideoElement).play().catch(() => {});
              }
            }}
            onCanPlay={(e) => {
              if (isPlaying) {
                (e.target as HTMLVideoElement).play().catch(() => {});
              }
            }}
            className="w-full h-full object-cover brightness-95 contrast-105"
          />

          {/* Adaptive Label (Vinyl plaque or Handwritten ink) */}
          {renderMediaOverlay('sm')}

          {/* Realistic Acrylic Glass Reflection */}
          <div className="retro-glass-glare" />

          {/* Hover Play/Pause Quick Control Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/video:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition transform active:scale-90 shadow-lg border border-white/20"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-amber-400 fill-amber-400" />
              ) : (
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              )}
            </button>

            {onExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand();
                }}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition transform active:scale-90 shadow-lg border border-white/20"
                title="Ampliar cinta en pantalla completa"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          {/* Live Status LED Badge in Corner */}
          <div className="absolute top-1.5 left-2 flex items-center gap-1.5 pointer-events-none">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPlaying ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'
              }`}
            />
            <span className="text-[9px] font-bold tracking-wider text-white/90 drop-shadow font-mono-retro">
              {isPlaying ? 'PLAY' : 'PAUSE'}
            </span>
          </div>
        </div>

        {/* Vintage Stereo VU-Meters & Tape Head Metadata */}
        <div className="mt-2 px-1 pt-1 border-t border-white/5 flex items-center justify-between text-[10px]">
          {/* Stereo VU Levels */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono-retro font-bold text-zinc-500 w-2.5">L</span>
              {renderMeterBar(vuLeft)}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono-retro font-bold text-zinc-500 w-2.5">R</span>
              {renderMeterBar(vuRight)}
            </div>
          </div>

          {/* Dolby NR & Tape Type Silkscreen Label */}
          <div className="text-right">
            <p className="text-[8px] font-bold text-zinc-400 tracking-wider">DOLBY B-C NR</p>
            <p className="text-[9px] font-mono text-amber-400/90 font-semibold truncate max-w-[90px]">
              {currentTrack ? currentTrack.title : 'NO TAPE'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     VARIANT B: AMBIENT LATERAL (Subtle Background on Right Lateral)
     ------------------------------------------------------------- */
  if (variant === 'ambient-lateral') {
    return (
      <div
        className={`pointer-events-none select-none transition-all duration-700 ${className}`}
      >
        <div className="retro-tape-chassis rounded-3xl p-3 shadow-2xl border border-white/10 bg-black/60 backdrop-blur-xl max-w-sm">
          {/* Deck Header */}
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isFavorite ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                }`}
              />
              <span className="text-xs font-bold tracking-widest text-zinc-300 font-mono-retro">
                {isFavorite ? 'VINILO HI-FI' : 'HI-FI CASSETTE'}
              </span>
            </div>
            <div className="retro-counter-display px-2 py-0.5 rounded font-mono-retro text-xs font-bold text-amber-400">
              {counterStr}
            </div>
          </div>

          {/* Spinning Cassette / Vinyl View with Adaptive Label */}
          <div className="retro-tape-window rounded-2xl aspect-[16/9] w-full relative overflow-hidden">
            <video
              key={videoSrc}
              ref={videoRef}
              src={videoSrc}
              poster={videoPoster}
              loop
              muted
              playsInline
              autoPlay={isPlaying}
              preload="auto"
              onLoadedData={(e) => {
                if (isPlaying) {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }
              }}
              onCanPlay={(e) => {
                if (isPlaying) {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }
              }}
              className="w-full h-full object-cover"
            />
            {renderMediaOverlay('md')}
            <div className="retro-glass-glare" />
          </div>

          {/* VU Meters Bar */}
          <div className="mt-2.5 flex items-center justify-between px-2">
            <span className="text-[9px] font-mono text-zinc-400">ANALOG VU</span>
            <div className="flex items-center gap-2">
              {renderMeterBar(vuLeft)}
              {renderMeterBar(vuRight)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     VARIANT C: FULLSCREEN 80s ROCK TAPE DECK
     ------------------------------------------------------------- */
  return (
    <div
      className={`${
        isSteel
          ? 'retro-brushed-steel border-2 border-slate-300/80 shadow-[0_15px_40px_rgba(0,0,0,0.8)]'
          : 'retro-tape-chassis shadow-2xl'
      } rounded-2xl sm:rounded-3xl p-2 sm:p-3.5 md:p-4 relative select-none w-full max-w-lg sm:max-w-xl mx-auto ${className}`}
    >
      {/* Hi-Fi Header with Silkscreen Markings */}
      <div
        className={`flex items-center justify-between px-1 sm:px-2 pt-0 pb-1 sm:pb-1.5 ${
          isSteel ? 'border-b border-slate-400/40' : 'border-b border-white/10'
        } mb-1 sm:mb-2`}
      >
        <div>
          {isSteel && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-sans font-black text-[11px] sm:text-xs tracking-widest text-slate-800">
                SONY
              </span>
              <span className="text-[8.5px] sm:text-[9.5px] text-slate-600 font-mono-retro font-bold">
                TA-1150 SERIES
              </span>
            </div>
          )}
          <h3
            className={`font-rock text-sm sm:text-lg md:text-xl tracking-widest uppercase flex items-center gap-1.5 ${
              isSteel ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isFavorite ? 'TOCADISCOS VINILO HI-FI' : 'MIXTAPE DECK'}
            <span
              className={`text-[8px] sm:text-[9.5px] px-1 sm:px-1.5 py-0.2 rounded font-mono-retro font-bold border ${
                isFavorite
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : isSteel
                  ? 'bg-amber-500/20 text-amber-900 border-amber-600/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {isFavorite ? 'FAVORITOS • 33⅓ RPM' : 'SOLID STATE'}
            </span>
          </h3>
          <p
            className={`text-[8px] sm:text-[9.5px] font-mono-retro ${
              isSteel ? 'text-slate-600' : 'text-zinc-400'
            }`}
          >
            {isFavorite
              ? 'DIRECT DRIVE • SHURE M97xE • VINILO AUDIÓFILO'
              : '3-HEAD • DUAL CAPSTAN • TYPE II CrO2'}
          </p>
        </div>

        {/* Mechanical Tape Counter */}
        <div className="flex flex-col items-end">
          <span
            className={`text-[7.5px] sm:text-[9px] font-mono-retro font-bold ${
              isSteel ? 'text-slate-700' : 'text-zinc-400'
            }`}
          >
            COUNTER
          </span>
          <div
            className={`${
              isSteel ? 'bg-slate-900 border-slate-700' : 'retro-counter-display'
            } px-1 sm:px-2 py-0.5 rounded flex items-center gap-0.5 font-mono-retro text-xs sm:text-sm font-bold text-amber-400 tracking-wider shadow-inner`}
          >
            {counterStr.split('').map((digit, idx) => (
              <span
                key={idx}
                className="bg-black/90 px-0.5 sm:px-1 py-0.2 rounded text-center min-w-[8px] sm:min-w-[11px] border border-white/5"
              >
                {digit}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Cassette / Vinyl Bay with Rotating Video & Adaptive Label - Uncropped True 16:9 Aspect */}
      <div
        className={`retro-tape-window rounded-xl aspect-[16/9] w-full max-w-[325px] sm:max-w-[420px] relative overflow-hidden shadow-2xl border-2 sm:border-3 mx-auto ${
          isSteel ? 'border-slate-700/80' : 'border-zinc-800'
        }`}
      >
        <video
          key={videoSrc}
          ref={videoRef}
          src={videoSrc}
          poster={videoPoster}
          loop
          muted
          playsInline
          autoPlay={isPlaying}
          preload="auto"
          onLoadedData={(e) => {
            if (isPlaying) {
              (e.target as HTMLVideoElement).play().catch(() => {});
            }
          }}
          onCanPlay={(e) => {
            if (isPlaying) {
              (e.target as HTMLVideoElement).play().catch(() => {});
            }
          }}
          className="w-full h-full object-contain sm:object-cover"
        />

        {/* Media Overlay: Vinyl gold plaque or Handwritten tape label */}
        {renderMediaOverlay('lg')}

        {/* Realistic Acrylic Sheen Overlay */}
        <div className="retro-glass-glare" />

        {/* Click to Play/Pause on the Window */}
        <div
          onClick={togglePlay}
          className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group/overlay z-30"
        >
          {!isPlaying && (
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
              <Play className="w-5 h-5 sm:w-7 sm:h-7 text-amber-400 fill-amber-400 ml-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* Lower Deck Controls & VU Meters Bar */}
      <div
        className={`mt-1.5 sm:mt-2.5 pt-1.5 sm:pt-2 ${
          isSteel ? 'border-t border-slate-400/35' : 'border-t border-white/10'
        } flex items-center justify-between gap-1.5 px-0.5 sm:px-2`}
      >
        {/* Authentic Analog Backlit Incandescent VU Meters when in Steel mode, or LED meters */}
        {isSteel ? (
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {renderNeedleMeter('left', 'LEFT')}
            {renderNeedleMeter('right', 'RIGHT')}
          </div>
        ) : (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[8px] sm:text-[9px] font-mono-retro font-bold text-zinc-400 w-3">
                L
              </span>
              {renderMeterBar(vuLeft)}
              <span className="text-[7.5px] sm:text-[9px] font-mono-retro text-zinc-500">
                -20 +3dB
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[8px] sm:text-[9px] font-mono-retro font-bold text-zinc-400 w-3">
                R
              </span>
              {renderMeterBar(vuRight)}
              <span className="text-[7.5px] sm:text-[9px] font-mono-retro text-zinc-500">
                -20 +3dB
              </span>
            </div>
          </div>
        )}

        {/* 80s Rock Tape Specs */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 text-[8.5px] sm:text-[10px] font-mono-retro ${
            isSteel ? 'text-slate-700' : 'text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPlaying
                  ? isSteel
                    ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                    : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : isSteel
                  ? 'bg-slate-400'
                  : 'bg-zinc-700'
              }`}
            />
            <span
              className={`font-bold ${
                isSteel ? 'text-slate-900' : 'text-white'
              }`}
            >
              {isPlaying ? 'MOTOR ON' : 'STOP'}
            </span>
          </div>
          <span>|</span>
          <span
            className={`font-bold ${
              isSteel ? 'text-amber-800' : 'text-amber-400'
            }`}
          >
            MIXTAPE
          </span>
        </div>
      </div>
    </div>
  );
};
