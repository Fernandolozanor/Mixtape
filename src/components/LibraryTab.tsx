import React from 'react';
import { Heart, Plus, ListMusic, Play, Trash2 } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

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
  const { playlists, likedTracks, deletePlaylist, removeTrackFromPlaylist } = useLibrary();
  const { playTrack, currentTrack } = usePlayer();
  const { currentTheme } = useTheme();

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
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
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
              <p className="text-sm text-zinc-400">{likedTracks.length} canciones</p>
            </div>
          </div>

          {likedTracks.length > 0 && (
            <button
              onClick={() => playTrack(likedTracks[0], likedTracks)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold shadow-lg transition theme-btn"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Reproducir Todo</span>
            </button>
          )}
        </div>

        {likedTracks.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 glass-card rounded-3xl">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-white">No tienes canciones favoritas aún</p>
            <p className="text-sm">Toca el icono de corazón en cualquier canción para guardarla aquí.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {likedTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, likedTracks)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition ${
                  currentTrack?.id === track.id
                    ? 'border shadow-md'
                    : 'glass-card glass-card-hover'
                }`}
                style={
                  currentTrack?.id === track.id
                    ? {
                        backgroundColor: `rgba(${currentTheme.rgb}, 0.15)`,
                        borderColor: `rgba(${currentTheme.rgb}, 0.3)`,
                      }
                    : {}
                }
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-11 h-11 rounded-xl object-cover shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{
                        color: currentTrack?.id === track.id ? currentTheme.accent : '#ffffff',
                      }}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {track.artist} • {audioEngine.getSourceLabel(track.source)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {formatDuration(track.duration)}
                  </span>
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
          onClick={() => setSelectedPlaylistId(null)}
          className="text-sm font-medium hover:underline transition"
          style={{ color: currentTheme.accent }}
        >
          ← Volver a la Biblioteca
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden shadow-lg border border-white/10">
              {selectedPlaylist.coverUrl ? (
                <img
                  src={selectedPlaylist.coverUrl}
                  alt={selectedPlaylist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ListMusic className="w-8 h-8 text-zinc-500" />
              )}
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Lista de reproducción</p>
              <h1 className="text-3xl font-extrabold text-white">{selectedPlaylist.name}</h1>
              <p className="text-sm text-zinc-400">
                {selectedPlaylist.tracks.length} canciones
                {selectedPlaylist.description && ` • ${selectedPlaylist.description}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedPlaylist.tracks.length > 0 && (
              <button
                onClick={() => playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold shadow-lg transition theme-btn"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Reproducir</span>
              </button>
            )}

            <button
              onClick={() => {
                if (confirm('¿Eliminar esta lista de reproducción?')) {
                  deletePlaylist(selectedPlaylist.id);
                  setSelectedPlaylistId(null);
                }
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition"
              title="Eliminar lista"
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
            {selectedPlaylist.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, selectedPlaylist.tracks)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition ${
                  currentTrack?.id === track.id
                    ? 'border shadow-md'
                    : 'glass-card glass-card-hover'
                }`}
                style={
                  currentTrack?.id === track.id
                    ? {
                        backgroundColor: `rgba(${currentTheme.rgb}, 0.15)`,
                        borderColor: `rgba(${currentTheme.rgb}, 0.3)`,
                      }
                    : {}
                }
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-11 h-11 rounded-xl object-cover shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{
                        color: currentTrack?.id === track.id ? currentTheme.accent : '#ffffff',
                      }}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {track.artist} • {audioEngine.getSourceLabel(track.source)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrackFromPlaylist(selectedPlaylist.id, track.id);
                    }}
                    className="p-2 text-zinc-500 hover:text-red-400 transition"
                    title="Quitar de la lista"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
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
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Tus Listas ({playlists.length})
        </p>

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
                className="glass-card glass-card-hover p-3.5 rounded-2xl cursor-pointer transition flex flex-col group"
              >
                <div className="w-full aspect-square rounded-xl bg-zinc-800/80 mb-3 overflow-hidden flex items-center justify-center relative shadow-md">
                  {playlist.coverUrl ? (
                    <img
                      src={playlist.coverUrl}
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

                <p className="text-sm font-semibold text-white truncate">{playlist.name}</p>
                <p className="text-xs text-zinc-400 truncate">
                  {playlist.tracks.length} {playlist.tracks.length === 1 ? 'canción' : 'canciones'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
