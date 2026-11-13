import React from 'react';
import { Play, Sparkles, Flame, Headphones } from 'lucide-react';
import type { Track } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';

interface HomeTabProps {
  onSearchGenre: (genre: string) => void;
}

const FEATURED_CARDS = [
  {
    id: 'lofi_chill',
    title: 'Lofi & Relax Beats',
    subtitle: 'Música perfecta para estudiar y concentrarse',
    gradient: 'from-blue-950/60 via-sky-950/40 to-black',
    accent: '#38bdf8',
    query: 'Lofi hip hop beats to study relax',
  },
  {
    id: 'top_hits',
    title: 'Top Hits Internacional',
    subtitle: 'Lo más escuchado del momento',
    gradient: 'from-indigo-950/60 via-blue-950/40 to-black',
    accent: '#60a5fa',
    query: 'Top hits 2026',
  },
  {
    id: 'synthwave',
    title: 'Synthwave & Retrowave',
    subtitle: 'Vibras retro futuristas electrónicas',
    gradient: 'from-cyan-950/60 via-blue-950/40 to-black',
    accent: '#06b6d4',
    query: 'Synthwave chillwave',
  },
];

const PRESET_CHANNELS = [
  {
    id: 'radio_lofi',
    title: 'Lofi Girl - Beats to relax/study to',
    artist: 'Lofi Girl',
    duration: 0,
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    source: 'youtube' as const,
    videoId: 'jfKfPfyJRdk',
  },
  {
    id: 'radio_piano',
    title: 'Piano Relajante y Paz',
    artist: 'Acoustic Waves',
    duration: 3600,
    thumbnail: 'https://images.unsplash.com/photo-1520523839898-507125cd53c1?w=500&auto=format&fit=crop&q=80',
    source: 'youtube' as const,
    videoId: '7NOSDKb0HlU',
  },
  {
    id: 'radio_deep_focus',
    title: 'Deep Focus Ambient',
    artist: 'Mind Wave',
    duration: 7200,
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
    source: 'youtube' as const,
    videoId: 'WPni755-Krg',
  },
];

export const HomeTab: React.FC<HomeTabProps> = ({ onSearchGenre }) => {
  const { playTrack } = usePlayer();
  const { currentTheme } = useTheme();

  const handlePlayPreset = (preset: typeof PRESET_CHANNELS[0]) => {
    const track: Track = {
      id: preset.videoId,
      title: preset.title,
      artist: preset.artist,
      duration: preset.duration,
      thumbnail: preset.thumbnail,
      source: 'youtube',
      youtubeId: preset.videoId,
    };
    playTrack(track);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-32">
      {/* Hero Welcome */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl transition-all"
        style={{
          background: `linear-gradient(135deg, rgba(${currentTheme.rgb}, 0.25) 0%, rgba(10, 16, 26, 0.9) 100%)`,
        }}
      >
        <div className="max-w-xl space-y-3 relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: currentTheme.badgeBg,
              color: currentTheme.badgeText,
              borderColor: currentTheme.badgeBorder,
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>PWA Musical Sin Anuncios</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Escucha la música que amas con pureza total.
          </h1>
          <p className="text-zinc-300 text-sm md:text-base">
            Diseño refinado, canciones completas, letras en tiempo real y listas sincronizadas en la nube.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onSearchGenre('Top Éxitos')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200 transition shadow-lg active:scale-95"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Explorar Música</span>
            </button>
          </div>
        </div>

        {/* Ambient glow in corner */}
        <div
          className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: `rgba(${currentTheme.rgb}, 0.25)`,
          }}
        />
      </div>

      {/* Featured Collection Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5" style={{ color: currentTheme.accent }} />
          <h2 className="text-lg font-bold text-white tracking-tight">Destacados</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURED_CARDS.map((card) => (
            <div
              key={card.id}
              onClick={() => onSearchGenre(card.query)}
              className={`p-6 rounded-3xl border border-white/10 bg-gradient-to-br ${card.gradient} cursor-pointer hover:scale-102 hover:border-white/20 transition-all shadow-xl flex flex-col justify-between min-h-[160px] group`}
            >
              <div>
                <p className="text-xl font-bold text-white mb-1">{card.title}</p>
                <p className="text-xs text-zinc-300">{card.subtitle}</p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <span className="text-xs font-semibold text-zinc-400 group-hover:text-white transition">
                  Ver pistas →
                </span>
                <div className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-white group-hover:text-black flex items-center justify-center transition">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live / Ambient Channels */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5" style={{ color: currentTheme.accent }} />
          <h2 className="text-lg font-bold text-white tracking-tight">Canales Continuos</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PRESET_CHANNELS.map((item) => (
            <div
              key={item.id}
              onClick={() => handlePlayPreset(item)}
              className="glass-card glass-card-hover rounded-2xl p-3 flex items-center gap-3.5 cursor-pointer transition group"
            >
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition">
                  <Play className="w-5 h-5 fill-white text-white" />
                </div>
              </div>

              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
