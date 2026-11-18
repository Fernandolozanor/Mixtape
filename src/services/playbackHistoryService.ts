import type { Track } from '../types/music';

export interface HistoryItem {
  track: Track;
  playedAt: number;
}

class PlaybackHistoryService {
  private readonly STORAGE_KEY = 'pulse_playback_history';
  private readonly MAX_ITEMS = 30;

  /**
   * Record a track into playback history
   */
  recordPlayback(track: Track): void {
    if (!track || !track.id) return;

    try {
      const history = this.getHistory();
      // Remove existing entry for same track to place it at the very top
      const filtered = history.filter((item) => item.track.id !== track.id);
      const updated: HistoryItem[] = [{ track, playedAt: Date.now() }, ...filtered].slice(
        0,
        this.MAX_ITEMS
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // LocalStorage error fallback
    }
  }

  /**
   * Get complete playback history
   */
  getHistory(): HistoryItem[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item && item.track && item.track.id && item.track.title);
    } catch {
      return [];
    }
  }

  /**
   * Get the N most recent played tracks
   */
  getRecentTracks(limit: number = 5): Track[] {
    return this.getHistory()
      .slice(0, limit)
      .map((item) => item.track);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {}
  }
}

export const playbackHistoryService = new PlaybackHistoryService();
