import React from 'react';
import { Play, Pause, SkipForward, Heart, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    nextTrack,
    currentTime,
    duration,
    setFullScreenPlayerOpen,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <div
      onClick={() => setFullScreenPlayerOpen(true)}
      className="fixed bottom-16 md:bottom-3 left-2 right-2 md:left-68 md:right-4 z-30 cursor-pointer transition-all duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl p-2.5 flex items-center justify-between gap-3">
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
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div
          className="flex items-center gap-2 shrink-0 pr-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleLike(currentTrack)}
            className="p-2 text-zinc-400 hover:text-pink-500 transition"
            aria-label="Me gusta"
          >
            <Heart
              className={`w-5 h-5 ${
                liked ? 'fill-pink-500 text-pink-500' : 'text-zinc-400'
              }`}
            />
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
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
