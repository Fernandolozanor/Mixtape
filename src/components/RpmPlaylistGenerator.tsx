import React, { useState, useEffect } from 'react';
import {
  Disc3,
  Play,
  ListPlus,
  Check,
  RefreshCw,
  Gauge,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Track } from '../types/music';
import { bpmService, RPM_ZONES, type RpmPreset } from '../services/bpmService';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';

export const RpmPlaylistGenerator: React.FC = () => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { likedTracks, playlists, createPlaylist, addTracksToPlaylist } = useLibrary();

  const [selectedPreset, setSelectedPreset] = useState<RpmPreset>('45');
  const [customBpm, setCustomBpm] = useState<number>(125);
  const [sessionTracks, setSessionTracks] = useState<Track[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const buildUserPool = (): Track[] => {
    const map = new Map<string, Track>();
    for (const t of likedTracks) map.set(t.id, t);
    for (const pl of playlists) {
      for (const t of pl.tracks) map.set(t.id, t);
    }
    return Array.from(map.values());
  };

  const generateMix = async (preset: RpmPreset = selectedPreset, bpm: number = customBpm) => {
    setIsGenerating(true);
    setSavedSuccess(false);
    try {
      const tracks = await bpmService.generateRpmSession(preset, bpm, buildUserPool());
      setSessionTracks(tracks);
    } catch (e) {
      console.warn('Error generating RPM session:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateMix(selectedPreset, customBpm);
  }, [selectedPreset]);

  const handlePlaySession = () => {
    if (sessionTracks.length === 0) return;
    playTrack(sessionTracks[0], sessionTracks);
  };

  const handleSaveAsPlaylist = () => {
    if (sessionTracks.length === 0) return;
    const label =
      selectedPreset === 'custom'
        ? `Cadencia ${customBpm} BPM (${bpmService.getRpmTier(customBpm).rpmLabel})`
        : `${RPM_ZONES[selectedPreset].rpmLabel} • ${RPM_ZONES[selectedPreset].title.split('•')[1]?.trim() || 'Mix'}`;

    const created = createPlaylist(
      `Ritmo ${label}`,
      `Lista generada automáticamente por ritmo (${sessionTracks.length} temas)`
    );
    addTracksToPlaylist(created.id, sessionTracks);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const activeZone =
    selectedPreset === 'custom' ? bpmService.getRpmTier(customBpm) : RPM_ZONES[selectedPreset];

  const displayedTracks = isExpanded ? sessionTracks : sessionTracks.slice(0, 6);

  return (
    <section className="retro-tape-chassis rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-[#263042] shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-retro font-bold uppercase tracking-widest text-amber-400">
                SELECTOR DE REVOLUCIONES • TECHNICS QUARTZ
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                AUTO-BPM
              </span>
            </div>
            <h2 className="font-rock text-2xl sm:text-3xl tracking-wider text-white">
              LISTAS POR RITMO (RPM / BPM)
            </h2>
          </div>
        </div>

        <button
          onClick={() => generateMix(selectedPreset, customBpm)}
          disabled={isGenerating}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono-retro font-bold flex items-center gap-1.5 transition active:scale-95"
          title="Renovar selección de este ritmo"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>RENOVAR MEZCLA</span>
        </button>
      </div>

      {/* 4 Speed Selector Buttons (33⅓, 45, 78 RPM + Exact Cadence) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {(['33', '45', '78'] as const).map((key) => {
          const z = RPM_ZONES[key];
          const isSelected = selectedPreset === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedPreset(key)}
              className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-[#232d42] to-[#131926] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-black/40 hover:bg-black/60 border-white/10 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className="font-mono-retro text-sm sm:text-base font-black tracking-wider"
                  style={{ color: isSelected ? z.color : '#e4e4e7' }}
                >
                  {z.rpmLabel}
                </span>
                <Disc3
                  className={`w-4 h-4 ${isSelected ? 'text-amber-400 animate-spin' : 'text-zinc-600'}`}
                  style={{
                    animationDuration: key === '33' ? '3s' : key === '45' ? '1.8s' : '0.9s',
                  }}
                />
              </div>
              <p className="text-xs font-bold text-white truncate">{z.title}</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                {z.minBpm}–{z.maxBpm} BPM
              </p>
            </button>
          );
        })}

        {/* Custom Exact Cadence Button */}
        <button
          onClick={() => setSelectedPreset('custom')}
          className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
            selectedPreset === 'custom'
              ? 'bg-gradient-to-br from-[#232d42] to-[#131926] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              : 'bg-black/40 hover:bg-black/60 border-white/10 text-zinc-400'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="font-mono-retro text-sm sm:text-base font-black tracking-wider text-emerald-400">
              CADENCIA
            </span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs font-bold text-white truncate">Ritmo Exacto Manual</p>
          <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
            Objetivo: {customBpm} BPM/RPM
          </p>
        </button>
      </div>

      {/* Custom BPM/RPM Dial Slider when 'custom' is active */}
      {selectedPreset === 'custom' && (
        <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300 font-bold">
              AJUSTE DE PULSACIONES / REVOLUCIONES POR MINUTO:
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-sm">
              {customBpm} BPM ({activeZone.rpmLabel})
            </span>
          </div>

          <input
            type="range"
            min={65}
            max={175}
            step={1}
            value={customBpm}
            onChange={(e) => setCustomBpm(parseInt(e.target.value, 10))}
            onMouseUp={() => generateMix('custom', customBpm)}
            onTouchEnd={() => generateMix('custom', customBpm)}
            className="retro-slider"
          />

          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1">
            {[75, 90, 105, 115, 128, 140, 155, 170].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setCustomBpm(val);
                  generateMix('custom', val);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition ${
                  customBpm === val
                    ? 'bg-emerald-400 text-black border-emerald-300'
                    : 'bg-white/5 text-zinc-400 hover:text-white border-white/10'
                }`}
              >
                {val} BPM
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar: Play Session or Save as Mixtape Playlist */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-3 rounded-2xl border border-white/10">
        <div className="text-xs font-mono text-zinc-300">
          <span className="text-amber-400 font-bold">{activeZone.rpmLabel}:</span>{' '}
          <span>{activeZone.subtitle}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePlaySession}
            disabled={sessionTracks.length === 0 || isGenerating}
            className="px-4 py-2 rounded-xl theme-btn text-xs sm:text-sm font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Reproducir Sesión ({sessionTracks.length})</span>
          </button>

          <button
            onClick={handleSaveAsPlaylist}
            disabled={sessionTracks.length === 0 || isGenerating}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono-retro font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">¡GUARDADA EN BIBLIOTECA!</span>
              </>
            ) : (
              <>
                <ListPlus className="w-4 h-4" />
                <span>GRABAR EN CINTA / LISTA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Tracklist Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {displayedTracks.map((track) => {
          const bpm = track.bpm || bpmService.getTrackBpm(track);
          const tier = bpmService.getRpmTier(bpm);
          const isCurrent = currentTrack?.id === track.id;

          return (
            <div
              key={track.id}
              onClick={() => playTrack(track, sessionTracks)}
              className={`flex items-center justify-between gap-2.5 p-2 rounded-xl cursor-pointer border transition ${
                isCurrent
                  ? 'bg-amber-500/20 border-amber-400/50'
                  : 'bg-black/40 hover:bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isCurrent && isPlaying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Disc3 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{track.title}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono-retro font-bold px-2 py-0.5 rounded-md border shrink-0 ${tier.badgeClass}`}
              >
                {bpm} BPM
              </span>
            </div>
          );
        })}
      </div>

      {sessionTracks.length > 6 && (
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 hover:text-amber-300 transition"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Mostrar menos temas</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Ver los {sessionTracks.length} temas de esta sesión</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};
