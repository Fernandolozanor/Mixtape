import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Loader2 } from 'lucide-react';
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

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);
  const sourceLabel = audioEngine.getSourceLabel(currentTrack.source);

  return (
    <div
      onClick={() => setFullScreenPlayerOpen(true)}
      className="fixed bottom-16 md:bottom-3 left-2 right-2 md:left-68 md:right-4 z-30 cursor-pointer transition-all duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#0e1624]/90 backdrop-blur-2xl border border-white/10 shadow-2xl p-2.5 flex items-center justify-between gap-3">
        {/* Track Info */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-md">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: currentTheme.accent }}
                />
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
              <span className="truncate">{currentTrack.artist}</span>
              <span>•</span>
              <span
                className="text-[10px] px-1.5 py-0.2 rounded font-medium border"
                style={{
                  backgroundColor: currentTheme.badgeBg,
                  color: currentTheme.badgeText,
                  borderColor: currentTheme.badgeBorder,
                }}
              >
                {sourceLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div
          className="flex items-center gap-2 shrink-0 pr-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleLike(currentTrack)}
            className="p-2 text-zinc-400 hover:text-white transition"
            aria-label="Me gusta"
          >
            <Heart
              className="w-5 h-5 transition-colors"
              style={{
                fill: liked ? currentTheme.accent : 'none',
                color: liked ? currentTheme.accent : 'currentColor',
              }}
            />
          </button>

          {/* Previous Track Button */}
          <button
            onClick={prevTrack}
            className="p-2 text-zinc-300 hover:text-white transition"
            aria-label="Canción anterior"
            title="Anterior"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-zinc-800" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-2 text-zinc-300 hover:text-white transition"
            aria-label="Siguiente"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar line along bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${progressPercent}%`,
              background: currentTheme.gradient,
            }}
          />
        </div>
      </div>
    </div>
  );
};
