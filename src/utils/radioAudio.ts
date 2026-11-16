/**
 * Authentic Vintage Radio Tuning Sound Player
 * Uses the authentic analog radio tuning sound effect (from YouTube LNCziHXp1BY)
 * Located at /assets/radio-tuning.mp3.
 * Seamless fallback to Web Audio API synthesizer if needed.
 */

let activeTuningAudio: HTMLAudioElement | null = null;
let activeFadeInterval: any = null;

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playSynthesizedRadioTuning(durationSec: number = 0.9, volume: number = 0.25): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  try {
    const now = ctx.currentTime;
    const dur = Math.max(0.4, Math.min(durationSec, 3.0));

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(volume * 0.45, now + 0.06);
    masterGain.gain.setValueAtTime(volume * 0.45, now + dur - 0.12);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    masterGain.connect(ctx.destination);

    const bufferSize = ctx.sampleRate * dur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = lastOut * 0.95 + white * 0.05;
      output[i] = lastOut * 3.5 + white * 0.2;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.setValueAtTime(2.8, now);
    bandpass.frequency.setValueAtTime(800, now);
    bandpass.frequency.exponentialRampToValueAtTime(3200, now + dur * 0.5);
    bandpass.frequency.exponentialRampToValueAtTime(1200, now + dur);

    noiseSource.connect(bandpass);
    bandpass.connect(masterGain);

    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();

    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1400, now);
    whistle.frequency.exponentialRampToValueAtTime(3800, now + dur * 0.45);
    whistle.frequency.exponentialRampToValueAtTime(600, now + dur * 0.85);

    whistleGain.gain.setValueAtTime(0.001, now);
    whistleGain.gain.linearRampToValueAtTime(volume * 0.1, now + 0.1);
    whistleGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.85);

    whistle.connect(whistleGain);
    whistleGain.connect(masterGain);

    noiseSource.start(now);
    whistle.start(now);

    noiseSource.stop(now + dur);
    whistle.stop(now + dur);

    return () => {
      try {
        const stopTime = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(stopTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, stopTime);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.05);
        setTimeout(() => {
          try {
            noiseSource.stop();
            whistle.stop();
          } catch {}
        }, 60);
      } catch {}
    };
  } catch {
    return () => {};
  }
}

/**
 * Plays the authentic analog radio tuning sound effect (from YouTube LNCziHXp1BY).
 * Returns a smooth stop/fade-out callback to be called when search completes.
 */
export function playRadioTuningSound(maxDurationSec: number = 4.0, volume: number = 0.35): () => void {
  if (typeof window === 'undefined') return () => {};

  // Clean up any previously active tuning sound
  if (activeFadeInterval) {
    clearInterval(activeFadeInterval);
    activeFadeInterval = null;
  }
  if (activeTuningAudio) {
    try {
      activeTuningAudio.pause();
      activeTuningAudio.currentTime = 0;
    } catch {}
    activeTuningAudio = null;
  }

  try {
    const audio = new Audio('./assets/radio-tuning.mp3');
    activeTuningAudio = audio;
    audio.volume = Math.max(0.05, Math.min(1, volume));

    // Pick a random offset between 0 and 18s for variety across searches
    const randomStart = Math.random() * 18;
    audio.currentTime = randomStart;

    const playPromise = audio.play();
    let isStopped = false;

    const stop = () => {
      if (isStopped) return;
      isStopped = true;

      if (activeFadeInterval) {
        clearInterval(activeFadeInterval);
        activeFadeInterval = null;
      }

      const fadeSteps = 10;
      const stepTime = 20; // 200ms total smooth fade out
      let currentStep = 0;
      const initialVol = audio.volume;

      activeFadeInterval = setInterval(() => {
        currentStep++;
        const factor = Math.max(0, 1 - currentStep / fadeSteps);
        try {
          audio.volume = initialVol * factor;
        } catch {}

        if (currentStep >= fadeSteps) {
          clearInterval(activeFadeInterval);
          activeFadeInterval = null;
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          if (activeTuningAudio === audio) {
            activeTuningAudio = null;
          }
        }
      }, stepTime);
    };

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to Web Audio synthesis if autoplay policy blocked HTMLAudioElement
        playSynthesizedRadioTuning(maxDurationSec, volume);
      });
    }

    const autoTimer = setTimeout(() => {
      stop();
    }, maxDurationSec * 1000);

    return () => {
      clearTimeout(autoTimer);
      stop();
    };
  } catch {
    return playSynthesizedRadioTuning(maxDurationSec, volume);
  }
}
