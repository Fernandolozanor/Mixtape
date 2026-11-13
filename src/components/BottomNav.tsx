import React from 'react';
import { Compass, Search, Library, Heart, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const { currentTheme } = useTheme();

  const tabs = [
    { id: 'home', label: 'Escuchar', icon: Compass },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'settings', label: 'Ajustes', icon: Settings, isAction: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav safe-bottom select-none">
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
              className="flex flex-col items-center justify-center flex-1 py-1 transition-colors"
              style={{
                color: isActive ? currentTheme.accent : undefined,
              }}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
