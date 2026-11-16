import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Plus,
  Disc3,
  Check,
  Loader2,
} from 'lucide-react';
import type { Track, YouTubeRelease } from '../types/music';
import { youtubeReleaseService } from '../services/youtubeReleaseService';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';

interface AlbumDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: YouTubeRelease | null;
  onOpenAddToPlaylist?: (track: Track) => void;
  onOpenAddMultipleToPlaylist?: (tracks: Track[]) => void;
}

export const AlbumDetailModal: React.FC<AlbumDetailModalProps> = ({
  isOpen,
  onClose,
  release,
  onOpenAddToPlaylist,
  onOpenAddMultipleToPlaylist,
}) => {
  const [fullRelease, setFullRelease] = useState<YouTubeRelease | null>(release);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState(false);

  const { playTrack, currentTrack } = usePlayer();
  const { createPlaylist, addTracksToPlaylist, playlists } = useLibrary();

  const isSavedVinyl = release
    ? playlists.some(
        (p) =>
          (p.mediaType === 'vinyl' || p.description?.toLowerCase().includes('vinilo')) &&
          (p.name.toLowerCase() === (release.title || '').toLowerCase() ||
            p.tracks.some((t) => (fullRelease?.tracks || release.tracks || []).some((at) => at.id === t.id)))
      )
    : false;

  useEffect(() => {
    if (!isOpen || !release) return;
    setFullRelease(release);
    setRecordedSuccess(false);

    if (release.tracks && release.tracks.length > 0) {
      return;
    }

    setIsLoadingTracks(true);
    youtubeReleaseService
      .getReleaseDetails(release.id, release)
      .then((detailed) => {
        if (detailed) {
          setFullRelease(detailed);
        }
      })
      .finally(() => {
        setIsLoadingTracks(false);
      });
  }, [isOpen, release?.id]);

  if (!isOpen || !release) return null;

  const tracks = fullRelease?.tracks || [];
  const totalDurationSec = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMins = Math.floor(totalDurationSec / 60);

  const formatTrackTime = (sec?: number) => {
    if (!sec) return '3:30';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    playTrack(tracks[0], tracks, false, isSavedVinyl ? 'vinyl' : 'tape');
    onClose();
  };

  const handleRecordToVinyl = () => {
    if (tracks.length === 0) return;
    const albumName = fullRelease?.title || release.title;
    const artistName = fullRelease?.artist || release.artist;
    const cover = fullRelease?.thumbnail || release.thumbnail;
    const playlist = createPlaylist(
      albumName,
      `Álbum de vinilo oficial de ${artistName} (${release.year || 'LP'})`,
      cover,
      'vinyl',
      artistName,
      release.year
    );
    addTracksToPlaylist(playlist.id, tracks);
    setRecordedSuccess(true);
    setTimeout(() => {
      setRecordedSuccess(false);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-2xl bg-[#0d121d] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] relative">
        {/* Header Ambient Background Glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-500/20 via-pink-500/10 to-transparent pointer-events-none" />

        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-zinc-400 hover:text-white border border-white/10 transition active:scale-95"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {/* Album Info Top Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2">
            {/* Vinyl / Cover Art with Realistic 3D Bevel */}
            <div className="relative group shrink-0">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/40 relative bg-black/60">
                <img
                  src={fullRelease?.thumbnail || release.thumbnail}
                  alt={release.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-white/10 pointer-events-none" />
                {/* Vinyl Record Peak Peeking behind */}
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-32 rounded-r-full bg-zinc-900 border border-zinc-700 opacity-80 pointer-events-none hidden sm:block shadow-inner" />
              </div>
              <div className="absolute -bottom-2 -left-2 bg-amber-500 text-black font-mono font-black text-[10px] px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider">
                Release
              </div>
            </div>

            {/* Metadata and Title */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>LANZAMIENTO OFICIAL</span>
                </span>
                {release.year && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-white/10">
                    {release.year}
                  </span>
                )}
                <span className="text-[10px] font-mono text-zinc-400">
                  {tracks.length > 0 ? `${tracks.length} canciones • ${totalMins} min` : 'Álbum Completo'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide leading-tight drop-shadow-md">
                {fullRelease?.title || release.title}
              </h2>
              <p className="text-sm sm:text-base font-bold text-amber-400 font-mono mt-1">
                {fullRelease?.artist || release.artist}
              </p>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={handlePlayAll}
                  disabled={tracks.length === 0}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-40 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reproducir Disco</span>
                </button>

                <button
                  type="button"
                  onClick={handleRecordToVinyl}
                  disabled={tracks.length === 0 || recordedSuccess}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 border transition active:scale-95 cursor-pointer ${
                    recordedSuccess
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-white/20'
                  }`}
                  title="Guardar este álbum en tu estantería Cover Flow de Vinilos"
                >
                  {recordedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-black" />
                      <span>¡Guardado en Vinilo!</span>
                    </>
                  ) : (
                    <>
                      <Disc3 className="w-4 h-4 text-amber-400" />
                      <span>Guardar en Vinilo</span>
                    </>
                  )}
                </button>

                {onOpenAddMultipleToPlaylist && tracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenAddMultipleToPlaylist(tracks)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 border border-white/10 transition active:scale-95 cursor-pointer"
                    title="Añadir a lista personalizada"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tracklist Section */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-2 py-1">
              <span className="font-mono-retro font-bold uppercase tracking-wider text-amber-400/90">
                Pistas del Álbum ({tracks.length})
              </span>
              <span className="text-[11px] font-mono">Audio Original • Estudio</span>
            </div>

            {isLoadingTracks ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span>Cargando pistas oficiales de YouTube...</span>
              </div>
            ) : tracks.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 font-mono">
                No se han podido cargar las pistas de este lanzamiento.
              </div>
            ) : (
              <div className="space-y-1.5">
                {tracks.map((t, idx) => {
                  const isCurrent = currentTrack?.youtubeId === t.youtubeId;
                  return (
                    <div
                      key={t.id + idx}
                      className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-500/40 text-white'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-zinc-200'
                      }`}
                    >
                      {/* Left: Track Number + Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold text-zinc-500 w-5 text-right shrink-0">
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => playTrack(t, tracks, false, isSavedVinyl ? 'vinyl' : 'tape')}
                          className="w-7 h-7 rounded-lg bg-white/10 group-hover:bg-amber-400 group-hover:text-black flex items-center justify-center text-zinc-300 transition shrink-0 cursor-pointer"
                          aria-label={`Reproducir ${t.title}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrent ? 'text-amber-300' : 'text-zinc-100'}`}>
                            {t.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {t.artist}
                          </p>
                        </div>
                      </div>

                      {/* Right: Duration + Add Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-zinc-400">
                          {formatTrackTime(t.duration)}
                        </span>
                        {onOpenAddToPlaylist && (
                          <button
                            type="button"
                            onClick={() => onOpenAddToPlaylist(t)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition opacity-80 group-hover:opacity-100"
                            title="Añadir a lista"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Disc3 className="w-3.5 h-3.5 text-amber-400" />
            <span>ID: {release.id.slice(0, 16)}...</span>
          </div>
          <span className="text-zinc-500">Formato YouTube Release</span>
        </div>
      </div>
    </div>
  );
};
