import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Track, RepeatMode, LyricLine } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import { lyricsService } from '../services/lyricsService';

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  queue: Track[];
  queueIndex: number;
  lyrics: LyricLine[];
  activeLyricIndex: number;
  isFullScreenPlayerOpen: boolean;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  setFullScreenPlayerOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  setLyricsOpen: (open: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);

  // UI Modals / Sheets
  const [isFullScreenPlayerOpen, setFullScreenPlayerOpen] = useState<boolean>(false);
  const [isQueueOpen, setQueueOpen] = useState<boolean>(false);
  const [isLyricsOpen, setLyricsOpen] = useState<boolean>(false);

  // References to avoid stale closures in callbacks
  const queueRef = useRef<Track[]>(queue);
  queueRef.current = queue;
  const queueIndexRef = useRef<number>(queueIndex);
  queueIndexRef.current = queueIndex;
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;
  const isShuffleRef = useRef<boolean>(isShuffle);
  isShuffleRef.current = isShuffle;

  useEffect(() => {
    // Setup AudioEngine event hooks
    audioEngine.onTimeUpdate((cur, dur, buf) => {
      setCurrentTime(cur);
      setDuration(dur);
      setBuffered(buf);
    });

    audioEngine.onStateChange(() => {
      setIsPlaying(audioEngine.isPlaying());
      setIsLoading(audioEngine.isBuffering());
    });

    audioEngine.onTrackEnd(() => {
      handleNextTrack();
    });

    audioEngine.onError((msg) => {
      console.warn('Playback error caught in PlayerContext:', msg);
      setIsLoading(false);
      setIsPlaying(false);
    });

    // Setup MediaSession hardware controls
    audioEngine.setupMediaSession({
      onPlay: () => audioEngine.play(),
      onPause: () => audioEngine.pause(),
      onNext: () => handleNextTrack(),
      onPrev: () => handlePrevTrack(),
      onSeek: (time) => audioEngine.seek(time),
    });
  }, []);

  // Update active lyric index whenever currentTime changes
  useEffect(() => {
    if (lyrics.length === 0) {
      setActiveLyricIndex(-1);
      return;
    }

    let found = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        found = i;
      } else {
        break;
      }
    }
    setActiveLyricIndex(found);
  }, [currentTime, lyrics]);

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    setIsLoading(true);
    setCurrentTrack(track);

    let updatedQueue = newQueue || queueRef.current;
    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((t) => t.id === track.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      // If playing a standalone track not in queue, set it
      const existingIdx = updatedQueue.findIndex((t) => t.id === track.id);
      if (existingIdx >= 0) {
        setQueueIndex(existingIdx);
      } else {
        const appended = [track, ...updatedQueue];
        setQueue(appended);
        setQueueIndex(0);
        updatedQueue = appended;
      }
    }

    // Fetch lyrics in background
    lyricsService.getLyrics(track.title, track.artist, track.duration).then((lrc) => {
      setLyrics(lrc);
    });

    const success = await audioEngine.playTrack(track);
    setIsLoading(false);
    setIsPlaying(success);

    // Preload next track
    const currentIdx = updatedQueue.findIndex((t) => t.id === track.id);
    if (currentIdx >= 0 && currentIdx + 1 < updatedQueue.length) {
      audioEngine.preloadNextTrack(updatedQueue[currentIdx + 1]);
    }
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  };

  const handleNextTrack = () => {
    const q = queueRef.current;
    const curIdx = queueIndexRef.current;
    const rMode = repeatModeRef.current;

    if (rMode === 'one' && currentTrack) {
      audioEngine.seek(0);
      audioEngine.play();
      return;
    }

    if (q.length === 0) return;

    let nextIdx = curIdx + 1;
    if (isShuffleRef.current) {
      nextIdx = Math.floor(Math.random() * q.length);
    }

    if (nextIdx < q.length) {
      playTrack(q[nextIdx]);
    } else if (rMode === 'all' || q.length > 1) {
      playTrack(q[0]);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrevTrack = () => {
    if (currentTime > 3) {
      audioEngine.seek(0);
      return;
    }

    const q = queueRef.current;
    const curIdx = queueIndexRef.current;
    if (q.length === 0) return;

    if (curIdx > 0) {
      playTrack(q[curIdx - 1]);
    } else if (q.length > 1) {
      playTrack(q[q.length - 1]);
    } else {
      audioEngine.seek(0);
    }
  };

  const seek = (seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    audioEngine.setVolume(vol);
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const addToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  const playNext = (track: Track) => {
    setQueue((prev) => {
      const copy = [...prev];
      copy.splice(queueIndex + 1, 0, track);
      return copy;
    });
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index < queueIndex) {
      setQueueIndex((prev) => prev - 1);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        buffered,
        volume,
        repeatMode,
        isShuffle,
        queue,
        queueIndex,
        lyrics,
        activeLyricIndex,
        isFullScreenPlayerOpen,
        isQueueOpen,
        isLyricsOpen,
        playTrack,
        togglePlay,
        nextTrack: handleNextTrack,
        prevTrack: handlePrevTrack,
        seek,
        setVolume,
        toggleRepeat,
        toggleShuffle,
        addToQueue,
        playNext,
        removeFromQueue,
        setFullScreenPlayerOpen,
        setQueueOpen,
        setLyricsOpen,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};
