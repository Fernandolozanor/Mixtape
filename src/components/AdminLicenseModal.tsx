import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  UserPlus,
  Copy,
  Check,
  Trash2,
  X,
  Smartphone,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DURATION_OPTIONS: { label: string; hours: number | null }[] = [
  { label: 'Permanente (Sin caducidad)', hours: null },
  { label: '30 Días', hours: 24 * 30 },
  { label: '7 Días', hours: 24 * 7 },
  { label: '24 Horas', hours: 24 },
];

export const AdminLicenseModal: React.FC = () => {
  const {
    session,
    isAdminModalOpen,
    setAdminModalOpen,
    generateUserPassword,
    generatedLicenses,
    deleteLicenseRecord,
  } = useAuth();

  const [targetUser, setTargetUser] = useState('');
  const [targetDevice, setTargetDevice] = useState('');
  const [selectedDurationIdx, setSelectedDurationIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<{
    username: string;
    deviceId: string;
    password: string;
    durationLabel: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isAdminModalOpen || session?.role !== 'admin') {
    return null;
  }

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const opt = DURATION_OPTIONS[selectedDurationIdx];
    const res = generateUserPassword(targetUser, targetDevice, opt.hours, opt.label);
    if ('error' in res) {
      setError(res.error);
      return;
    }

    setLastGenerated({
      username: targetUser.trim(),
      deviceId: res.normalizedDeviceId,
      password: res.password,
      durationLabel: opt.label,
    });
    setTargetUser('');
    setTargetDevice('');
  };

  const copyWhatsAppMessage = (
    id: string,
    username: string,
    password: string,
    deviceId: string,
    durationLabel: string
  ) => {
    const text = [
      `🎸 *Acceso Privado Mixtape Hi-Fi*`,
      `👤 Usuario: ${username}`,
      `🔑 Contraseña: ${password}`,
      `🔒 Equipo vinculado: ${deviceId}`,
      `⏱️ Validez: ${durationLabel}`,
      `(Nota: esta clave solo funciona en tu dispositivo ${deviceId})`,
    ].join('\n');

    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto select-none">
      <div className="retro-tape-chassis w-full max-w-lg rounded-3xl p-5 sm:p-7 border-2 border-amber-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.95)] relative my-auto max-h-[92dvh] overflow-y-auto">
        <button
          onClick={() => setAdminModalOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition"
          aria-label="Cerrar panel de administrador"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/10">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono-retro font-bold uppercase tracking-widest text-amber-400">
              ADMINISTRADOR MAESTRO • {session.username}
            </span>
            <h2 className="font-rock text-2xl tracking-wider text-white">
              GENERADOR DE CLAVES POR EQUIPO
            </h2>
          </div>
        </div>

        {/* Generator Form */}
        <form onSubmit={handleGenerate} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono-retro font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Nombre de Usuario
              </label>
              <div className="relative">
                <UserPlus className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder="Ej: carlos"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/70 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-zinc-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono-retro font-bold uppercase tracking-wider text-zinc-300 mb-1">
                ID de Equipo del Invitado
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={targetDevice}
                  onChange={(e) => setTargetDevice(e.target.value)}
                  placeholder="EQ-XXXX-XXXX"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/70 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-amber-300 placeholder-zinc-500 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono-retro font-bold uppercase tracking-wider text-zinc-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Duración del Acceso
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSelectedDurationIdx(idx)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold border transition ${
                    selectedDurationIdx === idx
                      ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                      : 'bg-black/50 text-zinc-400 hover:text-white border-white/10'
                  }`}
                >
                  {idx === 0 ? 'Permanente' : opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-black font-stereo font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            <KeyRound className="w-4 h-4" />
            <span>GENERAR CONTRASEÑA VINCULADA</span>
          </button>
        </form>

        {/* Newly Generated Result Banner */}
        {lastGenerated && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-retro font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                CLAVE GENERADA CON ÉXITO
              </span>
              <span className="text-[10px] font-mono text-zinc-300">
                {lastGenerated.durationLabel}
              </span>
            </div>

            <div className="bg-black/70 rounded-xl p-3 font-mono text-xs space-y-1 border border-white/10">
              <div className="flex justify-between">
                <span className="text-zinc-400">Usuario:</span>
                <span className="text-white font-bold">{lastGenerated.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Equipo autorizado:</span>
                <span className="text-amber-300 font-bold">{lastGenerated.deviceId}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-zinc-400">Contraseña:</span>
                <span className="text-emerald-400 font-bold text-sm tracking-wider">
                  {lastGenerated.password}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                copyWhatsAppMessage(
                  'latest',
                  lastGenerated.username,
                  lastGenerated.password,
                  lastGenerated.deviceId,
                  lastGenerated.durationLabel
                )
              }
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono-retro font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
            >
              {copiedId === 'latest' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡MENSAJE COPIADO PARA WHATSAPP!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPIAR CREDENCIALES PARA WHATSAPP</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* History of Generated Licenses */}
        {generatedLicenses.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <h3 className="text-[11px] font-mono-retro font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
              HISTORIAL DE ACCESOS GENERADOS ({generatedLicenses.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {generatedLicenses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">{item.username}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {item.deviceId}
                      </span>
                    </div>
                    <p className="text-emerald-400 font-bold text-[11px] mt-0.5">
                      {item.password}{' '}
                      <span className="text-zinc-500 font-normal">• {item.durationLabel}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        copyWhatsAppMessage(
                          item.id,
                          item.username,
                          item.password,
                          item.deviceId,
                          item.durationLabel
                        )
                      }
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition"
                      title="Copiar para WhatsApp"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLicenseRecord(item.id)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition"
                      title="Borrar del historial"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
