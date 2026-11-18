import React, { useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Loader2, Disc3, Shuffle } from 'lucide-react';
import type { Track } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { playbackHistoryService } from '../services/playbackHistoryService';
import { MarqueeTitle } from './MarqueeTitle';
import { SourceBadge } from './SourceBadge';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    playTrack,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    setFullScreenPlayerOpen,
  } = usePlayer();

  const { likedTracks, playlists, isLiked, toggleLike, settings } = useLibrary();
  const { currentTheme } = useTheme();
  const isSteel = currentTheme.id === 'retro-rock-80s' || settings.themeMode === 'light';

  // Find candidate track and label to show when standby (nothing actively playing)
  const standbyTrack = useMemo<Track | null>(() => {
    if (currentTrack) return currentTrack;
    const recents = playbackHistoryService.getRecentTracks(1);
    if (recents.length > 0) return recents[0];
    if (likedTracks.length > 0) return likedTracks[0];
    for (const pl of playlists) {
      if (pl.tracks.length > 0) return pl.tracks[0];
    }
    return {
      id: 'standby_anthem_acdc',
      title: 'Back In Black',
      artist: 'AC/DC',
      album: 'Back in Black',
      duration: 255,
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
      source: 'youtube',
      youtubeId: 'pAgnJDJN4VA',
    };
  }, [currentTrack, likedTracks, playlists]);

  const standbyLabel = useMemo(() => {
    const recents = playbackHistoryService.getRecentTracks(1);
    if (recents.length > 0) return 'REANUDAR PISTA';
    if (likedTracks.length > 0) return 'TUS FAVORITAS';
    if (playlists.length > 0) return 'DE TU BIBLIOTECA';
    return 'PLETINA LISTA';
  }, [likedTracks.length, playlists.length]);

  const handlePlayStandby = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!standbyTrack) return;
    const queue = likedTracks.length > 0 ? likedTracks : [standbyTrack];
    playTrack(standbyTrack, queue);
  };

  const handleShuffleStandby = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pool = likedTracks.length > 0 ? likedTracks : playbackHistoryService.getRecentTracks(10);
    if (pool.length > 0) {
      const randomTrack = pool[Math.floor(Math.random() * pool.length)];
      playTrack(randomTrack, pool);
    } else if (standbyTrack) {
      playTrack(standbyTrack, [standbyTrack]);
    }
  };

  // STANDBY MODE: Show last playback or favorite with quick Play/Shuffle
  if (!currentTrack) {
    if (!standbyTrack) return null;

    return (
      <div
        onClick={handlePlayStandby}
        className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-2.5 left-2 right-2 md:left-68 md:right-4 z-40 cursor-pointer transition-all duration-300 group"
      >
        <div
          className={`relative overflow-hidden rounded-2xl ${
            isSteel
              ? 'retro-brushed-steel border-2 border-slate-300 shadow-[0_12px_32px_rgba(0,0,0,0.7)]'
              : 'bg-gradient-to-r from-[#171c26] via-[#11151e] to-[#0e1219] border-2 border-[#263042] shadow-[0_10px_30px_rgba(0,0,0,0.85)]'
          } p-2.5 flex items-center justify-between gap-3 hover:border-amber-400/50 transition-colors`}
        >
          {/* Suggested / Last Track Info */}
          <div className="flex items-center gap-3 overflow-hidden pl-1.5 flex-1 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10 group-hover:scale-105 transition-transform duration-300">
              <img
                src={standbyTrack.thumbnail}
                alt={standbyTrack.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <Play className="w-5 h-5 fill-white text-white opacity-85" />
              </div>
            </div>

            <div className="overflow-hidden flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#fbbf24]" />
                <span className="text-[10px] font-mono-retro font-bold uppercase tracking-wider text-amber-400">
                  {standbyLabel}
                </span>
              </div>
              <p
                className={`font-stereo text-sm sm:text-base font-black tracking-wide truncate ${
                  isSteel ? 'text-black drop-shadow-none' : 'text-white'
                }`}
              >
                {standbyTrack.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
                <span className="truncate">{standbyTrack.artist}</span>
                {standbyTrack.source && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <SourceBadge source={standbyTrack.source} size="xs" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Standby Actions */}
          <div
            className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Shuffle button */}
            <button
              onClick={handleShuffleStandby}
              className={`p-2.5 rounded-xl border-t border-b-2 transition active:translate-y-0.5 cursor-pointer ${
                isSteel
                  ? 'retro-btn-aluminum shadow-md text-amber-900 border-slate-400'
                  : 'bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-white/20 border-black/80'
              }`}
              aria-label="Reproducción aleatoria"
              title="Aleatorio 🔀"
            >
              <Shuffle className="w-4 h-4 text-amber-400" />
            </button>

            {/* Play Standby Button */}
            <button
              onClick={handlePlayStandby}
              className="h-11 px-3.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black flex items-center gap-1.5 transition shadow-lg border-t border-white/40 border-b-2 border-amber-900 active:translate-y-0.5 cursor-pointer font-bold text-xs uppercase tracking-wider"
              aria-label="Poner a reproducir"
              title="PLAY ▶"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span className="hidden sm:inline font-mono-retro">Play</span>
            </button>
          </div>

          {/* Subtly glowing standby indicator line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400/20">
            <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
          </div>
        </div>
      </div>
    );
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
            className={`p-2.5 rounded-xl border-t border-b-2 transition active:translate-y-0.5 ${
              isSteel
                ? 'retro-btn-aluminum shadow-md text-amber-900 border-slate-400'
                : 'bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-white/20 border-black/80'
            }`}
            aria-label="Canción anterior"
            title="REW ⏪"
          >
            <SkipBack
              className={`w-4 h-4 ${
                isSteel ? 'text-amber-900 fill-amber-900' : 'text-amber-400 fill-amber-400'
              }`}
            />
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
            className={`p-2.5 rounded-xl border-t border-b-2 transition active:translate-y-0.5 ${
              isSteel
                ? 'retro-btn-aluminum shadow-md text-amber-900 border-slate-400'
                : 'bg-[#1d2330] hover:bg-[#252d3d] text-zinc-300 hover:text-white border-white/20 border-black/80'
            }`}
            aria-label="Siguiente"
            title="FF ⏩"
          >
            <SkipForward
              className={`w-4 h-4 ${
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
