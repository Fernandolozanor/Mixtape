import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

export const LyricsView: React.FC = () => {
  const { lyrics, activeLyricIndex, seek } = usePlayer();
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex]);

  if (lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-400">
        <p className="text-xl font-medium text-white mb-2">Sin letra sincronizada</p>
        <p className="text-sm text-zinc-400 max-w-xs">
          No encontramos la letra con marcas de tiempo para esta pista en este momento.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-6 py-12 space-y-8 text-left scroll-smooth select-none"
    >
      {lyrics.map((line, index) => {
        const isActive = index === activeLyricIndex;
        const isPast = index < activeLyricIndex;

        return (
          <div
            key={index}
            ref={isActive ? activeLineRef : null}
            onClick={() => seek(line.time)}
            className={`cursor-pointer transition-all duration-300 font-bold ${
              isActive
                ? 'text-white text-2xl md:text-3xl scale-102 opacity-100 filter drop-shadow-lg'
                : isPast
                ? 'text-zinc-500 text-xl md:text-2xl opacity-60 hover:opacity-90'
                : 'text-zinc-400 text-xl md:text-2xl opacity-40 hover:opacity-80'
            }`}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};
