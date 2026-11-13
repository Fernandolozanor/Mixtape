import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Check, Palette } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { currentTheme, setThemeById, themes } = useTheme();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-zinc-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Esquema de Color (5 Temas)
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {themes.map((theme) => {
          const isSelected = currentTheme.id === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => setThemeById(theme.id)}
              className={`flex items-center sm:flex-col justify-between sm:justify-center gap-2 p-2.5 rounded-2xl border transition-all text-left sm:text-center ${
                isSelected
                  ? 'border-white/40 bg-white/10 shadow-lg'
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
                <p className="text-xs font-medium text-white truncate">{theme.name}</p>
                <p className="text-[10px] text-zinc-400 font-mono truncate">{theme.primary}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
