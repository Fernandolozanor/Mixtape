import React, { useState } from 'react';
import { X, Baby, Volume2, Moon, Lock, ShieldCheck, Check } from 'lucide-react';
import { useKidsMode } from '../context/KidsModeContext';

interface KidsModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KidsModeModal: React.FC<KidsModeModalProps> = ({ isOpen, onClose }) => {
  const {
    isKidsMode,
    enableKidsMode,
    parentalPin,
    setParentalPin,
    maxVolume,
    setMaxVolume,
    sleepTimerMinutes,
    startSleepTimer,
    cancelSleepTimer,
  } = useKidsMode();

  const [pinInput, setPinInput] = useState(parentalPin);
  const [pinSaved, setPinSaved] = useState(false);

  if (!isOpen) return null;

  const handleSavePin = () => {
    if (pinInput.trim().length >= 4) {
      setParentalPin(pinInput.trim());
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 2000);
    }
  };

  const handleStartKidsMode = () => {
    enableKidsMode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#182032] to-[#0c101c] p-6 shadow-2xl relative border-2 border-emerald-500/40 text-white max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
            <Baby className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Modo Seguro para Niños</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                KIDS SAFE
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Entorno protegido con filtro de contenidos y volumen seguro
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-2 mb-5 text-[11px]">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Filtro de búsqueda estricto infantil</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-zinc-300">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Límite de decibelios para oídos</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-zinc-300">
            <Moon className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Temporizador de sueño relajante</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-zinc-300">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Candado parental con PIN/Reto</span>
          </div>
        </div>

        {/* Setting 1: Safe Volume Limit */}
        <div className="mb-4 p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Protección Auditiva (Volumen Máximo)</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              {Math.round(maxVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.85"
            step="0.05"
            value={maxVolume}
            onChange={(e) => setMaxVolume(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-2 bg-black/50 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-zinc-400">
            Impide que la música suba por encima de este nivel en auriculares o altavoz.
          </p>
        </div>

        {/* Setting 2: Sleep Timer */}
        <div className="mb-4 p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Moon className="w-4 h-4 text-purple-400" />
              <span>Temporizador de Sueño (Apagado Suave)</span>
            </div>
            {sleepTimerMinutes && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-mono font-bold">
                {sleepTimerMinutes}m activo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1">
            {[15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() =>
                  sleepTimerMinutes === mins ? cancelSleepTimer() : startSleepTimer(mins)
                }
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                  sleepTimerMinutes === mins
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                    : 'bg-white/10 hover:bg-white/15 text-zinc-300'
                }`}
              >
                {mins}m
              </button>
            ))}
            {sleepTimerMinutes && (
              <button
                onClick={cancelSleepTimer}
                className="py-1.5 px-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-bold"
              >
                Off
              </button>
            )}
          </div>
        </div>

        {/* Setting 3: Parental PIN */}
        <div className="mb-5 p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Lock className="w-4 h-4 text-rose-400" />
              <span>PIN de Seguridad Parental</span>
            </div>
            {pinSaved && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                <Check className="w-3 h-3" /> Guardado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN (ej: 1234)"
              className="flex-1 py-1.5 px-3 rounded-lg bg-black/50 border border-white/20 text-sm font-mono text-white focus:outline-none focus:border-rose-400"
            />
            <button
              onClick={handleSavePin}
              disabled={pinInput.trim().length < 4}
              className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold text-white transition"
            >
              Guardar
            </button>
          </div>
          <p className="text-[10px] text-zinc-400">
            Los padres siempre pueden salir respondiendo una pregunta matemática si olvidan el PIN.
          </p>
        </div>

        {/* Activate Button */}
        <button
          onClick={handleStartKidsMode}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-500/30 transition transform active:scale-98 flex items-center justify-center gap-2"
        >
          <Baby className="w-5 h-5" />
          <span>{isKidsMode ? 'Volver al Modo Niños' : 'Activar Modo Niños'}</span>
        </button>
      </div>
    </div>
  );
};
