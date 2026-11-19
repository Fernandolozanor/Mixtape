import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
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
import { LyricsView } from './LyricsView';
import { QueueSheet } from './QueueSheet';
import { RetroTapeDeck } from './RetroTapeDeck';
import { MarqueeTitle } from './MarqueeTitle';
import { SourceBadge } from './SourceBadge';
import { Disc3, Gauge } from 'lucide-react';
import { bpmService } from '../services/bpmService';

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
    fastForward,
    rewind,
    scrubDirection,
    scrubSpeed,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    playbackRate,
    setPlaybackRate,
    repeatMode,
    toggleRepeat,
    isShuffle,
    toggleShuffle,
    isFullScreenPlayerOpen,
    deckActivationTrigger,
    setFullScreenPlayerOpen,
    playbackMediaType,
  } = usePlayer();

  const { isLiked, toggleLike, settings } = useLibrary();
  const { currentTheme } = useTheme();

  // Active Center View: 'deck' | 'lyrics' | 'queue'
  // When 'deck' is active, RetroTapeDeck automatically displays vinyl for saved albums and cassette for other tracks
  const [centerView, setCenterView] = useState<'deck' | 'lyrics' | 'queue'>('deck');
  const [showPitchControl, setShowPitchControl] = useState(false);

  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const isSteel = currentTheme.id === 'retro-rock-80s' || settings.themeMode === 'light';

  // Ensure retro deck (cassette or vinyl as appropriate) is activated when track changes or 3-second auto-trigger fires
  useEffect(() => {
    if (currentTrack) {
      setCenterView('deck');
    }
  }, [currentTrack?.id, deckActivationTrigger, playbackMediaType]);

  if (!isFullScreenPlayerOpen || !currentTrack) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const remainingTime = duration > currentTime ? duration - currentTime : 0;

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col justify-between overflow-hidden ${
        settings.themeMode === 'light' ? 'bg-[#cbd2dc]' : 'bg-black'
      } select-none safe-top safe-bottom animate-in fade-in slide-in-from-bottom duration-300`}
    >
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
      <header className="flex items-center justify-between px-4 sm:px-6 py-1.5 sm:py-2.5 shrink-0">
        <button
          onClick={() => setFullScreenPlayerOpen(false)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition active:scale-95"
          aria-label="Cerrar reproductor"
        >
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
            FUENTE DE AUDIO
          </span>
          <SourceBadge source={currentTrack.source} size="md" />
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
      <main className="flex-1 flex flex-col items-center justify-center px-2 sm:px-6 min-h-0 overflow-hidden pb-1 sm:pb-3">
        {centerView === 'deck' && (
          <div className="w-full max-w-xl my-auto px-1 sm:px-2 animate-in fade-in duration-300">
            <RetroTapeDeck variant="fullscreen" />
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
      <footer className="w-full max-w-xl mx-auto px-3.5 sm:px-6 pb-3 sm:pb-6 pt-0 space-y-2 sm:space-y-3 shrink-0">
        {/* Title, Artist and Heart */}
        <div className="flex items-center justify-between gap-3 px-0.5 mb-0.5">
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
        <div className="w-full py-0.5">
          <div className="relative group flex items-center h-6 sm:h-7 px-0.5">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="retro-slider"
            />
          </div>
          <div className="flex justify-between items-center text-[11px] sm:text-xs font-mono-retro font-bold text-amber-400/90 tracking-wider px-1 mt-2.5">
            <span>{formatTime(currentTime)}</span>
            {scrubDirection && scrubSpeed ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-400 font-mono text-[10px] sm:text-[11px] font-black animate-pulse">
                {scrubDirection === 'forward' ? '⏩' : '⏪'}{' '}
                {String(scrubSpeed).replace('.', ',')}x • PULSA ▶
              </span>
            ) : (
              <span className="text-zinc-500 font-mono text-[9px] sm:text-[10px] hidden xs:inline">HI-FI STEREO</span>
            )}
            <span>-{formatTime(remainingTime)}</span>
          </div>
        </div>

        {/* Playback Controls - Vintage 80s Hi-Fi Mechanical Key Deck */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 py-1 px-0.5 sm:px-1">
          {/* Shuffle Button - Mechanical Toggle */}
          <button
            onClick={toggleShuffle}
            className={`p-1.5 sm:p-2.5 rounded-xl transition border active:translate-y-0.5 flex flex-col items-center gap-0.5 ${
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
            <Shuffle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
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
            className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl active:translate-y-0.5 shadow-lg transition flex flex-col items-center ${
              isSteel
                ? 'retro-btn-aluminum'
                : 'bg-[#1d2332] hover:bg-[#252e42] text-amber-400 border-t border-white/25 border-b-2 border-black/90'
            }`}
            aria-label="Canción anterior"
            title="ANTERIOR ⏮"
          >
            <SkipBack
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                isSteel ? 'text-slate-900 fill-slate-900' : 'fill-amber-400 text-amber-400'
              }`}
            />
            {isSteel && (
              <span className="text-[6.5px] font-mono-retro font-black text-slate-700 mt-0.5">PREV</span>
            )}
          </button>

          {/* Rewind (Retrasar) - 1,5x -> 2x -> 4x -> 8x -> 1,5x */}
          <button
            onClick={rewind}
            className={`relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl active:translate-y-0.5 shadow-lg transition flex flex-col items-center ${
              scrubDirection === 'backward'
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black border-t border-white/50 border-b-2 border-amber-900 ring-2 ring-amber-400/50'
                : isSteel
                ? 'retro-btn-aluminum'
                : 'bg-[#1d2332] hover:bg-[#252e42] text-amber-400 border-t border-white/25 border-b-2 border-black/90'
            }`}
            aria-label="Retrasar"
            title="Retrasar (1,5x / 2x / 4x / 8x)"
          >
            <Rewind
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                scrubDirection === 'backward'
                  ? 'fill-black text-black'
                  : isSteel
                  ? 'text-slate-900 fill-slate-900'
                  : 'fill-amber-400 text-amber-400'
              }`}
            />
            <span
              className={`text-[6.5px] sm:text-[7.5px] font-mono-retro font-black mt-0.5 leading-none ${
                scrubDirection === 'backward'
                  ? 'text-black'
                  : isSteel
                  ? 'text-slate-700'
                  : 'text-amber-300/80'
              }`}
            >
              {scrubDirection === 'backward' && scrubSpeed
                ? `${String(scrubSpeed).replace('.', ',')}x`
                : 'REW'}
            </span>
          </button>

          {/* Large Play/Pause Heavy Machined Switch */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`w-12 h-12 sm:w-15 sm:h-15 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition shadow-2xl active:translate-y-1 shrink-0 ${
              isSteel
                ? 'retro-btn-aluminum border-2 border-slate-300 ring-2 ring-amber-500/30'
                : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black border-t-2 border-white/50 border-b-4 border-amber-950 hover:brightness-110'
            }`}
            aria-label={isPlaying && !scrubDirection ? 'Pausar' : 'Reproducir'}
            title={scrubDirection ? 'PLAY ▶ (Velocidad normal)' : isPlaying ? 'PAUSE ⏸' : 'PLAY ▶'}
          >
            {isLoading ? (
              <Loader2 className={`w-6 h-6 sm:w-7 sm:h-7 animate-spin ${isSteel ? 'text-slate-900' : 'text-black'}`} />
            ) : isPlaying && !scrubDirection ? (
              <Pause className={`w-6 h-6 sm:w-7 sm:h-7 ${isSteel ? 'fill-amber-600 text-amber-600' : 'fill-black text-black'}`} />
            ) : (
              <Play className={`w-6 h-6 sm:w-7 sm:h-7 ml-0.5 ${isSteel ? 'fill-slate-900 text-slate-900' : 'fill-black text-black'}`} />
            )}
            {isSteel && (
              <span className="text-[7px] font-mono-retro font-black text-slate-800 tracking-wider">
                {isPlaying && !scrubDirection ? 'PAUSE' : 'PLAY'}
              </span>
            )}
          </button>

          {/* Fast Forward (Adelantar) - 1,5x -> 2x -> 4x -> 8x -> 1,5x */}
          <button
            onClick={fastForward}
            className={`relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl active:translate-y-0.5 shadow-lg transition flex flex-col items-center ${
              scrubDirection === 'forward'
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black border-t border-white/50 border-b-2 border-amber-900 ring-2 ring-amber-400/50'
                : isSteel
                ? 'retro-btn-aluminum'
                : 'bg-[#1d2332] hover:bg-[#252e42] text-amber-400 border-t border-white/25 border-b-2 border-black/90'
            }`}
            aria-label="Adelantar"
            title="Adelantar (1,5x / 2x / 4x / 8x)"
          >
            <FastForward
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                scrubDirection === 'forward'
                  ? 'fill-black text-black'
                  : isSteel
                  ? 'text-slate-900 fill-slate-900'
                  : 'fill-amber-400 text-amber-400'
              }`}
            />
            <span
              className={`text-[6.5px] sm:text-[7.5px] font-mono-retro font-black mt-0.5 leading-none ${
                scrubDirection === 'forward'
                  ? 'text-black'
                  : isSteel
                  ? 'text-slate-700'
                  : 'text-amber-300/80'
              }`}
            >
              {scrubDirection === 'forward' && scrubSpeed
                ? `${String(scrubSpeed).replace('.', ',')}x`
                : 'FF'}
            </span>
          </button>

          {/* Next Track - Mechanical Milled Push Button */}
          <button
            onClick={nextTrack}
            className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl active:translate-y-0.5 shadow-lg transition flex flex-col items-center ${
              isSteel
                ? 'retro-btn-aluminum'
                : 'bg-[#1d2332] hover:bg-[#252e42] text-amber-400 border-t border-white/25 border-b-2 border-black/90'
            }`}
            aria-label="Siguiente canción"
            title="SIGUIENTE ⏭"
          >
            <SkipForward
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                isSteel ? 'text-slate-900 fill-slate-900' : 'fill-amber-400 text-amber-400'
              }`}
            />
            {isSteel && (
              <span className="text-[6.5px] font-mono-retro font-black text-slate-700 mt-0.5">NEXT</span>
            )}
          </button>

          {/* Repeat Button - Mechanical Toggle */}
          <button
            onClick={toggleRepeat}
            className={`p-1.5 sm:p-2.5 rounded-xl transition border active:translate-y-0.5 flex flex-col items-center gap-0.5 ${
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
            {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <Repeat className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
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

          <div className="relative flex-1 flex items-center h-6 sm:h-7 py-0.5">
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

        {/* Technics Quartz Pitch / RPM Speed Control (Collapsible) */}
        {(showPitchControl || playbackRate !== 1) && (
          <div
            className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 rounded-xl shadow-inner animate-in fade-in ${
              isSteel
                ? 'bg-slate-900/90 border border-slate-700'
                : 'bg-black/50 border border-white/10'
            }`}
          >
            <button
              onClick={() => setPlaybackRate(1)}
              className={`px-2 py-1 rounded-lg active:scale-95 transition shrink-0 border text-[10px] font-mono-retro font-bold flex items-center gap-1 ${
                playbackRate === 1
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
              title="Restablecer velocidad original (Quartz Lock 0%)"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>
                {Math.round(bpmService.getTrackBpm(currentTrack) * playbackRate)} BPM
              </span>
            </button>

            <span className="text-[9px] font-mono-retro font-bold text-zinc-400 uppercase tracking-wider hidden xs:inline shrink-0">
              PITCH
            </span>

            <div className="relative flex-1 flex items-center h-6 sm:h-7 py-0.5">
              <input
                type="range"
                min={0.85}
                max={1.15}
                step={0.01}
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="retro-slider"
                aria-label="Control de velocidad Pitch / RPM"
              />
            </div>

            <span className="text-[10px] sm:text-xs font-mono-retro font-bold text-emerald-400 w-10 text-right shrink-0">
              {playbackRate >= 1 ? '+' : ''}
              {Math.round((playbackRate - 1) * 100)}%
            </span>
          </div>
        )}

        {/* Bottom Switcher: Cinta/Vinilo / Letra / Cola / Pitch */}
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

          <button
            onClick={() => setShowPitchControl((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition ${
              showPitchControl || playbackRate !== 1
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            title="Mostrar/ocultar control de velocidad Pitch / BPM"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Pitch</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
