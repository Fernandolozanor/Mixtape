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
  Sparkles,
  Layers,
} from 'lucide-react';
import type { Track, AudioSourceType } from '../types/music';
import { streamResolver } from '../services/streamResolver';
import { recommendationService } from '../services/recommendationService';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { SourceBadge } from './SourceBadge';
import { RadioTunerDial } from './RadioTunerDial';

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
  const [filterSource, setFilterSource] = useState<AudioSourceType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'views' | 'duration' | 'title'>('views');
  const [results, setResults] = useState<Track[]>([]);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [visibleCount, setVisibleCount] = useState<number>(25);

  // Multi-selection state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLikedSuccess, setBatchLikedSuccess] = useState(false);

  const { playTrack, currentTrack } = usePlayer();
  const { isLiked, toggleLike, addMultipleToLiked } = useLibrary();
  const { currentTheme } = useTheme();

  const handleSearch = async (
    searchTerm: string,
    filter: AudioSourceType | 'all' = filterSource
  ) => {
    const term = searchTerm.trim();
    if (!term) return;

    recommendationService.recordSearch(term);
    setIsSearching(true);
    setCurrentPage(1);
    setVisibleCount(25); // initial generous batch
    try {
      const tracks = await streamResolver.search(term, filter, 1);
      setResults(tracks);
      setSelectedIds(new Set()); // reset selection on new search
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFetchMoreFromNetwork = async () => {
    if (isLoadingMore || !query.trim()) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const additionalTracks = await streamResolver.search(query, filterSource, nextPage);
      if (additionalTracks.length > 0) {
        setResults((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const uniqueNew = additionalTracks.filter((t) => !existingIds.has(t.id));
          return [...prev, ...uniqueNew];
        });
        setCurrentPage(nextPage);
        setVisibleCount((prev) => prev + 25);
      }
    } catch (e) {
      console.error('Failed to load deep search results:', e);
    } finally {
      setIsLoadingMore(false);
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

  const markTrackBroken = (id: string) => {
    setBrokenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Filter out tracks without valid thumbnails or whose thumbnail failed/404'd, then sort
  const sortedResults = results
    .filter((t) => Boolean(t.thumbnail && t.thumbnail.trim()) && !brokenIds.has(t.id))
    .sort((a, b) => {
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
    setVisibleCount((prev) => Math.min(prev + 25, sortedResults.length));
  };

  const handleShowAll = () => {
    setVisibleCount(sortedResults.length);
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
    return <SourceBadge source={source} size="sm" />;
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-5xl mx-auto min-w-0 overflow-x-hidden pb-48 relative">
      {/* Header and Direct Search Box */}
      <div className="retro-tape-chassis rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl border-2 border-[#262f40] relative w-full min-w-0 overflow-hidden space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            <h1 className="font-rock text-2xl sm:text-3xl tracking-widest text-white leading-none">
              BUSCAR MÚSICA
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Multi-select toggle button */}
            {results.length > 0 && (
              <>
                {isMultiSelectMode && (
                  <button
                    onClick={selectAll}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl font-stereo text-[11px] sm:text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition flex items-center gap-1.5 border border-white/10"
                  >
                    {selectedIds.size === sortedResults.length ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>Deseleccionar</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Todo ({sortedResults.length})</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    if (isMultiSelectMode) setSelectedIds(new Set());
                  }}
                  className={`px-3 py-1.5 rounded-xl font-stereo text-[11px] sm:text-xs font-semibold transition border flex items-center gap-1.5 ${
                    isMultiSelectMode
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md font-bold'
                      : 'bg-[#151a24] hover:bg-[#1e2534] text-zinc-300 border-white/10'
                  }`}
                >
                  {isMultiSelectMode ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Varios</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Always-visible Compact Vintage Radio FM/AM Tuner Dial */}
        <RadioTunerDial
          isSearching={isSearching}
          query={query}
          hasResults={results.length > 0}
        />

        {/* Immediate Search Input */}
        <div className="relative w-full min-w-0">
          <SearchIcon className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-amber-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Artista, canción, álbum o género..."
            className="w-full min-w-0 pl-10 sm:pl-12 pr-24 sm:pr-28 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl glass-input font-stereo text-sm sm:text-base placeholder:text-zinc-500 shadow-xl transition"
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={isSearching}
            className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-3 sm:px-5 py-1.5 rounded-lg sm:rounded-xl text-amber-300 hover:text-white font-rock text-xs sm:text-base tracking-wider transition disabled:opacity-50 theme-btn active:scale-95"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : 'BUSCAR'}
          </button>
        </div>

        {/* Source Filter Switcher: All vs Audio de Fondo (Pantalla Apagada) vs YouTube */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
          <span className="font-mono-retro text-[9px] text-zinc-400 uppercase font-bold mr-1">Fuente:</span>
          <button
            onClick={() => {
              setFilterSource('all');
              if (query.trim()) handleSearch(query, 'all');
            }}
            className={`px-2.5 py-1 rounded-lg font-mono-retro text-[10px] font-semibold transition border ${
              filterSource === 'all'
                ? 'bg-amber-400 text-black border-amber-400 shadow-sm font-bold'
                : 'bg-black/40 text-zinc-400 hover:text-white border-white/10'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => {
              setFilterSource('audius');
              if (query.trim()) handleSearch(query, 'audius');
            }}
            className={`px-2.5 py-1 rounded-lg font-mono-retro text-[10px] font-semibold transition border flex items-center gap-1 ${
              filterSource === 'audius'
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] font-bold'
                : 'bg-black/40 text-cyan-400 hover:text-cyan-300 border-cyan-500/30'
            }`}
          >
            <span>🎧 Audio de Fondo (Pantalla Bloqueada)</span>
          </button>
          <button
            onClick={() => {
              setFilterSource('youtube');
              if (query.trim()) handleSearch(query, 'youtube');
            }}
            className={`px-2.5 py-1 rounded-lg font-mono-retro text-[10px] font-semibold transition border ${
              filterSource === 'youtube'
                ? 'bg-red-500 text-white border-red-500 shadow-sm font-bold'
                : 'bg-black/40 text-red-400 hover:text-red-300 border-red-500/30'
            }`}
          >
            <span>📺 Vídeos YouTube</span>
          </button>
        </div>

        {/* Sort By Dropdown (Only shown when there are results) */}
        {results.length > 0 && (
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 pt-2 border-t border-white/5 text-xs">
            <ArrowUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
            <span className="font-mono-retro text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase">ORDEN:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black/70 border border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs text-amber-400 font-mono-retro focus:outline-none max-w-[190px] sm:max-w-none truncate"
            >
              <option value="views" className="bg-zinc-900 text-white">
                Más reproducidos (Destacados)
              </option>
              <option value="duration" className="bg-zinc-900 text-white">
                Mayor duración (Conciertos)
              </option>
              <option value="title" className="bg-zinc-900 text-white">
                Título (A-Z)
              </option>
            </select>
          </div>
        )}
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
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Mostrando {visibleResults.length} de {sortedResults.length} canciones
              </span>
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 border shadow-sm"
                style={{
                  backgroundColor: currentTheme.badgeBg,
                  color: currentTheme.badgeText,
                  borderColor: currentTheme.badgeBorder,
                }}
              >
                <Sparkles className="w-3 h-3" />
                Sin límites de búsqueda (Pág. {currentPage})
              </span>
            </div>
            <span className="text-xs text-zinc-400">
              {isMultiSelectMode
                ? 'Toca cualquier canción para marcarla'
                : 'Ordenadas por popularidad'}
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
                  className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition group w-full min-w-0 ${
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
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden pr-1.5">
                    {/* Multi-select checkbox indicator */}
                    {isMultiSelectMode && (
                      <div
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all"
                        style={{
                          backgroundColor: isSelected ? currentTheme.primary : 'rgba(255,255,255,0.06)',
                          borderColor: isSelected ? currentTheme.accent : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>
                    )}

                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() => markTrackBroken(track.id)}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          // YouTube returns a 120x90 gray placeholder on HTTP 404 for hqdefault.jpg (which is 480x360 when valid)
                          if (
                            track.thumbnail.includes('hqdefault') &&
                            img.naturalWidth > 0 &&
                            img.naturalWidth <= 120
                          ) {
                            markTrackBroken(track.id);
                          }
                        }}
                      />
                      {!isMultiSelectMode && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Play className="w-5 h-5 fill-white text-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isTop3 && (
                          <span
                            className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0"
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
                          className="text-xs sm:text-sm font-semibold truncate leading-tight"
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
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400 mt-0.5 overflow-hidden flex-wrap">
                        <span className="truncate max-w-[120px] sm:max-w-none">{track.artist}</span>
                        <span>•</span>
                        {getSourceBadge(track.source)}
                        {track.viewsFormatted && (
                          <>
                            <span className="hidden xs:inline">•</span>
                            <span className="text-[9px] sm:text-[10px] font-medium text-zinc-400 inline-flex items-center gap-0.5 whitespace-nowrap">
                              <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                              {track.viewsFormatted}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Only in normal mode) - Always anchored and visible */}
                  {!isMultiSelectMode ? (
                    <div
                      className="flex items-center gap-1 sm:gap-2 shrink-0 ml-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 mr-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(track.duration)}
                      </span>

                      <button
                        onClick={() => toggleLike(track)}
                        className="p-1.5 sm:p-2 text-zinc-400 hover:text-white transition"
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
                        className="p-1.5 sm:p-2 text-zinc-400 hover:text-white transition"
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

          {/* Show More Results Controls */}
          <div className="pt-5 pb-6 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {hasMore && (
                <>
                  <button
                    onClick={handleShowMore}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold transition border border-white/10 text-sm shadow-md active:scale-95"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>Mostrar más canciones (+25)</span>
                  </button>

                  <button
                    onClick={handleShowAll}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium transition border border-white/5 text-xs active:scale-95"
                    title="Desplegar todas las canciones cargadas"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Ver todas ({sortedResults.length})</span>
                  </button>
                </>
              )}

              {/* Deep Network Search (Unlimited) */}
              <button
                onClick={handleFetchMoreFromNetwork}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold transition border text-sm shadow-md active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: currentTheme.secondary,
                  color: '#ffffff',
                  borderColor: currentTheme.badgeBorder,
                }}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Buscando más canciones en la red...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Buscar aún más en la red (Página {currentPage + 1})</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-500 text-center max-w-md pt-1">
              Búsqueda continua sin límites. Puedes pulsar en <strong>Buscar aún más en la red</strong> para extraer versiones en vivo, directos, remasters y rarezas ilimitadas.
            </p>
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
