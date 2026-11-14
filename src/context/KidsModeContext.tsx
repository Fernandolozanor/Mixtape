import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

interface MathChallenge {
  question: string;
  answer: number;
}

interface KidsModeContextType {
  isKidsMode: boolean;
  parentalPin: string;
  maxVolume: number;
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number | null;
  mathChallenge: MathChallenge;
  generateNewChallenge: () => void;
  enableKidsMode: () => void;
  disableKidsMode: (pinOrAnswer: string) => boolean;
  setParentalPin: (pin: string) => void;
  setMaxVolume: (vol: number) => void;
  startSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
}

const KidsModeContext = createContext<KidsModeContextType | undefined>(undefined);

function generateRandomMathChallenge(): MathChallenge {
  const a = Math.floor(Math.random() * 8) + 4; // 4 to 11
  const b = Math.floor(Math.random() * 8) + 3; // 3 to 10
  return {
    question: `¿Cuánto es ${a} + ${b}?`,
    answer: a + b,
  };
}

export const KidsModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isKidsMode, setIsKidsMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mixtape_kids_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [parentalPin, setPinState] = useState<string>(() => {
    try {
      return localStorage.getItem('mixtape_kids_pin') || '1234';
    } catch {
      return '1234';
    }
  });

  const [maxVolume, setMaxVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mixtape_kids_max_vol');
      return saved ? parseFloat(saved) : 0.65;
    } catch {
      return 0.65;
    }
  });

  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [mathChallenge, setMathChallenge] = useState<MathChallenge>(generateRandomMathChallenge);

  const { volume, setVolume, isPlaying, togglePlay } = usePlayer();
  const timerRef = useRef<number | null>(null);

  const generateNewChallenge = () => {
    setMathChallenge(generateRandomMathChallenge());
  };

  const enableKidsMode = () => {
    setIsKidsMode(true);
    try {
      localStorage.setItem('mixtape_kids_mode', 'true');
    } catch {}
    // Enforce volume safety limit immediately upon entering
    if (volume > maxVolume) {
      setVolume(maxVolume);
    }
  };

  const disableKidsMode = (input: string): boolean => {
    const trimmed = input.trim();
    const isPinCorrect = trimmed === parentalPin;
    const isMathCorrect = parseInt(trimmed, 10) === mathChallenge.answer;

    if (isPinCorrect || isMathCorrect) {
      setIsKidsMode(false);
      try {
        localStorage.setItem('mixtape_kids_mode', 'false');
      } catch {}
      generateNewChallenge();
      return true;
    }

    generateNewChallenge();
    return false;
  };

  const setParentalPin = (pin: string) => {
    const clean = pin.trim().slice(0, 8);
    if (!clean) return;
    setPinState(clean);
    try {
      localStorage.setItem('mixtape_kids_pin', clean);
    } catch {}
  };

  const setMaxVolume = (vol: number) => {
    const clamped = Math.max(0.2, Math.min(1.0, vol));
    setMaxVolumeState(clamped);
    try {
      localStorage.setItem('mixtape_kids_max_vol', clamped.toString());
    } catch {}
    if (isKidsMode && volume > clamped) {
      setVolume(clamped);
    }
  };

  // Enforce volume ceiling in Kids Mode
  useEffect(() => {
    if (isKidsMode && volume > maxVolume) {
      setVolume(maxVolume);
    }
  }, [isKidsMode, volume, maxVolume, setVolume]);

  // Sleep Timer countdown & gentle fade-out
  const startSleepTimer = (minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSleepTimerMinutes(minutes);
    setSleepTimerRemaining(minutes * 60);

    timerRef.current = window.setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setSleepTimerMinutes(null);
          // Fade out volume and pause
          if (isPlaying) {
            togglePlay();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSleepTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSleepTimerMinutes(null);
    setSleepTimerRemaining(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <KidsModeContext.Provider
      value={{
        isKidsMode,
        parentalPin,
        maxVolume,
        sleepTimerMinutes,
        sleepTimerRemaining,
        mathChallenge,
        generateNewChallenge,
        enableKidsMode,
        disableKidsMode,
        setParentalPin,
        setMaxVolume,
        startSleepTimer,
        cancelSleepTimer,
      }}
    >
      {children}
    </KidsModeContext.Provider>
  );
};

export const useKidsMode = (): KidsModeContextType => {
  const context = useContext(KidsModeContext);
  if (!context) {
    throw new Error('useKidsMode must be used within a KidsModeProvider');
  }
  return context;
};
