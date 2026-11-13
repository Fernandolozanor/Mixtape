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

  // Active Center View: 'cassette' | 'artwork' | 'lyrics' | 'queue'
  const [centerView, setCenterView] = useState<'cassette' | 'artwork' | 'lyrics' | 'queue'>('cassette');

  if (!isFullScreenPlayerOpen || !currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const isSteel = currentTheme.id === 'retro-rock-80s';

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
            FUENTE DE REPRODUCCIÓN
          </span>
          <span
            className="text-xs font-bold px-3 py-0.5 rounded-full mt-0.5 border"
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
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
          aria-label="Añadir a lista"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      </header>

      {/* Middle Interactive Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        {centerView === 'cassette' && (
          <div className="w-full max-w-xl my-auto px-2 animate-in fade-in duration-300">
            <RetroTapeDeck variant="fullscreen" />
          </div>
        )}

        {centerView === 'artwork' && (
          <div className="w-full max-w-sm aspect-square my-auto relative group animate-in fade-in duration-300">
            <div
              className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 transition-transform duration-500"
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
      <footer className="w-full max-w-xl mx-auto px-4 sm:px-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,20px)+1.5rem)] sm:pb-6 pt-1 sm:pt-2 space-y-2.5 sm:space-y-3.5 shrink-0">
        {/* Title, Artist and Heart */}
        <div className="flex items-center justify-between gap-4">
          <div className="overflow-hidden flex-1 min-w-0">
            <MarqueeTitle
              text={currentTrack.title}
              as="h2"
              className="font-rock text-2xl sm:text-4xl text-white tracking-widest drop-shadow-md"
            />
            <MarqueeTitle
              text={currentTrack.artist}
              as="p"
              className="text-sm sm:text-base text-amber-400 font-mono font-bold tracking-wide mt-0.5"
            />
          </div>

          <button
            onClick={() => toggleLike(currentTrack)}
            className="p-2 text-zinc-300 hover:text-amber-400 transition shrink-0"
            aria-label="Me gusta"
          >
            <Heart
              className="w-7 h-7 transition-colors"
              style={{
                fill: liked ? currentTheme.accent : 'none',
                color: liked ? currentTheme.accent : 'currentColor',
              }}
            />
          </button>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="space-y-1">
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
          <div className="flex justify-between text-xs font-mono-retro font-bold text-amber-400/90 tracking-wider">
            <span>{formatTime(currentTime)}</span>
            <span className="text-zinc-500 font-mono text-[10px] hidden xs:inline">HI-FI STEREO</span>
            <span>-{formatTime(remainingTime)}</span>
          </div>
        </div>

        {/* Playback Controls - Vintage 80s Hi-Fi Mechanical Key Deck */}
        <div className="flex items-center justify-between py-1">
          {/* Shuffle Button - Mechanical Toggle */}
          <button
            onClick={toggleShuffle}
            className={`p-2.5 sm:p-3 rounded-xl transition border active:translate-y-0.5 flex flex-col items-center gap-1 ${
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
            <Shuffle className="w-5 h-5" />
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
            className={`p-3 sm:p-3.5 rounded-2xl active:translate-y-0.5 shadow-lg transition flex flex-col items-center ${
              isSteel
                ? 'retro-btn-aluminum'
                : 'bg-[#1d2332] hover:bg-[#252e42] text-amber-400 border-t border-white/25 border-b-2 border-black/90'
            }`}
            aria-label="Anterior"
            title="REWIND ⏪"
          >
            <SkipBack
              className={`w-6 h-6 sm:w-7 sm:h-7 ${
                isSteel ? 'text-slate-900 fill-slate-900' : 'fill-amber-400 text-amber-400'
              }`}
            />
            {isSteel && (
              <span className="text-[7.5px] font-mono-retro font-black text-slate-700 mt-0.5">REW</span>
            )}
          </button>

          {/* Large Play/Pause Heavy Machined Switch */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex flex-col items-center justify-center transition shadow-2xl active:translate-y-1 ${
              isSteel
                ? 'retro-btn-aluminum border-2 border-slate-300 ring-2 ring-amber-500/30'
                : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black border-t-2 border-white/50 border-b-4 border-amber-950 hover:brightness-110'
            }`}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            title={isPlaying ? 'PAUSE ⏸' : 'PLAY ▶'}
          >
            {isLoading ? (
              <Loader2 className={`w-8 h-8 animate-spin ${isSteel ? 'text-slate-900' : 'text-black'}`} />
            ) : isPlaying ? (
              <Pause className={`w-8 h-8 ${isSteel ? 'fill-amber-600 text-amber-600' : 'fill-black text-black'}`} />
            ) : (
              <Play className={`w-8 h-8 ml-1 ${isSteel ? 'fill-slate-900 text-slate-900' : 'fill-black text-black'}`} />
            )}
            {isSteel && (
              <span className="text-[7.5px] font-mono-retro font-black text-slate-800 tracking-wider">
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </span>
            )}
          </button>

          {/* Next Track - Mechanical Milled Push Button */}
          <button
            onClick={nextTrack}
            className={`p-3 sm:p-3.5 rounded-2xl active:translate-y-0.5 shadow-lg transition flex flex-col items-center ${
              isSteel
                ? 'retro-btn-aluminum'
                : 'bg-[#1d2332] hover:bg-[#252e42] text-amber-400 border-t border-white/25 border-b-2 border-black/90'
            }`}
            aria-label="Siguiente"
            title="FAST FORWARD ⏩"
          >
            <SkipForward
              className={`w-6 h-6 sm:w-7 sm:h-7 ${
                isSteel ? 'text-slate-900 fill-slate-900' : 'fill-amber-400 text-amber-400'
              }`}
            />
            {isSteel && (
              <span className="text-[7.5px] font-mono-retro font-black text-slate-700 mt-0.5">FF</span>
            )}
          </button>

          {/* Repeat Button - Mechanical Toggle */}
          <button
            onClick={toggleRepeat}
            className={`p-2.5 sm:p-3 rounded-xl transition border active:translate-y-0.5 flex flex-col items-center gap-1 ${
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
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            {isSteel && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  repeatMode !== 'off' ? 'bg-amber-500 shadow-[0_0_5px_#f59e0b]' : 'bg-slate-400'
                }`}
              />
            )}
          </button>
        </div>

        {/* Vintage 80s Hi-Fi Volume Control - Separated and Touch-Optimized */}
        <div className="pt-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono-retro font-bold text-zinc-400 mb-1 px-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
              VOLUMEN
            </span>
            <span className="text-zinc-500 tracking-widest hidden xs:inline">
              0 • 2 • 4 • 6 • 8 • 10 • MAX
            </span>
            <span className="text-amber-400 font-bold">{Math.round(volume * 100)}%</span>
          </div>

          <div
            className={`flex items-center gap-3 p-2 rounded-xl shadow-inner ${
              isSteel
                ? 'bg-slate-900/90 border border-slate-700'
                : 'bg-black/50 border border-white/10'
            }`}
          >
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              className={`p-2 rounded-lg active:scale-95 transition shrink-0 border ${
                isSteel
                  ? 'retro-btn-aluminum'
                  : 'bg-white/5 hover:bg-white/10 text-amber-400 border-white/5'
              }`}
              aria-label={volume === 0 ? 'Activar sonido' : 'Silenciar'}
              title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
            >
              {volume === 0 ? (
                <VolumeX className="w-5 h-5 text-rose-400" />
              ) : (
                <Volume2 className={`w-5 h-5 ${isSteel ? 'text-slate-900' : 'text-amber-400'}`} />
              )}
            </button>

            <div className="relative flex-1 flex items-center py-2">
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
          </div>

          <p className="text-[9px] text-zinc-400 font-mono-retro text-center mt-1">
            {/iPhone|iPad|iPod/i.test(navigator.userAgent)
              ? 'En iOS el volumen de sonido se gradúa con los botones físicos del teléfono'
              : 'Desliza para regular el volumen o pulsa el botón para silenciar'}
          </p>
        </div>

        {/* Bottom Switcher: Cassette 80s / Artwork / Lyrics / Queue */}
        <div className="flex items-center justify-around pt-2 border-t border-white/10 flex-wrap gap-1">
          <button
            onClick={() => setCenterView('cassette')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              centerView === 'cassette'
                ? isSteel
                  ? 'retro-btn-aluminum text-slate-900 font-bold border-amber-600/60 shadow-md'
                  : 'bg-amber-400 text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Disc3 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
            <span>Cinta 80s</span>
          </button>

          <button
            onClick={() => setCenterView('artwork')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
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
