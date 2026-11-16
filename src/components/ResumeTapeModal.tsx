import React from 'react';
import type { Playlist } from '../types/music';
import type { TapeProgress } from '../services/tapeProgressService';
import { Play, RotateCcw, X, CassetteTape } from 'lucide-react';

interface ResumeTapeModalProps {
  isOpen: boolean;
  playlist: Playlist | null;
  progress: TapeProgress | null;
  onResume: (playlist: Playlist, progress: TapeProgress) => void;
  onRestart: (playlist: Playlist) => void;
  onClose: () => void;
}

export const ResumeTapeModal: React.FC<ResumeTapeModalProps> = ({
  isOpen,
  playlist,
  progress,
  onResume,
  onRestart,
  onClose,
}) => {
  if (!isOpen || !playlist || !progress) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalTracks = playlist.tracks.length;
  const currentTrackNum = Math.min(progress.trackIndex + 1, totalTracks);
  const trackDuration = progress.duration || 0;
  const progressPercent =
    trackDuration > 0
      ? Math.min(100, Math.max(0, (progress.currentTime / trackDuration) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-md bg-[#131215] border-2 border-amber-600/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-white overflow-hidden z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at top, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
        }}
      >
        {/* Subtle Screws in corners for authentic retro chassis styling */}
        <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full border border-zinc-600 bg-zinc-800 flex items-center justify-center">
          <div className="w-1 h-px bg-zinc-400 rotate-45" />
        </div>
        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full border border-zinc-600 bg-zinc-800 flex items-center justify-center">
          <div className="w-1 h-px bg-zinc-400 -rotate-45" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full border border-zinc-600 bg-zinc-800 flex items-center justify-center">
          <div className="w-1 h-px bg-zinc-400 -rotate-12" />
        </div>
        <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full border border-zinc-600 bg-zinc-800 flex items-center justify-center">
          <div className="w-1 h-px bg-zinc-400 rotate-12" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition active:scale-95"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CassetteTape className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400/90 block">
              Pletina de Casetes • Detección de Posición
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              ¿Continuar cinta interrumpida?
            </h3>
          </div>
        </div>

        {/* Vintage Cassette Shell Graphic */}
        <div className="my-3 bg-zinc-900/90 border border-amber-600/30 rounded-2xl p-4 shadow-inner relative overflow-hidden">
          {/* Cassette Title Label (Paper sticker) */}
          <div className="bg-[#f2efe9] text-zinc-900 rounded-lg p-2.5 shadow-sm border border-zinc-300 mb-3 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[9px] font-mono text-zinc-500 block uppercase font-bold">
                CINTA SELECCIONADA
              </span>
              <p className="font-marker font-bold text-base text-[#153b6e] truncate">
                {playlist.name}
              </p>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded bg-zinc-900 text-amber-400 font-mono text-[10px] font-bold">
              CARA A
            </span>
          </div>

          {/* Interrupted Position Card */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-amber-300 font-semibold block">
                  Pista {currentTrackNum} de {totalTracks}
                </span>
                <p className="font-bold text-sm sm:text-base text-white truncate">
                  {progress.trackTitle}
                </p>
                <p className="text-xs text-zinc-400 truncate">{progress.trackArtist}</p>
              </div>

              {/* Tape counter readout */}
              <div className="text-right shrink-0 bg-black/60 px-2.5 py-1.5 rounded-lg border border-white/10 font-mono">
                <span className="text-[8px] text-zinc-500 block">CONTADOR</span>
                <span className="text-xs font-bold text-amber-400">
                  {formatTime(progress.currentTime)}
                </span>
              </div>
            </div>

            {/* Mini Analog Tape Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                <span>{formatTime(progress.currentTime)}</span>
                <span>{trackDuration > 0 ? formatTime(trackDuration) : '--:--'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 mt-4">
          {/* Button 1: Continuar donde se quedó */}
          <button
            onClick={() => onResume(playlist, progress)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-sm sm:text-base block leading-tight">
                  Continuar donde se quedó
                </span>
                <span className="text-[10px] text-black/80 font-mono block truncate">
                  Pista {currentTrackNum} • {formatTime(progress.currentTime)}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-black/70 shrink-0 ml-2">
              REANUDAR
            </span>
          </button>

          {/* Button 2: Empezar desde el principio */}
          <button
            onClick={() => onRestart(playlist)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-sm block leading-tight">
                  Empezar desde el principio
                </span>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  Pista 1 • 00:00 (Rebobinar cinta)
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400 shrink-0 ml-2">
              REBOBINAR
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
