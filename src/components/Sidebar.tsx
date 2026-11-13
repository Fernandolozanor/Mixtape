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
    <aside className="hidden md:flex flex-col w-64 h-screen bg-[#0b1019]/80 backdrop-blur-2xl border-r border-white/5 p-4 select-none shrink-0">
      {/* Brand Logo with Dynamic Theme Gradient */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background: currentTheme.gradient,
            boxShadow: `0 8px 20px rgba(${currentTheme.rgb}, 0.35)`,
          }}
        >
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Pulse{' '}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
              style={{
                backgroundColor: currentTheme.badgeBg,
                color: currentTheme.badgeText,
                borderColor: currentTheme.badgeBorder,
              }}
            >
              PRO
            </span>
          </h1>
          <p className="text-xs text-zinc-400">Sin anuncios • Hi-Fi</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 mb-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: `rgba(${currentTheme.rgb}, 0.18)`,
                      color: currentTheme.accent,
                      border: `1px solid rgba(${currentTheme.rgb}, 0.3)`,
                    }
                  : {}
              }
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isActive ? currentTheme.accent : undefined }}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Playlists Section */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Listas
          </span>
          <button
            onClick={openNewPlaylistModal}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Crear nueva lista"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-0.5">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => setActiveTab(`playlist:${playlist.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left truncate transition ${
                activeTab === `playlist:${playlist.id}`
                  ? 'font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              style={
                activeTab === `playlist:${playlist.id}`
                  ? {
                      color: currentTheme.accent,
                      backgroundColor: `rgba(${currentTheme.rgb}, 0.15)`,
                    }
                  : {}
              }
            >
              <ListMusic className="w-4 h-4 shrink-0 text-zinc-500" />
              <span className="truncate">{playlist.name}</span>
            </button>
          ))}
          {playlists.length === 0 && (
            <p className="text-xs text-zinc-500 px-3 italic">No hay listas aún</p>
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
