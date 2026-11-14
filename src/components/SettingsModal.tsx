import React, { useState } from 'react';
import { X, Shield, Database, Trash2, Baby, QrCode, KeyRound, Gauge, Activity } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useKidsMode } from '../context/KidsModeContext';
import { useAuth } from '../context/AuthContext';
import { cacheService } from '../services/cacheService';
import { ThemeSelector } from './ThemeSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKidsModal?: () => void;
  onOpenSyncModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenKidsModal,
  onOpenSyncModal,
}) => {
  const { settings, syncState, updateSettings } = useLibrary();
  const { isKidsMode } = useKidsMode();
  const { session, setAdminModalOpen } = useAuth();
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);

  if (!isOpen) return null;

  const handleClearCache = async () => {
    await cacheService.clearAllCache();
    setCacheClearedMsg(true);
    setTimeout(() => setCacheClearedMsg(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pb-6 safe-top bg-black/75 backdrop-blur-md select-none animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl glass-panel p-6 shadow-2xl relative border border-white/10 max-h-[84dvh] overflow-y-auto my-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Ajustes de Mixtape</h2>

        {/* Admin Key Generator Shortcut (Only visible to Master Admin) */}
        {session?.role === 'admin' && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/25 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Generador de Claves VIP</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-mono font-black">
                    ADMIN
                  </span>
                </h3>
                <p className="text-xs text-zinc-300">Autoriza nuevos equipos y gestiona licencias</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                setAdminModalOpen(true);
              }}
              className="py-2 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md transition active:scale-95 shrink-0"
            >
              Abrir Panel
            </button>
          </div>
        )}

        {/* Section 0: Color Theme Selection */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
          <ThemeSelector />
        </div>

        {/* Section 0.2: VU Meter Style Selection (Agujas Analógicas vs Luces Digitales) */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Medidor de Nivel (VU Meter)</h3>
                <p className="text-xs text-zinc-400">Canales estéreo (L / R) de cinta y vinilo</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Opción 1: Agujas Analógicas */}
            <button
              type="button"
              onClick={() => updateSettings({ vuMeterStyle: 'analog' })}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition active:scale-95 text-center ${
                (settings.vuMeterStyle || 'analog') === 'analog'
                  ? 'bg-amber-500/20 text-white border-amber-400 shadow-lg ring-1 ring-amber-400/40'
                  : 'bg-black/30 text-zinc-400 border-white/10 hover:text-white hover:bg-white/5'
              }`}
            >
              <Gauge className="w-6 h-6 text-amber-400" />
              <div>
                <p className="text-xs font-bold font-stereo uppercase tracking-wider">Agujas Analógicas</p>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Vúmetro clásico vintage</p>
              </div>
            </button>

            {/* Opción 2: Luces Digitales LED */}
            <button
              type="button"
              onClick={() => updateSettings({ vuMeterStyle: 'led' })}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition active:scale-95 text-center ${
                settings.vuMeterStyle === 'led'
                  ? 'bg-emerald-500/20 text-white border-emerald-400 shadow-lg ring-1 ring-emerald-400/40'
                  : 'bg-black/30 text-zinc-400 border-white/10 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-0.5 h-6">
                <span className="w-1.5 h-3 bg-emerald-400 rounded-sm" />
                <span className="w-1.5 h-4 bg-emerald-400 rounded-sm" />
                <span className="w-1.5 h-5 bg-amber-400 rounded-sm" />
                <span className="w-1.5 h-6 bg-rose-500 rounded-sm shadow-[0_0_6px_#f43f5e]" />
              </div>
              <div>
                <p className="text-xs font-bold font-stereo uppercase tracking-wider">Luces Digitales</p>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Barras LED de colores</p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 0.5: Kids Safe Mode */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Modo Seguro para Niños</span>
                  {isKidsMode && (
                    <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold">
                      ACTIVO
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">Filtro infantil, volumen seguro y temporizador</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenKidsModal?.();
              }}
              className="py-1.5 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              Configurar
            </button>
          </div>
        </div>

        {/* Section 1: QR Multi-Device Sync (Primary) */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/35 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Sincronización por QR</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                    {syncState.syncCode}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Vincula tu móvil, tablet y PC escaneando un código QR sin registro
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSyncModal?.();
              }}
              className="py-2 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 shrink-0"
            >
              Abrir QR
            </button>
          </div>
        </div>

        {/* Section 2: Audio & Ads Controls */}
        <div className="space-y-3 mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2.5 mb-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Filtros & Reproducción</h3>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-zinc-200">Salto de anuncios de autor (SponsorBlock)</p>
              <p className="text-xs text-zinc-400">Salta intros y patrocinios comunitariamente reportados</p>
            </div>
            <input
              type="checkbox"
              checked={settings.skipSponsors}
              onChange={(e) => updateSettings({ skipSponsors: e.target.checked })}
              className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-white/5">
            <div>
              <p className="text-sm text-zinc-200">Letras sincronizadas en vivo</p>
              <p className="text-xs text-zinc-400">Descarga automática de letras con marcas de tiempo (LRCLIB)</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableLrcLyrics}
              onChange={(e) => updateSettings({ enableLrcLyrics: e.target.checked })}
              className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Section 3: Offline Storage */}
        <div className="space-y-3 mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Memoria Caché Offline</h3>
                <p className="text-xs text-zinc-400">Almacenamiento en IndexedDB del navegador</p>
              </div>
            </div>
            <button
              onClick={handleClearCache}
              className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          </div>
          {cacheClearedMsg && (
            <p className="text-xs text-green-400">✓ Memoria caché vaciada</p>
          )}
        </div>

        {/* Info */}
        <div className="text-center text-xs text-zinc-500">
          <p>Mixtape • Hi-Fi Cassette Deck PWA</p>
          <p>Compatible con iPhone, Android, Windows y macOS</p>
        </div>
      </div>
    </div>
  );
};
