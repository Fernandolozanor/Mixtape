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
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { EditPlaylistModal } from './EditPlaylistModal';
import type { Playlist } from '../types/music';

interface LibraryTabProps {
  openNewPlaylistModal: () => void;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  isFavoritesView?: boolean;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  openNewPlaylistModal,
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
  } = useLibrary();

  const { playTrack, currentTrack } = usePlayer();
  const { currentTheme } = useTheme();

  // Editing state
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);

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
      <div className="space-y-6 max-w-5xl mx-auto pb-32">
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

          <div className="flex items-center gap-2">
            {likedTracks.length > 0 && !isEditingMode && (
              <button
                onClick={() => playTrack(likedTracks[0], likedTracks)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white font-semibold shadow-lg transition theme-btn"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Reproducir Todo</span>
              </button>
            )}

            {likedTracks.length > 0 && (
              <button
                onClick={() => setIsEditingMode(!isEditingMode)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition border ${
                  isEditingMode
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                {isEditingMode ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Listo</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Editar Orden / Borrar</span>
                  </>
                )}
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
                className="px-3.5 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition border border-red-500/20"
                title="Vaciar favoritos"
              >
                <Trash2 className="w-4 h-4" />
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
        ) : (
          <div className="space-y-1.5">
            {likedTracks.map((track, idx) => (
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
                    <p className="text-xs text-zinc-400 truncate">
                      {track.artist} • {audioEngine.getSourceLabel(track.source)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Playlist Detail view
  if (selectedPlaylist) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-32">
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
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                {isEditingMode ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Listo</span>
                  </>
                ) : (
                  <span>Reordenar</span>
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

        {selectedPlaylist.tracks.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 glass-card rounded-3xl">
            <ListMusic className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-white">Esta lista está vacía</p>
            <p className="text-sm">Busca canciones y agrégalas usando el botón (+).</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedPlaylist.tracks.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => !isEditingMode && playTrack(track, selectedPlaylist.tracks)}
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
                    <p className="text-xs text-zinc-400 truncate">
                      {track.artist} • {audioEngine.getSourceLabel(track.source)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditingMode ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        disabled={idx === 0}
                        onClick={() => reorderPlaylistTracks(selectedPlaylist.id, idx, idx - 1)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 transition"
                        title="Subir"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        disabled={idx === selectedPlaylist.tracks.length - 1}
                        onClick={() => reorderPlaylistTracks(selectedPlaylist.id, idx, idx + 1)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 transition"
                        title="Bajar"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeTrackFromPlaylist(selectedPlaylist.id, track.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition ml-1"
                        title="Quitar de la lista"
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
            ))}
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

  // 3. Main Library Overview
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Biblioteca
        </h1>
        <button
          onClick={openNewPlaylistModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition shadow-md theme-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Lista</span>
        </button>
      </div>

      {/* Favorites Banner Card */}
      <div
        onClick={() => setSelectedPlaylistId('favorites')}
        className="p-5 rounded-3xl border cursor-pointer hover:border-white/30 transition flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, rgba(${currentTheme.rgb}, 0.35) 0%, rgba(10, 16, 26, 0.7) 100%)`,
          borderColor: `rgba(${currentTheme.rgb}, 0.35)`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
            style={{
              background: currentTheme.gradient,
            }}
          >
            <Heart className="w-7 h-7 fill-white text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white">Canciones Favoritas</p>
            <p className="text-xs text-zinc-400">{likedTracks.length} canciones guardadas</p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <Play className="w-4 h-4 fill-white" />
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Tus Listas ({playlists.length})
          </p>
        </div>

        {playlists.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-2xl text-zinc-400">
            <p className="text-sm">Aún no has creado listas de reproducción.</p>
            <button
              onClick={openNewPlaylistModal}
              className="mt-3 font-semibold text-sm hover:underline"
              style={{ color: currentTheme.accent }}
            >
              Crea tu primera lista
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => setSelectedPlaylistId(playlist.id)}
                className="glass-card glass-card-hover p-3.5 rounded-2xl cursor-pointer transition flex flex-col group relative"
              >
                <div className="w-full aspect-square rounded-xl bg-zinc-800/80 mb-3 overflow-hidden flex items-center justify-center relative shadow-md">
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
            ))}
          </div>
        )}
      </div>

      {/* Modal to edit playlist metadata */}
      <EditPlaylistModal
        playlist={playlistToEdit}
        isOpen={playlistToEdit !== null}
        onClose={() => setPlaylistToEdit(null)}
      />
    </div>
  );
};
