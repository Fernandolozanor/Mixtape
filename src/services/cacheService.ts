import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface PulseDB extends DBSchema {
  audioCache: {
    key: string; // track.id
    value: {
      id: string;
      title: string;
      artist: string;
      blob: Blob;
      mimeType: string;
      timestamp: number;
    };
  };
}

class CacheService {
  private dbPromise: Promise<IDBPDatabase<PulseDB>> | null = null;

  private async getDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB<PulseDB>('pulse-audio-db', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('audioCache')) {
            db.createObjectStore('audioCache', { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Save an audio stream blob to IndexedDB
   */
  async cacheAudio(id: string, title: string, artist: string, url: string): Promise<boolean> {
    try {
      const res = await fetch(url);
      if (!res.ok) return false;
      const blob = await res.blob();
      const db = await this.getDB();

      await db.put('audioCache', {
        id,
        title,
        artist,
        blob,
        mimeType: blob.type || 'audio/mp4',
        timestamp: Date.now(),
      });
      return true;
    } catch (e) {
      console.warn('Failed to cache audio offline:', e);
      return false;
    }
  }

  /**
   * Retrieve cached audio as an ObjectURL
   */
  async getCachedAudioUrl(id: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      const entry = await db.get('audioCache', id);
      if (entry && entry.blob) {
        return URL.createObjectURL(entry.blob);
      }
    } catch (e) {
      console.warn('Failed to retrieve cached audio:', e);
    }
    return null;
  }

  /**
   * Check if a track is cached
   */
  async isCached(id: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      const entry = await db.get('audioCache', id);
      return !!entry;
    } catch {
      return false;
    }
  }

  /**
   * Delete cached audio for a track
   */
  async deleteCachedAudio(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('audioCache', id);
  }

  /**
   * Clear all audio cache
   */
  async clearAllCache(): Promise<void> {
    const db = await this.getDB();
    await db.clear('audioCache');
  }
}

export const cacheService = new CacheService();
