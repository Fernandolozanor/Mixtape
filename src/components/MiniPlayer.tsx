import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward, Heart, Loader2, Disc3 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { MarqueeTitle } from './MarqueeTitle';
import { SourceBadge } from './SourceBadge';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    nextTrack,
    prevTrack,
    fastForward,
    rewind,
    scrubDirection,
    scrubSpeed,
    currentTime,
    duration,
    setFullScreenPlayerOpen,
  } = usePlayer();

  const { isLiked, toggleLike, settings } = useLibrary();
  const { currentTheme } = useTheme();
  const isSteel = currentTheme.id === 'retro-rock-80s' || settings.themeMode === 'light';

  // If nothing is playing, leave the space completely free for more on-screen content
  if (!currentTrack) {
    return null;
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <div
      onClick={() => setFullScreenPlayerOpen(true)}
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-2.5 left-2 right-2 md:left-68 md:right-4 z-40 cursor-pointer transition-all duration-300"
    >
      <div
        className={`relative overflow-hidden rounded-2xl ${
          isSteel
            ? 'retro-brushed-steel border-2 border-slate-300 shadow-[0_12px_32px_rgba(0,0,0,0.7)]'
            : 'bg-gradient-to-r from-[#171c26] via-[#11151e] to-[#0e1219] border-2 border-[#263042] shadow-[0_10px_30px_rgba(0,0,0,0.85)]'
        } p-2.5 flex items-center justify-between gap-3`}
      >
        {/* Track Info */}
        <div className="flex items-center gap-3 overflow-hidden pl-1.5">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center backdrop-blur-[0.5px]">
                <Disc3
                  className="w-6 h-6 text-amber-400 animate-spin"
                  style={{ animationDuration: '2.5s' }}
                />
              </div>
            )}
          </div>

          <div className="overflow-hidden flex-1 min-w-0">
            <MarqueeTitle
              text={currentTrack.title}
              as="p"
              className={`font-stereo text-sm sm:text-base font-black tracking-wide ${
                isSteel ? 'text-black drop-shadow-none' : 'text-white'
              }`}
            />
            <div className="flex items-center gap-2 text-xs truncate">
              <span
                className={`font-mono font-bold truncate ${
                  isSteel ? 'text-amber-950' : 'text-amber-400'
                }`}
              >
                {currentTrack.artist}
              </span>
              <span className={isSteel ? 'text-slate-700 font-bold' : 'text-zinc-600'}>•</span>
              <SourceBadge source={currentTrack.source} size="xs" />
            </div>
          </div>
        </div>

        {/* 80s Rock Mechanical Transport Controls */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 shrink-0 pr-0.5 sm:pr-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleLike(currentTrack)}
            className="hidden sm:inline-flex p-1.5 text-zinc-400 hover:text-amber-400 transition"
            aria-label="Me gusta"
          >
            <Heart
              className="w-4 h-4 transition-colors"
              style={{
                fill: liked ? currentTheme.accent : 'none',
                color: liked ? currentTheme.accent : 'currentColor',
              }}
            />
          </button>

          {/* Previous Track Button - Mechanical bevel */}
          <button
            onClick={prevTrack}
            className={`p-1.5 sm:p-2 rounded-xl border-t border-b-2 transition active:translate-y-0.5 ${
              isSteel
                ? 'retro-btn-aluminum shadow-md text-amber-900 border-slate-400'
                : 'bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-white/20 border-black/80'
            }`}
            aria-label="Canción anterior"
            title="Anterior ⏮"
          >
            <SkipBack
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                isSteel ? 'text-amber-900 fill-amber-900' : 'text-amber-400 fill-amber-400'
              }`}
            />
          </button>

          {/* Rewind (Retrasar) - 1,5x -> 2x -> 4x -> 8x -> 1,5x */}
          <button
            onClick={rewind}
            className={`relative p-1.5 sm:p-2 rounded-xl border-t border-b-2 transition active:translate-y-0.5 flex flex-col items-center justify-center ${
              scrubDirection === 'backward'
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black border-white/40 border-amber-900 ring-1 ring-amber-400'
                : isSteel
                ? 'retro-btn-aluminum shadow-md text-amber-900 border-slate-400'
                : 'bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-white/20 border-black/80'
            }`}
            aria-label="Retrasar"
            title="Retrasar (1,5x / 2x / 4x / 8x)"
          >
            <Rewind
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                scrubDirection === 'backward'
                  ? 'text-black fill-black'
                  : isSteel
                  ? 'text-amber-900 fill-amber-900'
                  : 'text-amber-400 fill-amber-400'
              }`}
            />
            {scrubDirection === 'backward' && scrubSpeed && (
              <span className="text-[7px] font-mono font-black text-black leading-none mt-0.5">
                {String(scrubSpeed).replace('.', ',')}x
              </span>
            )}
          </button>

          {/* Main Play / Pause Key */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black flex items-center justify-center transition shadow-lg border-t border-white/40 border-b-2 border-amber-900 active:translate-y-0.5"
            aria-label={isPlaying && !scrubDirection ? 'Pausar' : 'Reproducir'}
            title={scrubDirection ? 'PLAY ▶ (Velocidad normal)' : isPlaying ? 'PAUSE ⏸' : 'PLAY ▶'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : isPlaying && !scrubDirection ? (
              <Pause className="w-5 h-5 fill-black text-black" />
            ) : (
              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
            )}
          </button>

          {/* Fast Forward (Adelantar) - 1,5x -> 2x -> 4x -> 8x -> 1,5x */}
          <button
            onClick={fastForward}
            className={`relative p-1.5 sm:p-2 rounded-xl border-t border-b-2 transition active:translate-y-0.5 flex flex-col items-center justify-center ${
              scrubDirection === 'forward'
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black border-white/40 border-amber-900 ring-1 ring-amber-400'
                : isSteel
                ? 'retro-btn-aluminum shadow-md text-amber-900 border-slate-400'
                : 'bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-white/20 border-black/80'
            }`}
            aria-label="Adelantar"
            title="Adelantar (1,5x / 2x / 4x / 8x)"
          >
            <FastForward
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                scrubDirection === 'forward'
                  ? 'text-black fill-black'
                  : isSteel
                  ? 'text-amber-900 fill-amber-900'
                  : 'text-amber-400 fill-amber-400'
              }`}
            />
            {scrubDirection === 'forward' && scrubSpeed && (
              <span className="text-[7px] font-mono font-black text-black leading-none mt-0.5">
                {String(scrubSpeed).replace('.', ',')}x
              </span>
            )}
          </button>

          {/* Next Track Button - Mechanical bevel */}
          <button
            onClick={nextTrack}
            className={`p-1.5 sm:p-2 rounded-xl border-t border-b-2 transition active:translate-y-0.5 ${
              isSteel
                ? 'retro-btn-aluminum shadow-md text-amber-900 border-slate-400'
                : 'bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-white/20 border-black/80'
            }`}
            aria-label="Siguiente"
            title="Siguiente ⏭"
          >
            <SkipForward
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                isSteel ? 'text-amber-900 fill-amber-900' : 'text-amber-400 fill-amber-400'
              }`}
            />
          </button>
        </div>

        {/* Progress Bar styled like analog tape level with amber glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #1d5494 0%, #f59e0b 80%, #ef4444 100%)',
              boxShadow: '0 0 6px rgba(245, 158, 11, 0.7)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
