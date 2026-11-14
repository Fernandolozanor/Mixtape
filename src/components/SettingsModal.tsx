import React, { useState } from 'react';
import { X, Cloud, Shield, Database, Trash2, LogIn, LogOut, Baby, QrCode, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useKidsMode } from '../context/KidsModeContext';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebase';
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
  const { settings, syncState, updateSettings, saveFirebaseCredentials } = useLibrary();
  const { isKidsMode } = useKidsMode();
  const { session, setAdminModalOpen } = useAuth();
  const [firebaseJson, setFirebaseJson] = useState('');
  const [firebaseStatusMsg, setFirebaseStatusMsg] = useState<string | null>(null);
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);
  const [showAdvancedFirebase, setShowAdvancedFirebase] = useState(false);
  const [user, setUser] = useState(firebaseService.getCurrentUser());

  if (!isOpen) return null;

  const handleSaveFirebase = async () => {
    try {
      const parsed = JSON.parse(firebaseJson);
      const ok = await saveFirebaseCredentials(parsed);
      if (ok) {
        setFirebaseStatusMsg('¡Firebase conectado con éxito! Listas sincronizadas.');
        setUser(firebaseService.getCurrentUser());
      } else {
        setFirebaseStatusMsg('Error: Configuración incompleta (se requiere apiKey y projectId).');
      }
    } catch {
      setFirebaseStatusMsg('Error de sintaxis JSON. Asegúrate de copiar el objeto completo.');
    }
  };

  const handleGoogleLogin = async () => {
    const u = await firebaseService.loginWithGoogle();
    if (u) {
      setUser(u);
      setFirebaseStatusMsg(`Conectado como ${u.displayName || u.email}`);
    }
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    setUser(null);
  };

  const handleClearCache = async () => {
    await cacheService.clearAllCache();
    setCacheClearedMsg(true);
    setTimeout(() => setCacheClearedMsg(false), 2000);
  };

  const isConfigured = firebaseService.isConfigured();

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

          {/* Optional Advanced Firebase Toggle */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowAdvancedFirebase((prev) => !prev)}
              className="w-full flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 font-mono"
            >
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-pink-400" />
                Firebase Propio (Opcional / Avanzado)
              </span>
              {showAdvancedFirebase ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvancedFirebase && (
              <div className="mt-3 space-y-2 pt-2 border-t border-white/5">
                {isConfigured && user ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Sesión: {user.email || 'Anónimo'}</span>
                    <button
                      onClick={handleLogout}
                      className="text-red-400 hover:underline inline-flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                    </button>
                  </div>
                ) : isConfigured ? (
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition"
                  >
                    <LogIn className="w-4 h-4" /> Iniciar sesión con Google
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400">
                      Pega aquí tu configuración de Firebase Console (Proyecto web):
                    </p>
                    <textarea
                      rows={3}
                      value={firebaseJson}
                      onChange={(e) => setFirebaseJson(e.target.value)}
                      placeholder='{"apiKey": "...", "projectId": "...", ...}'
                      className="w-full p-2.5 rounded-xl glass-input text-xs font-mono"
                    />
                    <button
                      onClick={handleSaveFirebase}
                      className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold transition"
                    >
                      Guardar Configuración
                    </button>
                  </div>
                )}

                {firebaseStatusMsg && (
                  <p className="text-xs text-pink-400 font-medium">{firebaseStatusMsg}</p>
                )}
              </div>
            )}
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
