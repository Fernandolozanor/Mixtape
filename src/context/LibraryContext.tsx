import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Playlist, Track, UserSettings } from '../types/music';
import { firebaseService } from '../services/firebase';
import { audioEngine } from '../services/audioEngine';

interface LibraryContextType {
  playlists: Playlist[];
  likedTracks: Track[];
  settings: UserSettings;
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  toggleLike: (track: Track) => void;
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
      // Automatically attempt anonymous login if not logged in
      if (!firebaseService.getCurrentUser()) {
        await firebaseService.loginAnonymously();
      }
      // Sync current playlists & liked tracks
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

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      firebaseService.savePlaylists(updated);
      return updated;
    });
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id === playlistId) {
          // Prevent duplicates
          if (p.tracks.some((t) => t.id === track.id)) return p;
          const updatedTracks = [...p.tracks, { ...track, addedAt: Date.now() }];
          return {
            ...p,
            tracks: updatedTracks,
            coverUrl: p.coverUrl || track.thumbnail,
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
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        toggleLike,
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
