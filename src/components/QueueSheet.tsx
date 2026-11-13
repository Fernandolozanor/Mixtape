import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Trash2, Music2 } from 'lucide-react';

export const QueueSheet: React.FC = () => {
  const { queue, queueIndex, playTrack, removeFromQueue } = usePlayer();

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-6">
        <Music2 className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-lg font-medium text-white">Cola vacía</p>
        <p className="text-sm">Agrega canciones para continuar escuchando</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-2 select-none">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 px-2 mb-3">
        A continuación
      </h3>
      {queue.map((track, idx) => {
        const isCurrent = idx === queueIndex;

        return (
          <div
            key={`${track.id}-${idx}`}
            onClick={() => playTrack(track)}
            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
              isCurrent
                ? 'bg-pink-500/20 border border-pink-500/30'
                : 'hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
              <div className="overflow-hidden">
                <p
                  className={`text-sm font-medium truncate ${
                    isCurrent ? 'text-pink-400 font-semibold' : 'text-white'
                  }`}
                >
                  {track.title}
                </p>
                <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromQueue(idx);
              }}
              className="p-2 text-zinc-500 hover:text-red-400 transition"
              title="Quitar de la cola"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
