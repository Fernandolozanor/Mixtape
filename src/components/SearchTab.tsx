import React, { useState } from 'react';
import {
  Search as SearchIcon,
  Loader2,
  Play,
  Plus,
  Heart,
  Clock,
  CheckSquare,
  Square,
  ListPlus,
  Check,
  X,
  ChevronDown,
  Flame,
  ArrowUpDown,
} from 'lucide-react';
import type { Track, AudioSourceType } from '../types/music';
import { streamResolver } from '../services/streamResolver';
import { recommendationService } from '../services/recommendationService';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

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
  onSelectMultipleForPlaylist?: (tracks: Track[]) => void;
  initialQuery?: string;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  onSelectTrackForPlaylist,
  onSelectMultipleForPlaylist,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedFilter, setSelectedFilter] = useState<AudioSourceType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'views' | 'duration' | 'title'>('views');
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Multi-selection state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLikedSuccess, setBatchLikedSuccess] = useState(false);

  const { playTrack, currentTrack } = usePlayer();
  const { isLiked, toggleLike, addMultipleToLiked } = useLibrary();
  const { currentTheme } = useTheme();

  const handleSearch = async (
    searchTerm: string,
    filter: AudioSourceType | 'all' = selectedFilter,
    expand: boolean = true
  ) => {
    const term = searchTerm.trim();
    if (!term) return;

    recommendationService.recordSearch(term);
    setIsSearching(true);
    setVisibleCount(10); // reset page
    try {
      const tracks = await streamResolver.search(term, filter, expand);
      setResults(tracks);
      setSelectedIds(new Set()); // reset selection on new search
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const handleFilterChange = (filter: AudioSourceType | 'all') => {
    setSelectedFilter(filter);
    if (query.trim()) {
      handleSearch(query, filter);
    }
  };

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'views') {
      return (b.views || 0) - (a.views || 0);
    }
    if (sortBy === 'duration') {
      return (b.duration || 0) - (a.duration || 0);
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const visibleResults = sortedResults.slice(0, visibleCount);
  const hasMore = visibleCount < sortedResults.length;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, sortedResults.length));
  };

  const toggleSelectTrack = (trackId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === sortedResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedResults.map((t) => t.id)));
    }
  };

  const getSelectedTracks = (): Track[] => {
    return sortedResults.filter((t) => selectedIds.has(t.id));
  };

  const handleBatchAddToPlaylist = () => {
    const selected = getSelectedTracks();
    if (selected.length === 0) return;
    if (onSelectMultipleForPlaylist) {
      onSelectMultipleForPlaylist(selected);
    } else {
      onSelectTrackForPlaylist(selected[0]);
    }
  };

  const handleBatchAddToLiked = () => {
    const selected = getSelectedTracks();
    if (selected.length === 0) return;
    addMultipleToLiked(selected);
    setBatchLikedSuccess(true);
    setTimeout(() => {
      setBatchLikedSuccess(false);
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
    }, 1200);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getSourceBadge = (source: AudioSourceType) => {
    switch (source) {
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            YouTube
          </span>
        );
      case 'audius':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            Audius (Libre)
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
            style={{
              backgroundColor: currentTheme.badgeBg,
              color: currentTheme.badgeText,
              borderColor: currentTheme.badgeBorder,
            }}
          >
            {audioEngine.getSourceLabel(source)}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-44 relative">
      {/* Header and Search Box */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Buscar Música
          </h1>

          {/* Multi-select toggle button */}
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              {isMultiSelectMode && (
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition flex items-center gap-1.5"
                >
                  {selectedIds.size === sortedResults.length ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>Deseleccionar Todo</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Seleccionar Todo ({sortedResults.length})</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  if (isMultiSelectMode) setSelectedIds(new Set());
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                  isMultiSelectMode
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                {isMultiSelectMode ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Selección</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Selección Múltiple</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe canción, artista o pega enlace de YouTube..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl glass-input text-base placeholder:text-zinc-500 shadow-xl transition"
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 theme-btn"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </button>
        </div>

        {/* Source Filter Switcher & Sort Options */}
        <div className="flex items-center justify-between gap-3 mt-3 overflow-x-auto pb-1 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-semibold mr-1">Fuente:</span>
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                selectedFilter === 'all'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => handleFilterChange('youtube')}
              className="px-3 py-1.5 rounded-xl font-medium transition"
              style={
                selectedFilter === 'youtube'
                  ? { backgroundColor: currentTheme.primary, color: '#ffffff', fontWeight: 600 }
                  : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }
              }
            >
              YouTube
            </button>
            <button
              onClick={() => handleFilterChange('audius')}
              className="px-3 py-1.5 rounded-xl font-medium transition"
              style={
                selectedFilter === 'audius'
                  ? { backgroundColor: currentTheme.primary, color: '#ffffff', fontWeight: 600 }
                  : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }
              }
            >
              Audius
            </button>
          </div>

          {/* Sort By Dropdown */}
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-500 font-semibold">Orden:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="views" className="bg-zinc-900 text-white">
                  Más reproducidos (Destacados)
                </option>
                <option value="duration" className="bg-zinc-900 text-white">
                  Mayor duración
                </option>
                <option value="title" className="bg-zinc-900 text-white">
                  Título (A-Z)
                </option>
              </select>
            </div>
          )}
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
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Mostrando {visibleResults.length} de {sortedResults.length} resultados ordenados por popularidad
            </p>
            <span className="text-xs text-zinc-500">
              {isMultiSelectMode
                ? 'Toca cualquier canción para marcarla'
                : 'Canciones completas'}
            </span>
          </div>

          <div className="space-y-1.5">
            {visibleResults.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id;
              const isSelected = selectedIds.has(track.id);
              const liked = isLiked(track.id);
              const isTop3 = index < 3 && sortBy === 'views';

              return (
                <div
                  key={`${track.id}-${index}`}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleSelectTrack(track.id);
                    } else {
                      playTrack(track, sortedResults);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition group ${
                    isSelected
                      ? 'border shadow-lg ring-1'
                      : isCurrent && !isMultiSelectMode
                      ? 'border shadow-md'
                      : 'glass-card glass-card-hover'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `rgba(${currentTheme.rgb}, 0.22)`,
                          borderColor: currentTheme.accent,
                          boxShadow: `0 4px 16px rgba(${currentTheme.rgb}, 0.25)`,
                        }
                      : isCurrent && !isMultiSelectMode
                      ? {
                          backgroundColor: `rgba(${currentTheme.rgb}, 0.16)`,
                          borderColor: `rgba(${currentTheme.rgb}, 0.35)`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Multi-select checkbox indicator */}
                    {isMultiSelectMode && (
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all"
                        style={{
                          backgroundColor: isSelected ? currentTheme.primary : 'rgba(255,255,255,0.06)',
                          borderColor: isSelected ? currentTheme.accent : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </div>
                    )}

                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {!isMultiSelectMode && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Play className="w-5 h-5 fill-white text-white" />
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        {isTop3 && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded border"
                            style={{
                              backgroundColor: `rgba(${currentTheme.rgb}, 0.25)`,
                              color: currentTheme.accent,
                              borderColor: `rgba(${currentTheme.rgb}, 0.4)`,
                            }}
                          >
                            #{index + 1}
                          </span>
                        )}
                        <p
                          className="text-sm font-semibold truncate"
                          style={{
                            color: isSelected
                              ? '#ffffff'
                              : isCurrent && !isMultiSelectMode
                              ? currentTheme.accent
                              : '#ffffff',
                          }}
                        >
                          {track.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="truncate">{track.artist}</span>
                        <span>•</span>
                        {getSourceBadge(track.source)}
                        {track.viewsFormatted && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-amber-400" />
                              {track.viewsFormatted}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Only in normal mode) */}
                  {!isMultiSelectMode ? (
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
                        className="p-2 text-zinc-400 hover:text-white transition"
                        title="Me gusta"
                      >
                        <Heart
                          className="w-4 h-4 transition-colors"
                          style={{
                            fill: liked ? currentTheme.accent : 'none',
                            color: liked ? currentTheme.accent : 'currentColor',
                          }}
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
                  ) : (
                    <span className="text-xs text-zinc-400 mr-2 font-mono">
                      {formatDuration(track.duration)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Show More Results Control */}
          <div className="pt-4 flex flex-col items-center justify-center gap-2">
            {hasMore ? (
              <button
                onClick={handleShowMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold transition border border-white/10 text-sm shadow-md"
              >
                <ChevronDown className="w-4 h-4" />
                <span>Mostrar más resultados (+10)</span>
              </button>
            ) : (
              <p className="text-xs text-zinc-500 italic pt-2">
                Has visto todos los resultados destacados disponibles para esta búsqueda.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-20 left-4 right-4 md:left-72 md:right-8 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="glass-panel p-3.5 rounded-3xl shadow-2xl border border-white/15 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                style={{ backgroundColor: currentTheme.primary }}
              >
                {selectedIds.size}
              </span>
              <span className="text-sm font-semibold text-white">
                {selectedIds.size === 1 ? 'canción seleccionada' : 'canciones seleccionadas'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Batch Add to Playlist */}
              <button
                onClick={handleBatchAddToPlaylist}
                className="px-4 py-2 rounded-2xl text-white text-xs font-semibold transition theme-btn flex items-center gap-1.5"
              >
                <ListPlus className="w-4 h-4" />
                <span>Añadir a lista</span>
              </button>

              {/* Batch Add to Liked / Favorites */}
              <button
                onClick={handleBatchAddToLiked}
                disabled={batchLikedSuccess}
                className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition border border-white/10 flex items-center gap-1.5"
              >
                {batchLikedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">¡Guardadas!</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
                    <span>Guardar en Favoritos</span>
                  </>
                )}
              </button>

              {/* Cancel / Deselect */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title="Deseleccionar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
