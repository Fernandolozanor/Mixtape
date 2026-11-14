import React from 'react';
import type { Playlist } from '../types/music';
import { Play, Plus, Info } from 'lucide-react';

interface CassetteRackProps {
  playlists: Playlist[];
  onSelectPlaylist: (id: string) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onNewPlaylist: () => void;
}

// 48 Cassette Slots Configuration (3 Shelves x 4 Stacks x 4 Tapes)
interface SlotDef {
  index: number;
  top: string;
  left: string;
  width: string;
  height: string;
  labelLeft: string;
  labelWidth: string;
}

const SHELVES = [
  { top: 9.6, height: 20.6 },  // Top Shelf
  { top: 41.6, height: 21.6 }, // Middle Shelf
  { top: 74.0, height: 21.6 }, // Bottom Shelf
];

const COLUMNS = [
  { left: 4.8, width: 21.8, labelLeft: '28%', labelWidth: '58%' },
  { left: 27.5, width: 21.8, labelLeft: '28%', labelWidth: '58%' },
  { left: 50.3, width: 22.8, labelLeft: '27%', labelWidth: '59%' },
  { left: 74.0, width: 20.8, labelLeft: '26%', labelWidth: '58%' },
];

// Pre-compute 48 slots ordered by shelf (left to right, top to bottom within each stack)
const SLOTS: SlotDef[] = [];
let slotCounter = 0;

for (let s = 0; s < SHELVES.length; s++) {
  const shelf = SHELVES[s];
  const rowH = shelf.height / 4;

  for (let c = 0; c < COLUMNS.length; c++) {
    const col = COLUMNS[c];

    for (let r = 0; r < 4; r++) {
      const topPct = shelf.top + r * rowH;
      SLOTS.push({
        index: slotCounter++,
        top: `${topPct.toFixed(2)}%`,
        left: `${col.left.toFixed(2)}%`,
        width: `${col.width.toFixed(2)}%`,
        height: `${rowH.toFixed(2)}%`,
        labelLeft: col.labelLeft,
        labelWidth: col.labelWidth,
      });
    }
  }
}

export const CassetteRack: React.FC<CassetteRackProps> = ({
  playlists,
  onSelectPlaylist,
  onPlayPlaylist,
  onNewPlaylist,
}) => {
  return (
    <div className="w-full relative select-none rounded-3xl overflow-hidden shadow-2xl border-4 border-[#332215] bg-[#1a110a]">
      {/* Aspect ratio frame 2530:1536 (1.647:1) for pixel-perfect alignment */}
      <div className="w-full relative aspect-[2530/1536]">
        {/* Background Image: Authentic Wooden Cassette Rack with 48 Tapes */}
        <img
          src="./assets/cintas.jpg"
          alt="Estantería de cintas de casette analógicas"
          className="w-full h-full object-cover select-none pointer-events-none filter contrast-105 brightness-95"
        />

        {/* Subtle Warm Amber Lighting Gradient overlay across shelves */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-amber-900/5 to-black/20 pointer-events-none" />

        {/* 48 Interactive Cassette Slots */}
        {SLOTS.map((slot) => {
          const playlist = playlists[slot.index];
          const hasPlaylist = !!playlist;
          const isOdd = slot.index % 2 === 1;

          // Ink color: alternating authentic Bic Ballpoint Blue and Pilot Red
          const inkColor = isOdd ? '#b91c1c' : '#153b6e';
          const textShadow = isOdd
            ? '0 0 0.5px rgba(185, 28, 28, 0.7), 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.15)'
            : '0 0 0.5px rgba(21, 59, 110, 0.7), 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.15)';
          const inkRotation = (slot.index % 3 === 0 ? -0.35 : slot.index % 2 === 0 ? 0.35 : -0.15) + 'deg';

          return (
            <div
              key={slot.index}
              onClick={() => {
                if (hasPlaylist) {
                  onPlayPlaylist(playlist);
                } else {
                  onNewPlaylist();
                }
              }}
              style={{
                top: slot.top,
                left: slot.left,
                width: slot.width,
                height: slot.height,
              }}
              className={`absolute cursor-pointer transition-all duration-200 group/slot flex items-center ${
                hasPlaylist
                  ? 'hover:z-30 hover:shadow-[0_0_16px_rgba(251,191,36,0.6)]'
                  : 'hover:bg-amber-400/10'
              }`}
              title={
                hasPlaylist
                  ? `Reproducir cinta "${playlist.name}" (${playlist.tracks.length} canciones)`
                  : 'Hueco vacío • Haz clic para grabar una nueva cinta'
              }
            >
              {hasPlaylist ? (
                <>
                  {/* Handwritten Pen Ink directly on the white tape spine label */}
                  <div
                    style={{
                      left: slot.labelLeft,
                      width: slot.labelWidth,
                      transform: `rotate(${inkRotation})`,
                    }}
                    className="absolute top-[12%] bottom-[12%] flex items-center justify-between px-1 sm:px-1.5 overflow-hidden pointer-events-none"
                  >
                    {/* Handwritten Title */}
                    <span
                      className="font-marker font-bold truncate tracking-tight text-[8px] sm:text-[11px] md:text-sm lg:text-base leading-none"
                      style={{
                        color: inkColor,
                        textShadow,
                        mixBlendMode: 'multiply',
                      }}
                    >
                      {playlist.name}
                    </span>

                    {/* Track count badge in tiny handwriting */}
                    <span
                      className="text-[6.5px] sm:text-[8px] md:text-[10px] font-marker font-semibold opacity-75 shrink-0 ml-1 hidden min-[480px]:inline"
                      style={{ color: inkColor, mixBlendMode: 'multiply' }}
                    >
                      {playlist.tracks.length}T
                    </span>
                  </div>

                  {/* Hover Overlay with Quick Play & Info Buttons */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-between px-2 rounded backdrop-blur-[1px]">
                    <div className="flex items-center gap-1.5 text-white font-mono text-[9px] sm:text-xs">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg">
                        <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-black ml-0.5" />
                      </div>
                      <span className="font-bold hidden sm:inline text-amber-300">
                        REPRODUCIR CINTA
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlaylist(playlist.id);
                      }}
                      className="p-1 rounded-full bg-white/20 hover:bg-white/40 text-white transition active:scale-90"
                      title="Ver canciones / Editar cinta"
                    >
                      <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                /* Empty cassette slot hover prompt */
                <div className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-black/75 px-1.5 py-0.5 rounded text-amber-400 text-[8px] sm:text-[10px] font-mono font-bold flex items-center gap-1 border border-amber-400/40">
                    <Plus className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">GRABAR CINTA</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
