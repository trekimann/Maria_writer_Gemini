import { describe, it, expect } from 'vitest';
import {
  createMentionMarkup,
  filterCharactersByQuery,
  detectMentionInTextarea,
  getTextareaMentionPosition
} from './editorMentions';
import { Character } from '../types';

describe('editorMentions', () => {
  const mockCharacters: Character[] = [
    {
      id: 'c1',
      name: 'Alice',
      description: '',
      color: '',
      picture: '',
      tags: []
    },
    {
      id: 'c2',
      name: 'Bob',
      description: '',
      color: '',
      picture: '',
      tags: []
    },
    {
      id: 'c3',
      name: 'Charlie',
      description: '',
      color: '',
      picture: '',
      tags: []
    }
  ];

  describe('createMentionMarkup', () => {
    it('should create correct mention markup', () => {
      const character = mockCharacters[0];
      const markup = createMentionMarkup(character);
      expect(markup).toBe('<span data-character-id="c1" data-character-name="Alice" class="character-mention">Alice</span>');
    });
  });

  describe('filterCharactersByQuery', () => {
    it('should filter characters by name case-insensitively', () => {
      const result = filterCharactersByQuery(mockCharacters, 'ali');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
    });

    it('should return all characters for empty query', () => {
      const result = filterCharactersByQuery(mockCharacters, '');
      expect(result).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const result = filterCharactersByQuery(mockCharacters, 'xyz');
      expect(result).toHaveLength(0);
    });

    it('should match partial names', () => {
      const result = filterCharactersByQuery(mockCharacters, 'b');
      expect(result).toHaveLength(1); // Only Bob contains 'b'
      expect(result[0].name).toBe('Bob');
    });
  });

  describe('detectMentionInTextarea', () => {
    it('should detect @ mention before cursor', () => {
      const text = 'Hello @ali';
      const result = detectMentionInTextarea(text, 10);
      expect(result).not.toBeNull();
      expect(result?.query).toBe('ali');
      expect(result?.startIndex).toBe(6);
    });

    it('should return null if no @ before cursor', () => {
      const text = 'Hello world';
      const result = detectMentionInTextarea(text, 11);
      expect(result).toBeNull();
    });

    it('should return null if space after @', () => {
      const text = 'Hello @ world';
      const result = detectMentionInTextarea(text, 13);
      expect(result).toBeNull();
    });

    it('should detect empty query right after @', () => {
      const text = 'Hello @';
      const result = detectMentionInTextarea(text, 7);
      expect(result).not.toBeNull();
      expect(result?.query).toBe('');
      expect(result?.startIndex).toBe(6);
    });

    it('should detect mention with special characters', () => {
      const text = 'Text @query-123';
      const result = detectMentionInTextarea(text, 15);
      expect(result).not.toBeNull();
      expect(result?.query).toBe('query-123');
    });
  });

  describe('getTextareaMentionPosition', () => {
    it('should return approximate position for textarea', () => {
      // Create a mock textarea
      const textarea = document.createElement('textarea');
      textarea.getBoundingClientRect = () => ({
        left: 100,
        top: 200,
        right: 400,
        bottom: 250,
        width: 300,
        height: 50,
        x: 100,
        y: 200,
        toJSON: () => ({})
      });

      const position = getTextareaMentionPosition(textarea);
      expect(position.x).toBe(120); // left + 20
      expect(position.y).toBe(250); // top + 50
    });
  });
});
