import React from 'react';
import type { AudioSourceType } from '../types/music';

interface SourceBadgeProps {
  source?: AudioSourceType | string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source = 'youtube',
  size = 'xs',
  className = '',
}) => {
  const normSource = (source || 'youtube').toLowerCase();

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.2 rounded font-mono font-bold tracking-wide',
    sm: 'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wide',
    md: 'text-xs px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wide',
  }[size];

  if (normSource === 'audius') {
    return (
      <span
        className={`inline-flex items-center gap-1 shrink-0 border border-purple-500/35 bg-purple-500/20 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.2)] ${sizeClasses} ${className}`}
        title="Fuente: Audius"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        <span>Audius</span>
      </span>
    );
  }

  if (normSource === 'radio') {
    return (
      <span
        className={`inline-flex items-center gap-1 shrink-0 border border-emerald-500/35 bg-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)] ${sizeClasses} ${className}`}
        title="Fuente: Radio en Vivo"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Radio</span>
      </span>
    );
  }

  if (normSource === 'custom' || normSource === 'local') {
    return (
      <span
        className={`inline-flex items-center gap-1 shrink-0 border border-amber-500/35 bg-amber-500/20 text-amber-300 ${sizeClasses} ${className}`}
        title="Fuente: Archivo Local"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span>Local</span>
      </span>
    );
  }

  // Default: YouTube
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 border border-red-500/35 bg-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)] ${sizeClasses} ${className}`}
      title="Fuente: YouTube"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      <span>YouTube</span>
    </span>
  );
};

export default SourceBadge;
