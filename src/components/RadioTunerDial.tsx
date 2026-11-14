import React, { useEffect, useRef, useState } from 'react';
import { Radio, Volume2, VolumeX } from 'lucide-react';
import { playRadioTuningSound } from '../utils/radioAudio';

interface RadioTunerDialProps {
  isSearching: boolean;
  query: string;
  hasResults: boolean;
  className?: string;
}

export const RadioTunerDial: React.FC<RadioTunerDialProps> = ({
  isSearching,
  query,
  hasResults,
  className = '',
}) => {
  // Needle position across dial (0% to 100%)
  const [needlePos, setNeedlePos] = useState<number>(48);
  const [isTuned, setIsTuned] = useState<boolean>(false);
  const [currentFreq, setCurrentFreq] = useState<string>('98.5');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const stopSoundRef = useRef<(() => void) | null>(null);

  // Compute a deterministic frequency based on query string
  const calculateStation = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const normalized = Math.abs(hash) % 1000;
    // Map to FM range: 88.0 MHz to 108.0 MHz
    const freqVal = (88.0 + (normalized / 1000) * 20).toFixed(1);
    // Dial percentage between 10% and 90%
    const pos = 10 + (normalized / 1000) * 80;
    return { freqVal, pos };
  };

  // Trigger sweep and static sound during search
  useEffect(() => {
    if (isSearching) {
      setIsTuned(false);

      if (soundEnabled) {
        stopSoundRef.current = playRadioTuningSound(1.2);
      }

      // Sweep animation loop while searching
      let direction = 1;
      let pos = needlePos;
      const interval = setInterval(() => {
        pos += direction * 7;
        if (pos > 86) direction = -1;
        if (pos < 14) direction = 1;
        setNeedlePos(pos);
        const dynamicFreq = (88.0 + (pos / 100) * 20).toFixed(1);
        setCurrentFreq(dynamicFreq);
      }, 70);

      return () => {
        clearInterval(interval);
        if (stopSoundRef.current) {
          stopSoundRef.current();
          stopSoundRef.current = null;
        }
      };
    } else if (hasResults && query.trim()) {
      // Search finished: lock onto station!
      const { freqVal, pos } = calculateStation(query.trim());
      setNeedlePos(pos);
      setCurrentFreq(freqVal);
      setIsTuned(true);
    }
  }, [isSearching, hasResults, query, soundEnabled]);

  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(8, Math.min(92, (clickX / rect.width) * 100));
    setNeedlePos(percent);
    const manualFreq = (88.0 + (percent / 100) * 20).toFixed(1);
    setCurrentFreq(manualFreq);
    setIsTuned(true);

    if (soundEnabled) {
      playRadioTuningSound(0.5);
    }
  };

  return (
    <div
      className={`rounded-2xl bg-[#090c13] border-2 border-[#1e2736] p-2.5 sm:p-3.5 shadow-2xl relative select-none overflow-hidden ${className}`}
    >
      {/* Top Brushed Steel Tuning Header */}
      <div className="flex items-center justify-between px-1 pb-2 text-[10px] sm:text-xs font-mono-retro">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-extrabold tracking-widest text-zinc-300 uppercase">
            SINTONIZADOR ANALÓGICO HI-FI
          </span>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px]">
            FM/AM STEREO
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Station Locked Indicator */}
          <div className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isTuned
                  ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                  : isSearching
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-zinc-700'
              }`}
            />
            <span
              className={`text-[8.5px] sm:text-[9.5px] font-bold tracking-wider ${
                isTuned ? 'text-rose-400 font-extrabold' : 'text-zinc-500'
              }`}
            >
              {isSearching ? 'TUNING...' : isTuned ? 'STEREO TUNED' : 'STANDBY'}
            </span>
          </div>

          {/* Frequency readout */}
          <div className="bg-black/80 px-2 py-0.5 rounded border border-white/10 text-amber-400 font-bold font-mono tracking-wider text-[11px] sm:text-xs">
            {currentFreq} <span className="text-[9px] text-zinc-500">MHz</span>
          </div>

          {/* Sound mute toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-zinc-500 hover:text-amber-400 transition p-0.5"
            title={soundEnabled ? 'Silenciar sonido de sintonizador' : 'Activar sonido de sintonizador'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-600" />}
          </button>
        </div>
      </div>

      {/* Main Glass Scale Window */}
      <div
        onClick={handleDialClick}
        className="w-full aspect-[4.9/1] max-h-24 sm:max-h-28 rounded-xl relative overflow-hidden border border-black/80 shadow-inner cursor-pointer group"
        title="Haz clic en cualquier punto para sintonizar manualmente"
      >
        {/* Background Image: Authentic Vintage Radio Scale */}
        <img
          src="./assets/sintonizador.jpg"
          alt="Vintage Radio Tuner Scale"
          className="w-full h-full object-cover select-none pointer-events-none filter contrast-110 brightness-95"
        />

        {/* Warm Vintage Incandescent Bulb Backlight Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-600/10 via-transparent to-amber-400/5 pointer-events-none" />

        {/* Moving Red Analog Tuning Needle with Physical Bulb Indicator */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-20 transition-all duration-150 ease-out flex flex-col items-center"
          style={{
            left: `${needlePos}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Top Red LED Indicator Bulb */}
          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-rose-600 border border-white shadow-[0_0_10px_#f43f5e] -mt-0.5" />
          
          {/* Vertical Fine Red Needle */}
          <div className="w-[2px] sm:w-[2.5px] h-full bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
          
          {/* Bottom Needle Weight */}
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 border border-rose-500/80 -mb-0.5" />
        </div>

        {/* Acrylic Glass Highlight Reflection Glare */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/35 pointer-events-none z-30" />

        {/* Hover Hint */}
        <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-mono-retro text-amber-200/70 bg-black/60 px-1 rounded pointer-events-none z-40">
          DIAL CLICK TUNING
        </div>
      </div>
    </div>
  );
};
