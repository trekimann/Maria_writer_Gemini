import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_IGNORED_WORDS,
  FREQUENT_WORDS_STORAGE_KEY,
  ignoredWordsToText,
  loadIgnoredWords,
  normalizeIgnoredWords,
  parseIgnoredWordsInput,
  resetIgnoredWords,
  saveIgnoredWords,
} from './frequentWordSettings';

describe('frequentWordSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads the default ignored words when no custom list exists', () => {
    expect(loadIgnoredWords()).toEqual(DEFAULT_IGNORED_WORDS);
  });

  it('normalizes and persists custom ignored words', () => {
    expect(saveIgnoredWords([' The ', 'and', 'custom', 'custom'])).toEqual(['and', 'custom', 'the']);
    expect(JSON.parse(localStorage.getItem(FREQUENT_WORDS_STORAGE_KEY) ?? '[]')).toEqual(['and', 'custom', 'the']);
  });

  it('parses textarea input into a normalized ignore list', () => {
    expect(parseIgnoredWordsInput('the, and\nCustom\ncustom')).toEqual(['and', 'custom', 'the']);
    expect(ignoredWordsToText(['custom', 'the', 'and'])).toBe('and, custom, the');
    expect(normalizeIgnoredWords(['', '  ', 'A', 'a'])).toEqual(['a']);
  });

  it('resets to the built-in default list', () => {
    saveIgnoredWords(['custom']);
    expect(resetIgnoredWords()).toEqual(DEFAULT_IGNORED_WORDS);
    expect(loadIgnoredWords()).toEqual(DEFAULT_IGNORED_WORDS);
  });
});
