const STORAGE_KEY = 'mixtape_reggaeton_joke_counter';

/**
 * Checks if a genre, recommendation tag or query relates to reggaeton.
 */
export function isReggaetonTag(text: string): boolean {
  if (!text) return false;
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (
    normalized.includes('reggaeton') ||
    normalized.includes('reggeaton') ||
    normalized.includes('regeton') ||
    normalized.includes('perreo')
  );
}

/**
 * Returns true exactly 1 out of 3 times (1st, 4th, 7th, 10th selection, etc.)
 */
export function shouldTriggerReggaetonJoke(): boolean {
  let count = 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) count = parseInt(raw, 10) || 0;
  } catch {
    count = 0;
  }

  count += 1;
  try {
    localStorage.setItem(STORAGE_KEY, count.toString());
  } catch {
    // Ignore storage issues
  }

  return count % 3 === 1;
}
