import React, { useState } from 'react';
import { X, Plus, Check, ListMusic } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import type { Track } from '../types/music';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackToAdd?: Track | null;
  tracksToAdd?: Track[] | null;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  trackToAdd,
  tracksToAdd,
}) => {
  const { playlists, createPlaylist, addTracksToPlaylist } = useLibrary();
  const { currentTheme } = useTheme();

  const allTracksToAdd: Track[] = tracksToAdd && tracksToAdd.length > 0 
    ? tracksToAdd 
    : trackToAdd ? [trackToAdd] : [];

  const hasTracks = allTracksToAdd.length > 0;

  const [isCreatingNew, setIsCreatingNew] = useState(!hasTracks || playlists.length === 0);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const created = createPlaylist(newPlaylistName, newPlaylistDesc);
    if (hasTracks) {
      addTracksToPlaylist(created.id, allTracksToAdd);
      setAddedSuccessId(created.id);
      setTimeout(() => {
        onClose();
        setIsCreatingNew(false);
        setNewPlaylistName('');
      }, 700);
    } else {
      onClose();
      setNewPlaylistName('');
      setNewPlaylistDesc('');
    }
  };

  const handleAddToExisting = (playlistId: string) => {
    if (!hasTracks) return;
    addTracksToPlaylist(playlistId, allTracksToAdd);
    setAddedSuccessId(playlistId);
    setTimeout(() => {
      onClose();
      setAddedSuccessId(null);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl glass-panel p-6 shadow-2xl relative border border-white/10">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">
          {hasTracks
            ? allTracksToAdd.length === 1
              ? 'Añadir a lista'
              : `Añadir ${allTracksToAdd.length} canciones a lista`
            : 'Nueva lista de reproducción'}
        </h2>
        {hasTracks && (
          <p className="text-xs text-zinc-400 truncate mb-4">
            {allTracksToAdd.length === 1 ? (
              <>
                Canción: <span style={{ color: currentTheme.accent }}>{allTracksToAdd[0].title}</span>
              </>
            ) : (
              <span>
                Seleccionadas: <strong className="text-white">{allTracksToAdd.length} canciones</strong>
              </span>
            )}
          </p>
        )}

        {/* Option to create new or select existing */}
        {hasTracks && playlists.length > 0 && (
          <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setIsCreatingNew(false)}
              className="flex-1 py-1.5 rounded-lg transition"
              style={
                !isCreatingNew
                  ? { backgroundColor: currentTheme.primary, color: '#ffffff' }
                  : { color: '#a1a1aa' }
              }
            >
              Listas existentes
            </button>
            <button
              onClick={() => setIsCreatingNew(true)}
              className="flex-1 py-1.5 rounded-lg transition"
              style={
                isCreatingNew
                  ? { backgroundColor: currentTheme.primary, color: '#ffffff' }
                  : { color: '#a1a1aa' }
              }
            >
              Crear nueva
            </button>
          </div>
        )}

        {isCreatingNew ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Nombre de la lista
              </label>
              <input
                type="text"
                required
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Ej. Favoritos para el coche"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                placeholder="Ej. Para escuchar concentrado"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition theme-btn"
              >
                {hasTracks ? `Guardar y Añadir (${allTracksToAdd.length})` : 'Guardar Lista'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {playlists.map((playlist) => {
              const isAdded = addedSuccessId === playlist.id;

              return (
                <button
                  key={playlist.id}
                  onClick={() => handleAddToExisting(playlist.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <ListMusic className="w-5 h-5 text-zinc-400 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-white truncate">{playlist.name}</p>
                      <p className="text-xs text-zinc-400">{playlist.tracks.length} canciones</p>
                    </div>
                  </div>

                  {isAdded ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <Check className="w-4 h-4" /> Añadidas
                    </span>
                  ) : (
                    <Plus className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
