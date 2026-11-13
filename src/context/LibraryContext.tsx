import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Playlist, Track, UserSettings } from '../types/music';
import { firebaseService } from '../services/firebase';
import { audioEngine } from '../services/audioEngine';

interface LibraryContextType {
  playlists: Playlist[];
  likedTracks: Track[];
  settings: UserSettings;
  createPlaylist: (name: string, description?: string) => Playlist;
  updatePlaylist: (id: string, updates: { name?: string; description?: string; coverUrl?: string }) => void;
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
}

const DEFAULT_SETTINGS: UserSettings = {
  skipSponsors: true,
  audioQuality: 'high',
  enableLrcLyrics: true,
  normalizeVolume: true,
  cacheSongsOffline: true,
  activeInstanceIndex: 0,
};

const LibraryContext = createContext<LibraryContextType | null>(null);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('pulse_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const pl = await firebaseService.loadPlaylists();
      const lk = await firebaseService.loadLikedTracks();
      setPlaylists(pl);
      setLikedTracks(lk);
    }
    loadData();

    // Listen for auth state change
    const unsubscribe = firebaseService.onAuthChange(async (user) => {
      if (user) {
        const pl = await firebaseService.loadPlaylists();
        const lk = await firebaseService.loadLikedTracks();
        if (pl.length > 0) setPlaylists(pl);
        if (lk.length > 0) setLikedTracks(lk);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('pulse_settings', JSON.stringify(updated));
      if (newSettings.skipSponsors !== undefined) {
        audioEngine.setSkipSponsors(newSettings.skipSponsors);
      }
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

  const createPlaylist = (name: string, description?: string): Playlist => {
    const newPlaylist: Playlist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim() || 'Nueva Lista',
      description,
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setPlaylists((prev) => {
      const updated = [newPlaylist, ...prev];
      firebaseService.savePlaylists(updated);
      return updated;
    });

    return newPlaylist;
  };

  const updatePlaylist = (
    id: string,
    updates: { name?: string; description?: string; coverUrl?: string }
  ) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            name: updates.name !== undefined ? updates.name.trim() || p.name : p.name,
            description: updates.description !== undefined ? updates.description : p.description,
            coverUrl: updates.coverUrl !== undefined ? updates.coverUrl : p.coverUrl,
            updatedAt: Date.now(),
          };
        }
        return p;
      });
      firebaseService.savePlaylists(updated);
      return updated;
    });
  };

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      firebaseService.savePlaylists(updated);
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
      firebaseService.savePlaylists(updated);
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
      firebaseService.savePlaylists(updated);
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
      firebaseService.savePlaylists(updated);
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
      firebaseService.saveLikedTracks(list);
      return list;
    });
  };

  const toggleLike = (track: Track) => {
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      let updated: Track[];
      if (exists) {
        updated = prev.filter((t) => t.id !== track.id);
      } else {
        updated = [{ ...track, addedAt: Date.now() }, ...prev];
      }
      firebaseService.saveLikedTracks(updated);
      return updated;
    });
  };

  const addMultipleToLiked = (tracks: Track[]) => {
    if (!tracks || tracks.length === 0) return;
    setLikedTracks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const newTracks = tracks
        .filter((t) => !existingIds.has(t.id))
        .map((t) => ({ ...t, addedAt: Date.now() }));

      if (newTracks.length === 0) return prev;

      const updated = [...newTracks, ...prev];
      firebaseService.saveLikedTracks(updated);
      return updated;
    });
  };

  const removeLikedTrack = (trackId: string) => {
    setLikedTracks((prev) => {
      const updated = prev.filter((t) => t.id !== trackId);
      firebaseService.saveLikedTracks(updated);
      return updated;
    });
  };

  const clearLikedTracks = () => {
    setLikedTracks([]);
    firebaseService.saveLikedTracks([]);
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
