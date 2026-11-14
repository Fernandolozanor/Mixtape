import React, { useState, useMemo } from 'react';
import { Play, Pause, Search, Moon, Shield, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useKidsMode } from '../context/KidsModeContext';
import { KIDS_STATIONS, ALL_KIDS_TRACKS, type KidsStation } from '../data/kidsAnthology';
import type { Track } from '../types/music';
import { streamResolver } from '../services/streamResolver';

interface KidsTabProps {
  onOpenExitModal: () => void;
  onOpenSettingsModal?: () => void;
}

// Child safety blocklist for Kid SafeSearch
const BLOCKED_KEYWORDS = [
  'sex', 'porn', 'xxx', 'nude', 'desnudo', 'erotico', 'violencia', 'sangre',
  'gore', 'terror', 'miedo', 'drogas', 'weed', 'alcohol', 'matar', 'muerte',
  'pistola', 'armas', 'bad bunny', 'anuel', 'reggaeton explicito', 'insultos',
  'groserias', 'palabrotas', 'asustar', 'susto'
];

export const KidsTab: React.FC<KidsTabProps> = ({ onOpenExitModal }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { sleepTimerRemaining, maxVolume } = useKidsMode();

  const [selectedStationId, setSelectedStationId] = useState<string>('disney');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [blockedAlert, setBlockedAlert] = useState(false);

  const selectedStation = useMemo<KidsStation>(() => {
    return KIDS_STATIONS.find((s) => s.id === selectedStationId) || KIDS_STATIONS[0];
  }, [selectedStationId]);

  // Format sleep timer
  const sleepTimerFormatted = useMemo(() => {
    if (!sleepTimerRemaining) return null;
    const m = Math.floor(sleepTimerRemaining / 60);
    const s = sleepTimerRemaining % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }, [sleepTimerRemaining]);

  // SafeSearch execution
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResults(null);
      setBlockedAlert(false);
      return;
    }

    // Safety check
    const isBlocked = BLOCKED_KEYWORDS.some((kw) => query.includes(kw));
    if (isBlocked) {
      setBlockedAlert(true);
      setSearchResults([]);
      return;
    }

    setBlockedAlert(false);
    setIsSearching(true);

    try {
      // Append safe search keywords to enforce child safe content
      const safeQuery = `${query} infantil canciones para ninos`;
      const results = await streamResolver.search(safeQuery, 'youtube');
      setSearchResults(results.slice(0, 15));
    } catch {
      // Fallback: match inside curated kids tracks
      const localMatches = ALL_KIDS_TRACKS.filter((t) =>
        `${t.title} ${t.artist}`.toLowerCase().includes(query)
      );
      setSearchResults(localMatches);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setBlockedAlert(false);
  };

  const displayedTracks = searchResults !== null ? searchResults : selectedStation.tracks;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20 select-none">
      {/* Top Friendly Header Bar */}
      <div className="rounded-3xl p-4 sm:p-6 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-2xl relative overflow-hidden">
        {/* Floating playful background stars */}
        <div className="absolute top-2 right-16 opacity-30 text-3xl animate-bounce">⭐</div>
        <div className="absolute bottom-2 right-32 opacity-25 text-2xl">🎈</div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl sm:text-5xl filter drop-shadow">🧸</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide drop-shadow-md">
                  Mixtape Kids
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-widest border border-white/30">
                  Modo Seguro
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/90 font-medium">
                Música mágica, segura y divertida para soñar y cantar
              </p>
            </div>
          </div>

          {/* Right Action Badges */}
          <div className="flex items-center gap-2">
            {sleepTimerFormatted && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-xs font-mono font-bold text-amber-300">
                <Moon className="w-4 h-4 text-purple-300" />
                <span>{sleepTimerFormatted}</span>
              </div>
            )}

            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-xs font-mono font-bold text-emerald-300">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Max {Math.round(maxVolume * 100)}%</span>
            </div>

            {/* Parental Exit Button */}
            <button
              onClick={onOpenExitModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-black/50 hover:bg-black/70 active:scale-95 text-white font-bold text-xs border border-white/30 backdrop-blur-md transition shadow-lg"
              title="Salir al reproductor para adultos"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Salir (Padres)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Child SafeSearch Bar */}
      <div className="relative">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="¿Qué canción quieres escuchar hoy? (ej: Frozen, La Vaca Lola...)"
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-[#141a29] border-2 border-amber-500/30 text-white placeholder:text-zinc-500 text-sm sm:text-base font-semibold focus:outline-none focus:border-amber-400 shadow-xl transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-bold bg-white/10 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5 shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isSearching ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>

        {/* Blocked Search Friendly Notification */}
        {blockedAlert && (
          <div className="mt-3 p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 flex items-center gap-3 text-sm animate-in fade-in">
            <span className="text-2xl">🎈</span>
            <div>
              <p className="font-bold">¡Esa búsqueda no está en el mundo de los niños!</p>
              <p className="text-xs text-rose-300">
                Pide ayuda a tus papás o elige una de las estaciones mágicas de abajo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Station Selector - Big Tactile Tabs */}
      {searchResults === null && (
        <div className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 px-1">
            Estaciones Infantiles Favoritas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {KIDS_STATIONS.map((station) => {
              const isSelected = station.id === selectedStationId;
              return (
                <button
                  key={station.id}
                  onClick={() => {
                    setSelectedStationId(station.id);
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-95 flex flex-col justify-between h-24 ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#26324d] to-[#161d2e] border-amber-400 shadow-xl shadow-amber-500/15 scale-[1.02]'
                      : 'bg-[#121622] hover:bg-[#182030] border-white/5 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl filter drop-shadow">{station.emoji}</span>
                    <span
                      className="text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${station.color}25`,
                        color: station.color,
                      }}
                    >
                      {station.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                      {station.title}
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">
                      {station.tracks.length} canciones
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Station Title & Results Banner */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <span>{searchResults !== null ? 'Resultados de Búsqueda Segura' : `${selectedStation.emoji} ${selectedStation.title}`}</span>
          </h2>
          <p className="text-xs text-zinc-400">
            {searchResults !== null
              ? `${displayedTracks.length} canciones infantiles encontradas`
              : selectedStation.description}
          </p>
        </div>

        {searchResults !== null && (
          <button
            onClick={handleClearSearch}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
          >
            Volver a Estaciones
          </button>
        )}
      </div>

      {/* Big Friendly Song Cards (Thumbnails, Title, Play Button) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {displayedTracks.map((track, idx) => {
          const isThisTrackPlaying = isPlaying && currentTrack?.id === track.id;
          const isThisTrackActive = currentTrack?.id === track.id;

          return (
            <div
              key={`${track.id}-${idx}`}
              onClick={() => {
                if (isThisTrackActive) {
                  togglePlay();
                } else {
                  playTrack(track);
                }
              }}
              className={`group p-3 rounded-2xl flex items-center gap-3.5 transition-all duration-200 cursor-pointer active:scale-98 border ${
                isThisTrackActive
                  ? 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-teal-500/20 border-amber-400 shadow-xl'
                  : 'bg-[#121622] hover:bg-[#182030] border-white/5'
              }`}
            >
              {/* Big Thumbnail with Play Overlay */}
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 shadow-md">
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                    isThisTrackActive
                      ? 'bg-black/50 opacity-100'
                      : 'bg-black/40 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
                    {isThisTrackPlaying ? (
                      <Pause className="w-4 h-4 fill-slate-950" />
                    ) : (
                      <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                    )}
                  </div>
                </div>

                {isThisTrackPlaying && (
                  <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>

              {/* Title & Artist */}
              <div className="flex-1 min-w-0 pr-1">
                <h3
                  className={`text-sm sm:text-base font-extrabold truncate ${
                    isThisTrackActive ? 'text-amber-400' : 'text-white'
                  }`}
                  title={track.title}
                >
                  {track.title}
                </h3>
                <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
                  {track.artist}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-500">
                    {Math.floor(track.duration / 60)}:
                    {(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                  {track.viewsFormatted && (
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-amber-400/80 font-mono">
                      {track.viewsFormatted}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Play Pill Button */}
              <div className="shrink-0 pr-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                    isThisTrackActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                      : 'bg-white/10 text-white group-hover:bg-amber-400 group-hover:text-slate-950'
                  }`}
                >
                  {isThisTrackPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
