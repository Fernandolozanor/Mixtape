import React from 'react';
import { Compass, Search, Library, Heart, ListMusic, Settings, Plus, Radio, Palette } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { usePlayer } from '../context/PlayerContext';
import { RetroTapeDeck } from './RetroTapeDeck';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openNewPlaylistModal: () => void;
  openSettingsModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openNewPlaylistModal,
  openSettingsModal,
}) => {
  const { playlists } = useLibrary();
  const { currentTheme, setThemeById, themes } = useTheme();
  const { setFullScreenPlayerOpen } = usePlayer();

  const navItems = [
    { id: 'home', label: 'Escuchar', icon: Compass },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-[#0e121a] border-r-2 border-[#1f2636] p-3.5 select-none shrink-0 shadow-2xl relative">
      {/* 4 Corner Chassis Screws */}
      <div className="absolute top-2 left-2 retro-screw" />
      <div className="absolute top-2 right-2 retro-screw" />

      {/* 80s Rock Audio Receiver Header */}
      <div className="px-2 pt-2 pb-3 mb-3 border-b border-white/10 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
            <h1 className="font-rock text-2xl tracking-widest text-amber-400 drop-shadow">
              PULSE <span className="text-white">'84</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded border border-white/10 font-mono-retro text-[10px] text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            HI-FI
          </div>
        </div>
        <p className="text-[9px] font-mono tracking-wider text-zinc-400 uppercase mt-0.5">
          STEREO CASSETTE RECEIVER • 3-HEAD
        </p>
      </div>

      {/* Main Navigation - 80s Push Buttons */}
      <nav className="space-y-1.5 mb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-stereo text-sm font-semibold tracking-wider uppercase transition-all duration-100 ${
                isActive
                  ? 'bg-gradient-to-r from-[#20293a] to-[#141a26] text-amber-400 border border-amber-500/40 shadow-inner'
                  : 'bg-[#121620] text-zinc-400 hover:text-white hover:bg-[#181e2b] border border-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className="w-4 h-4"
                  style={{ color: isActive ? currentTheme.accent : undefined }}
                />
                <span>{item.label}</span>
              </div>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Playlists Section - Mixtape Rack */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
        <div className="flex items-center justify-between px-2 pt-1 border-b border-white/5 pb-1">
          <span className="text-[10px] font-mono-retro font-bold uppercase tracking-widest text-zinc-400">
            CINTAS & MIXTAPES
          </span>
          <button
            onClick={openNewPlaylistModal}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-amber-400 hover:text-white border border-white/5 transition"
            title="Grabar nueva cinta / lista"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => setActiveTab(`playlist:${playlist.id}`)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-mono truncate transition border ${
                activeTab === `playlist:${playlist.id}`
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
                  : 'text-zinc-400 hover:text-white bg-black/20 hover:bg-white/5 border-transparent'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5 shrink-0 text-amber-500/70" />
              <span className="truncate">{playlist.name}</span>
            </button>
          ))}
          {playlists.length === 0 && (
            <p className="text-[11px] text-zinc-500 px-2 italic font-mono">Sin cintas grabadas</p>
          )}
        </div>
      </div>

      {/* 80s Rock Cassette Deck in Lateral Sidebar */}
      <div className="py-2.5">
        <RetroTapeDeck
          variant="sidebar"
          onExpand={() => setFullScreenPlayerOpen(true)}
        />
      </div>

      {/* Quick Theme Swatches Bar */}
      <div className="pt-3 pb-2 border-t border-white/5">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" /> Esquema
          </span>
        </div>
        <div className="flex items-center justify-between px-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setThemeById(t.id)}
              className={`w-6 h-6 rounded-full transition-transform ${
                currentTheme.id === t.id ? 'scale-125 ring-2 ring-white/60' : 'opacity-70 hover:opacity-100 hover:scale-110'
              }`}
              style={{ background: t.gradient }}
              title={t.name}
            />
          ))}
        </div>
      </div>

      {/* Settings Footer */}
      <div className="pt-2 border-t border-white/5">
        <button
          onClick={openSettingsModal}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition"
        >
          <Settings className="w-5 h-5" />
          <span>Ajustes & Firebase</span>
        </button>
      </div>
    </aside>
  );
};
