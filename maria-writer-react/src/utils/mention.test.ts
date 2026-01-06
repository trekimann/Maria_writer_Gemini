import { describe, it, expect } from 'vitest';
import { findCharacterMentions, extractMentionedCharacterIds } from './mention';
import { Chapter, Character } from '../types';

describe('findCharacterMentions', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Maria',
    color: '#ff0000',
    description: '',
    tags: []
  };

  const mockChapters: Chapter[] = [
    {
      id: 'chap-1',
      title: 'Chapter One',
      content: 'Hello world. <span data-character-id="char-1">Maria</span> was here.',
      order: 0
    },
    {
      id: 'chap-2',
      title: 'Chapter Two',
      content: 'No mentions here.',
      order: 1
    },
    {
      id: 'chap-3',
      title: 'Chapter Three',
      content: 'Another mention of <span class="mention" data-character-id="char-1">Maria</span> later.',
      order: 2
    }
  ];

  it('should find all mentions in chapters', () => {
    const mentions = findCharacterMentions(mockChapters, mockCharacter);
    expect(mentions).toHaveLength(2);
    expect(mentions[0].chapterTitle).toBe('Chapter One');
    expect(mentions[1].chapterTitle).toBe('Chapter Three');
  });

  it('should generate excerpts with highlights', () => {
    const mentions = findCharacterMentions(mockChapters, mockCharacter);
    expect(mentions[0].excerpt).toContain('<mark class="mention-highlight"');
    expect(mentions[0].excerpt).toContain('style="background-color: #ff000025; color: #ff0000"');
    expect(mentions[0].excerpt).toContain('Maria</mark>');
  });

  it('should handle special HTML entities in content', () => {
    const complexChapter: Chapter = {
      id: 'chap-4',
      title: 'Complex',
      content: '<p>Some text</p> <span data-character-id="char-1">Maria</span> <p>More text</p>',
      order: 3
    };
    const mentions = findCharacterMentions([complexChapter], mockCharacter);
    expect(mentions).toHaveLength(1);
    // Should strip <p> tags
    expect(mentions[0].excerpt).not.toContain('<p>');
    expect(mentions[0].excerpt).toContain('Some text');
  });

  it('should return empty array if no mentions found', () => {
    const mentions = findCharacterMentions([mockChapters[1]], mockCharacter);
    expect(mentions).toHaveLength(0);
  });
});

describe('extractMentionedCharacterIds', () => {
  it('should extract single character ID', () => {
    const content = 'Some text <span data-character-id="char-1">Name</span> more text';
    expect(extractMentionedCharacterIds(content)).toEqual(['char-1']);
  });

  it('should extract multiple unique character IDs', () => {
    const content = `
      <span data-character-id="char-1">A</span>
      <span data-character-id="char-2">B</span>
      <span data-character-id="char-1">A again</span>
    `;
    const ids = extractMentionedCharacterIds(content);
    expect(ids).toHaveLength(2);
    expect(ids).toContain('char-1');
    expect(ids).toContain('char-2');
  });

  it('should handle unescaping &quot;', () => {
    const content = '<span data-character-id=&quot;char-with-quotes&quot;>Name</span>';
    expect(extractMentionedCharacterIds(content)).toEqual(['char-with-quotes']);
  });

  it('should return empty array for no mentions', () => {
    expect(extractMentionedCharacterIds('Plain text')).toEqual([]);
    expect(extractMentionedCharacterIds('')).toEqual([]);
  });
});
