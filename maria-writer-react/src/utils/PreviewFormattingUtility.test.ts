import { describe, it, expect } from 'vitest';
import { stripFormattingMarkup, getCleanPreviewContent } from './PreviewFormattingUtility';

describe('PreviewFormattingUtility', () => {
  describe('stripFormattingMarkup', () => {
    it('should strip comment markup', () => {
      const input = '<u data-comment-id="123" class="comment">This is a comment</u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('This is a comment');
    });

    it('should strip character mention markup', () => {
      const input = '<span data-character-id="456" data-character-name="John" class="character-mention">John</span>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('John');
    });

    it('should strip event marker markup', () => {
      const input = '<span data-event-id="789" class="event-marker">Event text</span>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Event text');
    });

    it('should strip pending event marker markup', () => {
      const input = '<span data-event-id="789" data-event-pending="true" class="event-marker">Pending event</span>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Pending event');
    });

    it('should handle nested formatting - character inside comment', () => {
      const input = '<u data-comment-id="123"><span data-character-id="456">John</span> said something</u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('John said something');
    });

    it('should handle nested formatting - event inside comment', () => {
      const input = '<u data-comment-id="123">Text with <span data-event-id="789">an event</span> inside</u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Text with an event inside');
    });

    it('should handle nested formatting - multiple characters in comment', () => {
      const input = '<u data-comment-id="123"><span data-character-id="1">Alice</span> met <span data-character-id="2">Bob</span></u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Alice met Bob');
    });

    it('should handle complex nested formatting - all types combined', () => {
      const input = '<u data-comment-id="123"><span data-character-id="1">Alice</span> attended <span data-event-id="789">the meeting</span> with <span data-character-id="2">Bob</span></u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Alice attended the meeting with Bob');
    });

    it('should preserve regular HTML tags', () => {
      const input = '<p>This is <strong>bold</strong> and <em>italic</em></p>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('<p>This is <strong>bold</strong> and <em>italic</em></p>');
    });

    it('should handle text with multiple comments', () => {
      const input = '<u data-comment-id="1">First comment</u> and <u data-comment-id="2">second comment</u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('First comment and second comment');
    });

    it('should handle text with multiple character mentions', () => {
      const input = '<span data-character-id="1">Alice</span> and <span data-character-id="2">Bob</span> and <span data-character-id="3">Charlie</span>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Alice and Bob and Charlie');
    });

    it('should handle markdown with formatting mixed in', () => {
      const input = '# Title\n\n<u data-comment-id="123">Comment in <span data-character-id="1">markdown</span></u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('# Title\n\nComment in markdown');
    });

    it('should return empty string for empty input', () => {
      const result = stripFormattingMarkup('');
      expect(result).toBe('');
    });

    it('should handle plain text without any markup', () => {
      const input = 'Just plain text';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Just plain text');
    });

    it('should handle adjacent formatting elements', () => {
      const input = '<u data-comment-id="1">Comment</u><span data-character-id="2">Name</span><span data-event-id="3">Event</span>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('CommentNameEvent');
    });

    it('should preserve whitespace correctly', () => {
      const input = '<u data-comment-id="1">Text with   spaces</u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Text with   spaces');
    });

    it('should handle deeply nested structures', () => {
      const input = '<u data-comment-id="1">Level 1 <u data-comment-id="2">Level 2 <span data-character-id="3">Level 3</span></u></u>';
      const result = stripFormattingMarkup(input);
      expect(result).toBe('Level 1 Level 2 Level 3');
    });
  });

  describe('getCleanPreviewContent', () => {
    it('should strip formatting and convert markdown to HTML', () => {
      const input = '# Title\n\n<u data-comment-id="123">Comment with <span data-character-id="1">Character</span></u>';
      const mockMarkdownToHtml = (markdown: string) => {
        // Simple mock that just returns the input wrapped in a div
        return `<div>${markdown}</div>`;
      };
      
      const result = getCleanPreviewContent(input, mockMarkdownToHtml);
      expect(result).toBe('<div># Title\n\nComment with Character</div>');
    });

    it('should handle empty content', () => {
      const mockMarkdownToHtml = (markdown: string) => markdown;
      const result = getCleanPreviewContent('', mockMarkdownToHtml);
      expect(result).toBe('');
    });

    it('should pass cleaned content to markdown converter', () => {
      const input = '<span data-character-id="1">Test</span>';
      let passedContent = '';
      const mockMarkdownToHtml = (markdown: string) => {
        passedContent = markdown;
        return markdown;
      };
      
      getCleanPreviewContent(input, mockMarkdownToHtml);
      expect(passedContent).toBe('Test');
    });
  });
});
