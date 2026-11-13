import React, { useState } from 'react';
import { X, Cloud, Shield, Database, Trash2, LogIn, LogOut } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { firebaseService } from '../services/firebase';
import { cacheService } from '../services/cacheService';
import { ThemeSelector } from './ThemeSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, saveFirebaseCredentials } = useLibrary();
  const [firebaseJson, setFirebaseJson] = useState('');
  const [firebaseStatusMsg, setFirebaseStatusMsg] = useState<string | null>(null);
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl glass-panel p-6 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Ajustes de Mixtape</h2>

        {/* Section 0: Color Theme Selection */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
          <ThemeSelector />
        </div>

        {/* Section 1: Firebase Cloud Sync */}
        <div className="space-y-3 mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-5 h-5 text-pink-500" />
              <div>
                <h3 className="text-sm font-semibold text-white">Sincronización Firebase</h3>
                <p className="text-xs text-zinc-400">Guarda listas en la nube entre iPhone, Android y PC</p>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                isConfigured
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-700 text-zinc-300'
              }`}
            >
              {isConfigured ? 'Conectado' : 'Modo Local'}
            </span>
          </div>

          {isConfigured && user ? (
            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="text-zinc-300">Sesión: {user.email || 'Anónimo'}</span>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:underline inline-flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
              </button>
            </div>
          ) : isConfigured ? (
            <div className="pt-2">
              <button
                onClick={handleGoogleLogin}
                className="w-full py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition"
              >
                <LogIn className="w-4 h-4" /> Iniciar sesión con Google
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
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
