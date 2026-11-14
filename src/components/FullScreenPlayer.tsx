import React, { useState, useEffect } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { LyricsView } from './LyricsView';
import { QueueSheet } from './QueueSheet';
import { RetroTapeDeck } from './RetroTapeDeck';
import { MarqueeTitle } from './MarqueeTitle';
import { Disc3, Image as ImageIcon } from 'lucide-react';

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
  const { currentTheme } = useTheme();

  // Active Center View: 'deck' | 'artwork' | 'lyrics' | 'queue'
  // When 'deck' is active, RetroTapeDeck automatically displays vinyl for favorites and cassette for regular tracks
  const [centerView, setCenterView] = useState<'deck' | 'artwork' | 'lyrics' | 'queue'>('deck');

  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const isSteel = currentTheme.id === 'retro-rock-80s';

  // Fixed default view is always the retro deck
  useEffect(() => {
    if (currentTrack) {
      setCenterView('deck');
    }
  }, [currentTrack?.id]);

  if (!isFullScreenPlayerOpen || !currentTrack) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const remainingTime = duration > currentTime ? duration - currentTime : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-between overflow-hidden bg-black select-none safe-top safe-bottom animate-in fade-in slide-in-from-bottom duration-300">
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
      <header className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 shrink-0">
        <button
          onClick={() => setFullScreenPlayerOpen(false)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition active:scale-95"
          aria-label="Cerrar reproductor"
        >
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            FUENTE DE REPRODUCCIÓN
          </span>
          <span
            className="text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-0.5 rounded-full mt-0.5 border"
            style={{
              backgroundColor: currentTheme.badgeBg,
              color: currentTheme.badgeText,
              borderColor: currentTheme.badgeBorder,
            }}
          >
            {audioEngine.getSourceLabel(currentTrack.source)}
          </span>
        </div>

        <button
          onClick={onOpenAddToPlaylist}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition active:scale-95"
          aria-label="Añadir a lista"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      </header>

      {/* Middle Interactive Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-2 sm:px-6 min-h-0 overflow-hidden">
        {centerView === 'deck' && (
          <div className="w-full max-w-xl my-auto px-1 sm:px-2 animate-in fade-in duration-300">
            <RetroTapeDeck variant="fullscreen" />
          </div>
        )}

        {centerView === 'artwork' && (
          <div className="w-full max-w-[280px] sm:max-w-sm aspect-square my-auto relative group animate-in fade-in duration-300">
            <div
              className="w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 transition-transform duration-500"
              style={{
                boxShadow: `0 20px 50px rgba(${currentTheme.rgb}, 0.25)`,
              }}
            >
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {centerView === 'lyrics' && (
          <div className="w-full max-w-lg h-full my-auto overflow-y-auto">
            <LyricsView />
          </div>
        )}

        {centerView === 'queue' && (
          <div className="w-full max-w-lg h-full my-auto overflow-y-auto">
            <QueueSheet />
          </div>
        )}
      </main>

      {/* Bottom Controls Area */}
      <footer className="w-full max-w-xl mx-auto px-3.5 sm:px-6 pb-2.5 sm:pb-5 pt-1 space-y-1.5 sm:space-y-2.5 shrink-0">
        {/* Title, Artist and Heart */}
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="overflow-hidden flex-1 min-w-0">
            <MarqueeTitle
              text={currentTrack.title}
              as="h2"
              className="font-rock text-lg sm:text-2xl md:text-3xl text-white tracking-widest drop-shadow-md"
            />
            <MarqueeTitle
              text={currentTrack.artist}
              as="p"
              className="text-xs sm:text-sm text-amber-400 font-mono font-bold tracking-wide mt-0.5"
            />
          </div>

          <button
            onClick={() => toggleLike(currentTrack)}
            className="p-1.5 sm:p-2 text-zinc-300 hover:text-amber-400 transition shrink-0 active:scale-95"
            aria-label="Me gusta"
          >
            <Heart
              className="w-6 h-6 sm:w-7 sm:h-7 transition-colors"
              style={{
                fill: liked ? currentTheme.accent : 'none',
                color: liked ? currentTheme.accent : 'currentColor',
              }}
            />
          </button>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="space-y-0.5">
          <div className="relative group flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="retro-slider"
            />
          </div>
          <div className="flex justify-between text-[11px] sm:text-xs font-mono-retro font-bold text-amber-400/90 tracking-wider px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span className="text-zinc-500 font-mono text-[9px] sm:text-[10px] hidden xs:inline">HI-FI STEREO</span>
            <span>-{formatTime(remainingTime)}</span>
          </div>
        </div>

        {/* Playback Controls - Vintage 80s Hi-Fi Mechanical Key Deck */}
        <div className="flex items-center justify-between py-0.5 px-1">
          {/* Shuffle Button - Mechanical Toggle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 sm:p-2.5 rounded-xl transition border active:translate-y-0.5 flex flex-col items-center gap-0.5 ${
              isSteel
                ? 'retro-btn-aluminum shadow-md'
                : 'border-white/10'
            }`}
            style={
              isShuffle
                ? {
                    color: isSteel ? '#b45309' : '#fbbf24',
                    backgroundColor: isSteel ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)',
                    borderColor: 'rgba(245, 158, 11, 0.5)',
                  }
                : isSteel
                ? {}
                : { color: '#94a3b8', backgroundColor: '#131822' }
            }
            aria-label="Aleatorio"
            title="SHUFFLE MODE"
          >
            <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            {isSteel && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isShuffle ? 'bg-amber-500 shadow-[0_0_5px_#f59e0b]' : 'bg-slate-400'
                }`}
              />
            )}
          </button>

          {/* Previous Track - Mechanical Milled Push Button */}
          <button
            onClick={prevTrack}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl active:translate-y-0.5 shadow-lg transition flex flex-col items-center ${
              isSteel
                ? 'retro-btn-aluminum'
                : 'bg-[#1d2332] hover:bg-[#252e42] text-amber-400 border-t border-white/25 border-b-2 border-black/90'
            }`}
            aria-label="Anterior"
            title="REWIND ⏪"
          >
            <SkipBack
              className={`w-5 h-5 sm:w-6 sm:h-6 ${
                isSteel ? 'text-slate-900 fill-slate-900' : 'fill-amber-400 text-amber-400'
              }`}
            />
            {isSteel && (
              <span className="text-[7px] font-mono-retro font-black text-slate-700 mt-0.5">REW</span>
            )}
          </button>

          {/* Large Play/Pause Heavy Machined Switch */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`w-13 h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition shadow-2xl active:translate-y-1 ${
              isSteel
                ? 'retro-btn-aluminum border-2 border-slate-300 ring-2 ring-amber-500/30'
                : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black border-t-2 border-white/50 border-b-4 border-amber-950 hover:brightness-110'
            }`}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            title={isPlaying ? 'PAUSE ⏸' : 'PLAY ▶'}
          >
            {isLoading ? (
              <Loader2 className={`w-7 h-7 sm:w-8 sm:h-8 animate-spin ${isSteel ? 'text-slate-900' : 'text-black'}`} />
            ) : isPlaying ? (
              <Pause className={`w-7 h-7 sm:w-8 sm:h-8 ${isSteel ? 'fill-amber-600 text-amber-600' : 'fill-black text-black'}`} />
            ) : (
              <Play className={`w-7 h-7 sm:w-8 sm:h-8 ml-0.5 ${isSteel ? 'fill-slate-900 text-slate-900' : 'fill-black text-black'}`} />
            )}
            {isSteel && (
              <span className="text-[7px] font-mono-retro font-black text-slate-800 tracking-wider">
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </span>
            )}
          </button>

          {/* Next Track - Mechanical Milled Push Button */}
          <button
            onClick={nextTrack}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl active:translate-y-0.5 shadow-lg transition flex flex-col items-center ${
              isSteel
                ? 'retro-btn-aluminum'
                : 'bg-[#1d2332] hover:bg-[#252e42] text-amber-400 border-t border-white/25 border-b-2 border-black/90'
            }`}
            aria-label="Siguiente"
            title="FAST FORWARD ⏩"
          >
            <SkipForward
              className={`w-5 h-5 sm:w-6 sm:h-6 ${
                isSteel ? 'text-slate-900 fill-slate-900' : 'fill-amber-400 text-amber-400'
              }`}
            />
            {isSteel && (
              <span className="text-[7px] font-mono-retro font-black text-slate-700 mt-0.5">FF</span>
            )}
          </button>

          {/* Repeat Button - Mechanical Toggle */}
          <button
            onClick={toggleRepeat}
            className={`p-2 sm:p-2.5 rounded-xl transition border active:translate-y-0.5 flex flex-col items-center gap-0.5 ${
              isSteel
                ? 'retro-btn-aluminum shadow-md'
                : 'rounded-full'
            }`}
            style={
              repeatMode !== 'off'
                ? {
                    color: isSteel ? '#b45309' : currentTheme.accent,
                    backgroundColor: isSteel ? '#fef3c7' : `rgba(${currentTheme.rgb}, 0.2)`,
                    borderColor: 'rgba(245, 158, 11, 0.5)',
                  }
                : isSteel
                ? {}
                : { color: '#a1a1aa' }
            }
            aria-label="Repetir"
            title="REPEAT MODE"
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
            {isSteel && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  repeatMode !== 'off' ? 'bg-amber-500 shadow-[0_0_5px_#f59e0b]' : 'bg-slate-400'
                }`}
              />
            )}
          </button>
        </div>

        {/* Vintage 80s Hi-Fi Volume Control - Sleek Single Row */}
        <div
          className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 rounded-xl shadow-inner ${
            isSteel
              ? 'bg-slate-900/90 border border-slate-700'
              : 'bg-black/50 border border-white/10'
          }`}
        >
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className={`p-1.5 rounded-lg active:scale-95 transition shrink-0 border ${
              isSteel
                ? 'retro-btn-aluminum'
                : 'bg-white/5 hover:bg-white/10 text-amber-400 border-white/5'
            }`}
            aria-label={volume === 0 ? 'Activar sonido' : 'Silenciar'}
            title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className={`w-4 h-4 ${isSteel ? 'text-slate-900' : 'text-amber-400'}`} />
            )}
          </button>

          <span className="text-[9px] font-mono-retro font-bold text-amber-400 uppercase tracking-wider hidden xs:inline shrink-0">
            VOL
          </span>

          <div className="relative flex-1 flex items-center py-1">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              onInput={(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))}
              className="retro-slider"
              aria-label="Control de volumen"
            />
          </div>

          <span className="text-[10px] sm:text-xs font-mono-retro font-bold text-amber-400 w-8 text-right shrink-0">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Bottom Switcher: Reproductor Retro / Portada / Letra / Cola */}
        <div className="flex items-center justify-around pt-1 border-t border-white/10 flex-wrap gap-1">
          <button
            onClick={() => setCenterView('deck')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition ${
              centerView === 'deck'
                ? isSteel
                  ? 'retro-btn-aluminum text-slate-900 font-bold border-amber-600/60 shadow-md'
                  : 'bg-amber-400 text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Disc3 className={`w-3.5 h-3.5 ${isPlaying && centerView === 'deck' ? 'animate-spin' : ''}`} />
            <span>{liked ? 'Vinilo' : 'Cinta'}</span>
          </button>

          <button
            onClick={() => setCenterView('artwork')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition ${
              centerView === 'artwork'
                ? isSteel
                  ? 'retro-btn-aluminum text-slate-900 font-bold shadow-md'
                  : 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Portada</span>
          </button>

          <button
            onClick={() => setCenterView('lyrics')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition ${
              centerView === 'lyrics'
                ? isSteel
                  ? 'retro-btn-aluminum text-slate-900 font-bold shadow-md'
                  : 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>Letra</span>
          </button>

          <button
            onClick={() => setCenterView('queue')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition ${
              centerView === 'queue'
                ? isSteel
                  ? 'retro-btn-aluminum text-slate-900 font-bold shadow-md'
                  : 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Cola</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
