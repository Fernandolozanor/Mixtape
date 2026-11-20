import React from 'react';
import { Compass, Search, Library, Heart, ListMusic, Settings, Plus, Radio, Baby, Shield, KeyRound, LogOut, Clock, UserCheck, QrCode, FileSpreadsheet } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { usePlayer } from '../context/PlayerContext';
import { useKidsMode } from '../context/KidsModeContext';
import { useAuth } from '../context/AuthContext';
import { RetroTapeDeck } from './RetroTapeDeck';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openNewPlaylistModal: () => void;
  openSpotifyCsvModal?: () => void;
  openSettingsModal: () => void;
  openKidsModal: () => void;
  openExitKidsModal: () => void;
  openSyncModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openNewPlaylistModal,
  openSpotifyCsvModal,
  openSettingsModal,
  openKidsModal,
  openExitKidsModal,
  openSyncModal,
}) => {
  const { playlists, syncState, settings } = useLibrary();
  const isLight = settings.themeMode === 'light';
  const { currentTheme } = useTheme();
  const { isFullScreenPlayerOpen, setFullScreenPlayerOpen } = usePlayer();
  const { isKidsMode } = useKidsMode();

  // Only mount the sidebar RetroTapeDeck on desktop (>= 768px) to avoid invisible video/rAF battery drain on mobile
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const {
    session,
    deviceId,
    isTrialActive,
    trialRemainingSeconds,
    setLoginModalOpen,
    setAdminModalOpen,
    logout,
  } = useAuth();

  const formatTrialTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const navItems = [
    { id: 'home', label: 'Para Ti', icon: Compass },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col w-64 h-screen max-h-screen ${
        isLight
          ? 'bg-[#b8c0cb] border-r-2 border-[#8e99a8] text-slate-900 shadow-xl'
          : 'bg-[#0e121a] border-r-2 border-[#1f2636] text-[#f4f4f5] shadow-2xl'
      } p-3 select-none shrink-0 relative overflow-hidden transition-colors duration-200`}
    >
      {/* 80s Rock Audio Receiver Header (Pinned at top) */}
      <div className={`shrink-0 px-2 pt-1 pb-2.5 mb-2 ${isLight ? 'border-b border-black/10' : 'border-b border-white/10'} relative`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`w-5 h-5 ${isLight ? 'text-amber-700' : 'text-amber-500'} animate-pulse`} />
            <h1 className={`font-rock text-2xl tracking-widest ${isLight ? 'text-amber-800' : 'text-amber-400'} drop-shadow`}>
              MIXTAPE
            </h1>
          </div>
          <div className={`flex items-center gap-1.5 ${isLight ? 'bg-black/10 border-black/15 text-emerald-800' : 'bg-black/60 border-white/10 text-emerald-400'} px-2 py-0.5 rounded border font-mono-retro text-[10px] font-bold`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'}`} />
            HI-FI
          </div>
        </div>
        <p className={`text-[9px] font-mono tracking-wider ${isLight ? 'text-slate-700 font-bold' : 'text-zinc-400'} uppercase mt-0.5`}>
          STEREO CASSETTE RECEIVER • 3-HEAD
        </p>
      </div>

      {/* Middle Scrollable Section (Nav, Playlists, Tape Deck) */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3">
        {/* Main Navigation - 80s Push Buttons */}
        <nav className="space-y-1.5 mb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'favorites') {
                    setFullScreenPlayerOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl font-stereo text-sm font-semibold tracking-wider uppercase transition-all duration-100 cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'retro-btn-aluminum text-amber-950 font-black border-amber-600/70 shadow-md ring-1 ring-amber-600/40'
                      : 'bg-gradient-to-r from-[#20293a] to-[#141a26] text-amber-400 border border-amber-500/40 shadow-inner'
                    : isLight
                      ? 'bg-[#cbd2dc] text-slate-800 hover:text-slate-950 hover:bg-[#d8dde6] border border-black/10'
                      : 'bg-[#121620] text-zinc-400 hover:text-white hover:bg-[#181e2b] border border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className="w-4 h-4"
                    style={{ color: isActive ? (isLight ? '#b45309' : currentTheme.accent) : undefined }}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-amber-600 shadow-[0_0_6px_#d97706]' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'}`} />
                )}
              </button>
            );
          })}
          {/* Kids Mode Toggle Button */}
          {isKidsMode ? (
            <button
              onClick={openExitKidsModal}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl font-stereo text-sm font-bold tracking-wider uppercase transition-all bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Baby className="w-4 h-4 text-emerald-400" />
                <span>🧸 Modo Niños</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-amber-300 border border-amber-400/40 font-mono">
                <Shield className="w-2.5 h-2.5" /> Salir
              </span>
            </button>
          ) : (
            <button
              onClick={openKidsModal}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl font-stereo text-sm font-semibold tracking-wider uppercase transition-all bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 active:scale-95 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Baby className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>🧸 Modo Niños</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                SAFE
              </span>
            </button>
          )}
        </nav>

        {/* Playlists Section - Mixtape Rack */}
        <div className="space-y-2">
          <div className={`flex items-center justify-between px-2 pt-1 border-b ${isLight ? 'border-black/10' : 'border-white/5'} pb-1`}>
            <span className={`text-[10px] font-mono-retro font-bold uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              CINTAS & MIXTAPES
            </span>
            <div className="flex items-center gap-1">
              {openSpotifyCsvModal && (
                <button
                  onClick={openSpotifyCsvModal}
                  className={`p-1 rounded ${isLight ? 'bg-emerald-600/20 text-emerald-900 border-emerald-600/40 hover:bg-emerald-600/30' : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'} transition cursor-pointer`}
                  title="Importar y grabar desde Spotify CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={openNewPlaylistModal}
                className={`p-1 rounded ${isLight ? 'bg-black/8 hover:bg-black/15 text-amber-800 border-black/10' : 'bg-white/5 hover:bg-white/10 text-amber-400 hover:text-white border border-white/5'} transition cursor-pointer`}
                title="Grabar nueva cinta / lista"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => setActiveTab(`playlist:${playlist.id}`)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-mono truncate transition border cursor-pointer ${
                  activeTab === `playlist:${playlist.id}`
                    ? isLight
                      ? 'bg-amber-600/25 text-amber-950 border-amber-600/50 font-bold shadow-xs'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
                    : isLight
                      ? 'text-slate-800 hover:text-slate-950 bg-black/5 hover:bg-black/10 border-transparent font-medium'
                      : 'text-zinc-400 hover:text-white bg-black/20 hover:bg-white/5 border-transparent'
                }`}
              >
                <ListMusic className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-500/70'}`} />
                <span className="truncate">{playlist.name}</span>
              </button>
            ))}
            {playlists.length === 0 && (
              <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-500'} px-2 italic font-mono`}>Sin cintas grabadas</p>
            )}
          </div>
        </div>

        {/* 80s Rock Cassette Deck in Lateral Sidebar (mounted only on desktop when fullscreen deck is closed) */}
        {isDesktop && !isFullScreenPlayerOpen && (
          <div className="py-2">
            <RetroTapeDeck
              variant="sidebar"
              onExpand={() => setFullScreenPlayerOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Settings & Auth Footer - Permanently Anchored at Bottom */}
      <div className={`shrink-0 mt-auto pt-2 border-t ${isLight ? 'border-black/10' : 'border-white/10'} space-y-1.5`}>
        {session?.role === 'admin' && (
          <button
            onClick={() => setAdminModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-mono-retro font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Generar Claves VIP
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-black font-black">
              ADMIN
            </span>
          </button>
        )}

        {session ? (
          <div className={`flex items-center justify-between px-3 py-1 rounded-xl ${isLight ? 'bg-black/8 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'} border text-xs font-mono`}>
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'} shrink-0`} />
              <div className="truncate">
                <p className={`font-bold truncate leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{session.username}</p>
                <p className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-zinc-500'}`}>{deviceId}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className={`p-1.5 rounded-lg ${isLight ? 'text-slate-600 hover:text-red-600 hover:bg-red-500/10' : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10'} transition shrink-0 cursor-pointer`}
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isTrialActive ? (
          <button
            onClick={() => setLoginModalOpen(true)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl ${isLight ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-950 border border-emerald-600/40' : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'} text-xs font-mono transition cursor-pointer`}
          >
            <span className="flex items-center gap-1.5 font-bold">
              <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400 animate-pulse'}`} />
              Prueba: {formatTrialTime(trialRemainingSeconds)}
            </span>
            <span className={`text-[10px] underline ${isLight ? 'text-amber-800' : 'text-amber-300'} font-bold`}>Activar</span>
          </button>
        ) : null}

        <button
          onClick={openSyncModal}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl ${isLight ? 'bg-amber-600/15 hover:bg-amber-600/25 text-amber-950 border border-amber-600/30' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'} text-xs font-mono transition cursor-pointer`}
          title="Sincronizar listas y favoritos entre dispositivos con QR"
        >
          <span className="flex items-center gap-2 font-bold">
            <QrCode className={`w-4 h-4 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
            <span>Sincronizar QR</span>
          </span>
          <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${isLight ? 'bg-black/10 text-emerald-800 border border-black/15' : 'bg-black/50 text-emerald-300 border border-emerald-500/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-emerald-400 animate-pulse'}`} />
            {syncState.syncCode.replace('TAPE-', '')}
          </span>
        </button>

        <button
          onClick={openSettingsModal}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-semibold ${isLight ? 'text-slate-800 hover:text-slate-950 bg-black/8 hover:bg-black/15 border border-black/15 shadow-xs' : 'text-zinc-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 shadow-sm'} transition active:scale-98 cursor-pointer`}
        >
          <Settings className={`w-4 h-4 ${isLight ? 'text-amber-700' : 'text-amber-400'} shrink-0`} />
          <span>Ajustes & Configurar</span>
        </button>
      </div>
    </aside>
  );
};
