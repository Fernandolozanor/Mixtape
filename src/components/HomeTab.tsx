import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Flame,
  Headphones,
  RefreshCw,
  Heart,
  Wand2,
  Radio,
  Clock,
  QrCode,
  Sparkles,
  Settings,
  History,
  ArrowLeft,
  Disc3,
  Compass,
} from 'lucide-react';
import type { Track } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import {
  recommendationService,
  getWeeklyCover,
  type ContentWindow,
  type FeaturedCollection,
} from '../services/recommendationService';
import { playbackHistoryService } from '../services/playbackHistoryService';
import { RpmPlaylistGenerator } from './RpmPlaylistGenerator';
import { SourceBadge } from './SourceBadge';

const RECOMMENDED_TAGS = [
  'Rock Clásico',
  'Reggaeton & Urbano',
  'Éxitos Globales',
  'Pop en Español',
  'Hard Rock 80s',
  'Lo-Fi Chill',
  'Baladas Legendarias',
  'Chill & Relax',
];

interface HomeTabProps {
  onSearchGenre: (genre: string) => void;
  onOpenSyncModal?: () => void;
  onOpenSettingsModal?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  onSearchGenre,
  onOpenSyncModal,
  onOpenSettingsModal,
}) => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { likedTracks, playlists, isLiked, toggleLike, settings } = useLibrary();
  const { currentTheme } = useTheme();
  const isLight = settings.themeMode === 'light';

  // Active expanded window ID (only one subsección open at any time)
  const [expandedWindowId, setExpandedWindowId] = useState<string | null>(null);

  // Up to 10 Content windows for each main section
  const [selectedWindows, setSelectedWindows] = useState<ContentWindow[]>([]);
  const [discoveryWindows, setDiscoveryWindows] = useState<ContentWindow[]>([]);
  const [recentWindows, setRecentWindows] = useState<ContentWindow[]>([]);
  const [newReleasesWindows, setNewReleasesWindows] = useState<ContentWindow[]>([]);

  const [featuredCollections, setFeaturedCollections] = useState<FeaturedCollection[]>(() =>
    recommendationService.getPersonalizedCollections(likedTracks, playlists)
  );
  const [continuousChannels, setContinuousChannels] = useState<Track[]>([]);

  const [isLoadingSelected, setIsLoadingSelected] = useState(false);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [isLoadingNewReleases, setIsLoadingNewReleases] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  // Dynamically calculate device screen width and adapt mobile card sizing
  const [screenWidth, setScreenWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 390
  );

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = screenWidth < 640;
  // Calculate exact card width so 2 cards fit flush on screen without spilling on the left,
  // and the 3rd card peeks out by ~42px on the right to cue horizontal scrolling
  const mobileCardWidth = useMemo(() => {
    if (!isMobile) return undefined;
    // <main> container in App.tsx has px-2.5 (10px on each side = 20px)
    const availableWidth = screenWidth - 20;
    const gap = 12; // gap-3 = 12px
    const peekAmount = 42; // visible slice of the 3rd card
    return Math.max(120, Math.round((availableWidth - gap * 2 - peekAmount) / 2));
  }, [screenWidth, isMobile]);

  const loadContent = async (force: boolean = false) => {
    setIsLoadingSelected(true);
    setIsLoadingDiscovery(true);
    setIsLoadingRecent(true);
    setIsLoadingNewReleases(true);
    setIsLoadingChannels(true);

    try {
      const recents = playbackHistoryService.getRecentTracks(25);

      // 1. Seleccionado para ti (hasta 10 ventanas)
      const recs = await recommendationService.getPersonalizedRecommendations(
        likedTracks,
        playlists,
        force
      );
      const selWins: ContentWindow[] = recs.slice(0, 10).map((g) => ({
        id: g.id,
        title: g.reason,
        subtitle: g.artistOrGenre,
        tracks: g.tracks,
      }));
      setSelectedWindows(selWins.slice(0, 10));

      // 2. Descubriendo para ti (hasta 10 ventanas de grupos afines que NO están en tus listas)
      const discWins = await recommendationService.getDiscoveryForYouWindows(
        likedTracks,
        playlists,
        recents
      );
      setDiscoveryWindows(discWins.slice(0, 10));

      // 3. Reproducciones recientes (hasta 10 ventanas)
      const recWins = await recommendationService.getRecentPlaybackWindows(recents);
      setRecentWindows(recWins.slice(0, 10));

      // 4. Novedades para ti (hasta 10 ventanas)
      const newsWins = await recommendationService.getNewReleasesWindows(
        likedTracks,
        playlists,
        recents
      );
      setNewReleasesWindows(newsWins.slice(0, 10));

      // 5. Featured Collections & Channels
      const cols = recommendationService.getPersonalizedCollections(likedTracks, playlists);
      setFeaturedCollections(cols);

      const channels = await recommendationService.getPersonalizedChannels(likedTracks, playlists);
      setContinuousChannels(channels);
    } catch (e) {
      console.warn('Error loading home content:', e);
    } finally {
      setIsLoadingSelected(false);
      setIsLoadingDiscovery(false);
      setIsLoadingRecent(false);
      setIsLoadingNewReleases(false);
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => {
    loadContent(false);
  }, [likedTracks.length, playlists.length]);

  // Keep recent windows synchronized when user plays any song
  useEffect(() => {
    const recents = playbackHistoryService.getRecentTracks(25);
    recommendationService.getRecentPlaybackWindows(recents).then((wins) => setRecentWindows(wins.slice(0, 10)));
  }, [currentTrack?.id]);

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

  const isGlobalLoading =
    isLoadingSelected && selectedWindows.length === 0;

  /**
   * Renders a main section with 4 or 5 folded content windows.
   * Tapping any window unfolds its tracklist and folds any previously open window.
   */
  const renderMainSection = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    windows: ContentWindow[],
    isLoading: boolean
  ) => {
    const activeWindow = windows.find((w) => w.id === expandedWindowId);

    return (
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon}
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight uppercase">
                {title}
              </h2>
              <p className="text-xs text-zinc-400">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && windows.length === 0 ? (
          <div className="p-10 text-center text-zinc-400 glass-card rounded-3xl">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" style={{ color: currentTheme.accent }} />
            <p className="text-sm font-medium text-white">Sintonizando ventanas de contenido...</p>
          </div>
        ) : activeWindow ? (
          /* EXPANDED SUBSECTION VIEW */
          <div className={`space-y-4 p-4 sm:p-6 rounded-3xl shadow-2xl transition-all duration-300 ${
            isLight
              ? 'bg-gradient-to-b from-[#bcc4d0] to-[#afb8c5] border-2 border-[#8591a2] text-slate-900'
              : 'glass-card border border-white/15 bg-black/45'
          }`}>
            {/* Top Bar with 'Volver' button */}
            <div className={`flex items-center justify-between gap-3 flex-wrap border-b pb-4 ${
              isLight ? 'border-black/15' : 'border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExpandedWindowId(null)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-md border ${
                    isLight
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 border-amber-600/40'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35'
                  }`}
                  title="Plegar y volver a las ventanas"
                >
                  <ArrowLeft className={`w-4 h-4 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                  <span>Volver</span>
                </button>
                <div>
                  <h3 className={`text-base sm:text-lg font-bold leading-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {activeWindow.title}
                  </h3>
                  {activeWindow.subtitle && (
                    <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>{activeWindow.subtitle}</p>
                  )}
                </div>
              </div>

              {activeWindow.tracks.length > 0 && (
                <button
                  onClick={() => playTrack(activeWindow.tracks[0], activeWindow.tracks)}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
                  style={{
                    backgroundColor: currentTheme.primary,
                    color: '#ffffff',
                  }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reproducir Todo</span>
                </button>
              )}
            </div>

            {/* Tracklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {activeWindow.tracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const liked = isLiked(track.id);

                return (
                  <div
                    key={`${activeWindow.id}-${track.id}-${idx}`}
                    onClick={() => playTrack(track, activeWindow.tracks)}
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
                            color: isCurrent
                              ? isLight
                                ? '#b45309'
                                : currentTheme.accent
                              : isLight
                              ? '#0f172a'
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

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={() => toggleLike(track)}
                        className="p-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
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

            {/* Bottom Volver Button for convenience on mobile */}
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setExpandedWindowId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Volver a las ventanas</span>
              </button>
            </div>
          </div>
        ) : (
          /* FOLDED STATE: Up to 10 Content Windows (Cards) */
          /* Mobile: Single horizontal row calculated to screen width, aligned flush on the left with 3rd card peeking right */
          /* PC / Desktop: Preserved grid layout untouched (sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5) */
          <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible pb-2.5 sm:pb-0 scrollbar-none snap-x snap-mandatory">
            {windows.map((win) => {
              const cover = getWeeklyCover(win.tracks, win.id);

              return (
                <div
                  key={win.id}
                  onClick={() => setExpandedWindowId(win.id)}
                  style={isMobile && mobileCardWidth ? { width: `${mobileCardWidth}px` } : undefined}
                  className="group relative aspect-square shrink-0 sm:w-auto sm:shrink snap-start rounded-2xl overflow-hidden cursor-pointer glass-card glass-card-hover border border-white/10 hover:border-amber-400/50 transition-all duration-300 hover:scale-[1.03] shadow-lg flex flex-col justify-end p-2.5 sm:p-3 select-none"
                  title={`Toca para abrir ${win.title}`}
                >
                  {/* Weekly Cover Image (changes once a week deterministically) */}
                  {cover ? (
                    <img
                      src={cover}
                      alt={win.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-70"
                      style={{ background: currentTheme.gradient }}
                    >
                      <Disc3 className="w-12 h-12 text-white/30" />
                    </div>
                  )}

                  {/* Vinyl Groove / Retro Accent */}
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full border border-white/20 bg-black/40 backdrop-blur-xs flex items-center justify-center opacity-80 group-hover:opacity-100 transition shadow">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>

                  {/* Dark Gradient Overlay for Title Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />

                  {/* Only Section Name as Requested */}
                  <div className="relative z-10">
                    <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-tight drop-shadow-md group-hover:text-amber-400 transition">
                      {win.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-5xl mx-auto min-w-0 overflow-x-hidden pb-6">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0"
            style={{ background: currentTheme.gradient }}
          >
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="font-mono-retro text-[10px] uppercase font-bold tracking-widest text-amber-400">
                SELECCIÓN PERSONALIZADA
              </span>
            </div>
            <h1 className="font-rock text-3xl sm:text-4xl tracking-widest text-white leading-none">
              PARA TI
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Sincronizar con otros dispositivos mediante código QR"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>QR</span>
            </button>
          )}
          <button
            onClick={() => loadContent(true)}
            disabled={isGlobalLoading}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Actualizar recomendaciones"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isGlobalLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          {onOpenSettingsModal && (
            <button
              onClick={onOpenSettingsModal}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Abrir Ajustes y Configuración"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Ajustes</span>
            </button>
          )}
        </div>
      </div>

      {/* Turntable RPM / Rhythm BPM Playlist Generator (Collapsible) */}
      <RpmPlaylistGenerator />

      {/* 1. SELECCIONADO PARA TI */}
      {renderMainSection(
        'Seleccionado para ti',
        'Listas mezclando temas de tus grupos favoritos, todas tus canciones y descubrimientos',
        <Sparkles className="w-5 h-5 text-amber-400" />,
        selectedWindows,
        isLoadingSelected
      )}

      {/* 2. DESCUBRIENDO PARA TI */}
      {renderMainSection(
        'Descubriendo para ti',
        'Bandas y grupos afines a tu estilo que no están en tus listas',
        <Compass className="w-5 h-5 text-amber-400" />,
        discoveryWindows,
        isLoadingDiscovery
      )}

      {/* 3. REPRODUCCIONES RECIENTES */}
      {renderMainSection(
        'Reproducciones recientes',
        'Tus últimas sesiones y canciones escuchadas en el equipo',
        <History className="w-5 h-5 text-amber-400" />,
        recentWindows,
        isLoadingRecent
      )}

      {/* 4. NOVEDADES PARA TI */}
      {renderMainSection(
        'Novedades para ti',
        'Últimos singles, directos y lanzamientos de grupos acordes a tus gustos',
        <Flame className="w-5 h-5 text-amber-500" />,
        newReleasesWindows,
        isLoadingNewReleases
      )}

      {/* Recommended Tags Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Etiquetas recomendadas
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {RECOMMENDED_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => onSearchGenre(tag)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
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
                    style={{
                      color: isCurrent
                        ? isLight
                          ? '#b45309'
                          : currentTheme.accent
                        : isLight
                        ? '#0f172a'
                        : '#ffffff',
                    }}
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
