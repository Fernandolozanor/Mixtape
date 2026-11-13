import React from 'react';
import { Compass, Search, Library, Heart, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openSettingsModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  openSettingsModal,
}) => {
  const tabs = [
    { id: 'home', label: 'Escuchar', icon: Compass },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'settings', label: 'Ajustes', icon: Settings, isAction: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0e1219] border-t-2 border-[#242c3d] safe-bottom select-none shadow-[0_-8px_25px_rgba(0,0,0,0.85)]">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.isAction) {
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
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110 drop-shadow' : ''}`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                )}
              </div>
              <span className="font-stereo text-[11px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
