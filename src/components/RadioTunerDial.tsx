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
  // Needle position in percentage of total tuner width (strictly constrained within glass scale: 18% to 57.5%)
  const [needlePos, setNeedlePos] = useState<number>(37.5);
  const [isTuned, setIsTuned] = useState<boolean>(true);
  const [currentFreq, setCurrentFreq] = useState<string>('98.0');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const stopSoundRef = useRef<(() => void) | null>(null);

  // Exact geometric boundaries of the FM scale in SINTONIZADOR.jpg
  const MIN_SCALE_X = 18.0; // Directly at "88 MHz"
  const MAX_SCALE_X = 58.0; // Directly at "108 MHz"
  const GLASS_MIN_X = 5.0;  // Left edge of dark glass
  const GLASS_MAX_X = 68.5; // Right edge of dark glass (before silver switches panel)

  // Compute station and needle position based on query string
  const calculateStation = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const ratio = (Math.abs(hash) % 1000) / 1000;
    // Frequency between 88.0 and 108.0 MHz
    const freqVal = (88.0 + ratio * 20.0).toFixed(1);
    // Needle position strictly mapped onto the 88-108 MHz scale
    const pos = MIN_SCALE_X + ratio * (MAX_SCALE_X - MIN_SCALE_X);
    return { freqVal, pos };
  };

  // Sweep and static sound during search
  useEffect(() => {
    if (isSearching) {
      setIsTuned(false);

      if (soundEnabled) {
        stopSoundRef.current = playRadioTuningSound(1.2);
      }

      // Sweep animation loop strictly within the FM dial scale (18% to 57%)
      let direction = 1;
      let pos = needlePos;
      const interval = setInterval(() => {
        pos += direction * 3.8;
        if (pos > MAX_SCALE_X) {
          pos = MAX_SCALE_X;
          direction = -1;
        }
        if (pos < MIN_SCALE_X) {
          pos = MIN_SCALE_X;
          direction = 1;
        }
        setNeedlePos(pos);
        const ratio = (pos - MIN_SCALE_X) / (MAX_SCALE_X - MIN_SCALE_X);
        const dynamicFreq = (88.0 + Math.max(0, Math.min(1, ratio)) * 20.0).toFixed(1);
        setCurrentFreq(dynamicFreq);
      }, 65);

      return () => {
        clearInterval(interval);
        if (stopSoundRef.current) {
          stopSoundRef.current();
          stopSoundRef.current = null;
        }
      };
    } else if (hasResults && query.trim()) {
      // Search finished: lock onto station on the FM dial!
      const { freqVal, pos } = calculateStation(query.trim());
      setNeedlePos(pos);
      setCurrentFreq(freqVal);
      setIsTuned(true);
    }
  }, [isSearching, hasResults, query, soundEnabled]);

  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;

    // Only respond if clicked inside the dark glass area (6% to 64%)
    if (clickXPercent >= GLASS_MIN_X && clickXPercent <= GLASS_MAX_X) {
      const clampedPos = Math.max(MIN_SCALE_X, Math.min(MAX_SCALE_X, clickXPercent));
      setNeedlePos(clampedPos);
      const ratio = (clampedPos - MIN_SCALE_X) / (MAX_SCALE_X - MIN_SCALE_X);
      const manualFreq = (88.0 + ratio * 20.0).toFixed(1);
      setCurrentFreq(manualFreq);
      setIsTuned(true);

      if (soundEnabled) {
        playRadioTuningSound(0.4);
      }
    }
  };

  return (
    <div
      className={`rounded-2xl bg-[#090c13] border-2 border-[#1e2736] p-2.5 sm:p-3.5 shadow-2xl relative select-none overflow-hidden ${className}`}
    >
      {/* Top Brushed Steel Tuning Header */}
      <div className="flex items-center justify-between px-1 pb-2 text-[10px] sm:text-xs font-mono-retro flex-nowrap whitespace-nowrap overflow-hidden h-7 sm:h-8">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0 overflow-hidden">
          <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-extrabold tracking-widest text-zinc-300 uppercase truncate">
            <span className="hidden sm:inline">SINTONIZADOR </span>HI-FI TUNER
          </span>
          <span className="hidden md:inline-block px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px] shrink-0">
            FM STEREO
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-1">
          {/* Station Locked Indicator */}
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${
                isTuned
                  ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                  : isSearching
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-zinc-700'
              }`}
            />
            <span
              className={`text-[8.5px] sm:text-[9.5px] font-bold tracking-wider shrink-0 w-[50px] sm:w-[70px] text-left truncate ${
                isTuned ? 'text-rose-400 font-extrabold' : 'text-zinc-500'
              }`}
            >
              {isSearching ? 'TUNING' : isTuned ? 'STEREO' : 'READY'}
            </span>
          </div>

          {/* Fixed-width Tabular Frequency readout: guaranteed ZERO layout shift on 2 vs 3 digits */}
          <div className="bg-black/90 px-1 sm:px-2 py-0.5 rounded border border-white/10 text-amber-400 font-bold font-mono tracking-wider text-[11px] sm:text-xs w-[70px] sm:w-[78px] text-center shrink-0 tabular-nums shadow-inner flex items-center justify-center gap-0.5">
            <span className="w-9 text-right font-bold">{currentFreq}</span>
            <span className="text-[8.5px] sm:text-[9px] text-zinc-500 font-normal">MHz</span>
          </div>

          {/* Sound mute toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-zinc-500 hover:text-amber-400 transition p-1 shrink-0 active:scale-95"
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
        title="Haz clic en la escala FM para sintonizar manualmente"
      >
        {/* Background Image: Cleaned Vintage Radio Scale */}
        <img
          src="./assets/sintonizador.jpg"
          alt="Vintage Radio Tuner Scale"
          className="w-full h-full object-cover select-none pointer-events-none filter contrast-110 brightness-95"
        />

        {/* Warm Vintage Incandescent Bulb Backlight Glow across the glass */}
        <div
          className="absolute top-[7.5%] bottom-[26%] left-[5%] w-[63.5%] bg-gradient-to-t from-amber-600/15 via-transparent to-amber-400/10 pointer-events-none"
        />

        {/* Moving Red Analog Tuning Needle: Strictly bounded to the glass FM dial */}
        <div
          className="absolute pointer-events-none z-20 transition-all duration-150 ease-out flex flex-col items-center"
          style={{
            top: '7.5%',
            bottom: '26%',
            left: `${needlePos}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Top Red Bead Indicator */}
          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#ff2a3b] border border-white/90 shadow-[0_0_8px_#ff2a3b] -mt-0.5" />
          
          {/* Slender Red Physical Needle */}
          <div className="w-[2px] sm:w-[2.5px] h-full bg-[#ff2a3b] shadow-[0_0_6px_rgba(255,42,59,0.95)]" />
          
          {/* Bottom Needle Tip */}
          <div className="w-1.5 h-1.5 rounded-full bg-[#991b1b] border border-[#ff2a3b] -mb-0.5" />
        </div>

        {/* Acrylic Glass Highlight Reflection Glare */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/35 pointer-events-none z-30" />

        {/* Glass region hint on hover */}
        <div className="absolute bottom-1 left-3 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-mono-retro text-amber-300/80 bg-black/70 px-1.5 py-0.5 rounded pointer-events-none z-40">
          ESCALA FM 88-108 MHz
        </div>
      </div>
    </div>
  );
};
