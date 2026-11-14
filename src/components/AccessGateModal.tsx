import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  User,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  Radio,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessGateModal: React.FC = () => {
  const {
    deviceId,
    isAccessGranted,
    isTrialActive,
    isTrialExpired,
    trialRemainingSeconds,
    isLoginModalOpen,
    setLoginModalOpen,
    login,
    startFreeTrial,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDevice, setCopiedDevice] = useState(false);

  // Only render when access is locked OR when the user explicitly opened the Login modal during trial
  if (isAccessGranted && !isLoginModalOpen) {
    return null;
  }

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId).catch(() => {});
    setCopiedDevice(true);
    setTimeout(() => setCopiedDevice(false), 2200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login(username, password);
    if (!res.success) {
      setError(res.error || 'Error de autenticación');
    } else {
      setUsername('');
      setPassword('');
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-xl p-3 sm:p-6 overflow-y-auto select-none">
      <div className="retro-tape-chassis w-full max-w-md rounded-3xl p-5 sm:p-7 border-2 border-[#2a3448] shadow-[0_25px_70px_rgba(0,0,0,0.95)] relative my-auto">
        {/* Close button only if access is currently granted (e.g. user is in active trial) */}
        {isAccessGranted && (
          <button
            onClick={() => setLoginModalOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.4)] border border-white/30 mb-3">
            <Lock className="w-7 h-7 text-black" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-black/70 border border-amber-500/40 font-mono-retro text-[10px] font-bold text-amber-400 mb-1">
            <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>ACCESO PRIVADO • MIXTAPE HI-FI</span>
          </div>

          <h2 className="font-rock text-2xl sm:text-3xl tracking-widest text-white uppercase">
            {isTrialExpired ? 'TIEMPO DE PRUEBA FINALIZADO' : 'CONTROL DE ACCESO'}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xs">
            {isTrialExpired
              ? 'Tu hora de prueba gratuita ha concluido. Introduce tu Usuario y Contraseña vinculada a este dispositivo para continuar.'
              : 'Acceso exclusivo con credenciales vinculadas a tu equipo.'}
          </p>
        </div>

        {/* Device Hardware ID Box (Anti-Sharing Lock) */}
        <div className="bg-black/70 border border-amber-500/30 rounded-2xl p-3.5 mb-5 shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-mono-retro font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              ID ÚNICO DE ESTE EQUIPO
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              1 USUARIO = 1 EQUIPO
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="retro-counter-display px-3 py-2 rounded-xl font-mono-retro text-base sm:text-lg font-bold text-amber-400 tracking-widest flex-1 text-center border border-white/10">
              {deviceId}
            </div>

            <button
              type="button"
              onClick={handleCopyDeviceId}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono-retro font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
              title="Copiar ID de Equipo para solicitar acceso"
            >
              {copiedDevice ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">COPIADO</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPIAR ID</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
            Envía este código al administrador para recibir tu contraseña personal. Las claves están ligadas a este ID y no funcionan en otros dispositivos.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono-retro font-bold uppercase tracking-wider text-zinc-300 mb-1">
              Usuario
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu nombre de usuario"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/70 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-zinc-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono-retro font-bold uppercase tracking-wider text-zinc-300 mb-1">
              Contraseña / Clave de Equipo
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ej: MX-XXXX-XXXX"
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/70 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-zinc-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 flex items-start gap-2 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-black font-stereo font-black text-sm uppercase tracking-wider shadow-lg transition active:scale-[0.99]"
          >
            DESBLOQUEAR REPRODUCTOR
          </button>
        </form>

        {/* 1-Hour Free Trial Option (shown if trial has not started yet) */}
        {!isTrialExpired && !isTrialActive && (
          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-zinc-400 mb-2.5">
              ¿Aún no tienes tu clave vinculada? Disfruta de una sesión de prueba completa:
            </p>
            <button
              type="button"
              onClick={startFreeTrial}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-mono-retro font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>PROBAR GRATIS DURANTE 1 HORA (60:00)</span>
            </button>
          </div>
        )}

        {/* Active trial indicator inside modal if opened voluntarily */}
        {isTrialActive && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Prueba activa restante:
            </span>
            <span className="font-bold">{formatCountdown(trialRemainingSeconds)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
