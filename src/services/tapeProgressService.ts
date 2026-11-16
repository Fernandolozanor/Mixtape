export interface TapeProgress {
  playlistId: string;
  playlistName: string;
  trackId: string;
  trackIndex: number;
  trackTitle: string;
  trackArtist: string;
  currentTime: number; // in seconds
  duration: number; // in seconds
  updatedAt: number; // timestamp
}

const STORAGE_KEY = 'mixtape_tapes_progress';

export const tapeProgressService = {
  getAllProgress(): Record<string, TapeProgress> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getProgress(playlistId: string): TapeProgress | null {
    if (!playlistId) return null;
    const all = this.getAllProgress();
    const item = all[playlistId];
    if (!item) return null;

    // A tape is considered interrupted if it has advanced beyond the first 4 seconds
    // or if the user is on track index 1 or greater.
    if (item.trackIndex === 0 && item.currentTime < 4) {
      return null;
    }
    return item;
  },

  saveProgress(progress: TapeProgress): void {
    if (!progress || !progress.playlistId) return;
    try {
      const all = this.getAllProgress();
      all[progress.playlistId] = {
        ...progress,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Error saving tape progress:', e);
    }
  },

  clearProgress(playlistId: string): void {
    if (!playlistId) return;
    try {
      const all = this.getAllProgress();
      if (all[playlistId]) {
        delete all[playlistId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
    } catch (e) {
      console.warn('Error clearing tape progress:', e);
    }
  },
};
