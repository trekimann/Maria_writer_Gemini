import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  calculateFrequentWords,
  summarizeChapterStatistics,
  summarizeProjectStatistics,
} from './projectStatistics';

describe('projectStatistics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates frequent words in descending order with stable ties', () => {
    expect(calculateFrequentWords('beta alpha beta gamma alpha beta')).toEqual([
      { word: 'beta', count: 3 },
      { word: 'alpha', count: 2 },
      { word: 'gamma', count: 1 },
    ]);
  });

  it('filters ignored words out of frequent word summaries', () => {
    expect(calculateFrequentWords('the beta the alpha beta', ['the'])).toEqual([
      { word: 'beta', count: 2 },
      { word: 'alpha', count: 1 },
    ]);
  });

  it('summarizes a single chapter using clean editor text', () => {
    const summary = summarizeChapterStatistics({
      id: 'ch-1',
      title: 'Chapter One',
      content: '<p>Hello <span data-character-id="char-1">Maria</span> <u data-comment-id="c-1">world</u> hello</p>',
      order: 0,
      date: '09/03/2026 10:00:00',
      commentIds: ['c-1'],
      relatedEvents: ['event-1', 'event-2'],
      mentionedCharacters: ['char-1'],
    });

    expect(summary.wordCount).toBe(4);
    expect(summary.characterCount).toBe(23);
    expect(summary.readingTime).toBe('< 1 min');
    expect(summary.pageEstimate).toBe('1 page');
    expect(summary.commentCount).toBe(1);
    expect(summary.relatedEventCount).toBe(2);
    expect(summary.mentionedCharacterCount).toBe(1);
    expect(summary.excerpt).toBe('Hello Maria world hello');
    expect(summary.frequentWords.slice(0, 3)).toEqual([
      { word: 'hello', count: 2 },
      { word: 'maria', count: 1 },
      { word: 'world', count: 1 },
    ]);
  });

  it('summarizes a full project and sorts chapters by order', () => {
    const summary = summarizeProjectStatistics({
      meta: { title: 'Starfall', author: 'A', description: '', tags: [] },
      chapters: [
        {
          id: 'ch-2',
          title: 'Second',
          content: 'Three word chapter word',
          order: 2,
        },
        {
          id: 'ch-1',
          title: 'First',
          content: 'One two word',
          order: 1,
        },
      ],
    });

    expect(summary.title).toBe('Starfall');
    expect(summary.chapterCount).toBe(2);
    expect(summary.totalWordCount).toBe(7);
    expect(summary.totalCharacterCount).toBe('One two word'.length + 'Three word chapter word'.length);
    expect(summary.totalReadingTime).toBe('< 1 min');
    expect(summary.totalPageEstimate).toBe('1 page');
    expect(summary.chapters.map((chapter) => chapter.id)).toEqual(['ch-1', 'ch-2']);
    expect(summary.frequentWords.slice(0, 3)).toEqual([
      { word: 'word', count: 3 },
      { word: 'chapter', count: 1 },
      { word: 'one', count: 1 },
    ]);
  });

  it('applies ignored words to project and chapter summaries', () => {
    const summary = summarizeProjectStatistics({
      meta: { title: 'Filtered', author: 'A', description: '', tags: [] },
      chapters: [
        {
          id: 'ch-1',
          title: 'First',
          content: 'the the lantern lantern light',
          order: 0,
        },
      ],
    }, { ignoredWords: ['the'] });

    expect(summary.frequentWords).toEqual([
      { word: 'lantern', count: 2 },
      { word: 'light', count: 1 },
    ]);
    expect(summary.chapters[0].frequentWords).toEqual([
      { word: 'lantern', count: 2 },
      { word: 'light', count: 1 },
    ]);
  });
});
