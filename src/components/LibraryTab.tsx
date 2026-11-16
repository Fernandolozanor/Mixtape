import React, { useState } from 'react';
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
import type { Playlist } from '../types/music';

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

  // Favorites view mode: 'vinyl' (default 3D vinyl records) or 'list'
  const [favoritesViewMode, setFavoritesViewMode] = useState<'vinyl' | 'list'>('vinyl');
  // Library view mode: 'shelves' (Estanterías 3D de Cintas arriba y Vinilos Cover Flow abajo) vs 'lists'
  const [libraryViewMode, setLibraryViewMode] = useState<'shelves' | 'lists'>('shelves');
  const [listFilter, setListFilter] = useState<'all' | 'tapes' | 'vinyls'>('all');

  const handlePlayPlaylistFromRack = (playlist: Playlist) => {
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
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

        {likedTracks.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 glass-card rounded-3xl">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-white">No tienes canciones favoritas aún</p>
            <p className="text-sm">Toca el icono de corazón en cualquier canción para guardarla aquí.</p>
          </div>
        ) : favoritesViewMode === 'vinyl' ? (
          /* 3D Vinyl Records Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-2">
            {likedTracks.map((track, idx) => (
              <VinylRecordCard
                key={track.id}
                track={track}
                index={idx}
                isCurrent={currentTrack?.id === track.id}
                isPlaying={isPlaying}
                onPlay={() => {
                  playTrack(track, likedTracks);
                }}
                onRemove={() => removeLikedTrack(track.id)}
                isEditingMode={isEditingMode}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {likedTracks.map((track, idx) => {
              const bpm = bpmService.getTrackBpm(track);
              const tier = bpmService.getRpmTier(bpm);
              return (
              <div
                key={track.id}
                onClick={() => !isEditingMode && playTrack(track, likedTracks)}
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
                onClick={() => playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
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
                onClick={() => !isEditingMode && playTrack(track, selectedPlaylist.tracks)}
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

  const isVinylPlaylist = (p: Playlist) => {
    return (
      p.mediaType === 'vinyl' ||
      p.description?.toLowerCase().includes('vinilo') ||
      p.description?.toLowerCase().includes('lanzamiento oficial') ||
      p.description?.toLowerCase().includes('álbum de vinilo')
    );
  };

  const tapePlaylists = playlists.filter((p) => !isVinylPlaylist(p));
  const vinylPlaylists = playlists.filter((p) => isVinylPlaylist(p));

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
      : playlists;

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
                Todos ({playlists.length})
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
