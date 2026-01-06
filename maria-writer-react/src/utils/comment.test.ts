import { describe, it, expect } from 'vitest';
import { StoryComment } from '../types';

// Test utility to create a mock comment
export const createMockComment = (overrides?: Partial<StoryComment>): StoryComment => ({
  id: 'test-comment-id',
  author: 'Test Author',
  text: 'This is a test comment',
  timestamp: Date.now(),
  isSuggestion: false,
  isHidden: false,
  originalText: 'selected text',
  ...overrides
});

describe('Comment Utilities', () => {
  describe('createMockComment', () => {
    it('should create a comment with default values', () => {
      const comment = createMockComment();
      
      expect(comment.id).toBe('test-comment-id');
      expect(comment.author).toBe('Test Author');
      expect(comment.text).toBe('This is a test comment');
      expect(comment.isSuggestion).toBe(false);
      expect(comment.isHidden).toBe(false);
      expect(comment.originalText).toBe('selected text');
    });

    it('should override default values', () => {
      const comment = createMockComment({
        author: 'Different Author',
        isSuggestion: true,
        replacementText: 'replacement'
      });
      
      expect(comment.author).toBe('Different Author');
      expect(comment.isSuggestion).toBe(true);
      expect(comment.replacementText).toBe('replacement');
    });

    it('should have a valid timestamp', () => {
      const before = Date.now();
      const comment = createMockComment();
      const after = Date.now();
      
      expect(comment.timestamp).toBeGreaterThanOrEqual(before);
      expect(comment.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Comment Validation', () => {
    it('should validate required fields', () => {
      const comment = createMockComment();
      
      expect(comment.id).toBeDefined();
      expect(comment.author).toBeDefined();
      expect(comment.text).toBeDefined();
      expect(comment.timestamp).toBeDefined();
      expect(comment.originalText).toBeDefined();
    });

    it('should allow suggestion with replacement text', () => {
      const comment = createMockComment({
        isSuggestion: true,
        replacementText: 'suggested replacement'
      });
      
      expect(comment.isSuggestion).toBe(true);
      expect(comment.replacementText).toBe('suggested replacement');
    });

    it('should handle hidden comments', () => {
      const comment = createMockComment({ isHidden: true });
      
      expect(comment.isHidden).toBe(true);
    });
  });
});

describe('Comment Content Processing', () => {
  describe('Comment Span Insertion', () => {
    it('should create valid comment span HTML', () => {
      const commentId = 'comment-123';
      const originalText = 'highlighted text';
      const span = `<span class="maria-comment" data-comment-id="${commentId}">${originalText}</span>`;
      
      expect(span).toContain('maria-comment');
      expect(span).toContain(`data-comment-id="${commentId}"`);
      expect(span).toContain(originalText);
    });

    it('should insert comment span at correct position', () => {
      const before = 'Text before ';
      const selected = 'selected text';
      const after = ' text after';
      const commentId = 'comment-123';
      
      const result = `${before}<span class="maria-comment" data-comment-id="${commentId}">${selected}</span>${after}`;
      
      expect(result).toBe('Text before <span class="maria-comment" data-comment-id="comment-123">selected text</span> text after');
    });
  });

  describe('Comment Span Removal', () => {
    it('should remove comment span but keep text', () => {
      const content = 'Before <span class="maria-comment" data-comment-id="comment-123">highlighted</span> after';
      const commentId = 'comment-123';
      const regex = new RegExp(`<span class="maria-comment" data-comment-id="${commentId}">(.*?)</span>`, 'g');
      const result = content.replace(regex, '$1');
      
      expect(result).toBe('Before highlighted after');
    });

    it('should handle multiple comment spans', () => {
      const content = '<span class="maria-comment" data-comment-id="1">first</span> and <span class="maria-comment" data-comment-id="2">second</span>';
      const result = content
        .replace(/<span class="maria-comment" data-comment-id="1">(.*?)<\/span>/g, '$1')
        .replace(/<span class="maria-comment" data-comment-id="2">(.*?)<\/span>/g, '$1');
      
      expect(result).toBe('first and second');
    });
  });

  describe('Suggestion Replacement', () => {
    it('should replace original text with suggestion', () => {
      const content = '<span class="maria-comment" data-comment-id="comment-123">original text</span>';
      const commentId = 'comment-123';
      const replacement = 'suggested text';
      const regex = new RegExp(`<span class="maria-comment" data-comment-id="${commentId}">(.*?)</span>`, 'g');
      const result = content.replace(
        regex,
        `<span class="maria-comment maria-suggestion-active" data-comment-id="${commentId}">${replacement}</span>`
      );
      
      expect(result).toContain('maria-suggestion-active');
      expect(result).toContain('suggested text');
      expect(result).not.toContain('original text');
    });
  });
});

describe('Comment Sorting and Filtering', () => {
  it('should sort comments by timestamp descending', () => {
    const comments = [
      createMockComment({ id: '1', timestamp: 1000 }),
      createMockComment({ id: '2', timestamp: 3000 }),
      createMockComment({ id: '3', timestamp: 2000 })
    ];
    
    const sorted = [...comments].sort((a, b) => b.timestamp - a.timestamp);
    
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });

  it('should filter hidden comments', () => {
    const comments = [
      createMockComment({ id: '1', isHidden: false }),
      createMockComment({ id: '2', isHidden: true }),
      createMockComment({ id: '3', isHidden: false })
    ];
    
    const visible = comments.filter(c => !c.isHidden);
    
    expect(visible).toHaveLength(2);
    expect(visible.map(c => c.id)).toEqual(['1', '3']);
  });

  it('should filter suggestions', () => {
    const comments = [
      createMockComment({ id: '1', isSuggestion: false }),
      createMockComment({ id: '2', isSuggestion: true }),
      createMockComment({ id: '3', isSuggestion: true })
    ];
    
    const suggestions = comments.filter(c => c.isSuggestion);
    
    expect(suggestions).toHaveLength(2);
    expect(suggestions.map(c => c.id)).toEqual(['2', '3']);
  });
});

describe('Comment Data Integrity', () => {
  it('should preserve all comment fields through JSON serialization', () => {
    const comment = createMockComment({
      author: 'John Doe',
      text: 'Important feedback',
      isSuggestion: true,
      replacementText: 'Better text',
      isHidden: false,
      originalText: 'Original text here'
    });
    
    const serialized = JSON.stringify(comment);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized).toEqual(comment);
  });

  it('should handle special characters in comment text', () => {
    const specialChars = 'Text with "quotes", <brackets>, & ampersands';
    const comment = createMockComment({
      text: specialChars,
      originalText: specialChars
    });
    
    expect(comment.text).toBe(specialChars);
    expect(comment.originalText).toBe(specialChars);
  });

  it('should handle empty replacement text for non-suggestions', () => {
    const comment = createMockComment({
      isSuggestion: false,
      replacementText: undefined
    });
    
    expect(comment.isSuggestion).toBe(false);
    expect(comment.replacementText).toBeUndefined();
  });
});
