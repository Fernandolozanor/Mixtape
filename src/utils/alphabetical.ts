const LEADING_PUNCT_RE = /^[\s"'`“”‘’¡¿(\[{#•\-–—]+/;

function stripLeadingPunct(raw: string | undefined | null): string {
  return (raw || '').trim().replace(LEADING_PUNCT_RE, '');
}

/**
 * Extracts the normalized alphabetical bucket letter (A–Z, Ñ, or #)
 * for any song title, artist/group name, album, or playlist name.
 */
export function getAlphabetLetter(raw: string | undefined | null): string {
  const cleaned = stripLeadingPunct(raw);

  if (!cleaned) return '#';

  const firstChar = cleaned[0];
  if (firstChar === 'ñ' || firstChar === 'Ñ') {
    return 'Ñ';
  }

  const normalized = firstChar
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (/^[A-Z]$/.test(normalized)) {
    return normalized;
  }

  return '#';
}

/**
 * Spanish locale-aware alphabetical comparator (case, accent, and leading-punctuation insensitive)
 */
export function compareAlphabetical(a: string | undefined | null, b: string | undefined | null): number {
  return stripLeadingPunct(a).localeCompare(stripLeadingPunct(b), 'es', { sensitivity: 'base' });
}

/**
 * Groups an already-sorted (or unsorted) list of items by their leading alphabetical letter.
 */
export function groupByLetter<T>(
  items: T[],
  getText: (item: T) => string
): Array<{ letter: string; items: T[] }> {
  const groups: Array<{ letter: string; items: T[] }> = [];
  for (const item of items) {
    const letter = getAlphabetLetter(getText(item));
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) {
      last.items.push(item);
    } else {
      groups.push({ letter, items: [item] });
    }
  }
  return groups;
}
