import React from 'react';
import { Compass, Search, Library, Heart, Settings, Baby, Shield } from 'lucide-react';
import { useKidsMode } from '../context/KidsModeContext';
import { useLibrary } from '../context/LibraryContext';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openSettingsModal: () => void;
  openKidsModal: () => void;
  openExitKidsModal: () => void;
  openSyncModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  openSettingsModal,
  openKidsModal,
  openExitKidsModal,
  openSyncModal,
}) => {
  const { isKidsMode } = useKidsMode();
  const { settings } = useLibrary();
  const isLight = settings.themeMode === 'light';

  const normalTabs = [
    { id: 'home', label: 'Para Ti', icon: Compass },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'settings', label: 'Ajustes', icon: Settings, isAction: true },
  ];

  const kidsTabs = [
    { id: 'kids', label: 'Mundo Kids', icon: Baby, isActive: true },
    { id: 'exit', label: 'Salir (Padres)', icon: Shield, isExitAction: true },
  ];

  const activeTabsList = isKidsMode ? kidsTabs : normalTabs;

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 ${
        isLight
          ? 'bg-[#cbd2dc] border-t-2 border-[#8f9aa9] shadow-[0_-8px_25px_rgba(15,23,42,0.15)]'
          : 'bg-[#0e1219] border-t-2 border-[#242c3d] shadow-[0_-8px_25px_rgba(0,0,0,0.85)]'
      } safe-bottom select-none transition-colors duration-200`}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {activeTabsList.map((tab) => {
          const Icon = tab.icon;
          const isActive = isKidsMode ? tab.id === 'kids' : activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if ('isExitAction' in tab && tab.isExitAction) {
                  openExitKidsModal();
                } else if ('isSyncAction' in tab && tab.isSyncAction) {
                  openSyncModal();
                } else if ('isKidsAction' in tab && tab.isKidsAction) {
                  openKidsModal();
                } else if ('isAction' in tab && tab.isAction) {
                  openSettingsModal();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 min-w-0 transition-all cursor-pointer"
              style={{
                color: isActive
                  ? isLight
                    ? '#92400e'
                    : '#fbbf24'
                  : isLight
                    ? '#475569'
                    : '#94a3b8',
              }}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 mb-0.5 ${
                    isActive
                      ? `scale-110 drop-shadow ${isLight ? 'text-amber-700' : 'text-amber-400'}`
                      : ''
                  }`}
                />
                {isActive && (
                  <span className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'}`} />
                )}
              </div>
              <span className="font-stereo text-[0.65rem] font-bold uppercase tracking-wider truncate max-w-full px-0.5 leading-none mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
