import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { Play, Pause, Disc3, Maximize2 } from 'lucide-react';
import { MarqueeTitle } from './MarqueeTitle';

interface RetroTapeDeckProps {
  variant?: 'sidebar' | 'ambient-lateral' | 'fullscreen' | 'compact';
  onExpand?: () => void;
  className?: string;
}

export const RetroTapeDeck: React.FC<RetroTapeDeckProps> = ({
  variant = 'sidebar',
  onExpand,
  className = '',
}) => {
  const { currentTrack, isPlaying, togglePlay, currentTime, volume } = usePlayer();
  const { currentTheme } = useTheme();
  const isSteel = currentTheme.id === 'retro-rock-80s';
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Synchronize video playback strictly with audio isPlaying state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Explicitly enforce muted and inline attributes for iOS Safari / Mobile WebKit
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented or interrupted, ignore safely
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying]);

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
   * Proportions and font sizes are tuned to prevent any vertical cut-off.
   */
  const renderHandwrittenTapeLabel = (size: 'sm' | 'md' | 'lg') => {
    const titleText = writtenTitle || (currentTrack ? '' : 'MIXTAPE');
    const artistText = writtenArtist || (currentTrack ? '' : 'MIXTAPE');

    return (
      <div
        className="absolute pointer-events-none flex flex-col justify-center items-center text-center overflow-hidden z-20"
        style={{
          top: '7.5%',
          left: '12%',
          width: '76%',
          height: '24%',
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
                      ? '9.5px'
                      : size === 'lg'
                      ? 'clamp(11.5px, 3.2vw, 15.5px)'
                      : '11.5px',
                  lineHeight: 1.15,
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
                      ? '9.5px'
                      : size === 'lg'
                      ? 'clamp(11.5px, 3.2vw, 15.5px)'
                      : '11.5px',
                  lineHeight: 1.15,
                  textShadow: '0 0 0.5px rgba(21, 59, 110, 0.7), 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.15)',
                  mixBlendMode: 'multiply',
                }}
              />
            )}
          </div>

          {/* Artist / Group Name in handwritten Red Ballpoint Pen right underneath */}
          {(writtenArtist || !currentTrack) && (
            <div className="w-full max-w-full overflow-hidden flex justify-center mt-0.2">
              {isTyping ? (
                <p
                  className="font-marker font-bold truncate max-w-full px-1"
                  style={{
                    color: '#b91c1c', // Authentic Bic / Pilot Red Pen Ink
                    fontSize:
                      size === 'sm'
                        ? '7.5px'
                        : size === 'lg'
                        ? 'clamp(8.5px, 2.3vw, 11px)'
                        : '9px',
                    lineHeight: 1.15,
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
                        ? 'clamp(8.5px, 2.3vw, 11px)'
                        : '9px',
                    lineHeight: 1.15,
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

  /* -------------------------------------------------------------
     VARIANT A: SIDEBAR CASSETTE DECK (Pinned in Left Sidebar)
     ------------------------------------------------------------- */
  if (variant === 'sidebar') {
    return (
      <div
        className={`retro-tape-chassis rounded-2xl p-2.5 relative select-none transition-all duration-200 group ${className}`}
      >
        {/* 4 Corner Screws */}
        <div className="absolute top-1.5 left-1.5 retro-screw" />
        <div className="absolute top-1.5 right-1.5 retro-screw" />
        <div className="absolute bottom-1.5 left-1.5 retro-screw" />
        <div className="absolute bottom-1.5 right-1.5 retro-screw" />

        {/* Deck Header: Brand & Counter */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Disc3
              className={`w-3.5 h-3.5 text-amber-500 ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '3s' }}
            />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-zinc-300">
              MIXTAPE DECK
            </span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
              CrO2
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

        {/* Cassette Acrylic Window with Video and Handwritten Label */}
        <div className="retro-tape-window rounded-xl aspect-[16/9] w-full relative overflow-hidden group/video shadow-inner">
          <video
            ref={videoRef}
            src="./assets/cassette.mp4"
            poster="./assets/cassette-poster.webp"
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover brightness-95 contrast-105"
          />

          {/* Handwritten Ink on Blank Tape Label */}
          {renderHandwrittenTapeLabel('sm')}

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
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-xs font-bold tracking-widest text-zinc-300 font-mono-retro">
                HI-FI CASSETTE
              </span>
            </div>
            <div className="retro-counter-display px-2 py-0.5 rounded font-mono-retro text-xs font-bold text-amber-400">
              {counterStr}
            </div>
          </div>

          {/* Spinning Cassette View with Handwritten Label */}
          <div className="retro-tape-window rounded-2xl aspect-[16/9] w-full relative overflow-hidden">
            <video
              ref={videoRef}
              src="./assets/cassette.mp4"
              poster="./assets/cassette-poster.webp"
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
            {renderHandwrittenTapeLabel('md')}
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
      } rounded-2xl sm:rounded-3xl p-2 sm:p-4 md:p-5 relative select-none w-full max-w-xl mx-auto ${className}`}
    >
      {/* 4 Corner Screws */}
      <div
        className={`absolute top-2 left-2 sm:top-2.5 sm:left-2.5 ${
          isSteel ? 'retro-screw-steel' : 'retro-screw'
        } scale-75 sm:scale-100`}
      />
      <div
        className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 ${
          isSteel ? 'retro-screw-steel' : 'retro-screw'
        } scale-75 sm:scale-100`}
      />
      <div
        className={`absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 ${
          isSteel ? 'retro-screw-steel' : 'retro-screw'
        } scale-75 sm:scale-100`}
      />
      <div
        className={`absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 ${
          isSteel ? 'retro-screw-steel' : 'retro-screw'
        } scale-75 sm:scale-100`}
      />

      {/* Hi-Fi Header with Silkscreen Markings */}
      <div
        className={`flex items-center justify-between px-1.5 sm:px-3 pt-0.5 sm:pt-1 pb-1 sm:pb-2 ${
          isSteel ? 'border-b border-slate-400/40' : 'border-b border-white/10'
        } mb-1.5 sm:mb-2.5`}
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
            MIXTAPE DECK
            <span
              className={`text-[8px] sm:text-[9.5px] px-1 sm:px-1.5 py-0.2 rounded font-mono-retro font-bold border ${
                isSteel
                  ? 'bg-amber-500/20 text-amber-900 border-amber-600/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              SOLID STATE
            </span>
          </h3>
          <p
            className={`text-[8px] sm:text-[9.5px] font-mono-retro ${
              isSteel ? 'text-slate-600' : 'text-zinc-400'
            }`}
          >
            3-HEAD • DUAL CAPSTAN • TYPE II CrO2
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

      {/* Cassette Bay with Rotating Video & Handwritten Label */}
      <div
        className={`retro-tape-window rounded-xl aspect-[16/9] max-h-[140px] sm:max-h-[190px] md:max-h-[220px] w-full relative overflow-hidden shadow-2xl border-2 sm:border-3 mx-auto ${
          isSteel ? 'border-slate-700/80' : 'border-zinc-800'
        }`}
      >
        <video
          ref={videoRef}
          src="./assets/cassette.mp4"
          poster="./assets/cassette-poster.webp"
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />

        {/* Handwritten Ink on the physical blank label of the cassette */}
        {renderHandwrittenTapeLabel('lg')}

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
