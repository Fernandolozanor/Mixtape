import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Track, RepeatMode, LyricLine, Playlist } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import { lyricsService } from '../services/lyricsService';
import { tapeProgressService } from '../services/tapeProgressService';
import { playbackHistoryService } from '../services/playbackHistoryService';
import { useLibrary } from './LibraryContext';

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  playbackRate: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  queue: Track[];
  queueIndex: number;
  lyrics: LyricLine[];
  activeLyricIndex: number;
  isFullScreenPlayerOpen: boolean;
  deckActivationTrigger: number;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  playbackMediaType: 'tape' | 'vinyl' | null;
  setPlaybackMediaType: (mediaType: 'tape' | 'vinyl' | null) => void;
  playbackContext: string | null;
  setPlaybackContext: (context: string | null) => void;
  activeNavigationTab: string;
  setActiveNavigationTab: (tab: string) => void;
  activeTapeId: string | null;
  activeTapeName: string | null;
  playTape: (playlist: Playlist, startIndex?: number, startTime?: number) => Promise<void>;
  playTrack: (
    track: Track,
    newQueue?: Track[],
    isCrossfade?: boolean,
    mediaType?: 'tape' | 'vinyl',
    context?: string | null,
    playlistId?: string | null,
    startTime?: number
  ) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
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
  const { settings } = useLibrary();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(1);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);

  // UI Modals / Sheets
  const [isFullScreenPlayerOpen, setFullScreenPlayerOpen] = useState<boolean>(false);
  const [deckActivationTrigger, setDeckActivationTrigger] = useState<number>(0);
  const [playTriggerCount, setPlayTriggerCount] = useState<number>(0);
  const [isQueueOpen, setQueueOpen] = useState<boolean>(false);
  const [isLyricsOpen, setLyricsOpen] = useState<boolean>(false);
  const [playbackMediaType, setPlaybackMediaType] = useState<'tape' | 'vinyl' | null>(null);
  const [playbackContext, setPlaybackContext] = useState<string | null>(null);
  const [activeNavigationTab, setActiveNavigationTab] = useState<string>('home');
  const [activeTapeId, setActiveTapeId] = useState<string | null>(null);
  const [activeTapeName, setActiveTapeName] = useState<string | null>(null);

  // References to avoid stale closures in callbacks
  const queueRef = useRef<Track[]>(queue);
  queueRef.current = queue;
  const queueIndexRef = useRef<number>(queueIndex);
  queueIndexRef.current = queueIndex;
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;
  const isShuffleRef = useRef<boolean>(isShuffle);
  isShuffleRef.current = isShuffle;

  const activeTapeIdRef = useRef<string | null>(null);
  activeTapeIdRef.current = activeTapeId;
  const activeTapeNameRef = useRef<string | null>(null);
  activeTapeNameRef.current = activeTapeName;
  const currentTrackRef = useRef<Track | null>(null);
  currentTrackRef.current = currentTrack;
  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;
  const durationRef = useRef<number>(0);
  durationRef.current = duration;
  const playbackMediaTypeRef = useRef<'tape' | 'vinyl' | null>(null);
  playbackMediaTypeRef.current = playbackMediaType;
  const lastSaveTimeRef = useRef<number>(0);

  const saveCurrentTapeProgress = () => {
    const tapeId = activeTapeIdRef.current;
    const media = playbackMediaTypeRef.current;
    const track = currentTrackRef.current;
    const curTime = currentTimeRef.current;
    const dur = durationRef.current;
    const qIdx = queueIndexRef.current;
    const tapeName = activeTapeNameRef.current;

    if (tapeId && media === 'tape' && track) {
      tapeProgressService.saveProgress({
        playlistId: tapeId,
        playlistName: tapeName || 'Cinta',
        trackId: track.id,
        trackIndex: qIdx >= 0 ? qIdx : 0,
        trackTitle: track.title,
        trackArtist: track.artist,
        currentTime: Math.floor(curTime),
        duration: Math.floor(dur),
        updatedAt: Date.now(),
      });
    }
  };

  useEffect(() => {
    // Setup AudioEngine event hooks
    audioEngine.onTimeUpdate((cur, dur, buf) => {
      setCurrentTime(cur);
      currentTimeRef.current = cur;
      setDuration(dur);
      durationRef.current = dur;
      setBuffered(buf);

      // Save tape progress throttled to every 2 seconds during playback
      if (Math.abs(cur - lastSaveTimeRef.current) >= 2) {
        lastSaveTimeRef.current = cur;
        saveCurrentTapeProgress();
      }
    });

    audioEngine.onStateChange(() => {
      const playing = audioEngine.isPlaying();
      setIsPlaying(playing);
      setIsLoading(audioEngine.isBuffering());
      if (!playing) {
        saveCurrentTapeProgress();
      }
    });

    audioEngine.onTrackEnd(() => {
      handleNextTrack(false);
    });

    audioEngine.onCrossfade(() => {
      handleNextTrack(true);
    });

    audioEngine.onError((msg) => {
      console.warn('Playback error caught in PlayerContext:', msg);
      setIsLoading(false);
      setIsPlaying(false);
    });

    // Setup MediaSession hardware controls
    audioEngine.setupMediaSession({
      onPlay: () => audioEngine.play(),
      onPause: () => {
        saveCurrentTapeProgress();
        audioEngine.pause();
      },
      onNext: () => handleNextTrack(),
      onPrev: () => handlePrevTrack(),
      onSeek: (time) => {
        audioEngine.seek(time);
        currentTimeRef.current = time;
        saveCurrentTapeProgress();
      },
    });

    const handleUnloadOrHide = () => {
      saveCurrentTapeProgress();
    };
    window.addEventListener('beforeunload', handleUnloadOrHide);
    document.addEventListener('visibilitychange', handleUnloadOrHide);

    return () => {
      window.removeEventListener('beforeunload', handleUnloadOrHide);
      document.removeEventListener('visibilitychange', handleUnloadOrHide);
    };
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

  // Auto-activate cassette or vinyl (FullScreenPlayer in 'deck' view) after 2 seconds of active playback if enabled in settings
  // REGLA: En favoritas no mostrar ni cinta ni vinilo aunque esté activada la opción de los dos segundos
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    if (settings?.autoOpenPlayerDeck === false) return;

    // Si estamos en la pestaña de favoritos o se está reproduciendo desde favoritos, NO mostrar ni cinta ni vinilo
    if (activeNavigationTab === 'favorites' || playbackContext === 'favorites') {
      return;
    }

    const timer = setTimeout(() => {
      setFullScreenPlayerOpen(true);
      setDeckActivationTrigger(Date.now());
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    isPlaying,
    currentTrack?.id,
    playTriggerCount,
    settings?.autoOpenPlayerDeck,
    activeNavigationTab,
    playbackContext,
  ]);

  const playTrack = async (
    track: Track,
    newQueue?: Track[],
    isCrossfade: boolean = false,
    mediaType?: 'tape' | 'vinyl',
    context?: string | null,
    playlistId?: string | null,
    startTime?: number
  ) => {
    // If playing from a different context or switching away from an active tape, save previous tape progress
    if (activeTapeIdRef.current && (mediaType !== 'tape' || (playlistId && playlistId !== activeTapeIdRef.current))) {
      saveCurrentTapeProgress();
    }

    if (mediaType === 'tape') {
      if (playlistId) {
        setActiveTapeId(playlistId);
      }
    } else if (mediaType === 'vinyl' || context === 'favorites') {
      setActiveTapeId(null);
      setActiveTapeName(null);
    }

    if (!isCrossfade) {
      setIsLoading(true);
    }
    setCurrentTrack(track);
    currentTrackRef.current = track;
    setPlayTriggerCount((c) => c + 1);
    playbackHistoryService.recordPlayback(track);

    if (context !== undefined) {
      setPlaybackContext(context);
    } else if (newQueue) {
      setPlaybackContext(null);
    }

    if (mediaType) {
      setPlaybackMediaType(mediaType);
      playbackMediaTypeRef.current = mediaType;
    } else if (newQueue) {
      setPlaybackMediaType(null);
      playbackMediaTypeRef.current = null;
    }

    let updatedQueue = newQueue || queueRef.current;
    if (newQueue) {
      setQueue(newQueue);
      queueRef.current = newQueue;
      const idx = newQueue.findIndex((t) => t.id === track.id);
      const chosenIdx = idx >= 0 ? idx : 0;
      setQueueIndex(chosenIdx);
      queueIndexRef.current = chosenIdx;
    } else {
      // If playing a standalone track not in queue, set it
      const existingIdx = updatedQueue.findIndex((t) => t.id === track.id);
      if (existingIdx >= 0) {
        setQueueIndex(existingIdx);
        queueIndexRef.current = existingIdx;
      } else {
        const appended = [track, ...updatedQueue];
        setQueue(appended);
        queueRef.current = appended;
        setQueueIndex(0);
        queueIndexRef.current = 0;
        updatedQueue = appended;
      }
    }

    if (startTime && startTime > 0) {
      setCurrentTime(startTime);
      currentTimeRef.current = startTime;
    }

    // Fetch lyrics in background
    lyricsService.getLyrics(track.title, track.artist, track.duration).then((lrc) => {
      setLyrics(lrc);
    });

    const success = await audioEngine.playTrack(track, isCrossfade, startTime);
    setIsLoading(false);
    setIsPlaying(success);

    if (success && startTime && startTime > 0) {
      setTimeout(() => {
        audioEngine.seek(startTime);
        setCurrentTime(startTime);
        currentTimeRef.current = startTime;
      }, 150);
    }

    // Preload next track
    const currentIdx = updatedQueue.findIndex((t) => t.id === track.id);
    if (currentIdx >= 0 && currentIdx + 1 < updatedQueue.length) {
      audioEngine.preloadNextTrack(updatedQueue[currentIdx + 1]);
    }
  };

  const playTape = async (playlist: Playlist, startIndex: number = 0, startTime: number = 0) => {
    if (!playlist || playlist.tracks.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(startIndex, playlist.tracks.length - 1));
    const targetTrack = playlist.tracks[clampedIndex];
    setActiveTapeId(playlist.id);
    setActiveTapeName(playlist.name);
    await playTrack(targetTrack, playlist.tracks, false, 'tape', null, playlist.id, startTime);
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      saveCurrentTapeProgress();
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  };

  const handleNextTrack = (isCrossfade: boolean = false) => {
    const q = queueRef.current;
    const curIdx = queueIndexRef.current;
    const rMode = repeatModeRef.current;

    if (rMode === 'one' && currentTrack) {
      if (isCrossfade) {
        playTrack(currentTrack, undefined, true);
      } else {
        audioEngine.seek(0);
        audioEngine.play();
      }
      return;
    }

    if (q.length === 0) return;

    let nextIdx = curIdx + 1;
    if (isShuffleRef.current) {
      nextIdx = Math.floor(Math.random() * q.length);
    }

    if (nextIdx < q.length) {
      playTrack(q[nextIdx], undefined, isCrossfade);
    } else if (rMode === 'all' || q.length > 1) {
      if (rMode !== 'all' && activeTapeIdRef.current && playbackMediaTypeRef.current === 'tape') {
        tapeProgressService.clearProgress(activeTapeIdRef.current);
      }
      playTrack(q[0], undefined, isCrossfade);
    } else {
      if (!isCrossfade) {
        setIsPlaying(false);
      }
      if (activeTapeIdRef.current && playbackMediaTypeRef.current === 'tape') {
        tapeProgressService.clearProgress(activeTapeIdRef.current);
      }
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
    currentTimeRef.current = seconds;
    saveCurrentTapeProgress();
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    audioEngine.setVolume(vol);
  };

  const setPlaybackRate = (rate: number) => {
    const clamped = Math.max(0.75, Math.min(1.35, Number(rate.toFixed(2))));
    setPlaybackRateState(clamped);
    audioEngine.setPlaybackRate(clamped);
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
        playbackRate,
        repeatMode,
        isShuffle,
        queue,
        queueIndex,
        lyrics,
        activeLyricIndex,
        isFullScreenPlayerOpen,
        deckActivationTrigger,
        isQueueOpen,
        isLyricsOpen,
        playbackMediaType,
        setPlaybackMediaType,
        playbackContext,
        setPlaybackContext,
        activeNavigationTab,
        setActiveNavigationTab,
        activeTapeId,
        activeTapeName,
        playTape,
        playTrack,
        togglePlay,
        nextTrack: handleNextTrack,
        prevTrack: handlePrevTrack,
        seek,
        setVolume,
        setPlaybackRate,
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
