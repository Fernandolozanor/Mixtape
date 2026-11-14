import React, { useState } from 'react';
import { ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useKidsMode } from '../context/KidsModeContext';

interface ParentalExitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParentalExitModal: React.FC<ParentalExitModalProps> = ({ isOpen, onClose }) => {
  const { disableKidsMode, mathChallenge, generateNewChallenge } = useKidsMode();
  const [inputVal, setInputVal] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = disableKidsMode(inputVal);
    if (success) {
      setInputVal('');
      setErrorMsg(false);
      onClose();
    } else {
      setErrorMsg(true);
      setInputVal('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1e2538] to-[#0f1422] p-6 shadow-2xl relative border-2 border-amber-500/30 text-white">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Control Parental</h3>
            <p className="text-xs text-zinc-400">Introduce el PIN o resuelve el reto</p>
          </div>
        </div>

        {/* Math Challenge Box */}
        <div className="mb-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
          <span className="text-[11px] font-mono uppercase text-amber-400 tracking-wider font-bold block mb-1">
            Reto para Adultos
          </span>
          <p className="text-xl font-extrabold text-white tracking-wide">
            {mathChallenge.question}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            (O introduce tu PIN de 4 cifras. Por defecto: <span className="font-mono text-zinc-300 font-bold">1234</span>)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="number"
            autoFocus
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg(false);
            }}
            placeholder="Respuesta o PIN..."
            className="w-full text-center text-xl font-bold py-3 px-4 rounded-xl bg-black/50 border border-white/20 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 transition"
          />

          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Respuesta incorrecta. Nuevo reto generado.</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                generateNewChallenge();
                setInputVal('');
              }}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-zinc-300 transition"
            >
              Cambiar reto
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition active:scale-95"
            >
              Salir de Modo Niños
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
