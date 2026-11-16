import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Disc3,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import type { Track } from '../types/music';
import { playJukeboxMechanicalClick, playJukeboxCoinDrop } from '../utils/jukeboxAudio';

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
  const [credits, setCredits] = useState(2);
  const [coinMessage, setCoinMessage] = useState<string | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

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

  // Handle coin insert easter egg
  const handleInsertCoin = () => {
    playJukeboxCoinDrop();
    setCredits((prev) => prev + 1);
    setCoinMessage('★ 25¢ INSERTADO • +1 CRÉDITO ★');
    setTimeout(() => setCoinMessage(null), 2500);
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
      {/* Jukebox Quick Toolbar */}
      <div className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 mb-3 bg-black/60 rounded-2xl border border-white/10 shadow-lg font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayToggle}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer ${
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
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Reproducción aleatoria"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aleatorio</span>
          </button>
        </div>

        {/* Coin & Credit status */}
        <div className="flex items-center gap-2">
          <div
            onClick={handleInsertCoin}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 cursor-pointer hover:bg-amber-500/25 transition select-none active:scale-95"
            title="Haz clic para echar una moneda de 25¢"
          >
            <span className="text-[11px] font-bold">🪙 25¢</span>
            <span className="text-[10px] text-zinc-400 hidden sm:inline">•</span>
            <span className="text-[10px] font-bold text-amber-400">{credits} CRÉDITOS</span>
          </div>

          {/* Zoom toggle on mobile */}
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 sm:hidden transition"
            title="Ampliar etiquetas"
          >
            {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {coinMessage && (
        <div className="mb-2 px-3 py-1 rounded-xl bg-amber-400 text-black font-mono font-bold text-xs tracking-wider animate-bounce shadow-lg">
          {coinMessage}
        </div>
      )}

      {/* JUKEBOX MACHINE WRAPPER */}
      <div
        className={`relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 border border-white/10 ${
          isZoomed ? 'scale-125 z-40 my-8 shadow-cyan-500/20' : 'z-10'
        }`}
        style={{
          aspectRatio: '1696 / 2528',
          boxShadow: isPlaying
            ? '0 25px 70px rgba(0,0,0,0.9), 0 0 50px rgba(0, 245, 255, 0.25), 0 0 100px rgba(245, 158, 11, 0.15)'
            : '0 20px 50px rgba(0,0,0,0.8)',
        }}
      >
        {/* Base Photo: JUKE-BOX.jpg */}
        <img
          src="./assets/juke-box.jpg"
          alt="Vintage Retro Jukebox"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />

        {/* NEON BUBBLE TUBES CANVAS OVERLAY */}
        <canvas
          ref={canvasRef}
          width={1696}
          height={2528}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          style={{ mixBlendMode: 'screen' }}
        />

        {/* TITLE STRIPS GLASS DISPLAY WINDOW (Exact alignment over beige slots) */}
        <div
          className="absolute z-30"
          style={{
            top: '32.1%',
            left: '17.4%',
            width: '65.2%',
            height: '17.6%',
          }}
        >
          <div className="grid grid-cols-3 grid-rows-4 gap-x-1.5 sm:gap-x-2 gap-y-1 sm:gap-y-1.5 h-full w-full p-0.5">
            {pageStrips.map((item) => {
              const { code, track } = item;
              const isCurrent = track && currentTrack?.id === track.id;

              if (track) {
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleSelectTrack(track)}
                    className={`group relative w-full h-full rounded sm:rounded-md transition-all duration-150 flex items-center justify-between px-1 sm:px-1.5 py-0.5 overflow-hidden text-left cursor-pointer border select-none ${
                      isCurrent
                        ? 'bg-[#fffdec] border-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9),inset_0_0_6px_rgba(251,191,36,0.5)] scale-[1.02] z-10'
                        : 'bg-[#faf4e1] hover:bg-[#fff9e8] border-[#a16207]/30 hover:border-amber-400/70 shadow-sm'
                    }`}
                  >
                    {/* Left code tag (e.g. A1, B2) */}
                    <div className="flex items-center gap-1 min-w-0 mr-1">
                      <span
                        className={`text-[8px] sm:text-[9px] font-mono font-black px-1 py-0.2 rounded shrink-0 shadow-xs ${
                          isCurrent
                            ? 'bg-amber-500 text-black animate-pulse'
                            : 'bg-red-700 group-hover:bg-red-600 text-white'
                        }`}
                      >
                        {code}
                      </span>

                      {/* Song Title & Artist */}
                      <div className="min-w-0 flex flex-col justify-center">
                        <span
                          className={`text-[8px] sm:text-[9.5px] font-black truncate leading-tight uppercase tracking-tight ${
                            isCurrent ? 'text-amber-950' : 'text-zinc-900 group-hover:text-black'
                          }`}
                        >
                          {track.title}
                        </span>
                        <span
                          className={`text-[7px] sm:text-[8px] truncate leading-none ${
                            isCurrent ? 'text-amber-800 font-semibold' : 'text-zinc-600'
                          }`}
                        >
                          {track.artist}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Animated Equalizer when playing or Delete in editing mode */}
                    <div className="shrink-0 flex items-center">
                      {isEditingMode && onRemoveTrack ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTrack(track.id);
                          }}
                          className="p-0.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                          title="Quitar de favoritos"
                        >
                          <X className="w-2.5 h-2.5" />
                        </div>
                      ) : isCurrent && isPlaying ? (
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 bg-amber-600 rounded-full animate-bounce [animation-delay:0ms] h-full" />
                          <span className="w-0.5 bg-amber-600 rounded-full animate-bounce [animation-delay:150ms] h-2/3" />
                          <span className="w-0.5 bg-amber-600 rounded-full animate-bounce [animation-delay:300ms] h-full" />
                        </div>
                      ) : (
                        <span className="text-[7px] font-mono text-zinc-400 group-hover:text-zinc-600">
                          45★
                        </span>
                      )}
                    </div>
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
                  className="w-full h-full rounded sm:rounded-md bg-[#faf4e1]/75 border border-dashed border-[#a16207]/20 flex items-center justify-between px-1.5 py-0.5 text-zinc-400 hover:text-amber-800 hover:border-amber-400/50 hover:bg-[#fff9e8]/90 transition cursor-pointer select-none"
                  title="Ranura libre • Haz clic para buscar canciones"
                >
                  <span className="text-[8px] font-mono text-zinc-400/70">{code}</span>
                  <span className="text-[7px] sm:text-[8px] font-mono tracking-wider font-semibold opacity-70">
                    — VACÍO —
                  </span>
                  <span className="text-[8px] font-mono opacity-50">+</span>
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

        {/* COIN SLOT (25¢ Coin Mechanism) */}
        <div
          onClick={handleInsertCoin}
          className="absolute z-30 cursor-pointer group"
          style={{
            top: '55.2%',
            left: '56.8%',
            width: '7.8%',
            height: '8.3%',
          }}
          title="Ranura de 25¢ • Haz clic para echar una moneda"
        >
          <div className="w-full h-full rounded border border-transparent group-hover:border-amber-400/50 group-hover:bg-amber-400/10 transition flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-mono font-black text-amber-300 drop-shadow">
              25¢
            </span>
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

      {/* JUKEBOX PAGE FLIPPER & CONTROLS */}
      <div className="w-full max-w-2xl mt-3 flex items-center justify-between gap-3 px-4 py-2.5 bg-black/70 rounded-2xl border border-white/10 shadow-lg font-mono text-xs">
        <button
          type="button"
          onClick={() => {
            playJukeboxMechanicalClick();
            setCurrentPage((p) => Math.max(0, p - 1));
          }}
          disabled={currentPage === 0}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center gap-1 transition active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Pág. Anterior</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="font-bold text-amber-400 tracking-wider">
            PÁGINA {currentPage + 1} DE {totalPages}
          </span>
          <span className="text-[10px] text-zinc-400">
            {tracks.length} {tracks.length === 1 ? 'favorita' : 'favoritas en la gramola'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playJukeboxMechanicalClick();
            setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
          }}
          disabled={currentPage >= totalPages - 1}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center gap-1 transition active:scale-95 cursor-pointer"
        >
          <span className="hidden sm:inline">Pág. Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tip helper */}
      <p className="text-[11px] font-mono text-zinc-500 mt-2 text-center">
        💡 Toca cualquier etiqueta para hacer sonar la canción • Los neones activan burbujas en movimiento durante la reproducción
      </p>
    </div>
  );
};
