import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Disc3,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Edit3,
  Trash2,
} from 'lucide-react';
import type { Playlist } from '../types/music';
import { usePlayer } from '../context/PlayerContext';

interface VinylCoverFlowProps {
  vinyls: Playlist[];
  onSelectVinyl: (id: string) => void;
  onEditVinyl?: (vinyl: Playlist) => void;
  onDeleteVinyl?: (id: string) => void;
  onOpenSearchReleases?: () => void;
}

export const VinylCoverFlow: React.FC<VinylCoverFlowProps> = ({
  vinyls,
  onSelectVinyl,
  onEditVinyl,
  onDeleteVinyl,
  onOpenSearchReleases,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  // Fluid velocity & momentum swipe gesture state
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const currentDragOffset = useRef(0);
  const [transitionDuration, setTransitionDuration] = useState(480);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const lastX = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const velocity = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Clean up animation frames on unmount
  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Keep activeIndex within bounds if vinyls length changes
  useEffect(() => {
    if (activeIndex >= vinyls.length && vinyls.length > 0) {
      setActiveIndex(vinyls.length - 1);
    }
  }, [vinyls.length, activeIndex]);

  // Keyboard navigation (Left / Right Arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setTransitionDuration(480);
        setActiveIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setTransitionDuration(480);
        setActiveIndex((prev) => Math.min(vinyls.length - 1, prev + 1));
      } else if (e.key === ' ' || e.key === 'Enter') {
        const activeVinyl = vinyls[activeIndex];
        if (activeVinyl && activeVinyl.tracks.length > 0) {
          e.preventDefault();
          handlePlayActiveVinyl();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vinyls, activeIndex]);

  // Mouse wheel navigation with adaptive momentum
  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 15) return;

    if (now - lastWheelTime.current < 90) return;
    lastWheelTime.current = now;

    const step = Math.abs(delta) > 120 ? 3 : Math.abs(delta) > 60 ? 2 : 1;
    setTransitionDuration(450);
    if (delta > 0) {
      setActiveIndex((prev) => Math.min(vinyls.length - 1, prev + step));
    } else {
      setActiveIndex((prev) => Math.max(0, prev - step));
    }
  };

  // High-performance pointer / touch swipe gestures with velocity & inertia (throttled via RAF)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (['BUTTON', 'A', 'INPUT'].includes((e.target as HTMLElement).tagName)) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    lastX.current = e.clientX;
    lastTime.current = performance.now();
    velocity.current = 0;
    currentDragOffset.current = 0;
    setDragOffset(0);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - (dragStartY.current ?? e.clientY);

    // Allow natural vertical page scrolling if swipe is primarily vertical
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20 && Math.abs(dx) < 12) {
      return;
    }

    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 8) {
      const instV = (e.clientX - lastX.current) / dt; // px / ms
      // Responsive low-pass filter for instantaneous velocity
      velocity.current = velocity.current * 0.3 + instV * 0.7;
      lastX.current = e.clientX;
      lastTime.current = now;
    }

    currentDragOffset.current = dx;
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        setDragOffset(currentDragOffset.current);
        rafId.current = null;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);

    const dx = currentDragOffset.current;
    const now = performance.now();
    const timeSinceLastMove = now - lastTime.current;

    // Decay velocity if held motionless before release (allow up to 120ms for touch hardware)
    let v = velocity.current;
    if (timeSinceLastMove > 120) {
      v = 0;
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const dragStep = isMobile ? 68 : 90;
    const dragJump = -dx / dragStep;
    const speed = Math.abs(v); // px per ms

    const totalAlbums = vinyls.length;
    const maxPossibleJump = Math.max(1, totalAlbums - 1);

    // High-momentum kinetic inertia:
    // Allows traversing the entire collection on a sufficiently strong swipe / flick
    let totalJump = 0;
    if (speed > 0.16) {
      // Natural base momentum for standard swipes
      const baseMomentum = Math.pow(speed, 1.25) * (isMobile ? 3.2 : 3.9);

      // Traversal boost that activates on faster flicks (speed > 1.1 px/ms)
      // reaching full collection span at speed ~2.2 - 2.4 px/ms
      let collectionTraverseBoost = 0;
      if (speed > 1.1) {
        const intensity = Math.min(1, (speed - 1.1) / 1.1);
        collectionTraverseBoost = Math.pow(intensity, 1.3) * maxPossibleJump;
      }

      const rawJump = dragJump + (-Math.sign(v) * (baseMomentum + collectionTraverseBoost));
      totalJump = Math.round(rawJump);
    } else if (Math.abs(dx) > (isMobile ? 32 : 45)) {
      totalJump = dx < 0 ? 1 : -1;
    }

    // Guaranteed minimum 1-step navigation for definite swipes
    if (totalJump === 0 && (speed > 0.16 || Math.abs(dx) > 20)) {
      totalJump = v < 0 || dx < 0 ? 1 : -1;
    }

    // Clamp totalJump to remaining distance in direction of swipe
    totalJump = Math.max(-maxPossibleJump, Math.min(maxPossibleJump, totalJump));

    // Dynamic glide duration that scales gracefully with distance and momentum
    const jumpDist = Math.abs(totalJump);
    const durationMs = jumpDist <= 1
      ? 480
      : Math.min(1250, Math.round(440 + Math.pow(jumpDist, 0.72) * 70 + speed * 50));
    setTransitionDuration(durationMs);

    if (totalJump !== 0) {
      const nextIndex = Math.max(0, Math.min(vinyls.length - 1, activeIndex + totalJump));
      setActiveIndex(nextIndex);
    }

    currentDragOffset.current = 0;
    setDragOffset(0);
    dragStartX.current = null;
    velocity.current = 0;
  };

  const activeVinyl = vinyls[activeIndex];
  const isCurrentActivePlaying =
    Boolean(activeVinyl?.tracks?.some((t) => t.id === currentTrack?.id)) && isPlaying;

  const handlePlayActiveVinyl = () => {
    if (!activeVinyl || activeVinyl.tracks.length === 0) return;

    // If currently playing a track from this album, toggle pause/play
    const isThisAlbumPlaying = activeVinyl.tracks.some((t) => t.id === currentTrack?.id);
    if (isThisAlbumPlaying) {
      togglePlay();
      return;
    }

    playTrack(activeVinyl.tracks[0], activeVinyl.tracks, false, 'vinyl');
  };

  // Empty state if user has no vinyl albums yet
  if (vinyls.length === 0) {
    return (
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#111726]/90 to-[#080d18] border border-amber-500/25 p-8 text-center shadow-2xl relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="w-20 h-20 mx-auto rounded-full bg-black/60 border-2 border-dashed border-amber-400/40 flex items-center justify-center mb-3 text-amber-400 shadow-inner">
          <Disc3 className="w-10 h-10 animate-spin text-amber-400" />
        </div>
        <h3 className="font-rock text-2xl text-white tracking-widest uppercase mb-1">
          ESTANTERÍA DE VINILOS VACÍA
        </h3>
        <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto mb-5 leading-relaxed">
          Los álbumes oficiales de grupos y artistas se colocan aquí como discos de vinilo 3D con efecto Cover Flow.
        </p>
        {onOpenSearchReleases && (
          <button
            type="button"
            onClick={onOpenSearchReleases}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-amber-400 text-black font-mono-retro font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            Buscar Álbumes para guardar en Vinilo +
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 select-none">
      {/* 3D Cover Flow Stage Viewport */}
      <div
        ref={stageRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-72 sm:h-84 md:h-96 rounded-3xl bg-gradient-to-b from-[#0e1424] via-[#090d18] to-[#04060c] border border-amber-500/25 shadow-2xl relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 45%',
          touchAction: 'pan-y',
        }}
      >
        {/* Overhead Spotlights & Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />

        {/* Left Navigation Chevron Button */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTransitionDuration(480);
              setActiveIndex((prev) => Math.max(0, prev - 1));
            }}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-90 shadow-xl cursor-pointer"
            aria-label="Disco anterior"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Right Navigation Chevron Button */}
        {activeIndex < vinyls.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTransitionDuration(480);
              setActiveIndex((prev) => Math.min(vinyls.length - 1, prev + 1));
            }}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-90 shadow-xl cursor-pointer"
            aria-label="Siguiente disco"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* 3D Track Container */}
        <div
          className="relative w-full h-full flex items-center justify-center pointer-events-none"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {vinyls.map((album, idx) => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
            const cardShiftRatio = isMobile ? 100 : 135;
            // Dynamic fluid offset during finger drag
            const offset = (idx - activeIndex) + (isDragging ? dragOffset / cardShiftRatio : 0);
            const absOffset = Math.abs(offset);
            const isCenter = absOffset < 0.45;

            // Tailored spacing & steeper tilt so 3 records are clearly visible on each flank
            const maxTilt = isMobile ? 70 : 73; // Steeper angle for classic Cover Flow perspective
            const centerOffset = isMobile ? 84 : 136;
            const itemSpacing = isMobile ? 34 : 54;
            const centerScale = isMobile ? 1.02 : 1.10;
            const centerZ = isMobile ? 50 : 65;
            const baseZ = isMobile ? -70 : -80;

            const clamped = Math.min(1, absOffset);
            const extra = Math.max(0, absOffset - 1);
            const clampedExtra = Math.min(5, extra) + Math.max(0, extra - 5) * 0.12;

            const sign = offset === 0 ? 0 : Math.sign(offset);
            const translateX = sign * (centerOffset * clamped + clampedExtra * itemSpacing);
            const rotateY = -sign * (maxTilt * clamped);
            // Mathematically continuous Z-depth interpolation eliminating any abrupt drop at center
            const translateZ = Math.max(
              isMobile ? -260 : -320,
              centerZ - (centerZ - baseZ) * clamped - clampedExtra * 36
            );
            const scale = Math.max(
              isMobile ? 0.65 : 0.70,
              centerScale - (isMobile ? 0.20 : 0.22) * clamped - Math.min(extra, 5) * 0.04
            );

            // Always-positive z-index preserving stack order for all collection items
            const zIndex = Math.max(1, Math.round(100 - absOffset * 6));

            // Progressive opacity & compositor-accelerated darkness overlay (eliminates expensive CSS filter recalculation)
            let opacity = 1;
            let darkness = 0;

            if (absOffset <= 1) {
              opacity = 1 - absOffset * 0.05;
              darkness = absOffset * 0.18;
            } else if (absOffset <= 2) {
              opacity = 0.95 - (absOffset - 1) * 0.12;
              darkness = 0.18 + (absOffset - 1) * 0.16;
            } else if (absOffset <= 3) {
              opacity = 0.83 - (absOffset - 2) * 0.15;
              darkness = 0.34 + (absOffset - 2) * 0.18;
            } else {
              opacity = Math.max(0, 0.68 - (absOffset - 3) * 0.55);
              darkness = 0.52;
            }

            // Fallback thumbnail
            const coverImage =
              album.coverUrl ||
              album.tracks[0]?.thumbnail ||
              `https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=80`;

            const isAlbumActivePlaying =
              isCenter && isPlaying && album.tracks.some((t) => t.id === currentTrack?.id);

            return (
              <div
                key={album.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (Math.abs(dragOffset) > 8) return;
                  if (isCenter) {
                    handlePlayActiveVinyl();
                  } else {
                    setTransitionDuration(Math.min(750, 420 + Math.abs(idx - activeIndex) * 70));
                    setActiveIndex(idx);
                  }
                }}
                className={`absolute w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 cursor-pointer select-none ${
                  absOffset > 4.5 ? 'pointer-events-none' : 'pointer-events-auto'
                }`}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                  willChange: absOffset <= 3.5 ? 'transform, opacity' : 'auto',
                  transformStyle: 'preserve-3d',
                  transition: isDragging
                    ? 'none'
                    : `transform ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
                title={album.name}
              >
                {/* 3D Vinyl Album Jacket & LP Protruding Assembly */}
                <div className="relative w-full h-full select-none">
                  {/* Glowing Aura for Centered Playing Album */}
                  {isAlbumActivePlaying && (
                    <div className="absolute inset-0 -m-3 rounded-2xl bg-amber-500/30 blur-2xl animate-pulse pointer-events-none" />
                  )}

                  {/* Real Vinyl LP Disc (Mounted only near center to keep GPU memory light; slides out of jacket ONLY during active playback) */}
                  {(isCenter || absOffset < 1.0) && (
                    <div
                      className={`absolute top-[4%] bottom-[4%] right-0 aspect-square z-0 pointer-events-none transition-all duration-700 ease-out ${
                        isAlbumActivePlaying
                          ? 'translate-x-[44%] sm:translate-x-[48%] opacity-100 scale-100'
                          : 'translate-x-0 opacity-0 scale-95 pointer-events-none'
                      }`}
                    >
                      <div
                        className="w-full h-full rounded-full relative overflow-hidden shadow-[-8px_0_22px_rgba(0,0,0,0.85)] drop-shadow-[0_10px_20px_rgba(0,0,0,0.95)]"
                        style={{
                          animation: isAlbumActivePlaying
                            ? 'vinyl-spin 1.8s linear infinite'
                            : 'none',
                          transformOrigin: 'center center',
                        }}
                      >
                        <img
                          src="./assets/vinilo.webp"
                          alt="Vinyl Record"
                          decoding="async"
                          className="w-full h-full object-cover rounded-full pointer-events-none select-none"
                        />
                        {/* Center Spindle Label with Album Cover Artwork */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full overflow-hidden border-2 border-zinc-800 shadow-[inset_0_0_8px_rgba(0,0,0,0.8),0_0_8px_rgba(0,0,0,0.6)] bg-zinc-950 pointer-events-none select-none">
                          <img
                            src={coverImage}
                            alt={album.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                          {/* Concentric label grooved rings overlay */}
                          <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                          <div className="absolute inset-[15%] rounded-full border border-black/30 pointer-events-none" />

                          {/* Center Spindle Hole with brass grommet */}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-zinc-950 border-2 border-amber-600 shadow-inner z-20 flex items-center justify-center">
                            <div className="w-0.5 h-0.5 rounded-full bg-black" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vinyl Cardboard Jacket / Cover Sleeve */}
                  <div
                    className={`relative w-full h-full rounded-2xl overflow-hidden border-2 bg-black z-10 group ${
                      isCenter
                        ? 'shadow-[0_20px_45px_rgba(0,0,0,0.95)] border-white/20'
                        : 'shadow-[0_8px_22px_rgba(0,0,0,0.7)] border-white/10'
                    }`}
                  >
                    <img
                      src={coverImage}
                      alt={album.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none select-none"
                    />

                    {/* Analog Vintage Vinyl Plastic Sleeve Sheen Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/15 pointer-events-none" />

                    {/* Hardware GPU-Accelerated Dynamic Depth Darkness (0 CPU rasterization) */}
                    <div
                      className="absolute inset-0 bg-black pointer-events-none rounded-2xl transition-opacity duration-300"
                      style={{ opacity: darkness }}
                    />

                    {/* Vintage LP Badge */}
                    <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md text-amber-300 font-mono-retro font-extrabold text-[8px] sm:text-[9px] px-2 py-0.5 rounded shadow border border-amber-400/30 uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>VINILO</span>
                    </div>

                    {album.year && (
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow border border-white/10">
                        {album.year}
                      </div>
                    )}

                    {/* Center Album Hover / Play Overlay */}
                    {isCenter && (
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition active:scale-95">
                          {isAlbumActivePlaying ? (
                            <Pause className="w-6 h-6 fill-black" />
                          ) : (
                            <Play className="w-6 h-6 fill-black ml-1" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apple Signature Glossy Mirror Floor Reflection (Culled on distant items for 60fps/120fps GPU performance) */}
                  {absOffset <= 2.2 && (
                    <div
                      className="absolute top-[102%] left-0 right-0 h-24 pointer-events-none overflow-hidden scale-y-[-1] opacity-30 origin-top rounded-2xl z-0"
                      style={{
                        WebkitMaskImage:
                          'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 75%)',
                        maskImage:
                          'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 75%)',
                      }}
                    >
                      <img
                        src={coverImage}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#090d18]/70 to-[#04060c]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Classic Apple Cover Flow Metallic Scrub Slider */}
      <div className="max-w-md mx-auto px-4 flex items-center gap-3 select-none">
        <span className="text-[10px] font-mono text-zinc-500 font-bold shrink-0">
          1
        </span>
        <input
          type="range"
          min={0}
          max={vinyls.length - 1}
          value={activeIndex}
          onChange={(e) => {
            setTransitionDuration(300);
            setActiveIndex(parseInt(e.target.value, 10));
          }}
          className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
        />
        <span className="text-[10px] font-mono text-zinc-500 font-bold shrink-0">
          {vinyls.length}
        </span>
      </div>

      {/* Centered Active Vinyl Information Card */}
      {activeVinyl && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#0c121f]/90 border border-amber-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in select-none">
          <div className="text-center sm:text-left min-w-0 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-[9px] font-mono uppercase font-bold tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Disc3 className="w-3 h-3 text-amber-400" />
                <span>VINILO EN BANDEJA ({activeIndex + 1}/{vinyls.length})</span>
              </span>
              {activeVinyl.year && (
                <span className="text-[10px] font-mono text-zinc-400">
                  Año: {activeVinyl.year}
                </span>
              )}
            </div>

            <h3 className="font-extrabold text-lg sm:text-xl text-white truncate tracking-wide">
              {activeVinyl.name}
            </h3>
            <p className="text-xs sm:text-sm font-mono font-bold text-amber-300 truncate mt-0.5">
              {activeVinyl.artist || activeVinyl.tracks[0]?.artist || 'Artista Oficial'}
              <span className="text-zinc-500 font-normal"> • {activeVinyl.tracks.length} canciones</span>
            </p>
          </div>

          {/* Action Buttons for Active Vinyl */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
            <button
              type="button"
              onClick={handlePlayActiveVinyl}
              disabled={activeVinyl.tracks.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-amber-400 hover:from-red-500 hover:to-amber-300 active:scale-95 text-black font-mono-retro font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-40 cursor-pointer"
            >
              {isCurrentActivePlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reproducir Vinilo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectVinyl(activeVinyl.id)}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Ver lista completa de canciones de este vinilo"
            >
              <ListMusic className="w-4 h-4 text-amber-400" />
              <span>Ver Pistas</span>
            </button>

            {onEditVinyl && (
              <button
                type="button"
                onClick={() => onEditVinyl(activeVinyl)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition active:scale-95 cursor-pointer"
                title="Editar información de este vinilo"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {onDeleteVinyl && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Eliminar el vinilo "${activeVinyl.name}" de tu estantería?`)) {
                    onDeleteVinyl(activeVinyl.id);
                  }
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition active:scale-95 cursor-pointer"
                title="Eliminar vinilo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
