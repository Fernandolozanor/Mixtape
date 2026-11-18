import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Playlist, Track, UserSettings } from '../types/music';
import { firebaseService } from '../services/firebase';
import { syncService, type SyncStateInfo } from '../services/syncService';
import { audioEngine } from '../services/audioEngine';

interface LibraryContextType {
  playlists: Playlist[];
  likedTracks: Track[];
  settings: UserSettings;
  syncState: SyncStateInfo;
  createPlaylist: (
    name: string,
    description?: string,
    coverUrl?: string,
    mediaType?: 'tape' | 'vinyl',
    artist?: string,
    year?: string,
    initialTracks?: Track[]
  ) => Playlist;
  updatePlaylist: (
    id: string,
    updates: {
      name?: string;
      description?: string;
      coverUrl?: string;
      mediaType?: 'tape' | 'vinyl';
      artist?: string;
      year?: string;
    }
  ) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  addTracksToPlaylist: (playlistId: string, tracks: Track[]) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => void;
  reorderLikedTracks: (fromIndex: number, toIndex: number) => void;
  toggleLike: (track: Track) => void;
  addMultipleToLiked: (tracks: Track[]) => void;
  removeLikedTrack: (trackId: string) => void;
  clearLikedTracks: () => void;
  isLiked: (trackId: string) => boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  saveFirebaseCredentials: (config: any) => Promise<boolean>;
  linkSyncCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  syncNow: () => Promise<void>;
  exportBackup: () => string;
  importBackup: (rawJson: string) => { success: boolean; error?: string };
  dismissJustLinkedBanner: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  skipSponsors: true,
  audioQuality: 'high',
  enableLrcLyrics: true,
  normalizeVolume: true,
  cacheSongsOffline: true,
  activeInstanceIndex: 0,
  vuMeterStyle: 'analog',
  textSize: 'medium',
  themeMode: 'dark',
  crossfadeEnabled: false,
  crossfadeDuration: 5,
  autoOpenPlayerDeck: true,
};

const LibraryContext = createContext<LibraryContextType | null>(null);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const local = localStorage.getItem('pulse_local_playlists');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  const [likedTracks, setLikedTracks] = useState<Track[]>(() => {
    try {
      const local = localStorage.getItem('pulse_local_liked');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('pulse_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [syncState, setSyncState] = useState<SyncStateInfo>(() => syncService.getStateInfo());
  const playlistsRef = useRef<Playlist[]>(playlists);
  const likedRef = useRef<Track[]>(likedTracks);

  useEffect(() => {
    playlistsRef.current = playlists;
  }, [playlists]);

  useEffect(() => {
    likedRef.current = likedTracks;
  }, [likedTracks]);

  // Synchronize Text Size to document root attribute and localStorage
  useEffect(() => {
    const size = settings.textSize || 'medium';
    document.documentElement.setAttribute('data-text-size', size);
    localStorage.setItem('pulse_text_size', size);
  }, [settings.textSize]);

  // Synchronize Theme Mode (dark vs light brushed silver) to document root and localStorage
  useEffect(() => {
    const mode = settings.themeMode || 'dark';
    document.documentElement.setAttribute('data-theme-mode', mode);
    if (mode === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('pulse_theme_mode', mode);
  }, [settings.themeMode]);

  // Synchronize initial audio settings on startup
  useEffect(() => {
    if (settings.skipSponsors !== undefined) {
      audioEngine.setSkipSponsors(settings.skipSponsors);
    }
    audioEngine.setCrossfade(
      settings.crossfadeEnabled ?? false,
      settings.crossfadeDuration ?? 5
    );
  }, []);

  // Subscribe to SyncService state & live remote updates
  useEffect(() => {
    const unsubState = syncService.onStateChange((info) => {
      setSyncState(info);
    });

    const unsubData = syncService.onRemoteDataMerged((merged) => {
      setPlaylists(merged.playlists);
      setLikedTracks(merged.likedTracks);

      if (merged.settingsBundle?.userSettings) {
        setSettings((prev) => {
          const updated = { ...prev, ...merged.settingsBundle!.userSettings };
          localStorage.setItem('pulse_settings', JSON.stringify(updated));
          if (merged.settingsBundle!.userSettings?.skipSponsors !== undefined) {
            audioEngine.setSkipSponsors(merged.settingsBundle!.userSettings.skipSponsors);
          }
          if (
            merged.settingsBundle!.userSettings?.crossfadeEnabled !== undefined ||
            merged.settingsBundle!.userSettings?.crossfadeDuration !== undefined
          ) {
            audioEngine.setCrossfade(
              updated.crossfadeEnabled ?? false,
              updated.crossfadeDuration ?? 5
            );
          }
          return updated;
        });
      }

      if (merged.settingsBundle) {
        window.dispatchEvent(
          new CustomEvent('mixtape:remote-settings-sync', {
            detail: merged.settingsBundle,
          })
        );
      }
    });

    return () => {
      unsubState();
      unsubData();
    };
  }, []);

  // Load initial data and auto-sync when app opens, gains focus, or reconnects
  useEffect(() => {
    let isSyncing = false;

    async function syncLibraryData() {
      if (isSyncing) return;
      isSyncing = true;
      try {
        const [pl, lk] = await Promise.all([
          firebaseService.loadPlaylists(),
          firebaseService.loadLikedTracks(),
        ]);
        setPlaylists(pl);
        setLikedTracks(lk);

        const savedSettings = localStorage.getItem('pulse_settings');
        if (savedSettings) {
          setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
        }

        // Pull from QR Cloud Sync room and merge
        const merged = await syncService.pullNow(pl, lk);
        if (merged) {
          setPlaylists(merged.playlists);
          setLikedTracks(merged.likedTracks);
          if (merged.playlists.length > 0 || merged.likedTracks.length > 0) {
            syncService.schedulePush(merged.playlists, merged.likedTracks);
          }
        }
      } catch (e) {
        console.warn('Auto-sync library error:', e);
      } finally {
        isSyncing = false;
      }
    }

    syncLibraryData();

    // Listen for auth state change
    const unsubscribe = firebaseService.onAuthChange(async (user) => {
      if (user) {
        await syncLibraryData();
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncLibraryData();
      }
    };

    const handleFocus = () => {
      syncLibraryData();
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'pulse_local_playlists' ||
        e.key === 'pulse_local_liked' ||
        e.key === 'pulse_settings'
      ) {
        syncLibraryData();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const persistPlaylists = (updated: Playlist[]) => {
    firebaseService.savePlaylists(updated);
    syncService.schedulePush(updated, likedRef.current);
  };

  const persistLikedTracks = (updated: Track[]) => {
    firebaseService.saveLikedTracks(updated);
    syncService.schedulePush(playlistsRef.current, updated);
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('pulse_settings', JSON.stringify(updated));
      if (newSettings.skipSponsors !== undefined) {
        audioEngine.setSkipSponsors(newSettings.skipSponsors);
      }
      if (newSettings.crossfadeEnabled !== undefined || newSettings.crossfadeDuration !== undefined) {
        audioEngine.setCrossfade(
          newSettings.crossfadeEnabled ?? updated.crossfadeEnabled ?? false,
          newSettings.crossfadeDuration ?? updated.crossfadeDuration ?? 5
        );
      }
      syncService.markSettingsUpdated();
      syncService.schedulePush(playlistsRef.current, likedRef.current);
      return updated;
    });
  };

  const saveFirebaseCredentials = async (config: any): Promise<boolean> => {
    const success = firebaseService.initialize(config);
    if (success) {
      updateSettings({ firebaseConfig: config });
      if (!firebaseService.getCurrentUser()) {
        await firebaseService.loginAnonymously();
      }
      await firebaseService.savePlaylists(playlists);
      await firebaseService.saveLikedTracks(likedTracks);
      return true;
    }
    return false;
  };

  const linkSyncCode = async (code: string) => {
    return syncService.linkSyncCode(code, playlistsRef.current, likedRef.current);
  };

  const syncNow = async () => {
    const merged = await syncService.pullNow(playlistsRef.current, likedRef.current);
    if (merged) {
      setPlaylists(merged.playlists);
      setLikedTracks(merged.likedTracks);
      await syncService.pushNow(merged.playlists, merged.likedTracks);
    }
  };

  const exportBackup = () => {
    return syncService.exportBackupJson(playlistsRef.current, likedRef.current);
  };

  const importBackup = (rawJson: string) => {
    return syncService.importBackupJson(rawJson, playlistsRef.current, likedRef.current);
  };

  const dismissJustLinkedBanner = () => {
    syncService.clearJustLinkedFlag();
  };

  const createPlaylist = (
    name: string,
    description?: string,
    coverUrl?: string,
    mediaType: 'tape' | 'vinyl' = 'tape',
    artist?: string,
    year?: string,
    initialTracks: Track[] = []
  ): Playlist => {
    const formattedTracks = (initialTracks || []).map((t) => ({
      ...t,
      addedAt: t.addedAt || Date.now(),
    }));
    const newPlaylist: Playlist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim() || 'Nueva Lista',
      description,
      coverUrl: coverUrl || formattedTracks[0]?.thumbnail,
      mediaType,
      artist,
      year,
      tracks: formattedTracks,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setPlaylists((prev) => {
      const updated = [newPlaylist, ...prev];
      persistPlaylists(updated);
      return updated;
    });

    return newPlaylist;
  };

  const updatePlaylist = (
    id: string,
    updates: {
      name?: string;
      description?: string;
      coverUrl?: string;
      mediaType?: 'tape' | 'vinyl';
      artist?: string;
      year?: string;
    }
  ) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            name: updates.name !== undefined ? updates.name.trim() || p.name : p.name,
            description: updates.description !== undefined ? updates.description : p.description,
            coverUrl: updates.coverUrl !== undefined ? updates.coverUrl : p.coverUrl,
            mediaType: updates.mediaType !== undefined ? updates.mediaType : p.mediaType,
            artist: updates.artist !== undefined ? updates.artist : p.artist,
            year: updates.year !== undefined ? updates.year : p.year,
            updatedAt: Date.now(),
          };
        }
        return p;
      });
      persistPlaylists(updated);
      return updated;
    });
  };

  const deletePlaylist = (id: string) => {
    syncService.recordPlaylistDeleted(id);
    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      persistPlaylists(updated);
      return updated;
    });
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    addTracksToPlaylist(playlistId, [track]);
  };

  const addTracksToPlaylist = (playlistId: string, tracks: Track[]) => {
    if (!tracks || tracks.length === 0) return;
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id === playlistId) {
          const existingIds = new Set(p.tracks.map((t) => t.id));
          const newTracks = tracks
            .filter((t) => !existingIds.has(t.id))
            .map((t) => ({ ...t, addedAt: Date.now() }));

          if (newTracks.length === 0) return p;

          const merged = [...p.tracks, ...newTracks];
          return {
            ...p,
            tracks: merged,
            coverUrl: p.coverUrl || newTracks[0]?.thumbnail || p.coverUrl,
            updatedAt: Date.now(),
          };
        }
        return p;
      });
      persistPlaylists(updated);
      return updated;
    });
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id === playlistId) {
          return {
            ...p,
            tracks: p.tracks.filter((t) => t.id !== trackId),
            updatedAt: Date.now(),
          };
        }
        return p;
      });
      persistPlaylists(updated);
      return updated;
    });
  };

  const reorderPlaylistTracks = (playlistId: string, fromIndex: number, toIndex: number) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id === playlistId) {
          const list = [...p.tracks];
          if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
            return p;
          }
          const [moved] = list.splice(fromIndex, 1);
          list.splice(toIndex, 0, moved);
          return {
            ...p,
            tracks: list,
            updatedAt: Date.now(),
          };
        }
        return p;
      });
      persistPlaylists(updated);
      return updated;
    });
  };

  const reorderLikedTracks = (fromIndex: number, toIndex: number) => {
    setLikedTracks((prev) => {
      const list = [...prev];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
        return prev;
      }
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      const now = Date.now();
      const updated = list.map((t, idx) => ({
        ...t,
        addedAt: now - idx * 1000,
      }));
      persistLikedTracks(updated);
      return updated;
    });
  };

  const toggleLike = (track: Track) => {
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      let updated: Track[];
      if (exists) {
        syncService.recordLikedTrackDeleted(track.id);
        updated = prev.filter((t) => t.id !== track.id);
      } else {
        syncService.recordTrackLiked(track.id);
        updated = [{ ...track, addedAt: Date.now() }, ...prev];
      }
      persistLikedTracks(updated);
      return updated;
    });
  };

  const addMultipleToLiked = (tracks: Track[]) => {
    if (!tracks || tracks.length === 0) return;
    setLikedTracks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const newTracks = tracks
        .filter((t) => !existingIds.has(t.id))
        .map((t) => {
          syncService.recordTrackLiked(t.id);
          return { ...t, addedAt: Date.now() };
        });

      if (newTracks.length === 0) return prev;

      const updated = [...newTracks, ...prev];
      persistLikedTracks(updated);
      return updated;
    });
  };

  const removeLikedTrack = (trackId: string) => {
    syncService.recordLikedTrackDeleted(trackId);
    setLikedTracks((prev) => {
      const updated = prev.filter((t) => t.id !== trackId);
      persistLikedTracks(updated);
      return updated;
    });
  };

  const clearLikedTracks = () => {
    likedRef.current.forEach((t) => syncService.recordLikedTrackDeleted(t.id));
    setLikedTracks([]);
    persistLikedTracks([]);
  };

  const isLiked = (trackId: string): boolean => {
    return likedTracks.some((t) => t.id === trackId);
  };

  return (
    <LibraryContext.Provider
      value={{
        playlists,
        likedTracks,
        settings,
        syncState,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        addTracksToPlaylist,
        removeTrackFromPlaylist,
        reorderPlaylistTracks,
        reorderLikedTracks,
        toggleLike,
        addMultipleToLiked,
        removeLikedTrack,
        clearLikedTracks,
        isLiked,
        updateSettings,
        saveFirebaseCredentials,
        linkSyncCode,
        syncNow,
        exportBackup,
        importBackup,
        dismissJustLinkedBanner,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
};
