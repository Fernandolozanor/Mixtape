import React from 'react';
import { Compass, Search, Library, Heart, Settings, Baby, Shield } from 'lucide-react';
import { useKidsMode } from '../context/KidsModeContext';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openSettingsModal: () => void;
  openKidsModal: () => void;
  openExitKidsModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  openSettingsModal,
  openKidsModal,
  openExitKidsModal,
}) => {
  const { isKidsMode } = useKidsMode();

  const normalTabs = [
    { id: 'home', label: 'Escuchar', icon: Compass },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'kids', label: 'Niños', icon: Baby, isKidsAction: true },
    { id: 'settings', label: 'Ajustes', icon: Settings, isAction: true },
  ];

  const kidsTabs = [
    { id: 'kids', label: 'Mundo Kids', icon: Baby, isActive: true },
    { id: 'exit', label: 'Salir (Padres)', icon: Shield, isExitAction: true },
  ];

  const activeTabsList = isKidsMode ? kidsTabs : normalTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0e1219] border-t-2 border-[#242c3d] safe-bottom select-none shadow-[0_-8px_25px_rgba(0,0,0,0.85)]">
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
                } else if ('isKidsAction' in tab && tab.isKidsAction) {
                  openKidsModal();
                } else if ('isAction' in tab && tab.isAction) {
                  openSettingsModal();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 transition-all"
              style={{
                color: isActive ? '#fbbf24' : '#94a3b8',
              }}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110 drop-shadow text-amber-400' : ''}`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                )}
              </div>
              <span className="font-stereo text-[10.5px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
