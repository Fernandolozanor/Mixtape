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
      <div className="relative aspect-[1878/1304] w-full select-none overflow-visible">
        {/* Glow halo when actively playing */}
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 -m-1.5 rounded-2xl bg-amber-500/20 blur-xl pointer-events-none animate-pulse" />
        )}

        {/* LAYER 1: Physical Vinyl LP Disc that slides out on hover or when playing */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-[33.17%] z-0 transition-transform duration-300 ease-out ${
            isCurrent && isPlaying
              ? 'translate-x-3 sm:translate-x-4'
              : 'group-hover:translate-x-3 sm:group-hover:translate-x-4'
          }`}
          style={{ willChange: 'transform' }}
        >
          {/* Real Vinyl LP High-Res Texture */}
          <img
            src="./assets/disco_vinyl.png"
            alt="Vinyl Record"
            className={`w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] ${
              isCurrent && isPlaying ? 'filter brightness-105' : ''
            }`}
          />

          {/* White Center Label on the Vinyl: Exactly aligned with the white paper label */}
          <div
            className="absolute left-0 top-[30.7%] w-[33.2%] h-[38.3%] flex flex-col items-center justify-center text-center px-1 overflow-hidden pointer-events-none select-none z-10"
            style={{ borderRadius: '0 9999px 9999px 0' }}
          >
            {/* Top vintage label header */}
            <span className="text-[6.5px] sm:text-[7.5px] font-mono-retro font-extrabold tracking-widest text-zinc-500 uppercase leading-none truncate max-w-full">
              STEREO
            </span>

            {/* Song Title written in vintage ink on the blank circular center label */}
            <p
              className="text-[7.5px] sm:text-[9px] font-bold font-serif text-zinc-900 leading-[1.05] line-clamp-3 my-0.5 px-0.5"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                textShadow: '0 0 1px rgba(0,0,0,0.15)',
              }}
              title={track.title}
            >
              {track.title}
            </p>

            {/* Bottom spindle label footer */}
            <div className="flex items-center gap-1 text-[6px] sm:text-[7px] font-mono font-semibold text-zinc-600 leading-none">
              <span>FAV</span>
              <span>•</span>
              <span>33⅓</span>
            </div>
          </div>
        </div>

        {/* LAYER 2: Album Cover Sleeve Jacket (Left ~66.83% of the image) */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[66.83%] z-10 rounded-l-xl overflow-hidden bg-[#121620] shadow-[0_10px_25px_rgba(0,0,0,0.7)] border-l border-t border-b transition-colors duration-300 ${
            isCurrent && isPlaying
              ? 'border-amber-400/60 ring-2 ring-amber-400/40'
              : 'border-white/10 group-hover:border-white/20'
          }`}
        >
          {/* Album Cover Thumbnail Image */}
          {!imageError && track.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-400 select-none">
              <Disc3 className="w-10 h-10 mb-2 opacity-50 text-amber-400 animate-spin-slow" />
              <p className="text-[10px] font-mono-retro text-center line-clamp-2 px-1 text-zinc-300">
                {track.title}
              </p>
            </div>
          )}

          {/* Authentic Vintage Cardboard Ring Wear & Paper Texture Sheen */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18) 0%, transparent 58%, rgba(255,255,255,0.08) 64%, transparent 72%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />

          {/* Right Seam Shadow (Simulates opening slit of the cardboard slipcase) */}
          <div className="absolute right-0 top-0 bottom-0 w-3 sm:w-4 bg-gradient-to-l from-black/80 via-black/40 to-transparent pointer-events-none" />

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
