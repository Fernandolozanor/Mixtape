import React, { useState } from 'react';
import { X, Shield, Database, Trash2, Baby, QrCode, KeyRound, Gauge, Activity, RefreshCw, CheckCircle2, Type, Disc3 } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useKidsMode } from '../context/KidsModeContext';
import { useAuth } from '../context/AuthContext';
import { cacheService } from '../services/cacheService';
import { ThemeSelector } from './ThemeSelector';
import { APP_VERSION, APP_BUILD, checkAppUpdate } from '../version';
import type { TextSizeType } from '../types/music';

const TEXT_SIZES: {
  id: TextSizeType;
  name: string;
  description: string;
  previewClass: string;
}[] = [
  {
    id: 'small',
    name: 'Pequeño',
    description: 'Compacto • 88%',
    previewClass: 'text-sm',
  },
  {
    id: 'medium',
    name: 'Normal',
    description: 'Estándar • 100%',
    previewClass: 'text-base',
  },
  {
    id: 'large',
    name: 'Grande',
    description: 'Cómodo • 113%',
    previewClass: 'text-xl',
  },
  {
    id: 'xlarge',
    name: 'Muy grande',
    description: 'Accesible • 125%',
    previewClass: 'text-2xl',
  },
];

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
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClearCache = async () => {
    await cacheService.clearAllCache();
    setCacheClearedMsg(true);
    setTimeout(() => setCacheClearedMsg(false), 2000);
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMsg(null);
    try {
      const res = await checkAppUpdate();
      setUpdateStatusMsg(res.message);
    } catch {
      setUpdateStatusMsg('Error al verificar actualización');
    } finally {
      setIsCheckingUpdate(false);
      setTimeout(() => {
        setUpdateStatusMsg(null);
      }, 5000);
    }
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

        {/* Section 0: Text Size Selection (4 Tamaños con Auto-Organización) */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white/5 to-transparent border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Type className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-white">Tamaño del Texto</h3>
                <p className="text-xs text-zinc-400">Escala de lectura con auto-organización de interfaz</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                {TEXT_SIZES.find((s) => s.id === (settings.textSize || 'medium'))?.name || 'Normal'}
              </span>
              {(settings.textSize && settings.textSize !== 'medium') && (
                <button
                  type="button"
                  onClick={() => updateSettings({ textSize: 'medium' })}
                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  Restablecer
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {TEXT_SIZES.map((opt) => {
              const isSelected = (settings.textSize || 'medium') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateSettings({ textSize: opt.id })}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-between gap-1.5 transition active:scale-95 text-center cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-white border-amber-400 shadow-lg ring-1 ring-amber-400/40'
                      : 'bg-black/30 text-zinc-400 border-white/10 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={`font-black font-stereo tracking-tight text-amber-400 ${opt.previewClass}`}>
                    A
                  </span>
                  <div>
                    <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                      {opt.name}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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

        {/* Section 1.5: Continuous Playback & Crossfade (Sin silencios) */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-transparent border border-pink-500/25 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Disc3
                className={`w-5 h-5 text-pink-400 shrink-0 ${settings.crossfadeEnabled ? 'animate-spin' : ''}`}
                style={{ animationDuration: '6s' }}
              />
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Fundido Cruzado (Crossfade)</span>
                  {settings.crossfadeEnabled ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-mono font-bold">
                      {settings.crossfadeDuration || 5}s ON
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 font-mono">
                      OFF
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">
                  Reproducción continua sin pausas solapando el final y el principio de las canciones
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={Boolean(settings.crossfadeEnabled)}
                onChange={(e) => updateSettings({ crossfadeEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 shadow-inner"></div>
            </label>
          </div>

          {settings.crossfadeEnabled && (
            <div className="pt-2 border-t border-white/10 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Tiempo de solape:</span>
                <span className="font-mono font-bold text-pink-400 bg-pink-500/15 px-2.5 py-0.5 rounded-lg border border-pink-500/30">
                  {settings.crossfadeDuration || 5} segundos
                </span>
              </div>

              {/* Range slider */}
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={settings.crossfadeDuration || 5}
                onChange={(e) => updateSettings({ crossfadeDuration: parseInt(e.target.value, 10) })}
                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[3, 5, 8, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => updateSettings({ crossfadeDuration: sec })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition active:scale-95 border cursor-pointer ${
                      (settings.crossfadeDuration || 5) === sec
                        ? 'bg-pink-500/25 text-pink-300 border-pink-400 shadow-md ring-1 ring-pink-400/40'
                        : 'bg-black/25 text-zinc-400 border-white/10 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-zinc-400 italic">
                💡 Al faltar {settings.crossfadeDuration || 5} segundos para acabar la canción, la siguiente entrará suavemente enlazada sin cortes ni silencios.
              </p>
            </div>
          )}
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

        {/* Version & System Information */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-mono-retro font-bold text-sm text-white">
                  Versión {APP_VERSION}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                  {APP_BUILD}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Mixtape • Hi-Fi Cassette Deck PWA
              </p>
            </div>

            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition active:scale-95 disabled:opacity-50 shrink-0"
              title="Comprobar si hay una versión más reciente"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
              <span>{isCheckingUpdate ? 'Comprobando...' : 'Buscar actualización'}</span>
            </button>
          </div>

          {updateStatusMsg && (
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{updateStatusMsg}</span>
            </div>
          )}

          <div className="text-center text-xs text-zinc-500">
            <p>Compatible con iPhone, Android, Windows y macOS</p>
          </div>
        </div>
      </div>
    </div>
  );
};
