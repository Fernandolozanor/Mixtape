import React, { useState, useEffect } from 'react';
import { X, Save, Image, FileText, Music } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import type { Playlist } from '../types/music';

interface EditPlaylistModalProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({
  playlist,
  isOpen,
  onClose,
}) => {
  const { updatePlaylist } = useLibrary();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || '');
      setCoverUrl(playlist.coverUrl || '');
    }
  }, [playlist]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updatePlaylist(playlist.id, {
      name: name.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim() || undefined,
    });
    onClose();
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

        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>Editar Lista de Reproducción</span>
        </h2>

        {/* Preview Cover */}
        <div className="flex items-center gap-4 mb-5 p-3 rounded-2xl bg-white/5 border border-white/5">
          <div className="w-16 h-16 rounded-xl bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center shadow-md">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Portada"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                }}
              />
            ) : playlist.tracks[0]?.thumbnail ? (
              <img
                src={playlist.tracks[0].thumbnail}
                alt="Portada"
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-7 h-7 text-zinc-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white truncate">{name || 'Sin título'}</p>
            <p className="text-xs text-zinc-400">{playlist.tracks.length} canciones</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Nombre de la lista
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la lista"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Descripción
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Añade una descripción para tu lista..."
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" /> URL de imagen de portada (opcional)
            </label>
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
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
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition theme-btn flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
