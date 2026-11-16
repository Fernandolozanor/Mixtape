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

function parseDurationValue(val: string): number | undefined {
  if (!val) return undefined;
  const trimmed = val.replace(/^["']|["']$/g, '').trim();
  if (!trimmed) return undefined;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseFloat(p));
    if (parts.some((p) => isNaN(p))) return undefined;
    if (parts.length === 2) {
      return Math.round((parts[0] * 60 + parts[1]) * 1000);
    }
    if (parts.length === 3) {
      return Math.round((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
    }
  }

  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) return undefined;
  if (num > 10000) return Math.round(num);
  if (num >= 10 && num <= 10000) return Math.round(num * 1000);

  return undefined;
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
    const isUriOrUrlOrId =
      h.includes('uri') ||
      h.includes('url') ||
      h.includes('id') ||
      h.includes('link') ||
      h.includes('isrc') ||
      h.includes('preview');
    const isNumber =
      h.includes('numero') ||
      h.includes('number') ||
      h.includes('tracknumber') ||
      h.includes('pos');
    const isDuration =
      h.includes('duracion') ||
      h.includes('duration') ||
      h.includes('length') ||
      h.includes('time') ||
      h.includes('dauer') ||
      h.includes('duree') ||
      h.includes('tempo');
    const isImage =
      h.includes('imagen') ||
      h.includes('image') ||
      h.includes('cover') ||
      h.includes('artwork') ||
      h.includes('foto');
    const isArtist =
      (h.includes('artist') ||
        h.includes('artista') ||
        h.includes('interprete') ||
        h.includes('autor') ||
        h.includes('performer') ||
        h.includes('creator') ||
        h.includes('band') ||
        h.includes('grupo') ||
        h.includes('singer')) &&
      !isUriOrUrlOrId &&
      !isImage;
    const isAlbum =
      (h.includes('album') || h.includes('disco')) &&
      !isUriOrUrlOrId &&
      !isImage &&
      !h.includes('fecha') &&
      !h.includes('date');

    // 1. Track Title (Song / Track name)
    if (
      titleIdx === -1 &&
      !isUriOrUrlOrId &&
      !isNumber &&
      !isDuration &&
      !isImage &&
      !isArtist &&
      !isAlbum
    ) {
      if (
        h.includes('cancion') ||
        h.includes('track') ||
        h.includes('title') ||
        h.includes('titulo') ||
        h.includes('song') ||
        h.includes('name') ||
        h.includes('nombre') ||
        h.includes('faixa') ||
        h.includes('musica') ||
        h.includes('morceau') ||
        h.includes('brano')
      ) {
        titleIdx = i;
      }
    }

    // 2. Artist Name (prefer track artist over album artist)
    if (isArtist) {
      if (
        artistIdx === -1 ||
        (!h.includes('album') && normalizedHeaders[artistIdx].includes('album'))
      ) {
        artistIdx = i;
      }
    }

    // 3. Album Name (exclude album artist columns)
    if (isAlbum && !isArtist && albumIdx === -1) {
      albumIdx = i;
    }

    // 4. Duration
    if (isDuration && durationIdx === -1) {
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
        durationMs = parseDurationValue(cols[durationIdx]);
      }
    } else {
      // Intelligent fallback when headers aren't detected:
      // Discard columns that look like URIs, URLs, or pure numbers
      const candidateCols = cols
        .map((c, colIdx) => ({
          text: c.replace(/^["']|["']$/g, '').trim(),
          colIdx,
        }))
        .filter(
          (c) =>
            c.text.length > 0 &&
            !c.text.startsWith('spotify:') &&
            !c.text.startsWith('http://') &&
            !c.text.startsWith('https://') &&
            !/^[a-zA-Z0-9]{22}$/.test(c.text) &&
            !/^\d+$/.test(c.text)
        );

      if (candidateCols.length >= 2) {
        title = candidateCols[0].text;
        artist = candidateCols[1].text;
      } else if (line.includes(' - ')) {
        // Line-by-line "Artist - Title" format
        const parts = line.split(' - ');
        if (parts.length >= 2) {
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
      }
    }

    if (
      title &&
      artist &&
      !title.startsWith('spotify:') &&
      !artist.startsWith('spotify:') &&
      !title.startsWith('http') &&
      !artist.startsWith('http')
    ) {
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
