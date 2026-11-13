import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Disc3, Maximize2 } from 'lucide-react';

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
  const { currentTrack, isPlaying, togglePlay, currentTime } = usePlayer();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Simulated VU Meter bouncing levels
  const [vuLeft, setVuLeft] = useState<number>(0);
  const [vuRight, setVuRight] = useState<number>(0);

  // Synchronize video playback strictly with audio isPlaying state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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

  // Animate vintage VU Meter bars during playback
  useEffect(() => {
    if (!isPlaying) {
      setVuLeft(0);
      setVuRight(0);
      return;
    }

    const interval = setInterval(() => {
      // Create organic, bouncy stereo levels characteristic of 80s tape decks
      const base = 4 + Math.random() * 4; // 4 to 8
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
          // Colors: 0-5 Green (-20dB to -3dB), 6-7 Amber (0dB), 8-9 Red (+1 to +3dB)
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
              PULSE DECK
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

        {/* Cassette Acrylic Window with Video */}
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

          {/* Spinning Cassette View */}
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
      className={`retro-tape-chassis rounded-3xl p-4 md:p-6 shadow-2xl relative select-none w-full max-w-2xl mx-auto ${className}`}
    >
      {/* 4 Corner Screws */}
      <div className="absolute top-3 left-3 retro-screw scale-125" />
      <div className="absolute top-3 right-3 retro-screw scale-125" />
      <div className="absolute bottom-3 left-3 retro-screw scale-125" />
      <div className="absolute bottom-3 right-3 retro-screw scale-125" />

      {/* Hi-Fi Header with Silkscreen Markings */}
      <div className="flex items-center justify-between px-3 pt-2 pb-3 border-b border-white/10 mb-4">
        <div>
          <h3 className="text-base font-extrabold tracking-widest uppercase text-white flex items-center gap-2">
            PULSE STEREO CASSETTE DECK
            <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold border border-amber-500/30">
              MODEL 1984
            </span>
          </h3>
          <p className="text-[10px] text-zinc-400 font-mono">
            3-HEAD SYSTEM • CLOSED LOOP DUAL CAPSTAN • TYPE II HIGH POSITION
          </p>
        </div>

        {/* Big Mechanical Tape Counter */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-mono-retro font-bold text-zinc-400">TAPE COUNTER</span>
          <div className="retro-counter-display px-2.5 py-1 rounded-md flex items-center gap-1 font-mono-retro text-base font-bold text-amber-400 tracking-wider">
            {counterStr.split('').map((digit, idx) => (
              <span
                key={idx}
                className="bg-black/90 px-1.5 py-0.5 rounded text-center min-w-[14px] border border-white/5"
              >
                {digit}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Massive Cassette Bay with Rotating Video */}
      <div className="retro-tape-window rounded-2xl aspect-[16/9] w-full relative overflow-hidden shadow-2xl border-4 border-zinc-800">
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

        {/* Realistic Acrylic Sheen Overlay */}
        <div className="retro-glass-glare" />

        {/* Vintage Tape Label Handwritten Overlay */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3/4 max-w-sm pointer-events-none">
          <div className="bg-[#f0e6d2] text-[#1d3d6b] px-4 py-1.5 rounded-sm shadow-md border border-[#c4b595] transform -rotate-0.5">
            <p className="font-marker text-xs md:text-sm truncate text-center tracking-wide font-bold">
              {currentTrack ? currentTrack.title : 'Pulse Music Player'}
            </p>
            <p className="text-[9px] font-mono text-zinc-600 text-center truncate">
              {currentTrack ? currentTrack.artist : 'Mixtape 1984'}
            </p>
          </div>
        </div>

        {/* Click to Play/Pause on the Window */}
        <div
          onClick={togglePlay}
          className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group/overlay"
        >
          {!isPlaying && (
            <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
              <Play className="w-7 h-7 text-amber-400 fill-amber-400 ml-1" />
            </div>
          )}
        </div>
      </div>

      {/* Lower Deck Controls & VU Meters Bar */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-4 px-2">
        {/* Stereo Analog VU Meters with dB Markings */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono-retro font-bold text-zinc-400 w-3">CH-L</span>
            {renderMeterBar(vuLeft)}
            <span className="text-[9px] font-mono text-zinc-500">-20 0 +3 dB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono-retro font-bold text-zinc-400 w-3">CH-R</span>
            {renderMeterBar(vuRight)}
            <span className="text-[9px] font-mono text-zinc-500">-20 0 +3 dB</span>
          </div>
        </div>

        {/* 80s Rock Tape Specs */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-700'
              }`}
            />
            <span className="font-bold text-white">{isPlaying ? 'MOTOR ON' : 'STOP'}</span>
          </div>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">DOLBY B NR ACTIVE</span>
          <span className="hidden sm:inline">|</span>
          <span className="text-amber-400 font-bold">PULSE HI-FI</span>
        </div>
      </div>
    </div>
  );
};
