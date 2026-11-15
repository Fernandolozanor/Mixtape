import React from 'react';

interface ReggaetonPrankModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const ReggaetonPrankModal: React.FC<ReggaetonPrankModalProps> = ({
  isOpen,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onAccept}
    >
      <div
        className="relative w-full max-w-md p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#1e1b24] via-[#141219] to-[#0d0c11] border-2 border-amber-500/50 shadow-[0_25px_70px_rgba(0,0,0,0.9)] text-center space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Humorous cassette / brain / headphones badge */}
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.25)]">
          🎧
        </div>

        {/* Text requested by user */}
        <div className="space-y-2.5">
          <p className="text-[10.5px] font-mono uppercase tracking-widest text-amber-400 font-bold">
            Aviso del Reproductor
          </p>
          <p className="text-base sm:text-lg font-medium text-white leading-relaxed px-2">
            “Para escuchal este tipo de ruido, no necesitas una aplicación. Lo que tú necesitas es un psicólogo, mi amol”
          </p>
        </div>

        {/* Accept Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onAccept}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReggaetonPrankModal;
