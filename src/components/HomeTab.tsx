import React, { useState, useEffect } from 'react';
import {
  Play,
  Flame,
  Headphones,
  RefreshCw,
  Heart,
  Wand2,
  Radio,
  Clock,
} from 'lucide-react';
import type { Track } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import {
  recommendationService,
  type RecommendationGroup,
  type FeaturedCollection,
} from '../services/recommendationService';

interface HomeTabProps {
  onSearchGenre: (genre: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ onSearchGenre }) => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { likedTracks, playlists, isLiked, toggleLike } = useLibrary();
  const { currentTheme } = useTheme();

  const [recommendations, setRecommendations] = useState<RecommendationGroup[]>([]);
  const [featuredCollections, setFeaturedCollections] = useState<FeaturedCollection[]>(() =>
    recommendationService.getPersonalizedCollections(likedTracks, playlists)
  );
  const [continuousChannels, setContinuousChannels] = useState<Track[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  const loadRecommendations = async (force: boolean = false) => {
    setIsLoadingRecs(true);
    setIsLoadingChannels(true);
    try {
      // 1. Personalized Groups ("Hecho Para Ti")
      const recs = await recommendationService.getPersonalizedRecommendations(
        likedTracks,
        playlists,
        force
      );
      setRecommendations(recs);

      // 2. Personalized Collections ("Colecciones Destacadas")
      const cols = recommendationService.getPersonalizedCollections(likedTracks, playlists);
      setFeaturedCollections(cols);

      // 3. Personalized Continuous Channels ("Canales Continuos")
      const channels = await recommendationService.getPersonalizedChannels(likedTracks, playlists);
      setContinuousChannels(channels);
    } catch (e) {
      console.warn('Error loading recommendations & channels:', e);
    } finally {
      setIsLoadingRecs(false);
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => {
    loadRecommendations(false);
  }, [likedTracks.length, playlists.length]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}h ${m}m`;
    }
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 sm:space-y-10 w-full max-w-5xl mx-auto min-w-0 overflow-x-hidden pb-48">
      {/* 80s Rock Audio Hi-Fi Receiver Hero Banner */}
      <div className="retro-tape-chassis rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 relative overflow-hidden shadow-2xl border-2 border-[#262f40] w-full min-w-0">
        {/* 4 Corner Screws */}
        <div className="absolute top-2.5 left-2.5 retro-screw" />
        <div className="absolute top-2.5 right-2.5 retro-screw" />
        <div className="absolute bottom-2.5 left-2.5 retro-screw" />
        <div className="absolute bottom-2.5 right-2.5 retro-screw" />

        <div className="max-w-2xl space-y-3.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 border border-amber-500/40 font-mono-retro text-[10px] sm:text-xs font-bold text-amber-400">
            <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>PLETINA ANALÓGICA DE ALTA FIDELIDAD • MODEL 1984</span>
          </div>

          <h1 className="font-rock text-3xl sm:text-5xl md:text-6xl text-white tracking-widest drop-shadow-md leading-none">
            SISTEMA HI-FI ESTÉREO
          </h1>

          <p className="text-zinc-300 font-stereo text-sm sm:text-base tracking-wide">
            Reproducción analógica de catálogo completo sin anuncios. El cabezal aprende de tus escuchas para recomendarte directos míticos, rarezas y temas afines.
          </p>

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onSearchGenre('80s Rock Classics')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl theme-btn active:scale-95 text-base"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Explorar Grandes Éxitos</span>
            </button>

            <button
              onClick={() => loadRecommendations(true)}
              disabled={isLoadingRecs}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/50 hover:bg-black/70 text-zinc-300 hover:text-white font-stereo text-sm font-semibold tracking-wider transition border border-white/10 active:scale-95 disabled:opacity-50"
              title="Volver a analizar gustos y actualizar pletina"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoadingRecs ? 'animate-spin' : ''}`} />
              <span>Sintonizar Preferencias</span>
            </button>
          </div>
        </div>

        {/* Vintage VU meter aesthetic overlay in corner */}
        <div className="absolute right-4 bottom-4 hidden lg:flex items-center gap-3 bg-black/50 p-3 rounded-xl border border-white/10 font-mono-retro text-[10px] text-zinc-400">
          <div className="flex flex-col gap-1">
            <span className="text-amber-400 font-bold">STEREO PEAK</span>
            <span>TYPE II CrO2</span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        </div>
      </div>

      {/* Personalized Recommendations Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: currentTheme.gradient }}
            >
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Hecho Para Ti</h2>
              <p className="text-xs text-zinc-400">
                Basado en tu historial de búsquedas, listas creadas y temas que te gustan
              </p>
            </div>
          </div>

          <button
            onClick={() => loadRecommendations(true)}
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecs ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        {isLoadingRecs && recommendations.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 glass-card rounded-3xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: currentTheme.accent }} />
            <p className="text-sm font-medium text-white">Analizando tus preferencias musicales...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {recommendations.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: currentTheme.accent }}
                    />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      {group.reason}
                    </h3>
                  </div>
                  {group.tracks.length > 0 && (
                    <button
                      onClick={() => playTrack(group.tracks[0], group.tracks)}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: currentTheme.accent }}
                    >
                      Reproducir Grupo →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {group.tracks.map((track) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const liked = isLiked(track.id);

                    return (
                      <div
                        key={track.id}
                        onClick={() => playTrack(track, group.tracks)}
                        className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 group ${
                          isCurrent
                            ? 'border shadow-md'
                            : 'glass-card glass-card-hover'
                        }`}
                        style={
                          isCurrent
                            ? {
                                backgroundColor: `rgba(${currentTheme.rgb}, 0.16)`,
                                borderColor: `rgba(${currentTheme.rgb}, 0.35)`,
                              }
                            : {}
                        }
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Play className="w-5 h-5 fill-white text-white" />
                            </div>
                          </div>

                          <div className="overflow-hidden">
                            <p
                              className="text-sm font-semibold truncate"
                              style={{
                                color: isCurrent ? currentTheme.accent : '#ffffff',
                              }}
                            >
                              {track.title}
                            </p>
                            <p className="text-xs text-zinc-400 truncate">
                              {track.artist}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {formatDuration(track.duration)}
                          </span>
                          <button
                            onClick={() => toggleLike(track)}
                            className="p-1.5 text-zinc-400 hover:text-white transition"
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Featured Collection Cards (Personalized based on tastes & searches) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Colecciones Destacadas</h2>
              <p className="text-xs text-zinc-400">
                Selecciones temáticas adaptadas a tus artistas, búsquedas y favoritos
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredCollections.map((card) => (
            <div
              key={card.id}
              onClick={() => onSearchGenre(card.query)}
              className={`p-6 rounded-3xl border border-white/10 bg-gradient-to-br ${card.gradient} cursor-pointer hover:scale-102 hover:border-white/20 transition-all shadow-xl flex flex-col justify-between min-h-[170px] group relative overflow-hidden`}
            >
              <div>
                {card.badge && (
                  <span
                    className="inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full mb-2.5 border"
                    style={{
                      backgroundColor: currentTheme.badgeBg,
                      color: currentTheme.badgeText,
                      borderColor: currentTheme.badgeBorder,
                    }}
                  >
                    {card.badge}
                  </span>
                )}
                <p className="text-xl font-bold text-white mb-1 leading-snug">{card.title}</p>
                <p className="text-xs text-zinc-300 line-clamp-2">{card.subtitle}</p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <span className="text-xs font-semibold text-zinc-400 group-hover:text-white transition">
                  Explorar canciones →
                </span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center transition shadow-md group-hover:scale-110"
                  style={{ backgroundColor: currentTheme.primary, color: '#ffffff' }}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live & Continuous Channels (Personalized based on tastes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Canales Continuos</h2>
              <p className="text-xs text-zinc-400">
                Conciertos completos, directos y sesiones ininterrumpidas de tu estilo
              </p>
            </div>
          </div>
          {isLoadingChannels && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>Sintonizando...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {continuousChannels.map((item) => {
            const isCurrent = currentTrack?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => playTrack(item, continuousChannels)}
                className={`glass-card glass-card-hover rounded-2xl p-3 flex items-center gap-3.5 cursor-pointer transition group relative overflow-hidden ${
                  isCurrent ? 'border shadow-lg' : ''
                }`}
                style={
                  isCurrent
                    ? {
                        backgroundColor: `rgba(${currentTheme.rgb}, 0.2)`,
                        borderColor: currentTheme.accent,
                      }
                    : {}
                }
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/35 group-hover:bg-black/50 flex items-center justify-center transition">
                    <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                  </div>
                  {isCurrent && isPlaying && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  )}
                </div>

                <div className="overflow-hidden flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: isCurrent ? currentTheme.accent : '#ffffff' }}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
                  {item.duration > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(item.duration)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
