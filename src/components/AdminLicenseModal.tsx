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
  MessageSquareText,
  ClipboardPaste,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseWhatsAppLicenseRequest } from '../utils/whatsappLicenseParser';

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

  const [whatsappInput, setWhatsappInput] = useState('');
  const [parseFeedback, setParseFeedback] = useState<{
    type: 'ready' | 'partial' | 'none';
    text: string;
  } | null>(null);
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

  const applyWhatsAppParse = (raw: string, autoGenerate: boolean = false) => {
    setWhatsappInput(raw);
    setError(null);

    if (!raw.trim()) {
      setParseFeedback(null);
      return;
    }

    const parsed = parseWhatsAppLicenseRequest(raw);
    const nextUser = parsed.username || targetUser;
    const nextDevice = parsed.deviceId || targetDevice;
    const nextDurationIdx =
      parsed.durationIdx !== null ? parsed.durationIdx : selectedDurationIdx;

    if (parsed.username) setTargetUser(parsed.username);
    if (parsed.deviceId) setTargetDevice(parsed.deviceId);
    if (parsed.durationIdx !== null) setSelectedDurationIdx(parsed.durationIdx);

    if (parsed.rawUserFound && parsed.rawDeviceFound) {
      setParseFeedback({
        type: 'ready',
        text: `Detectado: ${parsed.username} • ${parsed.deviceId}`,
      });
    } else if (parsed.rawDeviceFound) {
      setParseFeedback({
        type: 'partial',
        text: `ID detectado (${parsed.deviceId}). Falta el nombre de usuario.`,
      });
    } else if (parsed.rawUserFound) {
      setParseFeedback({
        type: 'partial',
        text: `Usuario detectado (${parsed.username}). Falta el ID EQ-XXXX-XXXX.`,
      });
    } else {
      setParseFeedback({
        type: 'none',
        text: 'No se detectó un ID EQ-XXXX-XXXX en el mensaje.',
      });
    }

    if (autoGenerate && nextUser.trim() && nextDevice.trim()) {
      const opt = DURATION_OPTIONS[nextDurationIdx];
      const res = generateUserPassword(nextUser, nextDevice, opt.hours, opt.label);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setLastGenerated({
        username: nextUser.trim(),
        deviceId: res.normalizedDeviceId,
        password: res.password,
        durationLabel: opt.label,
      });
      setWhatsappInput('');
      setParseFeedback(null);
      setTargetUser('');
      setTargetDevice('');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        applyWhatsAppParse(clipText, false);
      }
    } catch {
      setError('No se pudo leer el portapapeles. Pega el mensaje manualmente con Ctrl+V.');
    }
  };

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
    setWhatsappInput('');
    setParseFeedback(null);
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md px-3 pb-6 safe-top overflow-y-auto select-none">
      <div className="retro-tape-chassis w-full max-w-lg rounded-3xl p-5 sm:p-7 border-2 border-amber-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.95)] relative my-auto max-h-[84dvh] overflow-y-auto">
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

        {/* Quick WhatsApp Smart Import Box */}
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-[11px] font-mono-retro font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-emerald-400" />
              Pegar mensaje de WhatsApp
            </label>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[10px] font-mono-retro font-bold uppercase flex items-center gap-1 transition active:scale-95"
            >
              <ClipboardPaste className="w-3 h-3" />
              <span>Pegar</span>
            </button>
          </div>

          <textarea
            rows={3}
            value={whatsappInput}
            onChange={(e) => applyWhatsAppParse(e.target.value, false)}
            placeholder="Pega aquí el mensaje completo de WhatsApp (ej: [27/11/26, 23:15] Carlos: Hola, mi ID es EQ-A1B2-C3D4)"
            className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 focus:border-emerald-400 focus:outline-none text-xs text-white placeholder-zinc-500 font-mono resize-none select-text"
          />

          {parseFeedback && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`text-[11px] font-mono ${
                  parseFeedback.type === 'ready'
                    ? 'text-emerald-300 font-bold'
                    : parseFeedback.type === 'partial'
                    ? 'text-amber-300'
                    : 'text-zinc-400'
                }`}
              >
                {parseFeedback.text}
              </span>

              {parseFeedback.type === 'ready' && (
                <button
                  type="button"
                  onClick={() => applyWhatsAppParse(whatsappInput, true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono-retro font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow transition active:scale-95"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Generar ya</span>
                </button>
              )}
            </div>
          )}
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
