import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Loader2,
  ListMusic,
  Plus,
  AlertCircle,
} from 'lucide-react';
import type { Track, YouTubeRelease } from '../types/music';
import { youtubeReleaseService } from '../services/youtubeReleaseService';
import { useLibrary } from '../context/LibraryContext';

interface MultiAlbumRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAlbums: YouTubeRelease[];
  onRecordingComplete: (tape: {
    id: string;
    name: string;
    trackCount: number;
    tracks: Track[];
  }) => void;
}

export const MultiAlbumRecordModal: React.FC<MultiAlbumRecordModalProps> = ({
  isOpen,
  onClose,
  selectedAlbums,
  onRecordingComplete,
}) => {
  const { playlists, createPlaylist, addTracksToPlaylist } = useLibrary();

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [tapeName, setTapeName] = useState('');
  const [tapeDesc, setTapeDesc] = useState('');
  const [tapeBias, setTapeBias] = useState<'normal' | 'chrome' | 'metal'>('chrome');
  const [selectedExistingPlaylistId, setSelectedExistingPlaylistId] = useState<string>('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState<{
    current: number;
    total: number;
    albumTitle: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate suggested tape title and description whenever selectedAlbums changes
  useEffect(() => {
    if (!isOpen || selectedAlbums.length === 0) return;

    const titles = selectedAlbums.map((a) => a.title);
    const artists = Array.from(new Set(selectedAlbums.map((a) => a.artist)));
    const primaryArtist = artists.length === 1 ? artists[0] : null;

    let defaultTitle = '';
    if (selectedAlbums.length === 1) {
      defaultTitle = `${titles[0]} [Tape]`;
    } else if (selectedAlbums.length === 2) {
      defaultTitle = primaryArtist
        ? `${primaryArtist} - ${titles[0]} & ${titles[1]} [Tape]`
        : `${titles[0]} + ${titles[1]} [Tape]`;
    } else {
      defaultTitle = primaryArtist
        ? `Mixtape: ${primaryArtist} (${selectedAlbums.length} Discos)`
        : `Mixtape: ${titles[0]} y ${titles[1]} (+${selectedAlbums.length - 2})`;
    }

    const defaultDesc = `Cinta grabada con ${selectedAlbums.length} discos: ${titles.join(' • ')}`;

    setTapeName(defaultTitle);
    setTapeDesc(defaultDesc);
    setErrorMessage(null);
    setIsRecording(false);
    setRecordingProgress(null);

    if (playlists.length > 0 && !selectedExistingPlaylistId) {
      setSelectedExistingPlaylistId(playlists[0].id);
    }
  }, [isOpen, selectedAlbums]);

  if (!isOpen || selectedAlbums.length === 0) return null;

  const handleStartRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) return;
    if (mode === 'new' && !tapeName.trim()) {
      setErrorMessage('Por favor, indica un nombre para la cinta.');
      return;
    }
    if (mode === 'existing' && !selectedExistingPlaylistId) {
      setErrorMessage('Selecciona una cinta de tu colección.');
      return;
    }

    setIsRecording(true);
    setErrorMessage(null);

    const allExtractedTracks: Track[] = [];

    try {
      for (let i = 0; i < selectedAlbums.length; i++) {
        const album = selectedAlbums[i];
        setRecordingProgress({
          current: i + 1,
          total: selectedAlbums.length,
          albumTitle: album.title,
        });

        // Fetch tracks from release service (races Invidious, Piped, and search fallback)
        const details = await youtubeReleaseService.getReleaseDetails(album.id, album);
        if (details?.tracks && details.tracks.length > 0) {
          allExtractedTracks.push(...details.tracks);
        }
      }

      if (allExtractedTracks.length === 0) {
        throw new Error('No se pudieron obtener pistas de los discos seleccionados.');
      }

      let targetTapeId = selectedExistingPlaylistId;
      let finalTapeTitle = tapeName.trim();

      if (mode === 'new') {
        const firstCover = selectedAlbums[0]?.thumbnail || allExtractedTracks[0]?.thumbnail;
        const biasNote = ` [Tipo: ${tapeBias.toUpperCase()}]`;
        const newTape = createPlaylist(
          finalTapeTitle,
          (tapeDesc.trim() || `Grabación combinada de ${selectedAlbums.length} discos`) + biasNote,
          firstCover,
          'tape',
          undefined,
          undefined,
          allExtractedTracks
        );
        targetTapeId = newTape.id;
        addTracksToPlaylist(newTape.id, allExtractedTracks);
      } else {
        const existingTape = playlists.find((p) => p.id === selectedExistingPlaylistId);
        if (existingTape) {
          finalTapeTitle = existingTape.name;
        }
        addTracksToPlaylist(targetTapeId, allExtractedTracks);
      }

      // Success callback
      onRecordingComplete({
        id: targetTapeId,
        name: finalTapeTitle,
        trackCount: allExtractedTracks.length,
        tracks: allExtractedTracks,
      });

      onClose();
    } catch (err: any) {
      console.error('Error batch recording albums to tape:', err);
      setErrorMessage(
        err.message || 'Error al grabar las pistas en la cinta. Comprueba tu conexión.'
      );
      setIsRecording(false);
      setRecordingProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-[#0d121d] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[92dvh]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-amber-500/20 via-orange-500/10 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isRecording}
          className="absolute right-4 top-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-zinc-400 hover:text-white border border-white/10 transition active:scale-95 disabled:opacity-40 cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-5 sm:p-6 pb-3 border-b border-white/10 relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
            <span className="font-mono-retro text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-widest">
              GRABADORA ANALÓGICA • MASTER TAPE DECK
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
            Grabar {selectedAlbums.length} Discos en 1 Cinta
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Combina todos los temas de los lanzamientos seleccionados en un único cassette.
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Selected Albums Preview Horizontal Roll */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Discos a grabar ({selectedAlbums.length})</span>
              <span className="text-amber-400">Total aprox: {selectedAlbums.reduce((sum, a) => sum + (a.trackCount || 10), 0)} pistas</span>
            </label>
            <div className="flex gap-2.5 overflow-x-auto p-2 bg-black/40 rounded-2xl border border-white/10 no-scrollbar">
              {selectedAlbums.map((album, idx) => (
                <div
                  key={album.id}
                  className="w-20 shrink-0 flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden relative shadow-md bg-zinc-900 border border-white/15">
                    <img
                      src={album.thumbnail}
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 bg-black/80 font-mono text-[8px] font-bold text-amber-300 px-1 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-200 truncate w-full mt-1">
                    {album.title}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono truncate w-full">
                    {album.artist}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mode Switch: Nueva Cinta vs Cinta Existente */}
          {playlists.length > 0 && (
            <div className="flex p-1 bg-black/60 border border-white/10 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setMode('new')}
                disabled={isRecording}
                className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'new'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Grabar Nueva Cinta</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('existing')}
                disabled={isRecording}
                className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'existing'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Añadir a Cinta Existente</span>
              </button>
            </div>
          )}

          {/* Recording Mode Fields */}
          {mode === 'new' ? (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Título de la Cinta (Rotulado)
                </label>
                <input
                  type="text"
                  value={tapeName}
                  onChange={(e) => setTapeName(e.target.value)}
                  disabled={isRecording}
                  placeholder="Ej: Mixtape Éxitos Rock 80s"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/70 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-white font-mono placeholder-zinc-600 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Descripción / Notas de la grabación
                </label>
                <textarea
                  value={tapeDesc}
                  onChange={(e) => setTapeDesc(e.target.value)}
                  disabled={isRecording}
                  rows={2}
                  placeholder="Detalles de los álbumes incluidos..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/70 border border-white/15 focus:border-amber-400 focus:outline-none text-xs text-zinc-300 font-mono placeholder-zinc-600 resize-none transition"
                />
              </div>

              {/* Tape Bias Selector (Retro Hi-Fi) */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Emulsión de Cinta (Tape Bias)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: 'TYPE I', sub: 'Normal (Fe)' },
                    { id: 'chrome', label: 'TYPE II', sub: 'Chrome (CrO2)' },
                    { id: 'metal', label: 'TYPE IV', sub: 'Metal (Pure)' },
                  ].map((bias) => (
                    <button
                      key={bias.id}
                      type="button"
                      disabled={isRecording}
                      onClick={() => setTapeBias(bias.id as any)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        tapeBias === bias.id
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                          : 'bg-black/40 border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-mono font-black">{bias.label}</div>
                      <div className="text-[9px] font-mono text-zinc-400">{bias.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Selecciona la cinta de tu estantería:
              </label>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {playlists.map((playlist) => {
                  const isSelected = selectedExistingPlaylistId === playlist.id;
                  return (
                    <div
                      key={playlist.id}
                      onClick={() => !isRecording && setSelectedExistingPlaylistId(playlist.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-400/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                          : 'bg-black/50 border-white/10 text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                          {playlist.coverUrl ? (
                            <img
                              src={playlist.coverUrl}
                              alt={playlist.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 font-mono text-xs">
                              📼
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">
                            {playlist.name}
                          </h4>
                          <p className="text-[10px] font-mono text-zinc-400">
                            {playlist.tracks.length} canciones actuales
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Recording Animation & Progress Display */}
          {isRecording && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="font-mono-retro text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Grabando Cabezal Magnético...
                  </span>
                </div>
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              </div>

              {/* Vintage Cassette Reels Animation */}
              <div className="h-10 bg-black/60 rounded-xl border border-white/10 flex items-center justify-around px-6">
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-amber-400 animate-spin flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <div className="h-0.5 flex-1 mx-4 bg-gradient-to-r from-amber-500/30 via-red-500/60 to-amber-500/30" />
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-amber-400 animate-spin flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
              </div>

              {recordingProgress && (
                <div className="text-center font-mono text-xs text-zinc-300">
                  <span>
                    Extrayendo pistas de{' '}
                    <strong className="text-amber-300">
                      "{recordingProgress.albumTitle}"
                    </strong>{' '}
                    ({recordingProgress.current} de {recordingProgress.total})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isRecording}
            className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 text-xs font-mono font-bold transition disabled:opacity-40 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={isRecording}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-amber-400 hover:from-red-500 hover:to-amber-300 text-black font-mono-retro font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
          >
            {isRecording ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Grabando...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-800 animate-pulse" />
                <span>Iniciar Grabación a Cinta</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
