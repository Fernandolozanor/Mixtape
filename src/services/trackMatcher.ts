import type { ParsedSpotifyTrack } from './spotifyCsvParser';
import type { Track } from '../types/music';

export interface FailedTrackReport {
  track: ParsedSpotifyTrack;
  reason: string;
}

export interface MatchEvaluation {
  isMatch: boolean;
  score: number;
  reason: string;
}

// Common stopwords that shouldn't independently decide a title match
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'in', 'on', 'at', 'to', 'from', 'by',
  'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'de', 'del', 'con', 'en', 'por', 'para',
]);

// Words that indicate non-original / unwanted versions on video platforms
const DISQUALIFYING_PATTERNS = [
  /\b(?:karaoke|backing track|instrumental only)\b/i,
  /\b(?:acoustic cover|guitar cover|piano cover|drum cover|bass cover|vocal cover)\b/i,
  /\b(?:guitar lesson|tutorial|how to play|bass tab|guitar tab)\b/i,
  /\b(?:reaction|reacting to|review|parody|parodia)\b/i,
  /\b(?:chipmunk|nightcore|slowed \+ reverb|sped up)\b/i,
];

/**
 * Normalizes text: lowercase, remove accents, remove special punctuation, normalize spaces.
 */
export function normalizeTrackText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents
    .replace(/&/g, ' and ')
    .replace(/['’"`´]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips metadata noise from track titles: (Official Video), [Remastered 2011], - 2021 Remaster, etc.
 */
export function cleanTitle(title: string): string {
  if (!title) return '';
  let cleaned = title
    // Remove parenthetical / bracketed metadata
    .replace(
      /\((?:official|music|video|audio|lyric|lyrics|visualizer|remaster|remastered|deluxe|anniversary|live|bonus|version|edit|mono|stereo|hd|4k|hq|extended|radio edit)[^)]*\)/gi,
      ''
    )
    .replace(
      /\[(?:official|music|video|audio|lyric|lyrics|visualizer|remaster|remastered|deluxe|anniversary|live|bonus|version|edit|mono|stereo|hd|4k|hq|extended|radio edit)[^\]]*\]/gi,
      ''
    )
    // Remove trailing "- Remastered...", "- 2011 Remaster", "- Live at...", etc.
    .replace(
      /-\s*(?:remaster|remastered|\d{4}\s*remaster|deluxe|single version|radio edit|mono|stereo|live).*$/gi,
      ''
    )
    // Remove featured artists within parentheses
    .replace(/\((?:feat\.?|ft\.?)[^)]*\)/gi, '')
    .replace(/\[(?:feat\.?|ft\.?)[^\]]*\]/gi, '');

  return normalizeTrackText(cleaned);
}

/**
 * Splits artist string into individual artist tokens (e.g. "Queen, David Bowie" -> ["queen", "david bowie"]).
 */
export function extractArtists(artistStr: string): string[] {
  if (!artistStr) return [];
  const parts = artistStr.split(/[,/&]|\bfeat\.?\b|\bft\.?\b|\band\b|\bx\b/i);
  return parts
    .map((p) => normalizeTrackText(p))
    .filter((p) => p.length > 1);
}

/**
 * Evaluates whether a candidate track is an exact and legitimate match for an expected Spotify track.
 */
export function evaluateTrackMatch(
  expected: ParsedSpotifyTrack,
  candidate: Track
): MatchEvaluation {
  const normCandTitle = normalizeTrackText(candidate.title);
  const normCandArtist = normalizeTrackText(candidate.artist || '');
  const cleanExpTitle = cleanTitle(expected.title);
  const cleanCandTitle = cleanTitle(candidate.title);

  // 1. Check for disqualifying patterns in candidate (unless expected track explicitly asks for it)
  const expLower = expected.title.toLowerCase();
  for (const pattern of DISQUALIFYING_PATTERNS) {
    if (pattern.test(candidate.title) && !pattern.test(expLower)) {
      return {
        isMatch: false,
        score: 0,
        reason: 'Descartado: parece ser un cover, karaoke, tutorial o versión no original',
      };
    }
  }

  // 2. Check Artist Match
  const expArtists = extractArtists(expected.artist);
  const primaryArtist = expArtists[0] || normalizeTrackText(expected.artist);

  let artistMatched = false;
  // Match in candidate artist field
  if (normCandArtist && expArtists.some((a) => normCandArtist.includes(a) || a.includes(normCandArtist))) {
    artistMatched = true;
  }
  // Match in candidate title (very common on YouTube: "Artist - Song Title")
  if (!artistMatched && expArtists.some((a) => normCandTitle.includes(a))) {
    artistMatched = true;
  }
  // If primary artist has multiple words, check if individual significant words match
  if (!artistMatched && primaryArtist) {
    const artistWords = primaryArtist.split(' ').filter((w) => !STOPWORDS.has(w) && w.length >= 3);
    if (artistWords.length > 0 && artistWords.every((w) => normCandTitle.includes(w) || normCandArtist.includes(w))) {
      artistMatched = true;
    }
  }

  if (!artistMatched) {
    return {
      isMatch: false,
      score: 10,
      reason: 'El artista no coincide con el resultado encontrado',
    };
  }

  // 3. Check Title Match
  let titleScore = 0;
  let titleMatched = false;

  // Exact phrase match of cleaned title
  if (cleanExpTitle.length > 0 && normCandTitle.includes(cleanExpTitle)) {
    titleMatched = true;
    titleScore = 50;
  } else if (cleanExpTitle.length > 0 && cleanCandTitle.includes(cleanExpTitle)) {
    titleMatched = true;
    titleScore = 50;
  } else {
    // Significant words token match
    const expWords = cleanExpTitle.split(' ').filter((w) => !STOPWORDS.has(w) && w.length >= 2);
    if (expWords.length > 0) {
      const matchedWords = expWords.filter((w) => normCandTitle.includes(w));
      const matchRatio = matchedWords.length / expWords.length;

      // If title has 1 or 2 words, ALL must match with word boundary
      if (expWords.length <= 2) {
        const allBoundaryMatch = expWords.every((w) => {
          const re = new RegExp(`\\b${w}\\b`, 'i');
          return re.test(normCandTitle);
        });
        if (allBoundaryMatch) {
          titleMatched = true;
          titleScore = 40;
        }
      } else if (matchRatio >= 0.75) {
        titleMatched = true;
        titleScore = Math.round(matchRatio * 45);
      }
    }
  }

  if (!titleMatched) {
    return {
      isMatch: false,
      score: 25,
      reason: 'El título de la canción no coincide exactamente',
    };
  }

  // 4. Check Duration Match (if durationMs is present)
  let durationScore = 20;
  if (expected.durationMs && expected.durationMs > 0 && candidate.duration) {
    const expSec = Math.round(expected.durationMs / 1000);
    const candSec = candidate.duration;

    // Disqualify if candidate is a tiny preview (< 45s) or a giant full concert (> 20 min)
    if (candSec < 45 && expSec > 75) {
      return {
        isMatch: false,
        score: 10,
        reason: 'Descartado: la pista encontrada es un adelanto o muestra corta (< 45s)',
      };
    }
    if (candSec > 1200 && expSec < 600) {
      return {
        isMatch: false,
        score: 10,
        reason: 'Descartado: la pista encontrada es un concierto completo o álbum (> 20m)',
      };
    }

    const diff = Math.abs(candSec - expSec);
    if (diff <= 15) {
      durationScore = 25;
    } else if (diff <= 35) {
      durationScore = 20;
    } else if (diff <= 65) {
      durationScore = 15;
    } else if (diff <= 95) {
      durationScore = 10;
    } else if (diff <= 125) {
      durationScore = 5;
    } else {
      // Discard if duration differs by more than 2 minutes (unless title explicitly states live/extended)
      return {
        isMatch: false,
        score: 30,
        reason: `Duración no coincide con la original (${Math.round(candSec / 60)}m vs ${Math.round(expSec / 60)}m)`,
      };
    }
  }

  // 5. Credibility bonus for official channels / VEVO / Topics
  let credibilityBonus = 0;
  if (
    normCandArtist.includes('vevo') ||
    normCandArtist.includes('official') ||
    normCandArtist.includes('topic')
  ) {
    credibilityBonus = 5;
  }

  const totalScore = titleScore + (artistMatched ? 25 : 0) + durationScore + credibilityBonus;

  return {
    isMatch: totalScore >= 70,
    score: totalScore,
    reason: totalScore >= 70 ? 'Coincidencia exacta verificada' : 'Puntuación insuficiente para coincidencia exacta',
  };
}

/**
 * Searches candidates and picks the highest scoring strictly verified match.
 * Returns null if no candidate passes the strict match threshold.
 */
export function findStrictBestMatch(
  expected: ParsedSpotifyTrack,
  candidates: Track[]
): { matchedTrack: Track | null; reason: string } {
  if (!candidates || candidates.length === 0) {
    return { matchedTrack: null, reason: 'No se encontraron resultados en los servidores de audio' };
  }

  let bestCandidate: Track | null = null;
  let bestScore = -1;
  let lastFailReason = 'Sin coincidencia exacta';

  for (const candidate of candidates) {
    const evalResult = evaluateTrackMatch(expected, candidate);
    if (evalResult.isMatch && evalResult.score > bestScore) {
      bestScore = evalResult.score;
      bestCandidate = candidate;
    } else if (!evalResult.isMatch) {
      lastFailReason = evalResult.reason;
    }
  }

  if (bestCandidate) {
    return { matchedTrack: bestCandidate, reason: 'Coincidencia exacta verificada' };
  }

  return { matchedTrack: null, reason: lastFailReason };
}
