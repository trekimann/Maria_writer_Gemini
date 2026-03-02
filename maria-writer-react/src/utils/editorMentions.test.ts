import { describe, it, expect } from 'vitest';
import {
  createMentionMarkup,
  filterCharactersByQuery,
  detectMentionInTextarea,
  getTextareaMentionPosition,
  findCharactersInPlainText,
  autoTagCharacters
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

  describe('findCharactersInPlainText', () => {
    it('should find characters in plain text', () => {
      const text = 'Alice and Bob went to the market.';
      const result = findCharactersInPlainText(text, mockCharacters);
      expect(result).toContain('c1');
      expect(result).toContain('c2');
      expect(result).not.toContain('c3');
    });

    it('should match full names with punctuation', () => {
      const text = '"Alice!" he shouted.';
      const result = findCharactersInPlainText(text, mockCharacters);
      expect(result).toContain('c1');
    });

    it('should not match partial words', () => {
      const text = 'Alice wonderland bobby';
      const result = findCharactersInPlainText(text, mockCharacters);
      expect(result).toContain('c1');
      expect(result).not.toContain('c2'); // bobby != Bob
    });

    it('detects possessive with straight apostrophe: "Alice\'s"', () => {
      const text = "Alice's hat was red.";
      const result = findCharactersInPlainText(text, mockCharacters);
      expect(result).toContain('c1');
    });

    it('detects possessive with smart/curly apostrophe: \u201cAlice\u2019s\u201d', () => {
      const text = 'Alice\u2019s hat was red.';
      const result = findCharactersInPlainText(text, mockCharacters);
      expect(result).toContain('c1');
    });

    it('detects possessive at the start of text', () => {
      const text = "Bob's horse galloped away.";
      const result = findCharactersInPlainText(text, mockCharacters);
      expect(result).toContain('c2');
    });

    it('detects possessive mid-sentence with smart apostrophe', () => {
      const text = 'He borrowed Bob\u2019s sword.';
      const result = findCharactersInPlainText(text, mockCharacters);
      expect(result).toContain('c2');
    });
  });

  describe('autoTagCharacters', () => {
    it('wraps a bare character name in a mention span', () => {
      const html = '<p>Alice walked in.</p>';
      const result = autoTagCharacters(html, mockCharacters);
      expect(result).toContain('data-character-id="c1"');
      expect(result).toContain('class="character-mention"');
    });

    it('wraps possessive with straight apostrophe: "Alice\'s"', () => {
      const html = "<p>Alice's hat was red.</p>";
      const result = autoTagCharacters(html, mockCharacters);
      expect(result).toContain('data-character-id="c1"');
      // The span should include the full possessive text
      expect(result).toContain("Alice's");
    });

    it('wraps possessive with smart/curly apostrophe: \u201cAlice\u2019s\u201d', () => {
      const html = '<p>Alice\u2019s hat was red.</p>';
      const result = autoTagCharacters(html, mockCharacters);
      expect(result).toContain('data-character-id="c1"');
      expect(result).toContain('Alice\u2019s');
    });

    it('wraps possessive at the start of the paragraph', () => {
      const html = "<p>Bob's horse galloped away.</p>";
      const result = autoTagCharacters(html, mockCharacters);
      expect(result).toContain('data-character-id="c2"');
    });

    it('wraps possessive with smart apostrophe mid-sentence', () => {
      const html = '<p>He borrowed Bob\u2019s sword.</p>';
      const result = autoTagCharacters(html, mockCharacters);
      expect(result).toContain('data-character-id="c2"');
    });

    it('does not double-wrap an already-tagged mention', () => {
      const html = '<p><span class="character-mention" data-character-id="c1" data-character-name="Alice" contenteditable="false">Alice</span> walked in.</p>';
      const result = autoTagCharacters(html, mockCharacters);
      // Exactly one mention span for Alice — no double-wrapping
      const matches = result.match(/data-character-id="c1"/g);
      expect(matches).toHaveLength(1);
    });

    it('does not match partial word substrings (Bob inside Bobby)', () => {
      const html = '<p>Bobby ran past.</p>';
      const result = autoTagCharacters(html, mockCharacters);
      expect(result).not.toContain('data-character-id="c2"');
    });

    it('handles multiple characters in the same paragraph', () => {
      const html = "<p>Alice met Bob's cat.</p>";
      const result = autoTagCharacters(html, mockCharacters);
      expect(result).toContain('data-character-id="c1"');
      expect(result).toContain('data-character-id="c2"');
    });

    it('handles nicknames with possessive', () => {
      const charWithNick: Character[] = [{
        id: 'cn1',
        name: 'Nicholas',
        description: '',
        color: '',
        picture: '',
        tags: [],
        nicknames: ['Nick'],
      }];
      const html = "<p>Nick's sword was sharp.</p>";
      const result = autoTagCharacters(html, charWithNick);
      expect(result).toContain('data-character-id="cn1"');
    });

    it('handles nicknames with smart apostrophe possessive', () => {
      const charWithNick: Character[] = [{
        id: 'cn1',
        name: 'Nicholas',
        description: '',
        color: '',
        picture: '',
        tags: [],
        nicknames: ['Nick'],
      }];
      const html = '<p>Nick\u2019s sword was sharp.</p>';
      const result = autoTagCharacters(html, charWithNick);
      expect(result).toContain('data-character-id="cn1"');
    });

    it('returns unchanged HTML when no characters match', () => {
      const html = '<p>The sky was blue.</p>';
      const result = autoTagCharacters(html, mockCharacters);
      expect(result).toBe(html);
    });
  });
});
