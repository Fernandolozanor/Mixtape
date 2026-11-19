import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Disc3,
  ZoomIn,
  X,
} from 'lucide-react';
import type { Track } from '../types/music';
import { playJukeboxMechanicalClick } from '../utils/jukeboxAudio';

interface JukeboxViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onRemoveTrack?: (trackId: string) => void;
  isEditingMode?: boolean;
  onNavigateToSearch?: () => void;
}

interface BubbleParticle {
  tubeIndex: number;
  prog: number; // 0 to 1
  baseSpeed: number;
  currentSpeed: number;
  size: number;
  wobbleSpeed: number;
  wobblePhase: number;
  wobbleAmp: number;
  glowColor: string;
  rimColor: string;
}

// 4 Tube geometry definitions (normalized coordinates 0 to 1)
const TUBES = [
  // 0: Left Outer (Warm Amber / Magenta / Rose)
  { startX: 0.040, rx: 0.460, ry: 0.310, isLeft: true, type: 'amber' as const },
  // 1: Left Inner (Neon Cyan / Aquamarine)
  { startX: 0.082, rx: 0.418, ry: 0.275, isLeft: true, type: 'cyan' as const },
  // 2: Right Inner (Neon Cyan / Blue)
  { startX: 0.918, rx: 0.418, ry: 0.275, isLeft: false, type: 'cyan' as const },
  // 3: Right Outer (Warm Amber / Gold / Rose)
  { startX: 0.960, rx: 0.460, ry: 0.310, isLeft: false, type: 'amber' as const },
];

export const JukeboxView: React.FC<JukeboxViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onRemoveTrack,
  isEditingMode = false,
  onNavigateToSearch,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<BubbleParticle[]>([]);

  const [currentPage, setCurrentPage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // Close zoomed title strip rack on Escape key
  useEffect(() => {
    if (!isZoomed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed]);

  const STRIPS_PER_PAGE = 12; // 3 columns x 4 rows
  const totalPages = Math.max(1, Math.ceil(tracks.length / STRIPS_PER_PAGE));

  // Ensure current page is in valid range when tracks change
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [tracks.length, totalPages, currentPage]);

  // If a track from favorites starts playing, automatically flip to its page
  useEffect(() => {
    if (!currentTrack) return;
    const trackIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    if (trackIndex !== -1) {
      const targetPage = Math.floor(trackIndex / STRIPS_PER_PAGE);
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  }, [currentTrack?.id]);

  // Compute the 12 items for the current page
  const pageStrips = useMemo(() => {
    const startIndex = currentPage * STRIPS_PER_PAGE;
    const slice = tracks.slice(startIndex, startIndex + STRIPS_PER_PAGE);
    const slots: Array<{ code: string; track: Track | null; index: number }> = [];

    // Base letter codes for pages (A..C, D..F, G..I, etc.)
    const pageLetterBase = currentPage * 3;
    const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

    for (let col = 0; col < 3; col++) {
      const letterIndex = (pageLetterBase + col) % LETTERS.length;
      const letter = LETTERS[letterIndex];

      for (let row = 0; row < 4; row++) {
        const slotNumber = row + 1;
        const code = `${letter}${slotNumber}`;
        const trackOffset = col * 4 + row;
        const track = slice[trackOffset] || null;
        slots.push({ code, track, index: startIndex + trackOffset });
      }
    }

    return slots;
  }, [tracks, currentPage]);

  // Handle title strip click
  const handleSelectTrack = (track: Track) => {
    playJukeboxMechanicalClick();
    onPlayTrack(track, tracks);
  };

  // Keypad press handler
  const handleKeyPress = (key: string) => {
    playJukeboxMechanicalClick();
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 200);

    // Number keys switch pages
    const num = parseInt(key, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setCurrentPage(num - 1);
    }
  };

  // Shuffle play all favorites
  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    playJukeboxMechanicalClick();
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    onPlayTrack(shuffled[0], shuffled);
  };

  // Play / Pause toggle
  const handlePlayToggle = () => {
    playJukeboxMechanicalClick();
    if (currentTrack) {
      onPlayTrack(currentTrack, tracks);
    } else if (tracks.length > 0) {
      onPlayTrack(tracks[0], tracks);
    }
  };

  // =========================================================================
  // BUBBLE PARTICLES SIMULATION (Neon Bubblers like Wurlitzer 1015 / JUKEBOX.jpg)
  // =========================================================================
  const initParticles = useCallback(() => {
    const particles: BubbleParticle[] = [];
    const count = 180; // Total bubbles across 4 columns & arch

    for (let i = 0; i < count; i++) {
      const tubeIndex = i % 4;
      const tube = TUBES[tubeIndex];

      const isAmber = tube.type === 'amber';
      const glowColor = isAmber
        ? 'rgba(255, 175, 70, 0.35)'
        : 'rgba(0, 245, 255, 0.35)';
      const rimColor = isAmber
        ? 'rgba(255, 230, 180, 0.85)'
        : 'rgba(210, 250, 255, 0.85)';

      particles.push({
        tubeIndex,
        prog: Math.random(), // Staggered starting height
        baseSpeed: 0.0016 + Math.random() * 0.0035, // Faster and slower bubbles
        currentSpeed: isPlaying ? 0.0025 : 0.0003,
        size: 2.8 + Math.random() * 8.5, // 3D bubble diameters
        wobbleSpeed: 1.2 + Math.random() * 2.5,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: 0.003 + Math.random() * 0.006,
        glowColor,
        rimColor,
      });
    }

    particlesRef.current = particles;
  }, [isPlaying]);

  useEffect(() => {
    initParticles();
  }, [initParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let running = true;
    let lastTime = performance.now();

    const render = (time: number) => {
      if (!running) return;
      const dt = Math.min(32, time - lastTime);
      lastTime = time;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Clear previous frame
      ctx.clearRect(0, 0, w, h);

      const targetSpeedFactor = isPlaying ? 1.0 : 0.08; // Stop or idle drift when paused

      for (const p of particlesRef.current) {
        // Smooth inertia transitions
        const targetSpeed = p.baseSpeed * targetSpeedFactor;
        p.currentSpeed += (targetSpeed - p.currentSpeed) * 0.05;
        p.prog += (p.currentSpeed * dt) / 16.6;

        // Wrap around when reaching the apex
        if (p.prog >= 1.0) {
          p.prog = 0;
          p.wobblePhase = Math.random() * Math.PI * 2;
        }

        const tube = TUBES[p.tubeIndex];
        let normX = 0;
        let normY = 0;

        // Calculate (x, y) along tube geometry
        if (p.prog <= 0.6) {
          // Vertical straight section (Y: 0.91 down to 0.35)
          const frac = p.prog / 0.6;
          normY = 0.91 - frac * (0.91 - 0.35);
          normX =
            tube.startX +
            Math.sin(time * 0.003 * p.wobbleSpeed + p.wobblePhase) * p.wobbleAmp;
        } else {
          // Curved arch section (progress 0.6 to 1.0)
          const archFrac = (p.prog - 0.6) / 0.4;
          const angle = tube.isLeft
            ? Math.PI - archFrac * (Math.PI / 2)
            : archFrac * (Math.PI / 2);

          normX =
            0.50 +
            tube.rx * Math.cos(angle) +
            Math.sin(time * 0.003 * p.wobbleSpeed + p.wobblePhase) * p.wobbleAmp;
          normY = 0.35 - tube.ry * Math.sin(angle);
        }

        const px = normX * w;
        const py = normY * h;
        const r = p.size * (w / 1200);

        // Opacity fades smoothly near bottom spawn and top apex
        let alpha = 1;
        if (p.prog < 0.05) alpha = p.prog / 0.05;
        else if (p.prog > 0.92) alpha = (1 - p.prog) / 0.08;

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, alpha);

        // 1. Translucent glowing sphere interior
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = p.glowColor;
        ctx.fill();

        // 2. Shiny glass edge ring
        ctx.strokeStyle = p.rimColor;
        ctx.lineWidth = Math.max(1, r * 0.15);
        ctx.stroke();

        // 3. Crisp white 3D specular reflection highlight at top-left
        ctx.beginPath();
        ctx.arc(px - r * 0.35, py - r * 0.35, Math.max(1, r * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Single Ultra-Compact Jukebox Controller Bar (Gains maximum vertical space) */}
      <div className="w-full max-w-lg flex items-center justify-between gap-1.5 px-3 py-1.5 mb-1 bg-black/75 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg font-mono text-xs select-none">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePlayToggle}
            className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer text-xs ${
              isPlaying
                ? 'bg-amber-400 text-black shadow-amber-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-black" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Sonar Jukebox</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShufflePlay}
            disabled={tracks.length === 0}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Reproducción aleatoria"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Aleatorio</span>
          </button>
        </div>

        {/* Integrated Compact Page Flipper */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => {
                playJukeboxMechanicalClick();
                setCurrentPage((p) => Math.max(0, p - 1));
              }}
              disabled={currentPage === 0}
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer active:scale-90"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold text-amber-400 font-mono tracking-wider">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => {
                playJukeboxMechanicalClick();
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
              }}
              disabled={currentPage >= totalPages - 1}
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer active:scale-90"
              title="Página siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Full-view Title Strip Rack Toggle */}
        <button
          type="button"
          onClick={() => setIsZoomed(true)}
          className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 font-mono text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
          title="Ver la parrilla completa de etiquetas en grande"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">Ampliar</span>
        </button>
      </div>

      {/* JUKEBOX MACHINE WRAPPER (Responsive full-width with aspect ratio) */}
      <div
        className="relative w-full max-w-[360px] sm:max-w-[440px] md:max-w-[520px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 border border-white/10 z-10 mx-auto"
        style={{
          aspectRatio: '1696 / 2528',
          maxHeight: 'calc(100dvh - 175px)',
          boxShadow: isPlaying
            ? '0 25px 70px rgba(0,0,0,0.9), 0 0 50px rgba(0, 245, 255, 0.25), 0 0 100px rgba(245, 158, 11, 0.15)'
            : '0 20px 50px rgba(0,0,0,0.8)',
        }}
      >
        {/* Base Photo: juke-box.webp */}
        <img
          src="./assets/juke-box.webp"
          alt="Vintage Retro Jukebox"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />

        {/* NEON BUBBLE TUBES CANVAS OVERLAY */}
        <canvas
          ref={canvasRef}
          width={848}
          height={1264}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          style={{ mixBlendMode: 'screen' }}
        />

        {/* TITLE STRIPS GLASS DISPLAY WINDOW (Exact alignment over beige slots) */}
        <div
          className="absolute z-30"
          style={{
            top: '31.8%',
            left: '17.2%',
            width: '65.6%',
            height: '18.4%',
          }}
        >
          {/* Quick Zoom Pill Button on the glass frame */}
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            className="absolute -top-2 -right-1 z-40 px-1.5 py-0.5 rounded-full bg-black/80 hover:bg-black text-amber-300 border border-amber-400/50 backdrop-blur-md shadow-md text-[8px] sm:text-[9px] font-mono font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title="Ampliar parrilla de etiquetas para ver todas en detalle"
          >
            <ZoomIn className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="hidden sm:inline">Ampliar</span>
          </button>

          <div className="grid grid-cols-3 grid-rows-4 gap-x-1 sm:gap-x-1.5 gap-y-0.5 sm:gap-y-1 h-full w-full p-0.5">
            {pageStrips.map((item) => {
              const { code, track } = item;
              const isCurrent = track && currentTrack?.id === track.id;

              // Vintage strip color accent by letter column (Red, Teal, Amber)
              const isRed = code.startsWith('A') || code.startsWith('D') || code.startsWith('G') || code.startsWith('J');
              const isTeal = code.startsWith('B') || code.startsWith('E') || code.startsWith('H') || code.startsWith('K');
              const accentBorder = isRed
                ? 'border-l-[2.5px] border-l-red-600'
                : isTeal
                ? 'border-l-[2.5px] border-l-cyan-600'
                : 'border-l-[2.5px] border-l-amber-600';

              const codeBadgeColor = isRed
                ? 'bg-red-600 text-white'
                : isTeal
                ? 'bg-cyan-700 text-white'
                : 'bg-amber-600 text-white';

              if (track) {
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleSelectTrack(track)}
                    className={`group relative w-full h-full rounded-[3px] transition-all duration-150 flex flex-col justify-center px-1 sm:px-1.5 py-[1px] sm:py-0.5 overflow-hidden text-left cursor-pointer border select-none ${accentBorder} ${
                      isCurrent
                        ? 'bg-[#fffde6] border-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9),inset_0_0_8px_rgba(251,191,36,0.5)] scale-[1.02] z-10 ring-1 ring-amber-400'
                        : 'bg-[#faf6e8] hover:bg-[#fffcee] border-[#a16207]/30 hover:border-amber-400/70 shadow-xs'
                    }`}
                  >
                    {/* Top Row: Track Title + Slot Code */}
                    <div className="flex items-center justify-between w-full min-w-0 gap-1 leading-none">
                      <span
                        className={`font-bold uppercase tracking-tight truncate flex-1 min-w-0 text-[7.5px] sm:text-[9.5px] md:text-[11px] leading-[1.1] ${
                          isCurrent
                            ? 'text-amber-950 font-black'
                            : 'text-zinc-950 group-hover:text-black'
                        }`}
                        title={track.title}
                      >
                        {track.title}
                      </span>
                      <span
                        className={`shrink-0 font-mono font-black text-[5.5px] sm:text-[7px] md:text-[8px] px-1 py-[1px] rounded-[1px] leading-none ${codeBadgeColor}`}
                      >
                        {code}
                      </span>
                    </div>

                    {/* Bottom Row: Artist */}
                    <div className="flex items-center justify-between w-full min-w-0 mt-[1px] sm:mt-0.5 leading-none">
                      <span
                        className={`truncate flex-1 min-w-0 text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-medium leading-[1.0] ${
                          isCurrent ? 'text-amber-800 font-bold' : 'text-zinc-600 group-hover:text-zinc-800'
                        }`}
                        title={track.artist}
                      >
                        {track.artist}
                      </span>
                      {isCurrent && isPlaying && (
                        <span className="shrink-0 flex items-center gap-0.5 ml-0.5">
                          <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
                        </span>
                      )}
                    </div>

                    {/* Delete button in editing mode */}
                    {isEditingMode && onRemoveTrack && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrack(track.id);
                        }}
                        className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer z-20 shadow"
                        title="Quitar de favoritos"
                      >
                        <X className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                );
              }

              // Blank vintage strip for empty slots
              return (
                <div
                  key={code}
                  onClick={() => {
                    playJukeboxMechanicalClick();
                    if (onNavigateToSearch) onNavigateToSearch();
                  }}
                  className={`w-full h-full rounded-[3px] bg-[#faf6e8]/60 border border-dashed border-[#a16207]/25 flex items-center justify-between px-1 sm:px-1.5 py-[1px] text-zinc-400 hover:text-amber-800 hover:border-amber-400/50 hover:bg-[#fff9e8]/90 transition cursor-pointer select-none ${accentBorder}`}
                  title="Ranura libre • Toca para buscar canciones"
                >
                  <span className="text-[7px] sm:text-[8px] font-mono tracking-wider font-semibold truncate opacity-70">
                    + VACÍO
                  </span>
                  <span className="font-mono text-[5.5px] sm:text-[7px] text-zinc-400 font-bold">
                    {code}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KEYPAD SELECTOR CONSOLE (Interactive buttons overlaid on jukebox controls) */}
        <div
          className="absolute z-30"
          style={{
            top: '55.2%',
            left: '42.2%',
            width: '13.2%',
            height: '8.3%',
          }}
        >
          <div className="grid grid-cols-4 grid-rows-4 gap-0.5 h-full w-full">
            {['1', '2', '3', 'M', '4', '5', '6', 'X', '7', '8', '9', '0', 'D', '.', 'G', 'D'].map(
              (btn, idx) => {
                const isPressed = pressedKey === btn;
                return (
                  <button
                    key={`${btn}-${idx}`}
                    type="button"
                    onClick={() => handleKeyPress(btn)}
                    className={`rounded-[2px] text-[7px] sm:text-[8.5px] font-mono font-bold transition-all duration-75 flex items-center justify-center cursor-pointer select-none ${
                      isPressed
                        ? 'bg-amber-400 text-black scale-90 shadow-inner'
                        : 'bg-white/10 hover:bg-white/30 text-white/90 active:scale-95'
                    }`}
                  >
                    {btn}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* KEYPAD LETTER COLUMN (A3, B2, A1, BB on the left of keypad) */}
        <div
          className="absolute z-30"
          style={{
            top: '55.2%',
            left: '36.8%',
            width: '3.6%',
            height: '8.3%',
          }}
        >
          <div className="grid grid-cols-1 grid-rows-4 gap-0.5 h-full w-full">
            {['A3', 'B2', 'A1', 'BB'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => handleKeyPress(btn)}
                className={`rounded-[2px] text-[6.5px] sm:text-[7.5px] font-mono font-bold transition-all duration-75 flex items-center justify-center cursor-pointer select-none ${
                  pressedKey === btn
                    ? 'bg-amber-400 text-black scale-90'
                    : 'bg-red-800/80 hover:bg-red-700 text-white active:scale-95'
                }`}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        {/* RECORD MECHANISM INSPECTION WINDOW (Displays spinning vinyl when playing) */}
        <div
          className="absolute z-30 overflow-hidden flex items-center justify-center pointer-events-none"
          style={{
            top: '55.2%',
            left: '68.2%',
            width: '16.5%',
            height: '8.3%',
          }}
        >
          {isPlaying ? (
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Spinning Mini 45 RPM Vinyl with Album Cover Center Label */}
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-zinc-900 bg-zinc-950 flex items-center justify-center shadow-md animate-spin relative overflow-hidden"
                style={{
                  animationDuration: '1.8s',
                  background:
                    'radial-gradient(circle, #27272a 0%, #18181b 45%, #09090b 70%, #000 100%)',
                }}
              >
                {/* Center Label with Album Cover */}
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-zinc-700 relative z-10 shadow-inner">
                  {currentTrack?.thumbnail ? (
                    <img
                      src={currentTrack.thumbnail}
                      alt="Etiqueta Vinilo"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-amber-500" />
                  )}
                  {/* Spindle hole */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-black border border-white/40" />
                </div>
              </div>
              {/* Warm interior spotlight */}
              <div className="absolute inset-0 bg-amber-500/10 mix-blend-screen pointer-events-none" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-40">
              <Disc3 className="w-6 h-6 text-zinc-400" />
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN TITLE STRIPS RACK MODAL (Authentic Vintage Jukebox Display) */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#1c1610] via-[#120f0b] to-[#0a0806] border-2 border-amber-500/50 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(251,191,36,0.25)] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                  <Disc3 className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h3 className="font-rock text-lg sm:text-xl text-amber-300 tracking-wider uppercase leading-tight">
                    Parrilla de Etiquetas de la Jukebox
                  </h3>
                  <p className="text-[10px] sm:text-xs font-mono text-zinc-400 mt-0.5">
                    Página {currentPage + 1} de {totalPages} • Toca cualquier etiqueta para hacerla sonar
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
                title="Cerrar vista ampliada"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Large Authentic Title Strips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {pageStrips.map((item) => {
                const { code, track } = item;
                const isCurrent = track && currentTrack?.id === track.id;

                const isRed = code.startsWith('A') || code.startsWith('D') || code.startsWith('G') || code.startsWith('J');
                const isTeal = code.startsWith('B') || code.startsWith('E') || code.startsWith('H') || code.startsWith('K');
                const accentBorder = isRed
                  ? 'border-l-4 border-l-red-600'
                  : isTeal
                  ? 'border-l-4 border-l-cyan-600'
                  : 'border-l-4 border-l-amber-600';

                const codeBadgeBg = isRed
                  ? 'bg-red-600 text-white'
                  : isTeal
                  ? 'bg-cyan-700 text-white'
                  : 'bg-amber-600 text-white';

                if (track) {
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => {
                        handleSelectTrack(track);
                        setIsZoomed(false);
                      }}
                      className={`relative w-full rounded-xl transition-all duration-150 p-3 text-left cursor-pointer border select-none ${accentBorder} ${
                        isCurrent
                          ? 'bg-[#fffde6] border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.8)] ring-2 ring-amber-400'
                          : 'bg-[#faf6e8] hover:bg-[#fffcee] border-[#a16207]/30 hover:border-amber-400 shadow-md hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`font-mono font-black text-[10px] px-1.5 py-0.5 rounded leading-none ${codeBadgeBg}`}>
                              {code}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-400/25 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                <span>Sonando</span>
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-sm sm:text-base text-zinc-950 truncate leading-snug">
                            {track.title}
                          </h4>
                          <p className="text-xs text-zinc-700 truncate font-semibold mt-0.5">
                            {track.artist}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 self-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                            isCurrent && isPlaying
                              ? 'bg-amber-400 text-black shadow-lg'
                              : 'bg-black/10 text-zinc-800 hover:bg-amber-400 hover:text-black'
                          }`}>
                            {isCurrent && isPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </div>

                          {isEditingMode && onRemoveTrack && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveTrack(track.id);
                              }}
                              className="p-1.5 rounded-lg bg-red-600/15 hover:bg-red-600 text-red-500 hover:text-white transition"
                              title="Quitar de favoritos"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                }

                return (
                  <div
                    key={code}
                    onClick={() => {
                      setIsZoomed(false);
                      if (onNavigateToSearch) onNavigateToSearch();
                    }}
                    className={`w-full rounded-xl bg-[#faf6e8]/50 border-2 border-dashed border-[#a16207]/25 p-3 text-left transition cursor-pointer hover:bg-[#fff9e8] hover:border-amber-400/50 ${accentBorder}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`font-mono font-black text-[10px] px-1.5 py-0.5 rounded leading-none opacity-60 ${codeBadgeBg}`}>
                            {code}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase">
                            Ranura Libre
                          </span>
                        </div>
                        <p className="text-xs text-amber-700/80 font-medium">
                          + Toca para buscar y colocar una canción favorita
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Page Flipper */}
            <div className="mt-5 pt-3 border-t border-amber-500/20 flex items-center justify-between font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  playJukeboxMechanicalClick();
                  setCurrentPage((p) => Math.max(0, p - 1));
                }}
                disabled={currentPage === 0}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Pág. Anterior</span>
              </button>

              <span className="font-bold text-amber-400">
                PÁGINA {currentPage + 1} DE {totalPages}
              </span>

              <button
                type="button"
                onClick={() => {
                  playJukeboxMechanicalClick();
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
                }}
                disabled={currentPage >= totalPages - 1}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <span>Pág. Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
