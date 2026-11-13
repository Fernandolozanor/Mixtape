import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Loader2, Disc3 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    setFullScreenPlayerOpen,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();
  const { currentTheme } = useTheme();
  const isSteel = currentTheme.id === 'retro-rock-80s';

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);
  const sourceLabel = audioEngine.getSourceLabel(currentTrack.source);

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
        {/* Chassis corner screws */}
        <div
          className={`absolute top-1.5 left-1.5 ${
            isSteel ? 'retro-screw-steel' : 'retro-screw'
          } scale-75`}
        />
        <div
          className={`absolute top-1.5 right-1.5 ${
            isSteel ? 'retro-screw-steel' : 'retro-screw'
          } scale-75`}
        />

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

          <div className="overflow-hidden">
            <p className="font-stereo text-sm sm:text-base font-bold text-white tracking-wide truncate">
              {currentTrack.title}
            </p>
            <div className="flex items-center gap-2 text-xs truncate">
              <span className="text-amber-400 font-mono font-semibold truncate">
                {currentTrack.artist}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-[10px] font-mono-retro font-bold px-1.5 py-0.2 rounded bg-black/50 text-emerald-400 border border-emerald-500/30">
                {sourceLabel}
              </span>
            </div>
          </div>
        </div>

        {/* 80s Rock Mechanical Transport Controls */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleLike(currentTrack)}
            className="p-2 text-zinc-400 hover:text-amber-400 transition"
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
            className="p-2.5 rounded-xl bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-t border-white/20 border-b-2 border-black/80 transition active:translate-y-0.5"
            aria-label="Canción anterior"
            title="REW ⏪"
          >
            <SkipBack className="w-4 h-4 text-amber-400 fill-amber-400" />
          </button>

          {/* Main Play / Pause Key */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-11 h-11 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black flex items-center justify-center transition shadow-lg border-t border-white/40 border-b-2 border-amber-900 active:translate-y-0.5"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            title={isPlaying ? 'PAUSE ⏸' : 'PLAY ▶'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-black text-black" />
            ) : (
              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
            )}
          </button>

          {/* Next Track Button - Mechanical bevel */}
          <button
            onClick={nextTrack}
            className="p-2.5 rounded-xl bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-t border-white/20 border-b-2 border-black/80 transition active:translate-y-0.5"
            aria-label="Siguiente"
            title="FF ⏩"
          >
            <SkipForward className="w-4 h-4 text-amber-400 fill-amber-400" />
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
