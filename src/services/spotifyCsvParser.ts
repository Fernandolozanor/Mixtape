export interface ParsedSpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
}

export interface CsvParseResult {
  tracks: ParsedSpotifyTrack[];
  suggestedName?: string;
  totalFound: number;
}

/**
 * Robust CSV Line Tokenizer that handles quotes, escaped quotes, and commas/semicolons.
 */
function tokenizeCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Detects the most likely delimiter in CSV content (comma, semicolon, or tab).
 */
function detectDelimiter(firstFewLines: string[]): string {
  let commaCount = 0;
  let semiCount = 0;
  let tabCount = 0;

  for (const line of firstFewLines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      if (!inQuotes) {
        if (c === ',') commaCount++;
        else if (c === ';') semiCount++;
        else if (c === '\t') tabCount++;
      }
    }
  }

  if (semiCount > commaCount && semiCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  return ',';
}

/**
 * Normalizes header string for fuzzy column identification.
 */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses Spotify CSV content from Exportify, Spotlistr, Soundiiz, TuneMyMusic, etc.
 */
export function parseSpotifyCsv(content: string, fileName?: string): CsvParseResult {
  if (!content || !content.trim()) {
    return { tracks: [], totalFound: 0 };
  }

  const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { tracks: [], totalFound: 0 };
  }

  const delimiter = detectDelimiter(rawLines.slice(0, 5));
  const headers = tokenizeCsvLine(rawLines[0], delimiter);
  const normalizedHeaders = headers.map(normalizeHeader);

  // Column identification indices
  let titleIdx = -1;
  let artistIdx = -1;
  let albumIdx = -1;
  let durationIdx = -1;

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    // Track Name / Title
    if (
      titleIdx === -1 &&
      (h === 'trackname' ||
        h === 'track' ||
        h === 'title' ||
        h === 'song' ||
        h === 'cancion' ||
        h === 'nombre' ||
        h === 'titulodelacancion')
    ) {
      titleIdx = i;
    }

    // Artist Name
    if (
      artistIdx === -1 &&
      (h === 'artistnames' ||
        h === 'artistname' ||
        h === 'artists' ||
        h === 'artist' ||
        h === 'artista' ||
        h === 'artistas' ||
        h === 'interprete' ||
        h === 'performer')
    ) {
      artistIdx = i;
    }

    // Album Name
    if (albumIdx === -1 && (h === 'albumname' || h === 'album' || h === 'albumtitle')) {
      albumIdx = i;
    }

    // Duration (ms)
    if (durationIdx === -1 && (h.includes('duration') || h.includes('duracion'))) {
      durationIdx = i;
    }
  }

  const tracks: ParsedSpotifyTrack[] = [];
  const startRow = titleIdx !== -1 && artistIdx !== -1 ? 1 : 0;

  for (let r = startRow; r < rawLines.length; r++) {
    const line = rawLines[r];
    const cols = tokenizeCsvLine(line, delimiter);

    let title = '';
    let artist = '';
    let album: string | undefined;
    let durationMs: number | undefined;

    if (titleIdx !== -1 && artistIdx !== -1) {
      title = (cols[titleIdx] || '').replace(/^["']|["']$/g, '').trim();
      artist = (cols[artistIdx] || '').replace(/^["']|["']$/g, '').trim();
      if (albumIdx !== -1 && cols[albumIdx]) {
        album = cols[albumIdx].replace(/^["']|["']$/g, '').trim();
      }
      if (durationIdx !== -1 && cols[durationIdx]) {
        const ms = parseInt(cols[durationIdx], 10);
        if (!isNaN(ms)) durationMs = ms;
      }
    } else {
      // Fallback heuristics: If column 0 and column 1 exist
      if (cols.length >= 2) {
        title = cols[0].replace(/^["']|["']$/g, '').trim();
        artist = cols[1].replace(/^["']|["']$/g, '').trim();
      } else if (line.includes(' - ')) {
        // Line-by-line "Artist - Title" format
        const parts = line.split(' - ');
        if (parts.length >= 2) {
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
      }
    }

    if (title && artist) {
      tracks.push({
        id: `sp_import_${r}_${Math.random().toString(36).substring(2, 6)}`,
        title,
        artist,
        album,
        durationMs,
      });
    }
  }

  // Derive suggested playlist name from filename or date
  let suggestedName = 'Mixtape Spotify';
  if (fileName) {
    const clean = fileName
      .replace(/\.(csv|txt)$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (clean) suggestedName = `Cinta: ${clean}`;
  }

  return {
    tracks,
    suggestedName,
    totalFound: tracks.length,
  };
}
