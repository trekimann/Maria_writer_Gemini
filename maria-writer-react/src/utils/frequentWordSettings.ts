export const FREQUENT_WORDS_STORAGE_KEY = 'maria_statistics_ignored_words';

export const DEFAULT_IGNORED_WORDS = [
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'for',
  'from',
  'had',
  'has',
  'have',
  'he',
  'her',
  'hers',
  'him',
  'his',
  'i',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'ours',
  'she',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'they',
  'this',
  'to',
  'was',
  'we',
  'were',
  'with',
  'you',
  'your',
  'yours',
];

function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
}

export function normalizeIgnoredWords(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeWord).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

export function parseIgnoredWordsInput(value: string): string[] {
  return normalizeIgnoredWords(value.split(/[\n,]+/));
}

export function ignoredWordsToText(values: string[]): string {
  return normalizeIgnoredWords(values).join(', ');
}

export function loadIgnoredWords(): string[] {
  const saved = localStorage.getItem(FREQUENT_WORDS_STORAGE_KEY);
  if (!saved) {
    return [...DEFAULT_IGNORED_WORDS];
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_IGNORED_WORDS];
    }

    return normalizeIgnoredWords(parsed);
  } catch {
    return [...DEFAULT_IGNORED_WORDS];
  }
}

export function saveIgnoredWords(values: string[]): string[] {
  const normalized = normalizeIgnoredWords(values);
  localStorage.setItem(FREQUENT_WORDS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function resetIgnoredWords(): string[] {
  localStorage.setItem(FREQUENT_WORDS_STORAGE_KEY, JSON.stringify(DEFAULT_IGNORED_WORDS));
  return [...DEFAULT_IGNORED_WORDS];
}
