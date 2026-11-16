import React, { useState, useMemo } from 'react';
import {
  Heart,
  Plus,
  ListMusic,
  Play,
  Trash2,
  Edit3,
  Check,
  ChevronUp,
  ChevronDown,
  Disc3,
  List,
  QrCode,
  GripVertical,
  Settings,
  FileSpreadsheet,
  Search,
  X,
  Mic2,
  Music2,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { EditPlaylistModal } from './EditPlaylistModal';
import { CassetteRack } from './CassetteRack';
import { VinylRecordCard } from './VinylRecordCard';
import { VinylCoverFlow } from './VinylCoverFlow';
import { bpmService } from '../services/bpmService';
import { SourceBadge } from './SourceBadge';
import type { Playlist, Track } from '../types/music';

interface GenreDefinition {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export const LIBRARY_GENRES: GenreDefinition[] = [
  {
    id: 'rock',
    label: 'Rock',
    icon: '🎸',
    keywords: [
      'rock', 'queen', 'ac/dc', 'acdc', 'dire straits', 'stones', 'rolling', 'beatles',
      'guns', 'nirvana', 'clash', 'police', 'u2', 'led zeppelin', 'the who', 'deep purple',
      'aerosmith', 'pink floyd', 'radiohead', 'hendrix', 'doors', 'cream', 'creedence',
      'scorpions', 'bon jovi', 'def leppard', 'kiss', 'van halen', 'clapton', 'zz top',
      'springsteen', 'bowie', 'eagles', 'fleetwood', 'journey', 'toto', 'boston', 'foreigner'
    ],
  },
  {
    id: 'metal',
    label: 'Metal',
    icon: '⚡',
    keywords: [
      'metal', 'metallica', 'iron maiden', 'judas priest', 'black sabbath', 'ozzy',
      'megadeth', 'slayer', 'pantera', 'heavy', 'dio', 'motorhead', 'slipknot',
      'rammstein', 'avenged', 'system of a down', 'sepultura', 'anthrax', 'accept'
    ],
  },
  {
    id: 'pop',
    label: 'Pop',
    icon: '✨',
    keywords: [
      'pop', 'michael jackson', 'madonna', 'dua lipa', 'taylor swift', 'bruno mars',
      'ed sheeran', 'billie eilish', 'ariana', 'katy perry', 'elton john', 'abba',
      'george michael', 'wham', 'prince', 'whitney houston', 'phil collins', 'bee gees',
      'cyndi lauper', 'rick astley', 'ricky martin', 'shakira'
    ],
  },
  {
    id: '80s',
    label: '80s / Retro',
    icon: '📻',
    keywords: [
      '80s', '80', 'ochenta', 'synth', 'retro', 'new wave', 'disco', 'depeche mode',
      'duran duran', 'tears for fears', 'a-ha', 'aha', 'pet shop boys', 'spandau',
      'human league', 'omd', 'eurythmics', 'simple minds', 'talk talk', 'inxs', '198'
    ],
  },
  {
    id: 'electronica',
    label: 'Electrónica',
    icon: '🎛️',
    keywords: [
      'electronic', 'electronica', 'electro', 'house', 'techno', 'edm', 'daft punk',
      'avicii', 'calvin harris', 'tiesto', 'guetta', 'kraftwerk', 'prodigy', 'chemical brothers',
      'fatboy slim', 'underworld', 'deadmau5', 'faithless', 'swedish house mafia', 'moby'
    ],
  },
  {
    id: 'indie',
    label: 'Indie / Alt',
    icon: '🎙️',
    keywords: [
      'indie', 'alternative', 'alternativo', 'arctic monkeys', 'the strokes', 'the killers',
      'franz ferdinand', 'blur', 'oasis', 'pixies', 'smiths', 'cure', 'arcade fire', 'interpol',
      'rem', 'smashing pumpkins', 'foals', 'muse'
    ],
  },
  {
    id: 'baladas',
    label: 'Baladas',
    icon: '🎹',
    keywords: [
      'balada', 'ballad', 'acustico', 'acoustic', 'unplugged', 'slow', 'piano',
      'love song', 'romantic', 'adagio', 'adele', 'sam smith', 'norah jones', 'sinatras'
    ],
  },
  {
    id: 'espanol',
    label: 'En Español',
    icon: '🇪🇸',
    keywords: [
      'espanol', 'español', 'soda stereo', 'heroes del silencio', 'fito', 'charly garcia',
      'calamaro', 'estopa', 'radio futura', 'alaska', 'mecano', 'los rodriguez', 'bunbury',
      'jarabe de palo', 'la oreja de van gogh', 'el canto del loco', 'nacho vega', 'los secretos',
      'duncan dhu', 'tequila', 'rosalia', 'triana', 'leiva', 'm-clan'
    ],
  },
];

const normalizeText = (str: string) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

interface LibraryTabProps {
  openNewPlaylistModal: () => void;
  openSpotifyCsvModal?: () => void;
  openSyncModal?: () => void;
  openSettingsModal?: () => void;
  onNavigateToSearch?: () => void;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  isFavoritesView?: boolean;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  openNewPlaylistModal,
  openSpotifyCsvModal,
  openSyncModal,
  openSettingsModal,
  onNavigateToSearch,
  selectedPlaylistId,
  setSelectedPlaylistId,
  isFavoritesView = false,
}) => {
  const {
    playlists,
    likedTracks,
    deletePlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    reorderLikedTracks,
    removeLikedTrack,
    clearLikedTracks,
    createPlaylist,
    addTracksToPlaylist,
  } = useLibrary();

  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { currentTheme } = useTheme();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  const [showMatchingTracks, setShowMatchingTracks] = useState(true);

  // Favorites view mode: 'vinyl' (default 3D vinyl records) or 'list'
  const [favoritesViewMode, setFavoritesViewMode] = useState<'vinyl' | 'list'>('vinyl');
  // Library view mode: 'shelves' (Estanterías 3D de Cintas arriba y Vinilos Cover Flow abajo) vs 'lists'
  const [libraryViewMode, setLibraryViewMode] = useState<'shelves' | 'lists'>('shelves');
  const [listFilter, setListFilter] = useState<'all' | 'tapes' | 'vinyls'>('all');

  // Helper to identify saved vinyl albums
  const isVinylPlaylist = (p: Playlist) => {
    return (
      p.mediaType === 'vinyl' ||
      p.description?.toLowerCase().includes('vinilo') ||
      p.description?.toLowerCase().includes('lanzamiento oficial') ||
      p.description?.toLowerCase().includes('álbum de vinilo')
    );
  };

  // Dynamically extract all unique artists present across user playlists & tracks
  const availableArtists = useMemo(() => {
    const artistSet = new Set<string>();
    for (const p of playlists) {
      if (p.artist && p.artist.trim()) {
        artistSet.add(p.artist.trim());
      }
      for (const t of p.tracks) {
        if (t.artist && t.artist.trim()) {
          const parts = t.artist.split(/[,/]|feat\.?|ft\.?/i);
          for (const part of parts) {
            const clean = part.trim();
            if (clean.length > 1) artistSet.add(clean);
          }
        }
      }
    }
    for (const t of likedTracks) {
      if (t.artist && t.artist.trim()) {
        const parts = t.artist.split(/[,/]|feat\.?|ft\.?/i);
        for (const part of parts) {
          const clean = part.trim();
          if (clean.length > 1) artistSet.add(clean);
        }
      }
    }
    return Array.from(artistSet).sort((a, b) => a.localeCompare(b));
  }, [playlists, likedTracks]);

  const matchesPlaylistFilter = (playlist: Playlist): boolean => {
    const normQuery = normalizeText(searchQuery);

    // 1. Artist filter (if selected)
    if (selectedArtist !== 'all') {
      const normArtist = normalizeText(selectedArtist);
      const playlistArtistMatch = normalizeText(playlist.artist || '').includes(normArtist);
      const tracksArtistMatch = playlist.tracks.some((t) =>
        normalizeText(t.artist).includes(normArtist)
      );
      if (!playlistArtistMatch && !tracksArtistMatch) {
        return false;
      }
    }

    // 2. Genre filter (if selected)
    if (selectedGenre !== 'all') {
      const genreDef = LIBRARY_GENRES.find((g) => g.id === selectedGenre);
      if (genreDef) {
        const fullText = normalizeText(
          `${playlist.name} ${playlist.artist || ''} ${playlist.description || ''} ${playlist.year || ''} ${playlist.tracks.map((t) => `${t.title} ${t.artist} ${t.album || ''}`).join(' ')}`
        );
        const matches = genreDef.keywords.some((kw) => fullText.includes(kw));
        if (!matches) {
          return false;
        }
      }
    }

    // 3. Search query string (if typed)
    if (normQuery) {
      const terms = normQuery.split(/\s+/).filter(Boolean);
      const fullText = normalizeText(
        `${playlist.name} ${playlist.artist || ''} ${playlist.description || ''} ${playlist.year || ''} ${playlist.tracks.map((t) => `${t.title} ${t.artist} ${t.album || ''}`).join(' ')}`
      );
      const matchesAll = terms.every((term) => fullText.includes(term));
      if (!matchesAll) {
        return false;
      }
    }

    return true;
  };

  const hasActiveFilter = Boolean(
    searchQuery.trim() || selectedGenre !== 'all' || selectedArtist !== 'all'
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSelectedArtist('all');
  };

  const tapePlaylists = useMemo(
    () => playlists.filter((p) => !isVinylPlaylist(p) && matchesPlaylistFilter(p)),
    [playlists, searchQuery, selectedGenre, selectedArtist]
  );

  const vinylPlaylists = useMemo(
    () => playlists.filter((p) => isVinylPlaylist(p) && matchesPlaylistFilter(p)),
    [playlists, searchQuery, selectedGenre, selectedArtist]
  );

  // Individual track matches across all playlists when search/filters are active
  const matchingTracks = useMemo(() => {
    if (!hasActiveFilter) return [];

    const normQuery = normalizeText(searchQuery);
    const results: Array<{
      track: Track;
      playlistName: string;
      playlistId: string;
      mediaType: 'tape' | 'vinyl';
    }> = [];
    const seenIds = new Set<string>();

    for (const p of playlists) {
      const pMediaType: 'tape' | 'vinyl' = isVinylPlaylist(p) ? 'vinyl' : 'tape';
      for (const t of p.tracks) {
        if (seenIds.has(t.id)) continue;

        let ok = true;

        if (selectedArtist !== 'all') {
          const normArtist = normalizeText(selectedArtist);
          if (!normalizeText(t.artist).includes(normArtist)) ok = false;
        }

        if (ok && selectedGenre !== 'all') {
          const genreDef = LIBRARY_GENRES.find((g) => g.id === selectedGenre);
          if (genreDef) {
            const trackText = normalizeText(`${t.title} ${t.artist} ${t.album || ''} ${p.name}`);
            if (!genreDef.keywords.some((kw) => trackText.includes(kw))) ok = false;
          }
        }

        if (ok && normQuery) {
          const terms = normQuery.split(/\s+/).filter(Boolean);
          const trackText = normalizeText(`${t.title} ${t.artist} ${t.album || ''} ${p.name}`);
          if (!terms.every((term) => trackText.includes(term))) ok = false;
        }

        if (ok) {
          seenIds.add(t.id);
          results.push({
            track: t,
            playlistName: p.name,
            playlistId: p.id,
            mediaType: pMediaType,
          });
          if (results.length >= 24) break;
        }
      }
      if (results.length >= 24) break;
    }

    return results;
  }, [playlists, hasActiveFilter, searchQuery, selectedGenre, selectedArtist]);

  // Filtered favorite tracks for the Favorites view
  const filteredLikedTracks = useMemo(() => {
    return likedTracks.filter((track) => {
      const normQuery = normalizeText(searchQuery);

      if (selectedArtist !== 'all') {
        const normArtist = normalizeText(selectedArtist);
        if (!normalizeText(track.artist).includes(normArtist)) return false;
      }

      if (selectedGenre !== 'all') {
        const genreDef = LIBRARY_GENRES.find((g) => g.id === selectedGenre);
        if (genreDef) {
          const trackText = normalizeText(`${track.title} ${track.artist} ${track.album || ''}`);
          if (!genreDef.keywords.some((kw) => trackText.includes(kw))) return false;
        }
      }

      if (normQuery) {
        const terms = normQuery.split(/\s+/).filter(Boolean);
        const trackText = normalizeText(`${track.title} ${track.artist} ${track.album || ''}`);
        if (!terms.every((term) => trackText.includes(term))) return false;
      }

      return true;
    });
  }, [likedTracks, searchQuery, selectedGenre, selectedArtist]);

  const handlePlayPlaylistFromRack = (playlist: Playlist) => {
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks, false, 'tape');
    } else {
      setSelectedPlaylistId(playlist.id);
    }
  };

  // Editing state
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);

  // Drag and drop state for reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Favorites view
  if (isFavoritesView) {
    return (
      <div className="space-y-6 w-full max-w-5xl mx-auto min-w-0 overflow-x-hidden pb-48">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style={{
                background: currentTheme.gradient,
                boxShadow: `0 8px 24px rgba(${currentTheme.rgb}, 0.35)`,
              }}
            >
              <Heart className="w-10 h-10 fill-white text-white" />
            </div>
            <div>
              <p
                className="text-xs uppercase font-bold tracking-wider"
                style={{ color: currentTheme.accent }}
              >
                Lista Automática
              </p>
              <h1 className="text-3xl font-extrabold text-white">Canciones Favoritas</h1>
              <p className="text-sm text-zinc-400">{likedTracks.length} canciones guardadas</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {likedTracks.length > 0 && !isEditingMode && (
              <button
                onClick={() => {
                  playTrack(likedTracks[0], likedTracks);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl text-white font-semibold shadow-lg transition theme-btn text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Reproducir Todo</span>
              </button>
            )}

            {/* View switcher: Vinilos vs Lista */}
            {likedTracks.length > 0 && (
              <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10 shadow-inner">
                <button
                  onClick={() => setFavoritesViewMode('vinyl')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    favoritesViewMode === 'vinyl'
                      ? 'bg-amber-400 text-black shadow-md font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Vista Discos de Vinilo"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>Vinilos</span>
                </button>
                <button
                  onClick={() => setFavoritesViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    favoritesViewMode === 'list'
                      ? 'bg-amber-400 text-black shadow-md font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Vista Lista de Canciones"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Lista</span>
                </button>
              </div>
            )}

            {likedTracks.length > 0 && (
              <button
                onClick={() => setIsEditingMode(!isEditingMode)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold transition border ${
                  isEditingMode
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                {isEditingMode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Listo</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar / Borrar</span>
                  </>
                )}
              </button>
            )}

            {openSettingsModal && (
              <button
                onClick={openSettingsModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer"
                title="Abrir Ajustes"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Ajustes</span>
              </button>
            )}

            {isEditingMode && likedTracks.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('¿Vaciar toda la lista de canciones favoritas?')) {
                    clearLikedTracks();
                    setIsEditingMode(false);
                  }
                }}
                className="px-3.5 py-2 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition border border-red-500/20"
                title="Vaciar favoritos"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search input in Favorites view */}
        {likedTracks.length > 0 && (
          <div className="flex items-center gap-2.5 bg-black/60 border border-white/10 rounded-2xl px-3.5 py-2 shadow-inner">
            <Search className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en tus favoritos por título, artista o género..."
              className="w-full bg-transparent text-white font-mono text-xs focus:outline-none placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full text-zinc-400 hover:text-white transition cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {searchQuery && (
              <span className="text-[10px] font-mono text-amber-300 font-bold shrink-0">
                {filteredLikedTracks.length} de {likedTracks.length}
              </span>
            )}
          </div>
        )}

        {likedTracks.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 glass-card rounded-3xl">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-white">No tienes canciones favoritas aún</p>
            <p className="text-sm">Toca el icono de corazón en cualquier canción para guardarla aquí.</p>
          </div>
        ) : filteredLikedTracks.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 glass-card rounded-3xl space-y-2">
            <p className="font-bold text-white text-base">No hay canciones que coincidan</p>
            <p className="text-xs font-mono">No se encontraron favoritos con "{searchQuery}".</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 px-4 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs"
            >
              Borrar filtro
            </button>
          </div>
        ) : favoritesViewMode === 'vinyl' ? (
          /* 3D Vinyl Records Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-2">
            {filteredLikedTracks.map((track, idx) => (
              <VinylRecordCard
                key={track.id}
                track={track}
                index={idx}
                isCurrent={currentTrack?.id === track.id}
                isPlaying={isPlaying}
                onPlay={() => {
                  playTrack(track, filteredLikedTracks);
                }}
                onRemove={() => removeLikedTrack(track.id)}
                isEditingMode={isEditingMode}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredLikedTracks.map((track, idx) => {
              const bpm = bpmService.getTrackBpm(track);
              const tier = bpmService.getRpmTier(bpm);
              return (
              <div
                key={track.id}
                onClick={() => !isEditingMode && playTrack(track, filteredLikedTracks)}
                className={`flex items-center justify-between p-2.5 rounded-2xl transition ${
                  isEditingMode ? 'cursor-default' : 'cursor-pointer'
                } ${
                  currentTrack?.id === track.id && !isEditingMode
                    ? 'border shadow-md'
                    : 'glass-card glass-card-hover'
                }`}
                style={
                  currentTrack?.id === track.id && !isEditingMode
                    ? {
                        backgroundColor: `rgba(${currentTheme.rgb}, 0.15)`,
                        borderColor: `rgba(${currentTheme.rgb}, 0.3)`,
                      }
                    : {}
                }
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-xs text-zinc-500 w-5 text-center font-mono">
                    {idx + 1}
                  </span>
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-11 h-11 rounded-xl object-cover shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{
                        color:
                          currentTrack?.id === track.id && !isEditingMode
                            ? currentTheme.accent
                            : '#ffffff',
                      }}
                    >
                      {track.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                      <span className="truncate">{track.artist}</span>
                      <span className="text-zinc-600">•</span>
                      <SourceBadge source={track.source} size="xs" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono-retro font-bold px-2 py-0.5 rounded border hidden sm:inline-block ${tier.badgeClass}`}>
                    {bpm} BPM • {tier.rpmLabel}
                  </span>
                  {isEditingMode ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        disabled={idx === 0}
                        onClick={() => reorderLikedTracks(idx, idx - 1)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 transition"
                        title="Subir"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        disabled={idx === likedTracks.length - 1}
                        onClick={() => reorderLikedTracks(idx, idx + 1)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 transition"
                        title="Bajar"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeLikedTrack(track.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition ml-1"
                        title="Quitar de favoritos"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 mr-2">
                      {formatDuration(track.duration)}
                    </span>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    );
  }

  // 2. Playlist Detail view
  if (selectedPlaylist) {
    return (
      <div className="space-y-6 w-full max-w-5xl mx-auto min-w-0 overflow-x-hidden pb-48">
        <button
          onClick={() => {
            setSelectedPlaylistId(null);
            setIsEditingMode(false);
          }}
          className="text-sm font-medium hover:underline transition"
          style={{ color: currentTheme.accent }}
        >
          ← Volver a la Biblioteca
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden shadow-lg border border-white/10 shrink-0">
              {selectedPlaylist.coverUrl ? (
                <img
                  src={selectedPlaylist.coverUrl}
                  alt={selectedPlaylist.name}
                  className="w-full h-full object-cover"
                />
              ) : selectedPlaylist.tracks[0]?.thumbnail ? (
                <img
                  src={selectedPlaylist.tracks[0].thumbnail}
                  alt={selectedPlaylist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ListMusic className="w-8 h-8 text-zinc-500" />
              )}
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
                Lista de reproducción
              </p>
              <h1 className="text-3xl font-extrabold text-white">{selectedPlaylist.name}</h1>
              <p className="text-sm text-zinc-400">
                {selectedPlaylist.tracks.length} canciones
                {selectedPlaylist.description && ` • ${selectedPlaylist.description}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedPlaylist.tracks.length > 0 && !isEditingMode && (
              <button
                onClick={() =>
                  playTrack(
                    selectedPlaylist.tracks[0],
                    selectedPlaylist.tracks,
                    false,
                    isVinylPlaylist(selectedPlaylist) ? 'vinyl' : 'tape'
                  )
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold shadow-lg transition theme-btn"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Reproducir</span>
              </button>
            )}

            {/* Edit Playlist Details (Name, Description, Cover) */}
            <button
              onClick={() => setPlaylistToEdit(selectedPlaylist)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition border border-white/10"
              title="Editar nombre, descripción y portada"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Info</span>
            </button>

            {/* Reorder / Delete Songs Mode */}
            {selectedPlaylist.tracks.length > 0 && (
              <button
                onClick={() => setIsEditingMode(!isEditingMode)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition border ${
                  isEditingMode
                    ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                {isEditingMode ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Guardar Orden</span>
                  </>
                ) : (
                  <>
                    <GripVertical className="w-4 h-4 text-amber-400" />
                    <span>Reordenar</span>
                  </>
                )}
              </button>
            )}

            {/* Delete entire playlist */}
            <button
              onClick={() => {
                if (confirm(`¿Eliminar definitivamente la lista "${selectedPlaylist.name}"?`)) {
                  deletePlaylist(selectedPlaylist.id);
                  setSelectedPlaylistId(null);
                }
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition"
              title="Eliminar lista completa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {selectedPlaylist.tracks.length > 0 && (
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono px-1">
            <span>{selectedPlaylist.tracks.length} canciones</span>
            {isEditingMode && (
              <span className="text-amber-300 flex items-center gap-1 font-semibold">
                <GripVertical className="w-3.5 h-3.5 text-amber-400" />
                Arrastra las canciones o usa las flechas para colocarlas
              </span>
            )}
          </div>
        )}

        {selectedPlaylist.tracks.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 glass-card rounded-3xl">
            <ListMusic className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-white">Esta lista está vacía</p>
            <p className="text-sm">Busca canciones y agrégalas usando el botón (+).</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedPlaylist.tracks.map((track, idx) => {
              const bpm = bpmService.getTrackBpm(track);
              const tier = bpmService.getRpmTier(bpm);
              const isDragging = draggedIndex === idx;
              const isOver = dragOverIndex === idx;

              return (
              <div
                key={`${track.id}-${idx}`}
                draggable={isEditingMode}
                onDragStart={() => {
                  if (isEditingMode) setDraggedIndex(idx);
                }}
                onDragOver={(e) => {
                  if (isEditingMode) {
                    e.preventDefault();
                    setDragOverIndex(idx);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverIndex === idx) setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  if (isEditingMode && draggedIndex !== null) {
                    e.preventDefault();
                    if (draggedIndex !== idx) {
                      reorderPlaylistTracks(selectedPlaylist.id, draggedIndex, idx);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                onClick={() =>
                  !isEditingMode &&
                  playTrack(
                    track,
                    selectedPlaylist.tracks,
                    false,
                    isVinylPlaylist(selectedPlaylist) ? 'vinyl' : 'tape'
                  )
                }
                className={`flex items-center justify-between p-2.5 rounded-2xl transition ${
                  isEditingMode ? 'cursor-grab active:cursor-grabbing select-none' : 'cursor-pointer'
                } ${
                  isDragging ? 'opacity-40 scale-[0.98]' : ''
                } ${
                  isOver ? 'border-2 border-amber-400 bg-amber-400/10' : ''
                } ${
                  currentTrack?.id === track.id && !isEditingMode
                    ? 'border shadow-md'
                    : 'glass-card glass-card-hover'
                }`}
                style={
                  currentTrack?.id === track.id && !isEditingMode
                    ? {
                        backgroundColor: `rgba(${currentTheme.rgb}, 0.15)`,
                        borderColor: `rgba(${currentTheme.rgb}, 0.3)`,
                      }
                    : {}
                }
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {isEditingMode ? (
                    <div className="flex items-center gap-1 text-amber-400 cursor-grab shrink-0">
                      <GripVertical className="w-5 h-5 text-amber-400/80" />
                      <span className="text-xs text-amber-300 font-mono font-bold w-4 text-center">
                        {idx + 1}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 w-5 text-center font-mono shrink-0">
                      {idx + 1}
                    </span>
                  )}

                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-11 h-11 rounded-xl object-cover shrink-0 pointer-events-none"
                  />
                  <div className="overflow-hidden">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{
                        color:
                          currentTrack?.id === track.id && !isEditingMode
                            ? currentTheme.accent
                            : '#ffffff',
                      }}
                    >
                      {track.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                      <span className="truncate">{track.artist}</span>
                      <span className="text-zinc-600">•</span>
                      <SourceBadge source={track.source} size="xs" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono-retro font-bold px-2 py-0.5 rounded border hidden sm:inline-block ${tier.badgeClass}`}>
                    {bpm} BPM • {tier.rpmLabel}
                  </span>
                  {isEditingMode ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => reorderPlaylistTracks(selectedPlaylist.id, idx, idx - 1)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition active:scale-95"
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedPlaylist.tracks.length - 1}
                        onClick={() => reorderPlaylistTracks(selectedPlaylist.id, idx, idx + 1)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition active:scale-95"
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTrackFromPlaylist(selectedPlaylist.id, track.id)}
                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-400 transition ml-1 active:scale-95"
                        title="Quitar de la lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 mr-2 font-mono">
                      {formatDuration(track.duration)}
                    </span>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}

        {/* Modal to edit playlist metadata */}
        <EditPlaylistModal
          playlist={playlistToEdit}
          isOpen={playlistToEdit !== null}
          onClose={() => setPlaylistToEdit(null)}
        />
      </div>
    );
  }

  const handleLoadDemoVinyls = () => {
    const demos = [
      {
        name: 'A Night at the Opera',
        artist: 'Queen',
        year: '1975',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        tracks: [
          {
            id: 'fJ9rUzIMcZQ',
            title: 'Bohemian Rhapsody',
            artist: 'Queen',
            album: 'A Night at the Opera',
            duration: 359,
            thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
            source: 'youtube' as const,
          },
          {
            id: 'HgzGwKwLmgM',
            title: "You're My Best Friend",
            artist: 'Queen',
            album: 'A Night at the Opera',
            duration: 172,
            thumbnail: 'https://i.ytimg.com/vi/HgzGwKwLmgM/hqdefault.jpg',
            source: 'youtube' as const,
          },
        ],
      },
      {
        name: 'The Dark Side of the Moon',
        artist: 'Pink Floyd',
        year: '1973',
        coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
        tracks: [
          {
            id: 'cpbbuaIA3Ds',
            title: 'Time',
            artist: 'Pink Floyd',
            album: 'The Dark Side of the Moon',
            duration: 425,
            thumbnail: 'https://i.ytimg.com/vi/cpbbuaIA3Ds/hqdefault.jpg',
            source: 'youtube' as const,
          },
          {
            id: 'DLOth-BuCNY',
            title: 'Money',
            artist: 'Pink Floyd',
            album: 'The Dark Side of the Moon',
            duration: 382,
            thumbnail: 'https://i.ytimg.com/vi/DLOth-BuCNY/hqdefault.jpg',
            source: 'youtube' as const,
          },
        ],
      },
      {
        name: 'Thriller',
        artist: 'Michael Jackson',
        year: '1982',
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        tracks: [
          {
            id: 'sOnqjkJTMaA',
            title: 'Thriller',
            artist: 'Michael Jackson',
            album: 'Thriller',
            duration: 357,
            thumbnail: 'https://i.ytimg.com/vi/sOnqjkJTMaA/hqdefault.jpg',
            source: 'youtube' as const,
          },
          {
            id: 'Zi_XLOBDo_Y',
            title: 'Billie Jean',
            artist: 'Michael Jackson',
            album: 'Thriller',
            duration: 294,
            thumbnail: 'https://i.ytimg.com/vi/Zi_XLOBDo_Y/hqdefault.jpg',
            source: 'youtube' as const,
          },
        ],
      },
    ];

    for (const demo of demos) {
      const created = createPlaylist(
        demo.name,
        `Álbum de vinilo oficial de ${demo.artist} (${demo.year})`,
        demo.coverUrl,
        'vinyl',
        demo.artist,
        demo.year
      );
      addTracksToPlaylist(created.id, demo.tracks);
    }
  };

  // 3. Main Library Overview
  const displayedListPlaylists =
    listFilter === 'tapes'
      ? tapePlaylists
      : listFilter === 'vinyls'
      ? vinylPlaylists
      : [...tapePlaylists, ...vinylPlaylists];

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto min-w-0 overflow-x-hidden pb-48 select-none">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            <span className="font-mono-retro text-[10px] uppercase font-bold tracking-widest text-zinc-400">
              ARCHIVO DE AUDIO ANALÓGICO
            </span>
          </div>
          <h1 className="font-rock text-3xl sm:text-4xl tracking-widest text-white leading-tight">
            ESTANTERÍAS & COLECCIÓN
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector principal: Estanterías 3D vs Listados */}
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setLibraryViewMode('shelves')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-retro font-bold uppercase transition cursor-pointer ${
                libraryViewMode === 'shelves'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Ver estanterías analógicas 3D (Cintas arriba y Vinilos Cover Flow abajo)"
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Estanterías (3D)</span>
            </button>
            <button
              type="button"
              onClick={() => setLibraryViewMode('lists')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-retro font-bold uppercase transition cursor-pointer ${
                libraryViewMode === 'lists'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Ver listados en tarjetas"
            >
              <List className="w-3.5 h-3.5" />
              <span>Listados</span>
            </button>
          </div>

          {openSyncModal && (
            <button
              onClick={openSyncModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-stereo font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
              title="Sincronizar listas y favoritos entre dispositivos con QR"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>QR</span>
            </button>
          )}

          {openSettingsModal && (
            <button
              onClick={openSettingsModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-stereo font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
              title="Abrir Ajustes y Configuración"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Ajustes</span>
            </button>
          )}

          {openSpotifyCsvModal && (
            <button
              onClick={openSpotifyCsvModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-stereo font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-md shadow-emerald-500/10"
              title="Importar y grabar canciones desde un CSV de Spotify"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Spotify CSV</span>
            </button>
          )}

          <button
            onClick={openNewPlaylistModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl theme-btn text-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>GRABAR CINTA +</span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          BARRA DE BÚSQUEDA Y FILTRADO AVANZADO (ARTISTAS, GÉNEROS, ETC.)
         ============================================================== */}
      <div className="rounded-2xl bg-black/60 border border-white/10 p-3 sm:p-4 space-y-3 shadow-xl backdrop-blur-md">
        {/* Fila 1: Caja de búsqueda con icono, input, clear button y contador */}
        <div className="flex items-center gap-2.5 bg-zinc-900/90 border border-white/10 focus-within:border-amber-400 rounded-xl px-3 py-2 transition shadow-inner">
          <Search className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por artista, género (rock, pop, metal...), disco, cinta o canción..."
            className="w-full bg-transparent text-white font-mono text-xs sm:text-sm focus:outline-none placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Borrar texto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {hasActiveFilter && (
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full shrink-0">
              {tapePlaylists.length + vinylPlaylists.length} coincidencia(s)
            </span>
          )}
        </div>

        {/* Fila 2: Filtros rápidos por género musical y selector de artistas */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Pills de Género */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedGenre('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                selectedGenre === 'all'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              Todos los géneros
            </button>
            {LIBRARY_GENRES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGenre(selectedGenre === g.id ? 'all' : g.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                  selectedGenre === g.id
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>

          {/* Selector de Artistas */}
          {availableArtists.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <Mic2 className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Artista:</span>
              </span>
              <select
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="bg-zinc-900 border border-white/15 text-zinc-200 text-xs font-mono font-bold rounded-xl px-2.5 py-1.5 focus:border-amber-400 focus:outline-none cursor-pointer max-w-[160px] sm:max-w-[200px] truncate"
              >
                <option value="all">Todos los artistas ({availableArtists.length})</option>
                {availableArtists.map((artist) => (
                  <option key={artist} value={artist}>
                    {artist}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Fila 3: Indicador de filtro activo con botón de reset */}
        {hasActiveFilter && (
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap text-zinc-400">
              <span>Filtrado por:</span>
              {searchQuery && (
                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                  "{searchQuery}"
                </span>
              )}
              {selectedGenre !== 'all' && (
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  Género: {LIBRARY_GENRES.find((g) => g.id === selectedGenre)?.label}
                </span>
              )}
              {selectedArtist !== 'all' && (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  Artista: {selectedArtist}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* CANCIONES COINCIDENTES ENCONTRADAS (SI EL FILTRO ESTÁ ACTIVO) */}
      {hasActiveFilter && matchingTracks.length > 0 && (
        <div className="rounded-2xl bg-black/40 border border-amber-500/30 p-3 sm:p-4 space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold font-mono text-white">
                Canciones coincidentes en tus discos y cintas ({matchingTracks.length}):
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowMatchingTracks(!showMatchingTracks)}
              className="text-xs font-mono text-amber-400 hover:underline cursor-pointer"
            >
              {showMatchingTracks ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {showMatchingTracks && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {matchingTracks.map(({ track, playlistName, mediaType }, idx) => (
                <div
                  key={`${track.id}_${idx}`}
                  onClick={() => playTrack(track, undefined, false, mediaType)}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 transition cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-white truncate group-hover:text-amber-300">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {track.artist}
                    </p>
                    <span className="inline-block text-[9px] font-mono text-amber-400/80 truncate">
                      {mediaType === 'vinyl' ? '💽 ' : '📼 '} {playlistName}
                    </span>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-amber-400 text-black flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition shadow">
                    <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ESTADO VACÍO CUANDO NO HAY COINCIDENCIAS */}
      {hasActiveFilter && tapePlaylists.length === 0 && vinylPlaylists.length === 0 && (
        <div className="p-8 text-center bg-black/40 border border-white/10 rounded-2xl space-y-2 animate-in fade-in">
          <p className="font-rock text-lg text-white">NO SE ENCONTRARON DISCOS NI CINTAS</p>
          <p className="text-xs text-zinc-400 font-mono">
            No hay ningún álbum ni cinta que coincida con tus filtros actuales.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition cursor-pointer"
          >
            Limpiar filtros de búsqueda
          </button>
        </div>
      )}

      {libraryViewMode === 'shelves' ? (
        <div className="space-y-12 animate-in fade-in">
          {/* 1. SECCIÓN SUPERIOR: ESTANTERÍA DE CINTAS (LISTAS & MIXTAPES) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                <h2 className="font-mono-retro text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  ESTANTERÍA DE CINTAS • TUS LISTAS EN EL LOMO ({tapePlaylists.length}/48)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-amber-400/80 hidden sm:inline">
                Toca una cinta para reproducirla directamente en la pletina
              </span>
            </div>

            <CassetteRack
              playlists={tapePlaylists}
              onSelectPlaylist={(id) => setSelectedPlaylistId(id)}
              onPlayPlaylist={handlePlayPlaylistFromRack}
              onNewPlaylist={openNewPlaylistModal}
            />
          </div>

          {/* 2. SECCIÓN INFERIOR: ESTANTERÍA DE VINILOS (ÁLBUMES DE GRUPOS - COVER FLOW) */}
          <div className="space-y-3 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-amber-400 animate-spin" />
                <h2 className="font-mono-retro text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  ESTANTERÍA DE VINILOS • ÁLBUMES DE GRUPOS ({vinylPlaylists.length})
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold">
                  COVER FLOW 3D
                </span>
              </div>

              <div className="flex items-center gap-3">
                {vinylPlaylists.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadDemoVinyls}
                    className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    + Cargar 3 Vinilos Clásicos (Demo)
                  </button>
                )}
                {onNavigateToSearch && (
                  <button
                    type="button"
                    onClick={onNavigateToSearch}
                    className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Buscar Álbumes</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] font-mono text-zinc-400 px-1">
              Hojear discos como en Cover Flow: desliza, usa las flechas o la rueda del ratón para girar las carátulas.
            </p>

            <VinylCoverFlow
              vinyls={vinylPlaylists}
              onSelectVinyl={(id) => setSelectedPlaylistId(id)}
              onEditVinyl={(vinyl) => setPlaylistToEdit(vinyl)}
              onDeleteVinyl={(id) => deletePlaylist(id)}
              onOpenSearchReleases={onNavigateToSearch}
            />
          </div>
        </div>
      ) : (
        /* VISTA DE LISTADOS (CUADRÍCULA / LISTA FILTRADA) */
        <div className="space-y-4 animate-in fade-in">
          {/* Sub-selector de tipo de lista */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setListFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  listFilter === 'all'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todos ({tapePlaylists.length + vinylPlaylists.length})
              </button>
              <button
                type="button"
                onClick={() => setListFilter('tapes')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  listFilter === 'tapes'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                📼 Cintas ({tapePlaylists.length})
              </button>
              <button
                type="button"
                onClick={() => setListFilter('vinyls')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  listFilter === 'vinyls'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                💽 Vinilos ({vinylPlaylists.length})
              </button>
            </div>

            {vinylPlaylists.length === 0 && listFilter === 'vinyls' && (
              <button
                type="button"
                onClick={handleLoadDemoVinyls}
                className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                + Cargar 3 Vinilos Clásicos (Demo)
              </button>
            )}
          </div>

          {displayedListPlaylists.length === 0 ? (
            <div className="p-10 text-center retro-tape-chassis rounded-3xl border border-white/10 text-zinc-400">
              <p className="font-rock text-xl text-white tracking-wider mb-1">NO HAY ELEMENTOS EN ESTA VISTA</p>
              <p className="text-xs font-mono text-zinc-400">
                {listFilter === 'vinyls'
                  ? 'No has guardado álbumes en vinilo todavía.'
                  : 'No has grabado ninguna cinta todavía.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                {listFilter === 'vinyls' ? (
                  <>
                    <button
                      onClick={handleLoadDemoVinyls}
                      className="px-5 py-2 rounded-xl theme-btn text-sm cursor-pointer"
                    >
                      Cargar Vinilos Demo
                    </button>
                    {onNavigateToSearch && (
                      <button
                        onClick={onNavigateToSearch}
                        className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm cursor-pointer"
                      >
                        Buscar Álbumes
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={openNewPlaylistModal}
                    className="px-5 py-2 rounded-xl theme-btn text-sm cursor-pointer"
                  >
                    Grabar cinta manual
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayedListPlaylists.map((playlist) => {
                const isItemVinyl = isVinylPlaylist(playlist);
                return (
                  <div
                    key={playlist.id}
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                    className="retro-tape-chassis p-3.5 rounded-2xl cursor-pointer hover:border-amber-500/40 transition flex flex-col group relative overflow-hidden border border-white/10"
                  >
                    {/* Media Cover Window */}
                    <div className="w-full aspect-[4/3] rounded-xl bg-black/60 mb-2.5 overflow-hidden flex items-center justify-center relative shadow-inner border border-white/10">
                      {playlist.coverUrl ? (
                        <img
                          src={playlist.coverUrl}
                          alt={playlist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : playlist.tracks[0]?.thumbnail ? (
                        <img
                          src={playlist.tracks[0].thumbnail}
                          alt={playlist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <ListMusic className="w-10 h-10 text-zinc-600" />
                      )}

                      {/* Format Badge */}
                      <div className="absolute top-1.5 left-1.5 bg-black/85 text-amber-300 font-mono text-[8px] font-black px-1.5 py-0.5 rounded shadow border border-amber-400/30">
                        {isItemVinyl ? '💽 VINILO' : '📼 CINTA'}
                      </div>

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Play className="w-6 h-6 fill-white text-white" />
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-1">
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{playlist.name}</p>
                        <p className="text-xs text-zinc-400 truncate">
                          {playlist.tracks.length} {playlist.tracks.length === 1 ? 'canción' : 'canciones'}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistToEdit(playlist);
                        }}
                        className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition shrink-0"
                        title="Editar lista"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal to edit playlist metadata */}
      <EditPlaylistModal
        playlist={playlistToEdit}
        isOpen={playlistToEdit !== null}
        onClose={() => setPlaylistToEdit(null)}
      />
    </div>
  );
};
