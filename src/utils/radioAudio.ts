/**
 * Web Audio API Vintage FM Radio Tuning Sound Synthesizer
 * Produces authentic analog radio frequency sweep static, heterodyne whistle, and lock-in pop.
 * Zero external audio files required, zero latency, light & pleasant volume.
 */

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

export function playRadioTuningSound(durationSec: number = 0.9): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  try {
    const now = ctx.currentTime;
    const dur = Math.max(0.4, Math.min(durationSec, 2.0));

    // Master gain node for tuning burst
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.12, now + 0.06);
    masterGain.gain.setValueAtTime(0.12, now + dur - 0.12);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    masterGain.connect(ctx.destination);

    // 1. Noise Generator (FM Interstation Static)
    const bufferSize = ctx.sampleRate * dur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filtering
      lastOut = (lastOut * 0.95) + (white * 0.05);
      output[i] = lastOut * 3.5 + (white * 0.2);
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Bandpass filter to simulate dial sweep through resonant frequency bands
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.setValueAtTime(2.8, now);
    bandpass.frequency.setValueAtTime(800, now);
    bandpass.frequency.exponentialRampToValueAtTime(3200, now + dur * 0.5);
    bandpass.frequency.exponentialRampToValueAtTime(1200, now + dur);

    noiseSource.connect(bandpass);
    bandpass.connect(masterGain);

    // 2. Heterodyne Whistle Oscillator (analog frequency beat note)
    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();

    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1400, now);
    whistle.frequency.exponentialRampToValueAtTime(3800, now + dur * 0.45);
    whistle.frequency.exponentialRampToValueAtTime(600, now + dur * 0.85);

    whistleGain.gain.setValueAtTime(0.001, now);
    whistleGain.gain.linearRampToValueAtTime(0.025, now + 0.1);
    whistleGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.85);

    whistle.connect(whistleGain);
    whistleGain.connect(masterGain);

    // Start audio sources
    noiseSource.start(now);
    whistle.start(now);

    noiseSource.stop(now + dur);
    whistle.stop(now + dur);

    // Return stop callback
    return () => {
      try {
        const stopTime = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(stopTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, stopTime);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.05);
        setTimeout(() => {
          noiseSource.stop();
          whistle.stop();
        }, 60);
      } catch {
        // Ignored
      }
    };
  } catch (e) {
    console.warn('Radio tuning audio error:', e);
    return () => {};
  }
}
