import React from 'react';
import { Compass, Search, Library, Heart, ListMusic, Settings, Plus, Radio } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';

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

  const navItems = [
    { id: 'home', label: 'Escuchar', icon: Compass },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-[#111116]/80 backdrop-blur-2xl border-r border-white/5 p-4 select-none shrink-0">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#fa2d55] via-[#d83b9e] to-[#7928ca] flex items-center justify-center shadow-lg shadow-pink-500/25">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Pulse <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-semibold">PRO</span>
          </h1>
          <p className="text-xs text-zinc-400">Sin anuncios • Hi-Fi</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-pink-600/15 text-pink-500 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-pink-500' : 'text-zinc-400'}`} />
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
                  ? 'text-pink-400 bg-pink-500/10 font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
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

      {/* Settings Footer */}
      <div className="pt-3 border-t border-white/5">
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
