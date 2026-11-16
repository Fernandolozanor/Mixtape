import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

interface MathChallenge {
  question: string;
  answer: number;
}

interface KidsModeContextType {
  isKidsMode: boolean;
  parentalPin: string;
  parentalPassword: string;
  maxVolume: number;
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number | null;
  mathChallenge: MathChallenge;
  generateNewChallenge: () => void;
  verifyMathChallenge: (answer: string | number) => boolean;
  enableKidsMode: () => void;
  disableKidsMode: (password: string) => boolean;
  setParentalPin: (pin: string) => void;
  setParentalPassword: (password: string) => void;
  setMaxVolume: (vol: number) => void;
  startSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
}

const KidsModeContext = createContext<KidsModeContextType | undefined>(undefined);

function generateRandomMathChallenge(): MathChallenge {
  const isMult = Math.random() > 0.45;
  if (isMult) {
    const a = Math.floor(Math.random() * 6) + 4; // 4 to 9
    const b = Math.floor(Math.random() * 6) + 3; // 3 to 8
    return {
      question: `¿Cuánto es ${a} × ${b}?`,
      answer: a * b,
    };
  }
  const a = Math.floor(Math.random() * 15) + 12; // 12 to 26
  const b = Math.floor(Math.random() * 15) + 11; // 11 to 25
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

  const [parentalPassword, setParentalPasswordState] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('mixtape_kids_password') ||
        localStorage.getItem('mixtape_kids_pin') ||
        '1234'
      );
    } catch {
      return '1234';
    }
  });

  const [parentalPin, setPinState] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('mixtape_kids_password') ||
        localStorage.getItem('mixtape_kids_pin') ||
        '1234'
      );
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

  const verifyMathChallenge = (answer: string | number): boolean => {
    const num = typeof answer === 'number' ? answer : parseInt(String(answer).trim(), 10);
    const isCorrect = !isNaN(num) && num === mathChallenge.answer;
    if (!isCorrect) {
      generateNewChallenge();
    }
    return isCorrect;
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

  const disableKidsMode = (password: string): boolean => {
    const trimmed = password.trim();
    const isPasswordCorrect =
      trimmed === parentalPassword ||
      trimmed === parentalPin;

    if (isPasswordCorrect) {
      setIsKidsMode(false);
      try {
        localStorage.setItem('mixtape_kids_mode', 'false');
      } catch {}
      generateNewChallenge();
      return true;
    }

    return false;
  };

  const setParentalPassword = (pwd: string) => {
    const clean = pwd.trim();
    if (!clean) return;
    setParentalPasswordState(clean);
    setPinState(clean);
    try {
      localStorage.setItem('mixtape_kids_password', clean);
      localStorage.setItem('mixtape_kids_pin', clean);
    } catch {}
  };

  const setParentalPin = (pin: string) => {
    setParentalPassword(pin);
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
        parentalPassword,
        maxVolume,
        sleepTimerMinutes,
        sleepTimerRemaining,
        mathChallenge,
        generateNewChallenge,
        verifyMathChallenge,
        enableKidsMode,
        disableKidsMode,
        setParentalPin,
        setParentalPassword,
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
