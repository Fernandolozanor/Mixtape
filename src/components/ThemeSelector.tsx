import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { Check, Palette } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { currentTheme, setThemeById, themes } = useTheme();
  const { settings } = useLibrary();
  const isLight = settings.themeMode === 'light';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className={`w-4 h-4 ${isLight ? 'text-amber-700' : 'text-zinc-400'}`} />
        <h4 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700 font-bold' : 'text-zinc-400'}`}>
          Esquema de Color ({themes.length} Temas)
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {themes.map((theme) => {
          const isSelected = currentTheme.id === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => setThemeById(theme.id)}
              className={`flex items-center sm:flex-col justify-between sm:justify-center gap-2 p-2.5 rounded-2xl border transition-all text-left sm:text-center cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'border-amber-600 bg-amber-500/20 shadow-md ring-1 ring-amber-600/30'
                    : 'border-white/40 bg-white/10 shadow-lg'
                  : isLight
                    ? 'border-black/10 bg-black/5 hover:bg-black/10'
                    : 'border-white/5 bg-white/5 hover:bg-white/8 hover:border-white/15'
              }`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-md relative"
                style={{ background: theme.gradient }}
              >
                {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
              </div>

              <div className="overflow-hidden">
                <p className={`text-xs font-medium truncate ${isSelected ? (isLight ? 'text-slate-950 font-bold' : 'text-white') : (isLight ? 'text-slate-800' : 'text-zinc-200')}`}>{theme.name}</p>
                <p className={`text-[10px] font-mono truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{theme.primary}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
