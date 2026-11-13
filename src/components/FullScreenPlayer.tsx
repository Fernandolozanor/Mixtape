import React, { useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Quote,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { LyricsView } from './LyricsView';
import { QueueSheet } from './QueueSheet';

interface FullScreenPlayerProps {
  onOpenAddToPlaylist: () => void;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ onOpenAddToPlaylist }) => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    repeatMode,
    toggleRepeat,
    isShuffle,
    toggleShuffle,
    isFullScreenPlayerOpen,
    setFullScreenPlayerOpen,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();

  // Active Center View: 'artwork' | 'lyrics' | 'queue'
  const [centerView, setCenterView] = useState<'artwork' | 'lyrics' | 'queue'>('artwork');

  if (!isFullScreenPlayerOpen || !currentTrack) return null;

  const liked = isLiked(currentTrack.id);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const remainingTime = duration > currentTime ? duration - currentTime : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-black select-none safe-top safe-bottom animate-in fade-in slide-in-from-bottom duration-300">
      {/* Blurred Album Art Ambient Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <img
          src={currentTrack.thumbnail}
          alt=""
          className="w-full h-full object-cover scale-150 blur-3xl opacity-40 brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      </div>

      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 shrink-0">
        <button
          onClick={() => setFullScreenPlayerOpen(false)}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
          aria-label="Cerrar reproductor"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            REPRODUCIENDO DE {currentTrack.source.toUpperCase()}
          </span>
          <span className="text-xs font-semibold text-pink-400">AUDIO SIN ANUNCIOS</span>
        </div>

        <button
          onClick={onOpenAddToPlaylist}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
          aria-label="Añadir a lista"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      </header>

      {/* Middle Interactive Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        {centerView === 'artwork' && (
          <div className="w-full max-w-sm aspect-square my-auto relative group">
            <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/10 border border-white/10 transition-transform duration-500">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {centerView === 'lyrics' && (
          <div className="w-full max-w-lg h-full my-auto">
            <LyricsView />
          </div>
        )}

        {centerView === 'queue' && (
          <div className="w-full max-w-lg h-full my-auto">
            <QueueSheet />
          </div>
        )}
      </main>

      {/* Bottom Controls Area */}
      <footer className="w-full max-w-xl mx-auto px-6 pb-6 pt-2 space-y-4 shrink-0">
        {/* Title, Artist and Heart */}
        <div className="flex items-center justify-between gap-4">
          <div className="overflow-hidden">
            <h2 className="text-xl md:text-2xl font-bold text-white truncate drop-shadow-md">
              {currentTrack.title}
            </h2>
            <p className="text-sm md:text-base text-zinc-300 font-medium truncate">
              {currentTrack.artist}
            </p>
          </div>

          <button
            onClick={() => toggleLike(currentTrack)}
            className="p-2 text-zinc-300 hover:text-pink-500 transition shrink-0"
            aria-label="Me gusta"
          >
            <Heart
              className={`w-7 h-7 ${
                liked ? 'fill-pink-500 text-pink-500' : 'text-zinc-300'
              }`}
            />
          </button>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="space-y-1.5">
          <div className="relative group flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:h-2 transition-all"
            />
          </div>
          <div className="flex justify-between text-xs font-semibold text-zinc-400 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(remainingTime)}</span>
          </div>
        </div>

        {/* Playback Controls (Apple Music Style) */}
        <div className="flex items-center justify-between py-1">
          {/* Shuffle Button */}
          <button
            onClick={toggleShuffle}
            className={`p-3 rounded-full transition ${
              isShuffle ? 'text-pink-500 bg-pink-500/10' : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Aleatorio"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={prevTrack}
            className="p-3 text-white hover:scale-110 active:scale-95 transition"
            aria-label="Anterior"
          >
            <SkipBack className="w-8 h-8 fill-current" />
          </button>

          {/* Large Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-18 h-18 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xl shadow-white/20"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 fill-black" />
            ) : (
              <Play className="w-8 h-8 fill-black ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={nextTrack}
            className="p-3 text-white hover:scale-110 active:scale-95 transition"
            aria-label="Siguiente"
          >
            <SkipForward className="w-8 h-8 fill-current" />
          </button>

          {/* Repeat Button */}
          <button
            onClick={toggleRepeat}
            className={`p-3 rounded-full transition ${
              repeatMode !== 'off'
                ? 'text-pink-500 bg-pink-500/10'
                : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Repetir"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className="text-zinc-400 hover:text-white transition"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Bottom Switcher: Artwork / Lyrics / Queue */}
        <div className="flex items-center justify-around pt-3 border-t border-white/10">
          <button
            onClick={() => setCenterView(centerView === 'lyrics' ? 'artwork' : 'lyrics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              centerView === 'lyrics'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Quote className="w-4 h-4" />
            <span>Letra</span>
          </button>

          <button
            onClick={() => setCenterView(centerView === 'queue' ? 'artwork' : 'queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              centerView === 'queue'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Cola</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
