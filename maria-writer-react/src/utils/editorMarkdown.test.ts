import { describe, it, expect } from 'vitest';
import {
  createTurndownService,
  htmlToMarkdown,
  markdownToHtml,
  extractTitleFromMarkdown
} from './editorMarkdown';
import { StoryComment, Character } from '../types';

describe('editorMarkdown', () => {
  describe('createTurndownService', () => {
    it('should create a turndown service with custom rules', () => {
      const service = createTurndownService();
      expect(service).toBeDefined();
      expect(typeof service.turndown).toBe('function');
    });

    it('should preserve comment tags', () => {
      const service = createTurndownService();
      const html = '<p>text <u data-comment-id="c1" class="comment">commented</u> more</p>';
      const markdown = service.turndown(html);
      expect(markdown).toContain('<u data-comment-id="c1" class="comment">commented</u>');
    });

    it('should preserve character mentions', () => {
      const service = createTurndownService();
      const html = '<p>Hello <span data-character-id="ch1" data-character-name="Alice" class="character-mention">Alice</span></p>';
      const markdown = service.turndown(html);
      expect(markdown).toContain('data-character-id="ch1"');
      expect(markdown).toContain('data-character-name="Alice"');
    });
  });

  describe('htmlToMarkdown', () => {
    it('should convert HTML to markdown', () => {
      const service = createTurndownService();
      const html = '<h1>Title</h1><p>Paragraph</p>';
      const markdown = htmlToMarkdown(html, service);
      expect(markdown).toContain('# Title');
      expect(markdown).toContain('Paragraph');
    });
  });

  describe('markdownToHtml', () => {
const mockComments: StoryComment[] = [
    {
      id: 'c1',
      author: 'User',
      text: 'Comment text',
      timestamp: Date.now(),
      isSuggestion: false,
      isPreviewing: false,
      isHidden: false,
      originalText: 'original'
    }
  ];

  const mockCharacters: Character[] = [
    {
      id: 'ch1',
      name: 'Alice',
      description: '',
      color: '#ff0000',
      picture: '',
      tags: []
      }
    ];

    it('should convert markdown to sanitized HTML', () => {
      const markdown = '# Title\n\nParagraph';
      const html = markdownToHtml(markdown, [], [], 'preview');
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<p>Paragraph</p>');
    });

    it('should hide hidden comments', () => {
      const hiddenComment: StoryComment = { ...mockComments[0], isHidden: true };
      const markdown = '<u data-comment-id="c1" class="comment">hidden text</u>';
      const html = markdownToHtml(markdown, [hiddenComment], [], 'preview');
      expect(html).not.toContain('<u data-comment-id="c1"');
      expect(html).toContain('hidden text');
    });

    it('should inject character colors', () => {
      const markdown = '<span data-character-id="ch1" data-character-name="Alice" class="character-mention">Alice</span>';
      const html = markdownToHtml(markdown, [], mockCharacters, 'preview');
      expect(html).toContain('#ff0000');
      expect(html).toContain('background-color');
    });

    it('should return empty string for empty markdown', () => {
      const html = markdownToHtml('', [], [], 'preview');
      expect(html).toBe('');
    });
  });

  describe('extractTitleFromMarkdown', () => {
    it('should extract H1 title from markdown', () => {
      const markdown = '# My Title\n\nSome content';
      const title = extractTitleFromMarkdown(markdown);
      expect(title).toBe('My Title');
    });

    it('should return null if no H1', () => {
      const markdown = 'Just some text\n\n## H2 heading';
      const title = extractTitleFromMarkdown(markdown);
      expect(title).toBeNull();
    });

    it('should return null for empty H1', () => {
      const markdown = '#  \n\nContent';
      const title = extractTitleFromMarkdown(markdown);
      expect(title).toBeNull();
    });

    it('should handle H1 with trailing spaces', () => {
      const markdown = '#   Spaced Title   \n\nContent';
      const title = extractTitleFromMarkdown(markdown);
      expect(title).toBe('Spaced Title');
    });
  });
});
