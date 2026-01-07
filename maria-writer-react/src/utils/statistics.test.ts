import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractCleanText, calculateWordCount, calculateCharacterCount, formatReadingTime } from './statistics';

describe('Statistics Utils', () => {
  beforeEach(() => {
    // Mock document.createElement for extractCleanText's entity decoding
    vi.spyOn(document, 'createElement').mockImplementation(() => {
        const div = {
            set innerHTML(val: string) { (this as any)._value = val; },
            get value() { 
                // Simple mock for decoding basic entities or just returning the text
                return (this as any)._value.replace(/&amp;/g, '&'); 
            }
        } as any;
        return div;
    });
  });

  describe('extractCleanText', () => {
    it('should remove comment markup', () => {
      const content = 'This is content with <u data-comment-id="1" class="comment">a comment</u> here.';
      expect(extractCleanText(content)).toBe('This is content with a comment here.');
    });

    it('should remove character mention markup', () => {
      const content = 'Hello <span data-character-id="123" class="character-mention">Maria</span> morning.';
      expect(extractCleanText(content)).toBe('Hello Maria morning.');
    });

    it('should remove general HTML tags', () => {
      const content = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> text.</p>';
      expect(extractCleanText(content)).toBe('TitleParagraph with bold text.');
    });

    it('should handle complex mixed content', () => {
      const content = '<h1>Summary</h1><p>By <span data-character-id="1">John</span> regarding <u data-comment-id="2">the secret</u> and <em>more</em>.</p>';
      expect(extractCleanText(content)).toBe('SummaryBy John regarding the secret and more.');
    });
  });

  describe('calculateWordCount', () => {
    it('should return 0 for empty string', () => {
      expect(calculateWordCount('')).toBe(0);
      expect(calculateWordCount('   ')).toBe(0);
    });

    it('should count words correctly', () => {
      expect(calculateWordCount('Hello world')).toBe(2);
      expect(calculateWordCount('One')).toBe(1);
      expect(calculateWordCount('  Multiple   spaces between   words  ')).toBe(4);
    });
  });

  describe('calculateCharacterCount', () => {
    it('should return 0 for empty string', () => {
      expect(calculateCharacterCount('')).toBe(0);
    });

    it('should count characters including spaces', () => {
      expect(calculateCharacterCount('Hello')).toBe(5);
      expect(calculateCharacterCount('Hello world')).toBe(11);
    });
  });

  describe('formatReadingTime', () => {
    it('should show 0 min for no words', () => {
      expect(formatReadingTime(0)).toBe('0 min');
    });

    it('should show < 1 min for very few words', () => {
      expect(formatReadingTime(5)).toBe('< 1 min');
    });

    it('should show range for moderate word counts', () => {
      // 200 words: 200/300 = 0.66 (1), 200/150 = 1.33 (2) -> 1-2 min
      expect(formatReadingTime(200)).toBe('1-2 min');
      
      // 500 words: 500/300 = 1.66 (2), 500/150 = 3.33 (4) -> 2-4 min
      expect(formatReadingTime(500)).toBe('2-4 min');
    });

    it('should show single value if min and max match', () => {
        // 150 words: 150/300 = 0.5 (1), 150/150 = 1 (1) -> 1 min
        expect(formatReadingTime(150)).toBe('1 min');
    });
  });
});
