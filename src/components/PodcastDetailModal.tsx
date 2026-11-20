import React, { useEffect, useState } from 'react';
import {
  X,
  Play,
  Podcast,
  Loader2,
  BookmarkCheck,
  BookmarkPlus,
  Clock,
  Calendar,
  ListPlus,
  Heart,
} from 'lucide-react';
import type { PodcastShow, Track } from '../types/music';
import { podcastService } from '../services/podcastService';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';

interface PodcastDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  show: PodcastShow | null;
  onOpenAddToPlaylist?: (track: Track) => void;
}

export const PodcastDetailModal: React.FC<PodcastDetailModalProps> = ({
  isOpen,
  onClose,
  show,
  onOpenAddToPlaylist,
}) => {
  const [episodes, setEpisodes] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { settings, isPodcastFollowed, toggleFollowPodcast, isLiked, toggleLike } = useLibrary();
  const isLight = settings.themeMode === 'light';

  useEffect(() => {
    if (!isOpen || !show) return;
    let active = true;
    setIsLoading(true);
    setEpisodes([]);

    podcastService
      .getPodcastEpisodes(show, 30)
      .then((eps) => {
        if (active) setEpisodes(eps);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, show?.id]);

  if (!isOpen || !show) return null;

  const followed = isPodcastFollowed(show.id);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`w-full max-w-2xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] relative z-10 ${
          isLight
            ? 'bg-gradient-to-b from-[#bcc4d0] to-[#afb8c5] border-[#8591a2] text-slate-900'
            : 'bg-[#0d121d] border-indigo-500/35 text-white'
        }`}
      >
        {/* Ambient Header Glow */}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-indigo-500/20 via-amber-500/5 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute right-4 top-4 z-20 p-2 rounded-full transition active:scale-95 border cursor-pointer ${
            isLight
              ? 'bg-[#a4aebb] hover:bg-[#b0bac7] text-slate-800 border-[#7c899a]'
              : 'bg-black/40 hover:bg-black/60 text-zinc-400 hover:text-white border-white/10'
          }`}
          aria-label="Cerrar podcast"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
          {/* Show Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-1">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-indigo-500/40 shrink-0 bg-black/40">
              {show.artwork ? (
                <img
                  src={show.artwork}
                  alt={show.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-950/60">
                  <Podcast className="w-12 h-12 text-indigo-400" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    isLight
                      ? 'bg-indigo-600/15 text-indigo-900 border-indigo-700/40'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  }`}
                >
                  <Podcast className="w-3 h-3" />
                  <span>PODCAST</span>
                </span>
                {show.genre && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isLight
                        ? 'bg-black/10 text-slate-800 border-black/15'
                        : 'bg-white/10 text-zinc-300 border-white/10'
                    }`}
                  >
                    {show.genre}
                  </span>
                )}
              </div>

              <h2
                className={`text-xl sm:text-2xl font-black tracking-wide leading-tight ${
                  isLight ? 'text-slate-950' : 'text-white'
                }`}
              >
                {show.title}
              </h2>
              <p
                className={`text-sm font-bold font-mono mt-0.5 ${
                  isLight ? 'text-amber-900' : 'text-amber-400'
                }`}
              >
                {show.author}
              </p>

              {/* Action Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3.5">
                {episodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playTrack(episodes[0], episodes);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Último Episodio</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => toggleFollowPodcast(show)}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border transition active:scale-95 cursor-pointer ${
                    followed
                      ? isLight
                        ? 'bg-emerald-700 text-white border-emerald-900 shadow-md'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : isLight
                      ? 'bg-[#a4aebb] hover:bg-[#b0bac7] text-slate-900 border-[#7c899a]'
                      : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                  }`}
                >
                  {followed ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      <span>Siguiendo</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Seguir Podcast</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Episodes List */}
          <div className={`space-y-2.5 pt-3 border-t ${isLight ? 'border-black/15' : 'border-white/10'}`}>
            <div className="flex items-center justify-between text-xs px-1">
              <span
                className={`font-mono-retro font-bold uppercase tracking-wider ${
                  isLight ? 'text-amber-900' : 'text-amber-400'
                }`}
              >
                Episodios Recientes ({episodes.length})
              </span>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                Audio directo • Sin anuncios
              </span>
            </div>

            {isLoading ? (
              <div
                className={`py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs ${
                  isLight ? 'text-slate-700' : 'text-zinc-400'
                }`}
              >
                <Loader2 className={`w-6 h-6 animate-spin ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                <span>Cargando episodios del podcast...</span>
              </div>
            ) : episodes.length === 0 ? (
              <div
                className={`py-8 text-center text-xs font-mono ${
                  isLight ? 'text-slate-700' : 'text-zinc-400'
                }`}
              >
                No se encontraron episodios disponibles con audio directo para este podcast.
              </div>
            ) : (
              <div className="space-y-2">
                {episodes.map((ep) => {
                  const isCurrent = currentTrack?.id === ep.id;
                  const saved = podcastService.getEpisodeProgress(ep.id);
                  const liked = isLiked(ep.id);
                  const progressPct =
                    saved && saved.duration > 0
                      ? Math.min(100, Math.round((saved.currentTime / saved.duration) * 100))
                      : 0;

                  return (
                    <div
                      key={ep.id}
                      onClick={() => playTrack(ep, episodes)}
                      className={`group p-3 rounded-2xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                        isCurrent
                          ? isLight
                            ? 'bg-amber-500/20 border-amber-600/60 text-slate-950 shadow-sm'
                            : 'bg-amber-500/15 border-amber-500/50 text-white'
                          : isLight
                          ? 'bg-[#a4aebb] hover:bg-[#b0bac7] border-[#7c899a] text-slate-900'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTrack(ep, episodes);
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                          isCurrent && isPlaying
                            ? 'bg-amber-400 text-black shadow'
                            : isLight
                            ? 'bg-[#bcc4d0] group-hover:bg-amber-400 text-slate-900 group-hover:text-black border border-[#7c899a]'
                            : 'bg-white/10 group-hover:bg-amber-400 text-white group-hover:text-black'
                        }`}
                        aria-label={`Reproducir ${ep.title}`}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={`text-xs sm:text-sm font-bold leading-snug line-clamp-2 ${
                            isCurrent
                              ? isLight
                                ? 'text-amber-900'
                                : 'text-amber-300'
                              : isLight
                              ? 'text-slate-950'
                              : 'text-white'
                          }`}
                        >
                          {ep.title}
                        </p>

                        <div
                          className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-[11px] font-mono ${
                            isLight ? 'text-slate-700' : 'text-zinc-400'
                          }`}
                        >
                          {ep.releaseDate && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(ep.releaseDate)}
                            </span>
                          )}
                          {ep.duration > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(ep.duration)}
                            </span>
                          )}
                          {saved && (
                            <span
                              className={`font-bold ${
                                isLight ? 'text-emerald-800' : 'text-emerald-400'
                              }`}
                            >
                              • Reanudar en {formatTime(saved.currentTime)}
                            </span>
                          )}
                        </div>

                        {progressPct > 0 && (
                          <div className="w-full h-1 rounded-full bg-black/20 overflow-hidden mt-1">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => toggleLike(ep)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isLight
                              ? 'text-slate-700 hover:text-amber-800 hover:bg-black/10'
                              : 'text-zinc-400 hover:text-amber-400 hover:bg-white/10'
                          }`}
                          title="Guardar en Favoritos"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              liked ? 'fill-amber-500 text-amber-500' : ''
                            }`}
                          />
                        </button>
                        {onOpenAddToPlaylist && (
                          <button
                            type="button"
                            onClick={() => onOpenAddToPlaylist(ep)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isLight
                                ? 'text-slate-700 hover:text-slate-950 hover:bg-black/10'
                                : 'text-zinc-400 hover:text-white hover:bg-white/10'
                            }`}
                            title="Añadir a una cinta"
                          >
                            <ListPlus className="w-4 h-4" />
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
      </div>
    </div>
  );
};
