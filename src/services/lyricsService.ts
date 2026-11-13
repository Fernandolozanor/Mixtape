import type { LyricLine } from '../types/music';

class LyricsService {
  /**
   * Parse LRC format string into structured LyricLine array
   */
  parseLrc(lrcText: string): LyricLine[] {
    if (!lrcText) return [];

    const lines = lrcText.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const matches = [...trimmed.matchAll(timeRegex)];
      if (matches.length > 0) {
        const text = trimmed.replace(timeRegex, '').trim();
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const fraction = match[3] ? parseFloat(`0.${match[3]}`) : 0;
          const totalSeconds = minutes * 60 + seconds + fraction;

          if (text) {
            result.push({
              time: totalSeconds,
              text,
            });
          }
        }
      }
    }

    return result.sort((a, b) => a.time - b.time);
  }

  /**
   * Clean song titles to increase lyric match probability
   * (removes "(Official Video)", "[Audio]", "feat. X", etc.)
   */
  cleanTitle(title: string): string {
    return title
      .replace(/\(Official (Music )?Video\)/gi, '')
      .replace(/\[Official (Music )?Video\]/gi, '')
      .replace(/\(Audio\)/gi, '')
      .replace(/\[Audio\]/gi, '')
      .replace(/\(Lyric Video\)/gi, '')
      .replace(/\[Lyric Video\]/gi, '')
      .replace(/\(Visualizer\)/gi, '')
      .replace(/\[Visualizer\]/gi, '')
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\[feat\..*?\]/gi, '')
      .replace(/\(ft\..*?\)/gi, '')
      .replace(/\[ft\..*?\]/gi, '')
      .replace(/\|.*$/g, '')
      .trim();
  }

  /**
   * Fetch synced or plain lyrics from LRCLIB
   */
  async getLyrics(trackTitle: string, artistName: string, duration?: number): Promise<LyricLine[]> {
    const cleanedTitle = this.cleanTitle(trackTitle);
    const cleanedArtist = artistName.replace(/\s*-\s*Topic$/i, '').trim();

    try {
      // 1. Try exact match with duration
      const queryParams = new URLSearchParams({
        track_name: cleanedTitle,
        artist_name: cleanedArtist,
      });

      if (duration && duration > 0) {
        queryParams.append('duration', Math.round(duration).toString());
      }

      const res = await fetch(`https://lrclib.net/api/get?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics) {
          return this.parseLrc(data.syncedLyrics);
        }
        if (data.plainLyrics) {
          return data.plainLyrics
            .split('\n')
            .filter((l: string) => l.trim().length > 0)
            .map((text: string, idx: number) => ({
              time: idx * 4, // estimate spacing if no sync
              text: text.trim(),
            }));
        }
      }

      // 2. Fallback to search endpoint
      const searchRes = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanedTitle} ${cleanedArtist}`)}`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData) && searchData.length > 0) {
          const matchWithSync = searchData.find((item: any) => item.syncedLyrics);
          if (matchWithSync) {
            return this.parseLrc(matchWithSync.syncedLyrics);
          }
          if (searchData[0].plainLyrics) {
            return searchData[0].plainLyrics
              .split('\n')
              .filter((l: string) => l.trim().length > 0)
              .map((text: string, idx: number) => ({
                time: idx * 4,
                text: text.trim(),
              }));
          }
        }
      }
    } catch (err) {
      console.warn('Lyrics fetch failed:', err);
    }

    return [];
  }
}

export const lyricsService = new LyricsService();
