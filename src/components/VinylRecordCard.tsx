import React, { useState } from 'react';
import { Play, Disc3, Trash2 } from 'lucide-react';
import type { Track } from '../types/music';

interface VinylRecordCardProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove?: () => void;
  isEditingMode?: boolean;
}

export const VinylRecordCard: React.FC<VinylRecordCardProps> = ({
  track,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  onRemove,
  isEditingMode = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditingMode) return;
    e.stopPropagation();
    onPlay();
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col transition-all duration-300 ${
        isEditingMode ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      {/* 3D Vinyl Album Jacket & LP Protruding Assembly */}
      <div className="relative aspect-[1.38/1] w-full select-none overflow-visible">
        {/* Glow halo when actively playing */}
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 -m-1.5 rounded-2xl bg-amber-500/20 blur-xl pointer-events-none animate-pulse" />
        )}

        {/* LAYER 1: Full Circular Vinyl Record that slides out smoothly from inside the sleeve */}
        <div
          className={`absolute top-[3%] bottom-[3%] right-0 aspect-square z-0 transition-all duration-500 ease-out ${
            isCurrent && isPlaying
              ? 'translate-x-[26%] sm:translate-x-[30%]'
              : 'translate-x-[8%] group-hover:translate-x-[26%] sm:group-hover:translate-x-[30%]'
          }`}
          style={{ willChange: 'transform' }}
        >
          {/* Full Circular LP Disc with 33⅓ RPM Rotation when playing */}
          <div
            className="w-full h-full rounded-full relative overflow-hidden shadow-[-6px_0_18px_rgba(0,0,0,0.85)] drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]"
            style={{
              animation: isPlaying && isCurrent ? 'vinyl-spin 1.8s linear infinite' : 'none',
              transformOrigin: 'center center',
            }}
          >
            {/* Real Full Vinyl Texture (VINILO.png) */}
            <img
              src="./assets/vinilo.png"
              alt="Vinyl Record"
              className={`w-full h-full object-cover rounded-full pointer-events-none select-none ${
                isCurrent && isPlaying ? 'filter brightness-105' : ''
              }`}
            />

            {/* White Circular Center Label with printed song title & artist */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34%] h-[34%] rounded-full flex flex-col items-center justify-center text-center px-1.5 overflow-hidden pointer-events-none select-none z-10 bg-[#f4f3ef] shadow-inner border border-zinc-400/40"
            >
              {/* Spindle hole in center */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-zinc-950 border border-zinc-700 shadow-inner z-20" />

              {/* Label Top Header */}
              <span className="text-[6.5px] sm:text-[7.5px] font-mono-retro font-extrabold tracking-widest text-zinc-600 uppercase leading-none truncate max-w-full mb-0.5">
                STEREO • 33⅓
              </span>

              {/* Song Title printed on center label */}
              <p
                className="text-[7.5px] sm:text-[9px] font-bold font-serif text-zinc-950 leading-[1.05] line-clamp-2 px-1 max-w-full"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  textShadow: '0 0 1px rgba(0,0,0,0.15)',
                }}
                title={track.title}
              >
                {track.title}
              </p>

              {/* Artist Name */}
              <p className="text-[6.5px] sm:text-[7.5px] font-mono font-bold text-zinc-700 truncate max-w-full px-1 mt-0.5">
                {track.artist}
              </p>
            </div>
          </div>
        </div>

        {/* LAYER 2: Album Cover Sleeve Jacket (Uses FUNDA.jpg with track artwork pasted on front) */}
        <div
          className={`absolute left-0 top-0 bottom-0 aspect-[1261/1304] z-10 rounded-xl overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.85)] border transition-all duration-300 ${
            isCurrent && isPlaying
              ? 'border-amber-400/70 ring-2 ring-amber-400/40 shadow-amber-500/10'
              : 'border-white/10 group-hover:border-white/20'
          }`}
        >
          {/* Cardboard Sleeve Base Texture (FUNDA.jpg) */}
          <img
            src="./assets/funda.jpg"
            alt="Funda"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />

          {/* Pasted Album Artwork on the Sleeve Front */}
          {!imageError && track.thumbnail ? (
            <div className="absolute inset-0 z-1 overflow-hidden">
              <img
                src={track.thumbnail}
                alt={track.title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="absolute inset-0 z-1 flex flex-col items-center justify-center p-3 bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-400 select-none">
              <Disc3 className="w-10 h-10 mb-2 opacity-50 text-amber-400 animate-spin-slow" />
              <p className="text-[10px] font-mono-retro text-center line-clamp-2 px-1 text-zinc-300">
                {track.title}
              </p>
            </div>
          )}

          {/* Vintage Cardboard Ring Wear Overlay & Grain */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay z-2"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.25) 0%, transparent 60%, rgba(255,255,255,0.12) 68%, transparent 75%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-transparent to-white/15 pointer-events-none z-2" />

          {/* Right Sleeve Opening Slit Shadow */}
          <div className="absolute right-0 top-0 bottom-0 w-3 sm:w-4 bg-gradient-to-l from-black/90 via-black/45 to-transparent pointer-events-none z-3" />

          {/* Track Number Badge */}
          <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[9px] sm:text-[10px] font-mono text-zinc-300 font-bold shadow-md">
            #{index + 1}
          </div>

          {/* Actively Playing Soundwave / Neon Badge */}
          {isCurrent && isPlaying && (
            <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded-full bg-amber-400 text-black font-extrabold text-[8.5px] sm:text-[9.5px] font-mono-retro shadow-lg flex items-center gap-1.5 animate-pulse">
              <span className="flex items-end gap-0.5 h-2.5">
                <span className="w-0.5 h-full bg-black rounded-full animate-bounce" />
                <span className="w-0.5 h-2/3 bg-black rounded-full animate-bounce delay-75" />
                <span className="w-0.5 h-4/5 bg-black rounded-full animate-bounce delay-150" />
              </span>
              <span>EN VIVO</span>
            </div>
          )}

          {/* Play Hover Overlay Button */}
          {!isEditingMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-2xl transform group-hover:scale-105 active:scale-95 transition-transform">
                <Play className="w-5 h-5 fill-black ml-0.5" />
              </div>
            </div>
          )}

          {/* Delete Button in Edit Mode */}
          {isEditingMode && onRemove && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl hover:scale-110 active:scale-95 transition"
                title="Eliminar de favoritos"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Below Disc for Quick Reading */}
      <div className="mt-2.5 px-1 min-w-0">
        <h4
          className={`text-xs sm:text-sm font-bold truncate transition-colors ${
            isCurrent
              ? 'text-amber-400'
              : 'text-zinc-100 group-hover:text-amber-300'
          }`}
          title={track.title}
        >
          {track.title}
        </h4>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-0.5">
          <p className="truncate mr-2 font-medium">{track.artist || 'Artista Desconocido'}</p>
          <span className="shrink-0 font-mono text-[10px] text-zinc-500">
            {formatDuration(track.duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
