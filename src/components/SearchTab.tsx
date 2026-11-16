import React, { useState, useEffect } from 'react';
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
  Settings,
  Music2,
  Disc3,
  CheckCircle2,
} from 'lucide-react';
import type { Track, AudioSourceType, YouTubeRelease } from '../types/music';
import { streamResolver } from '../services/streamResolver';
import { youtubeReleaseService } from '../services/youtubeReleaseService';
import { recommendationService } from '../services/recommendationService';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { SourceBadge } from './SourceBadge';
import { RadioTunerDial } from './RadioTunerDial';
import { ReggaetonPrankModal } from './ReggaetonPrankModal';
import { AlbumDetailModal } from './AlbumDetailModal';
import { MultiAlbumRecordModal } from './MultiAlbumRecordModal';
import { isReggaetonTag, shouldTriggerReggaetonJoke } from '../services/prankService';

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
  onOpenSettingsModal?: () => void;
  onNavigateToPlaylist?: (playlistId: string) => void;
  initialQuery?: string;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  onSelectTrackForPlaylist,
  onSelectMultipleForPlaylist,
  onOpenSettingsModal,
  onNavigateToPlaylist,
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

  const [searchContentType, setSearchContentType] = useState<'tracks' | 'releases'>('tracks');
  const [releases, setReleases] = useState<YouTubeRelease[]>([]);
  const [isSearchingReleases, setIsSearchingReleases] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<YouTubeRelease | null>(null);

  // Multi-album tape recording states
  const [isMultiAlbumMode, setIsMultiAlbumMode] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());
  const [recordingAlbumId, setRecordingAlbumId] = useState<string | null>(null);
  const [recordedSuccessAlbumId, setRecordedSuccessAlbumId] = useState<string | null>(null);
  const [isMultiAlbumModalOpen, setIsMultiAlbumModalOpen] = useState(false);
  const [albumToast, setAlbumToast] = useState<{
    title: string;
    message: string;
    playlistId: string;
    tracks: Track[];
  } | null>(null);

  // Multi-selection state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLikedSuccess, setBatchLikedSuccess] = useState(false);
  const [prankPendingAction, setPrankPendingAction] = useState<(() => void) | null>(null);

  const { playTrack, currentTrack } = usePlayer();
  const { isLiked, toggleLike, addMultipleToLiked, createPlaylist, addTracksToPlaylist } = useLibrary();
  const { currentTheme } = useTheme();

  // Auto-dismiss album toast after 6 seconds
  useEffect(() => {
    if (albumToast) {
      const timer = setTimeout(() => {
        setAlbumToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [albumToast]);

  const handleQuickRecordAlbum = async (album: YouTubeRelease, e: React.MouseEvent) => {
    e.stopPropagation();
    if (recordingAlbumId) return;

    setRecordingAlbumId(album.id);
    try {
      const details = await youtubeReleaseService.getReleaseDetails(album.id, album);
      const tracks = details?.tracks || [];

      if (tracks.length === 0) {
        throw new Error('No se pudieron obtener las pistas del álbum.');
      }

      const vinylTitle = album.title;
      const vinylDesc = `Álbum de vinilo oficial de ${album.artist} (${album.year || 'LP'})`;
      const createdVinyl = createPlaylist(
        vinylTitle,
        vinylDesc,
        album.thumbnail,
        'vinyl',
        album.artist,
        album.year
      );
      addTracksToPlaylist(createdVinyl.id, tracks);

      setRecordedSuccessAlbumId(album.id);
      setAlbumToast({
        title: '¡Álbum guardado en Vinilo!',
        message: `"${album.title}" (${tracks.length} canciones añadidas a tu colección de vinilos)`,
        playlistId: createdVinyl.id,
        tracks,
      });

      setTimeout(() => {
        setRecordedSuccessAlbumId(null);
      }, 3500);
    } catch (err: any) {
      console.error('Quick record album error:', err);
      setAlbumToast({
        title: 'Error de grabación',
        message: 'No se pudieron extraer las pistas del álbum. Inténtalo de nuevo.',
        playlistId: '',
        tracks: [],
      });
    } finally {
      setRecordingAlbumId(null);
    }
  };

  const toggleAlbumSelection = (albumId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAlbumIds((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }
      return next;
    });
  };

  const selectAllAlbums = () => {
    setSelectedAlbumIds(new Set(releases.map((r) => r.id)));
  };

  const deselectAllAlbums = () => {
    setSelectedAlbumIds(new Set());
  };

  const selectedAlbumsList = releases.filter((r) => selectedAlbumIds.has(r.id));

  const handleBatchRecordComplete = (tape: {
    id: string;
    name: string;
    trackCount: number;
    tracks: Track[];
  }) => {
    setSelectedAlbumIds(new Set());
    setIsMultiAlbumMode(false);
    setAlbumToast({
      title: '¡Cinta grabada con éxito!',
      message: `"${tape.name}" (${tape.trackCount} canciones añadidas)`,
      playlistId: tape.id,
      tracks: tape.tracks,
    });
  };

  const handleSelectGenreTag = (tag: string) => {
    const continueAction = () => {
      setQuery(tag);
      handleSearch(tag);
    };

    if (isReggaetonTag(tag) && shouldTriggerReggaetonJoke()) {
      setPrankPendingAction(() => continueAction);
    } else {
      continueAction();
    }
  };

  const handleSearch = async (
    searchTerm: string,
    filter: AudioSourceType | 'all' = filterSource
  ) => {
    const term = searchTerm.trim();
    if (!term) return;

    recommendationService.recordSearch(term);
    setIsSearching(true);
    setIsSearchingReleases(true);
    setCurrentPage(1);
    setVisibleCount(25); // initial generous batch

    const tracksPromise = streamResolver.search(term, filter, 1);
    const releasesPromise = youtubeReleaseService.searchReleases(term);

    try {
      const [tracks, foundReleases] = await Promise.all([
        tracksPromise.catch(() => []),
        releasesPromise.catch(() => []),
      ]);
      setResults(tracks);
      setReleases(foundReleases);
      setSelectedIds(new Set()); // reset selection on new search
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
      setIsSearchingReleases(false);
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

            {onOpenSettingsModal && (
              <button
                onClick={onOpenSettingsModal}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl font-stereo text-[11px] sm:text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                title="Abrir Ajustes"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Ajustes</span>
              </button>
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

        {/* Content Type Selector: Canciones vs Lanzamientos Oficiales (Álbumes) */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10 flex-wrap">
          <button
            type="button"
            onClick={() => setSearchContentType('tracks')}
            className={`px-3 py-1.5 rounded-xl font-mono-retro text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              searchContentType === 'tracks'
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Canciones ({results.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchContentType('releases');
              if (releases.length === 0 && query.trim()) {
                handleSearch(query);
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-mono-retro text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              searchContentType === 'releases'
                ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-md'
                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Disc3 className={`w-3.5 h-3.5 ${isSearchingReleases ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
            <span>Lanzamientos / Álbumes {releases.length > 0 ? `(${releases.length})` : ''}</span>
            {releases.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            )}
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

      {/* Releases View (Álbumes y Lanzamientos Oficiales) */}
      {searchContentType === 'releases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Disc3 className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-mono-retro">
                Lanzamientos y Álbumes Oficiales ({releases.length})
              </h2>
            </div>
            
            {releases.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !isMultiAlbumMode;
                    setIsMultiAlbumMode(nextMode);
                    if (!nextMode) setSelectedAlbumIds(new Set());
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono-retro text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isMultiAlbumMode
                      ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                      : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border-white/10'
                  }`}
                  title="Seleccionar múltiples discos y grabarlos juntos en un solo cassette"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isMultiAlbumMode ? 'Salir de selección' : '📼 Grabar varios discos en 1 cinta'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Multi-album selection helper bar */}
          {isMultiAlbumMode && releases.length > 0 && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 rounded-2xl text-xs font-mono animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span>
                  <strong>{selectedAlbumIds.size}</strong> de {releases.length} discos seleccionados para la cinta
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectAllAlbums}
                  className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
                >
                  Seleccionar todos
                </button>
                {selectedAlbumIds.size > 0 && (
                  <button
                    type="button"
                    onClick={deselectAllAlbums}
                    className="text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}

          {isSearchingReleases ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs">
              <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
              <span>Buscando álbumes y lanzamientos oficiales...</span>
            </div>
          ) : releases.length === 0 ? (
            <div className="py-16 text-center text-xs font-mono text-zinc-400 bg-white/5 rounded-2xl border border-white/5 p-6">
              <Disc3 className="w-10 h-10 text-zinc-600 mx-auto mb-2.5" />
              <p className="font-bold text-zinc-200">No se han encontrado lanzamientos oficiales para "{query}".</p>
              <p className="text-[11px] text-zinc-500 mt-1">Prueba a buscar el nombre del artista (ej: Queen, The Beatles, Michael Jackson, Rosalía...)</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {releases.map((album) => {
                const isSelected = selectedAlbumIds.has(album.id);
                return (
                  <div
                    key={album.id}
                    onClick={() => {
                      if (isMultiAlbumMode) {
                        toggleAlbumSelection(album.id);
                      } else {
                        setSelectedRelease(album);
                      }
                    }}
                    className={`group cursor-pointer p-3 rounded-2xl border transition-all duration-200 flex flex-col relative select-none ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] ring-1 ring-amber-400/60 scale-[1.01]'
                        : 'bg-[#131822] hover:bg-[#1b2333] border-white/10 hover:border-amber-400/50 hover:shadow-xl active:scale-[0.98]'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-lg bg-black">
                      <img
                        src={album.thumbnail}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-red-600/95 text-white font-mono text-[9px] font-black px-2 py-0.5 rounded shadow-md uppercase tracking-wider flex items-center gap-1 pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>Release</span>
                      </div>

                      {/* Multi-select Checkbox Badge */}
                      {isMultiAlbumMode ? (
                        <div className="absolute top-2 right-2">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center transition shadow-lg ${
                              isSelected
                                ? 'bg-amber-400 text-black ring-2 ring-amber-300'
                                : 'bg-black/75 text-white/60 border border-white/20 backdrop-blur-sm hover:text-white'
                            }`}
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </div>
                        </div>
                      ) : album.year ? (
                        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none">
                          {album.year}
                        </div>
                      ) : null}
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 truncate mt-2.5">
                      {album.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-zinc-400 font-mono truncate">
                      {album.artist}
                    </p>

                    {/* Non-multiselect: Quick record button & track count */}
                    {!isMultiAlbumMode ? (
                      <>
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <span>{album.trackCount ? `${album.trackCount} canciones` : 'Álbum Oficial'}</span>
                          <span className="text-amber-400 font-bold group-hover:underline">Ver pistas →</span>
                        </div>

                        {/* Direct 1-Click Vinyl Recording Button */}
                        <button
                          type="button"
                          onClick={(e) => handleQuickRecordAlbum(album, e)}
                          disabled={recordingAlbumId === album.id}
                          className={`w-full mt-2 py-1.5 px-2 rounded-xl text-[11px] font-mono-retro font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm border ${
                            recordedSuccessAlbumId === album.id
                              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                              : 'bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-black border-amber-400/40 hover:shadow-md'
                          }`}
                          title="Guardar directamente este álbum en tu estantería de Vinilos"
                        >
                          {recordingAlbumId === album.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Guardando vinilo...</span>
                            </>
                          ) : recordedSuccessAlbumId === album.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>¡Guardado en Vinilo!</span>
                            </>
                          ) : (
                            <>
                              <Disc3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Guardar en Vinilo</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">{album.trackCount ? `${album.trackCount} pistas` : 'Álbum'}</span>
                        <span className={isSelected ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                          {isSelected ? '✓ Seleccionado' : 'Toca para elegir'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Horizontal Shelf of Official Releases / Albums when in Tracks view */}
      {searchContentType === 'tracks' && releases.length > 0 && (
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-500/25 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Disc3 className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono-retro">
                Lanzamientos de {query || 'este artista'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSearchContentType('releases')}
              className="text-[11px] font-mono font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              Ver todos ({releases.length}) →
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {releases.slice(0, 10).map((album) => (
              <div
                key={album.id}
                onClick={() => setSelectedRelease(album)}
                className="w-28 sm:w-32 shrink-0 group cursor-pointer bg-black/40 hover:bg-black/60 p-2 rounded-xl border border-white/10 hover:border-amber-400/50 transition active:scale-95 text-center flex flex-col items-center"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden relative shadow-md bg-black">
                  <img
                    src={album.thumbnail}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-1 right-1 bg-red-600/90 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                    ÁLBUM
                  </div>
                </div>
                <p className="text-xs font-bold text-zinc-100 truncate w-full mt-1.5 group-hover:text-amber-300">
                  {album.title}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono truncate w-full">
                  {album.year ? `${album.year} • ` : ''}{album.artist}
                </p>

                {/* Direct quick record on horizontal shelf */}
                <button
                  type="button"
                  onClick={(e) => handleQuickRecordAlbum(album, e)}
                  disabled={recordingAlbumId === album.id}
                  className={`w-full mt-1.5 py-1 px-1.5 rounded-lg text-[10px] font-mono-retro font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer border ${
                    recordedSuccessAlbumId === album.id
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                      : 'bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-black border-amber-400/40'
                  }`}
                  title="Guardar álbum en vinilo"
                >
                  {recordingAlbumId === album.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : recordedSuccessAlbumId === album.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <>
                      <Disc3 className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Vinilo</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Category Chips */}
      {searchContentType === 'tracks' && results.length === 0 && !isSearching && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Explora por géneros
          </p>
          <div className="flex flex-wrap gap-2">
            {GENRE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSelectGenreTag(tag)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-zinc-300 hover:text-white transition cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      {searchContentType === 'tracks' && results.length > 0 && (
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (track.artist && track.artist !== 'YouTube') {
                              setQuery(track.artist);
                              setSearchContentType('releases');
                              handleSearch(track.artist);
                            }
                          }}
                          className="truncate max-w-[120px] sm:max-w-none hover:text-amber-300 hover:underline cursor-pointer text-left font-medium"
                          title={`Ver lanzamientos y álbumes de ${track.artist}`}
                        >
                          {track.artist}
                        </button>
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
      {/* Floating Action Bar for Multi-Album Batch Recording */}
      {isMultiAlbumMode && selectedAlbumIds.size > 0 && (
        <div className="fixed bottom-24 sm:bottom-28 left-3 right-3 sm:left-4 sm:right-4 max-w-xl mx-auto z-40 p-3 sm:p-4 rounded-2xl bg-[#0d121e]/95 border-2 border-amber-500/60 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(251,191,36,0.3)] backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 select-none">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>
                {selectedAlbumIds.size}{' '}
                {selectedAlbumIds.size === 1 ? 'disco seleccionado' : 'discos seleccionados'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
              {selectedAlbumsList.map((a) => a.title).join(' • ')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={deselectAllAlbums}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono font-bold transition cursor-pointer"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setIsMultiAlbumModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-amber-400 hover:from-red-500 hover:to-amber-300 text-black font-mono-retro font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-red-900 animate-ping" />
              <span>Grabar en 1 Cinta</span>
            </button>
          </div>
        </div>
      )}

      {/* Retro Tape Recording Notification Toast */}
      {albumToast && (
        <div className="fixed top-4 left-3 right-3 sm:left-4 sm:right-4 max-w-md mx-auto z-50 p-3.5 sm:p-4 rounded-2xl bg-[#0c111c]/95 border-2 border-amber-400/60 shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(251,191,36,0.35)] backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 select-none">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-amber-400 font-mono-retro text-xs font-black uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{albumToast.title}</span>
            </div>
            <p className="text-xs text-zinc-300 font-mono truncate mt-0.5">
              {albumToast.message}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {albumToast.tracks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playTrack(albumToast.tracks[0], albumToast.tracks, false, 'tape');
                  setAlbumToast(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition flex items-center gap-1 shadow-md cursor-pointer active:scale-95"
                title="Reproducir esta cinta ahora"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Play</span>
              </button>
            )}
            {onNavigateToPlaylist && albumToast.playlistId && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToPlaylist(albumToast.playlistId);
                  setAlbumToast(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold transition cursor-pointer active:scale-95"
              >
                Ver Cinta
              </button>
            )}
            <button
              type="button"
              onClick={() => setAlbumToast(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Multi-Album Recording Modal */}
      <MultiAlbumRecordModal
        isOpen={isMultiAlbumModalOpen}
        onClose={() => setIsMultiAlbumModalOpen(false)}
        selectedAlbums={selectedAlbumsList}
        onRecordingComplete={handleBatchRecordComplete}
      />

      {/* Reggaeton Prank Modal */}
      <ReggaetonPrankModal
        isOpen={!!prankPendingAction}
        onAccept={() => {
          const action = prankPendingAction;
          setPrankPendingAction(null);
          if (action) action();
        }}
      />

      {/* Album / Release Detail Modal */}
      <AlbumDetailModal
        isOpen={Boolean(selectedRelease)}
        onClose={() => setSelectedRelease(null)}
        release={selectedRelease}
        onOpenAddToPlaylist={onSelectTrackForPlaylist}
        onOpenAddMultipleToPlaylist={onSelectMultipleForPlaylist}
      />
    </div>
  );
};
