import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  AlertCircle,
  Lock,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RotateCw,
} from 'lucide-react';
import { useKidsMode } from '../context/KidsModeContext';

interface ParentalExitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParentalExitModal: React.FC<ParentalExitModalProps> = ({ isOpen, onClose }) => {
  const {
    disableKidsMode,
    mathChallenge,
    generateNewChallenge,
    verifyMathChallenge,
  } = useKidsMode();

  const [step, setStep] = useState<'math' | 'password'>('math');
  const [mathInput, setMathInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mathSolved, setMathSolved] = useState(false);
  const [mathError, setMathError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('math');
      setMathInput('');
      setPasswordInput('');
      setShowPassword(false);
      setMathSolved(false);
      setMathError(null);
      setPasswordError(null);
      generateNewChallenge();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Step 1: Handle Math Challenge Submission
  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mathInput.trim()) return;

    const isCorrect = verifyMathChallenge(mathInput);
    if (isCorrect) {
      setMathSolved(true);
      setMathError(null);
      setStep('password');
    } else {
      setMathError('Resultado incorrecto. Operación actualizada.');
      setMathInput('');
    }
  };

  // Step 2: Handle Password Verification & Exit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError('Por favor, introduce la contraseña.');
      return;
    }

    const success = disableKidsMode(passwordInput);
    if (success) {
      setPasswordError(null);
      setPasswordInput('');
      onClose();
    } else {
      setPasswordError('Contraseña incorrecta. Introduce la clave de la app (por defecto: 1234).');
      setPasswordInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#182033] to-[#0c101c] p-6 shadow-2xl relative border-2 border-amber-500/35 text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Step Indicator */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/25 to-rose-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            {step === 'math' ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5 text-rose-400" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Control Parental</span>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DOBLE CAPA
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              {step === 'math'
                ? 'Capa 1: Resuelve la operación matemática'
                : 'Capa 2: Autorización con contraseña parental'}
            </p>
          </div>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-between gap-2 mb-4 p-1 bg-black/40 rounded-xl border border-white/10 text-[10px] font-mono">
          <div
            className={`flex-1 py-1 px-2 rounded-lg text-center font-bold flex items-center justify-center gap-1 transition ${
              step === 'math'
                ? 'bg-amber-400 text-black shadow-sm'
                : 'text-emerald-400 bg-emerald-500/10'
            }`}
          >
            {mathSolved ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : null}
            <span>1. Operación</span>
          </div>

          <span className="text-zinc-600">→</span>

          <div
            className={`flex-1 py-1 px-2 rounded-lg text-center font-bold flex items-center justify-center gap-1 transition ${
              step === 'password'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-zinc-500'
            }`}
          >
            <KeyRound className="w-3 h-3" />
            <span>2. Contraseña</span>
          </div>
        </div>

        {/* STEP 1: MATH CHALLENGE */}
        {step === 'math' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400/50" />
              <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider font-bold block mb-1">
                Operación de Seguridad
              </span>
              <p className="text-2xl font-black text-white tracking-wider my-1">
                {mathChallenge.question}
              </p>
              <p className="text-[11px] text-zinc-400">
                Resuelve esta operación para acceder al desbloqueo parental.
              </p>
            </div>

            <form onSubmit={handleMathSubmit} className="space-y-3">
              <div>
                <input
                  type="number"
                  autoFocus
                  value={mathInput}
                  onChange={(e) => {
                    setMathInput(e.target.value);
                    if (mathError) setMathError(null);
                  }}
                  placeholder="Tu respuesta..."
                  className="w-full text-center text-xl font-bold py-3 px-4 rounded-xl bg-black/50 border border-white/20 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {mathError && (
                <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{mathError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    generateNewChallenge();
                    setMathInput('');
                    setMathError(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-zinc-300 font-mono transition flex items-center gap-1.5 cursor-pointer"
                  title="Cambiar reto"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Cambiar</span>
                </button>

                <button
                  type="submit"
                  disabled={!mathInput.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Direct Bypass for adults who know the password */}
              <div className="pt-2 text-center border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setStep('password');
                    setMathError(null);
                  }}
                  className="text-[11px] font-mono text-zinc-400 hover:text-amber-300 underline cursor-pointer transition"
                >
                  ¿Eres el adulto? Acceder con contraseña directamente →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: PARENTAL PASSWORD */}
        {step === 'password' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {mathSolved
                  ? 'Operación resuelta con éxito.'
                  : 'Verificación de contraseña requerida.'}
              </span>
            </div>

            <div className="text-xs text-zinc-300 font-mono">
              Introduce la <strong>contraseña de la app</strong> para autorizar el desbloqueo.
              <span className="block text-[11px] text-zinc-400 mt-1">
                Esto impide que un menor salga del modo seguro resolviendo solo la operación matemática.
              </span>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="Contraseña parental..."
                  className="w-full text-center text-lg font-bold py-3 pl-4 pr-10 rounded-xl bg-black/50 border border-white/20 text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-medium text-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <p className="text-[10px] text-zinc-400 text-center font-mono">
                (Por defecto si no la has cambiado: <span className="text-zinc-200 font-bold">1234</span>)
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('math');
                    setPasswordError(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-zinc-300 font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver</span>
                </button>

                <button
                  type="submit"
                  disabled={!passwordInput.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-sm shadow-lg shadow-rose-500/25 transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Salir del Modo Niños</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
