import React from 'react';

interface LetterSeparatorProps {
  letter: string;
  count?: number;
  isLight?: boolean;
  className?: string;
}

export const LetterSeparator: React.FC<LetterSeparatorProps> = ({
  letter,
  count,
  isLight = false,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center gap-2.5 pt-2.5 pb-1 first:pt-0.5 select-none ${className}`}
      role="separator"
      aria-label={`Sección letra ${letter}`}
    >
      <span
        className={`inline-flex items-center justify-center min-w-[1.75rem] h-6 px-2 rounded-lg font-mono-retro text-xs font-black tracking-wider border shadow-sm ${
          isLight
            ? 'bg-amber-500/20 text-amber-900 border-amber-700/40'
            : 'bg-amber-400/15 text-amber-300 border-amber-400/40'
        }`}
      >
        {letter}
      </span>
      <div
        className={`flex-1 h-px ${
          isLight ? 'bg-slate-900/15' : 'bg-white/10'
        }`}
      />
      {typeof count === 'number' && (
        <span
          className={`text-[10px] font-mono font-bold ${
            isLight ? 'text-slate-600' : 'text-zinc-500'
          }`}
        >
          {count}
        </span>
      )}
    </div>
  );
};
