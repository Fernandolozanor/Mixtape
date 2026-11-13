import React, { useState } from 'react';
import { Search as SearchIcon, Loader2, Play, Plus, Heart, Clock } from 'lucide-react';
import type { Track } from '../types/music';
import { streamResolver } from '../services/streamResolver';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';

const GENRE_TAGS = [
  'Éxitos Globales',
  'Reggaeton & Urbano',
  'Pop en Español',
  'Lo-Fi Beats',
  'Rock Clásico',
  'Chill & Relax',
  'Hip Hop',
  'Electrónica / House',
  'Acústico',
];

interface SearchTabProps {
  onSelectTrackForPlaylist: (track: Track) => void;
  initialQuery?: string;
}

export const SearchTab: React.FC<SearchTabProps> = ({ onSelectTrackForPlaylist, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { playTrack, currentTrack } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();

  React.useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    setIsSearching(true);
    try {
      const tracks = await streamResolver.search(term);
      setResults(tracks);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-32">
      {/* Header and Search Box */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-4">
          Buscar
        </h1>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Canciones, artistas, álbumes..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl glass-input text-base placeholder:text-zinc-500 shadow-xl transition"
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Quick Category Chips */}
      {results.length === 0 && !isSearching && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Explora por géneros
          </p>
          <div className="flex flex-wrap gap-2">
            {GENRE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setQuery(tag);
                  handleSearch(tag);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-zinc-300 hover:text-white transition"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Resultados ({results.length})
          </p>
          <div className="space-y-1.5">
            {results.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const liked = isLiked(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, results)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition group ${
                    isCurrent
                      ? 'bg-pink-500/15 border border-pink-500/20'
                      : 'glass-card glass-card-hover'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Play className="w-5 h-5 fill-white text-white" />
                      </div>
                    </div>

                    <div className="overflow-hidden">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isCurrent ? 'text-pink-400' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 mr-2">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(track.duration)}
                    </span>

                    <button
                      onClick={() => toggleLike(track)}
                      className="p-2 text-zinc-400 hover:text-pink-500 transition"
                      title="Me gusta"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          liked ? 'fill-pink-500 text-pink-500' : ''
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => onSelectTrackForPlaylist(track)}
                      className="p-2 text-zinc-400 hover:text-white transition"
                      title="Añadir a lista"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
