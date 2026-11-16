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
    .replace(/['’"`´“”]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips metadata noise from track titles: (Official Video), (2013 Remaster), [Remastered 2011], - 2021 Remaster, etc.
 */
export function cleanTitle(title: string): string {
  if (!title) return '';
  let cleaned = title
    .replace(/[–—−]/g, '-')
    .replace(/["“”'’`´]/g, '')
    // Remove parenthetical with keywords or 4-digit year anywhere inside
    .replace(
      /\([^(]*\b(?:remaster|remastered|\d{4}|mix|version|edit|live|deluxe|edition|anniversary|explicit|clean|audio|video|soundtrack|from|ost|theme|mono|stereo|feat|ft|featuring|with|re-recorded|rerecorded|session|bonus|single|album)\b[^)]*\)/gi,
      ''
    )
    // Remove brackets with keywords or 4-digit year anywhere inside
    .replace(
      /\[[^[]*\b(?:remaster|remastered|\d{4}|mix|version|edit|live|deluxe|edition|anniversary|explicit|clean|audio|video|soundtrack|from|ost|theme|mono|stereo|feat|ft|featuring|with|re-recorded|rerecorded|session|bonus|single|album)\b[^\]]*\]/gi,
      ''
    )
    // Remove trailing dash metadata (remaster, soundtrack, live, radio edit, etc.)
    .replace(
      /\s*-\s*(?:from\s+.*|remaster|remastered|\d{4}\s*remaster|\d{4}\s*mix|\d{4}\s*remastered.*|deluxe|single\s*version|album\s*version|radio\s*edit|mono|stereo|live|anniversary|original|bonus|re-recorded|rerecorded).*$/gi,
      ''
    )
    // Remove trailing dash feat metadata
    .replace(/\s*-\s*(?:feat\.?|ft\.?|featuring|with)\s+.*$/gi, '');

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
    .filter((p) => p.length > 0);
}

/**
 * Evaluates whether a candidate track is an authentic, legitimate match for an expected Spotify track.
 * Ensures the maximum number of original tracks are matched without accepting covers, tutorials, or unrelated songs.
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

  // Sanity duration bounds (prevent 20s previews or 2-hour full concerts)
  if (expected.durationMs && expected.durationMs > 0 && candidate.duration) {
    const expSec = Math.round(expected.durationMs / 1000);
    const candSec = candidate.duration;
    if (candSec < 35 && expSec > 60) {
      return {
        isMatch: false,
        score: 0,
        reason: 'Descartado: la pista encontrada es un adelanto o muestra corta (< 35s)',
      };
    }
    if (candSec > 1200 && expSec < 500) {
      return {
        isMatch: false,
        score: 0,
        reason: 'Descartado: la pista encontrada es un concierto completo o álbum (> 20m)',
      };
    }
  }

  // 2. Check Artist Match
  const expArtists = extractArtists(expected.artist);
  const primaryArtist = expArtists[0] || normalizeTrackText(expected.artist);

  let artistMatched = false;
  let artistScore = 0;

  // Match in candidate artist field
  if (normCandArtist && expArtists.some((a) => a.length >= 2 && (normCandArtist.includes(a) || a.includes(normCandArtist)))) {
    artistMatched = true;
    artistScore = 30;
  }
  // Match in candidate title ("Artist - Song Title" format on YouTube)
  if (!artistMatched && expArtists.some((a) => a.length >= 2 && normCandTitle.includes(a))) {
    artistMatched = true;
    artistScore = 25;
  }
  // Match individual words of primary artist if >= 3 letters (e.g. "Red Hot Chili Peppers", "Guns N' Roses")
  if (!artistMatched && primaryArtist) {
    const artistWords = primaryArtist.split(' ').filter((w) => !STOPWORDS.has(w) && w.length >= 3);
    if (artistWords.length > 0 && artistWords.every((w) => normCandTitle.includes(w) || normCandArtist.includes(w))) {
      artistMatched = true;
      artistScore = 20;
    }
  }
  // Match for Topic channels or record labels (e.g., "Queen - Topic", "Warner Records", "VEVO")
  if (!artistMatched && (normCandArtist.includes('topic') || normCandArtist.includes('vevo') || normCandArtist.includes('records'))) {
    const artistWords = primaryArtist.split(' ').filter((w) => !STOPWORDS.has(w) && w.length >= 2);
    if (artistWords.length > 0 && artistWords.some((w) => normCandTitle.includes(w))) {
      artistMatched = true;
      artistScore = 20;
    }
  }

  if (!artistMatched) {
    return {
      isMatch: false,
      score: 0,
      reason: 'El artista no coincide con el resultado encontrado',
    };
  }

  // 3. Check Title Match
  let titleScore = 0;
  let titleMatched = false;

  // Exact phrase match of cleaned title
  if (cleanExpTitle.length > 0 && (normCandTitle.includes(cleanExpTitle) || cleanCandTitle.includes(cleanExpTitle))) {
    titleMatched = true;
    titleScore = 50;
  } else {
    // Significant words token match
    const expWords = cleanExpTitle.split(' ').filter((w) => !STOPWORDS.has(w) && w.length >= 2);
    if (expWords.length > 0) {
      const matchedWords = expWords.filter((w) => {
        const re = new RegExp(`\\b${w}\\b`, 'i');
        return re.test(normCandTitle) || re.test(cleanCandTitle);
      });
      const matchRatio = matchedWords.length / expWords.length;

      // 1 or 2 word titles: all core words must match with word boundary
      if (expWords.length <= 2) {
        if (matchedWords.length === expWords.length) {
          titleMatched = true;
          titleScore = 50;
        }
      } else if (matchRatio >= 0.65) {
        titleMatched = true;
        titleScore = Math.round(matchRatio * 45);
      }
    }
  }

  if (!titleMatched) {
    return {
      isMatch: false,
      score: 0,
      reason: 'El título de la canción no coincide con el resultado',
    };
  }

  // When both Artist and Title are legitimately confirmed -> VALID MATCH!
  let score = titleScore + artistScore;

  // Duration proximity ranking bonus (promotes official album version over extended edits)
  if (expected.durationMs && expected.durationMs > 0 && candidate.duration) {
    const expSec = Math.round(expected.durationMs / 1000);
    const candSec = candidate.duration;
    const diff = Math.abs(candSec - expSec);
    if (diff <= 15) score += 20;
    else if (diff <= 40) score += 15;
    else if (diff <= 80) score += 10;
    else if (diff <= 150) score += 5;
    else score -= 10; // mild penalty for large difference, but do NOT discard valid track
  } else {
    score += 10; // neutral duration score
  }

  // Credibility bonus for official channels / VEVO / Topics
  if (
    normCandArtist.includes('vevo') ||
    normCandArtist.includes('official') ||
    normCandArtist.includes('topic')
  ) {
    score += 10;
  }

  return {
    isMatch: true,
    score,
    reason: 'Coincidencia confirmada',
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
    } else if (!evalResult.isMatch && bestScore === -1) {
      lastFailReason = evalResult.reason;
    }
  }

  if (bestCandidate) {
    return { matchedTrack: bestCandidate, reason: 'Coincidencia verificada' };
  }

  return { matchedTrack: null, reason: lastFailReason };
}
