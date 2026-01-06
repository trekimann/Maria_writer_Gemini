import { describe, it, expect } from 'vitest';
import {
  createCommentMarkup,
  removeCommentMarkup,
  replaceCommentText,
  applySuggestionToContent,
  hasOverlappingComments,
  wrapSelectionWithComment,
  updateCommentElementId
} from './editorComments';

describe('editorComments', () => {
  describe('createCommentMarkup', () => {
    it('should create correct markup for a comment', () => {
      const result = createCommentMarkup('comment-123', 'selected text');
      expect(result).toBe('<u data-comment-id="comment-123" class="comment">selected text</u>');
    });
  });

  describe('removeCommentMarkup', () => {
    it('should remove comment markup but keep the text', () => {
      const content = 'Before <u data-comment-id="c1" class="comment">commented text</u> after';
      const result = removeCommentMarkup(content, 'c1');
      expect(result).toBe('Before commented text after');
    });

    it('should handle multiple occurrences', () => {
      const content = '<u data-comment-id="c1" class="comment">first</u> and <u data-comment-id="c1" class="comment">second</u>';
      const result = removeCommentMarkup(content, 'c1');
      expect(result).toBe('first and second');
    });

    it('should not affect other comment IDs', () => {
      const content = '<u data-comment-id="c1" class="comment">first</u> and <u data-comment-id="c2" class="comment">second</u>';
      const result = removeCommentMarkup(content, 'c1');
      expect(result).toBe('first and <u data-comment-id="c2" class="comment">second</u>');
    });
  });

  describe('replaceCommentText', () => {
    it('should replace text within a comment tag', () => {
      const content = 'Before <u data-comment-id="c1" class="comment">old text</u> after';
      const result = replaceCommentText(content, 'c1', 'new text');
      expect(result).toBe('Before <u data-comment-id="c1" class="comment">new text</u> after');
    });

    it('should handle multiline content', () => {
      const content = '<u data-comment-id="c1" class="comment">line one\nline two</u>';
      const result = replaceCommentText(content, 'c1', 'replaced');
      expect(result).toBe('<u data-comment-id="c1" class="comment">replaced</u>');
    });
  });

  describe('applySuggestionToContent', () => {
    it('should replace entire comment tag with replacement text', () => {
      const content = 'Before <u data-comment-id="c1" class="comment">old text</u> after';
      const result = applySuggestionToContent(content, 'c1', 'new text');
      expect(result).toBe('Before new text after');
    });

    it('should handle complex markup', () => {
      const content = '<u data-comment-id="c1" class="comment suggestion">original</u>';
      const result = applySuggestionToContent(content, 'c1', 'replacement');
      expect(result).toBe('replacement');
    });
  });

  describe('hasOverlappingComments', () => {
    it('should detect overlapping comment tags', () => {
      expect(hasOverlappingComments('text with <u data-comment-id="c1">')).toBe(true);
      expect(hasOverlappingComments('text with </u> tag')).toBe(true);
      expect(hasOverlappingComments('plain text')).toBe(false);
    });
  });

  describe('wrapSelectionWithComment', () => {
    it('should return false if no range', () => {
      const mockSelection = {
        rangeCount: 0,
        getRangeAt: () => null
      } as unknown as Selection;
      
      const result = wrapSelectionWithComment(mockSelection, 'c1', false);
      expect(result).toBe(false);
    });
  });

  describe('updateCommentElementId', () => {
    it('should update comment element ID in DOM', () => {
      // Create a container with a comment element
      const container = document.createElement('div');
      container.innerHTML = '<u data-comment-id="old-id" class="comment pending">text</u>';
      
      const result = updateCommentElementId(container, 'old-id', 'new-id');
      
      expect(result).toBe(true);
      expect(container.innerHTML).toBe('<u data-comment-id="new-id" class="comment">text</u>');
    });

    it('should return false if element not found', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>no comment</p>';
      
      const result = updateCommentElementId(container, 'missing-id', 'new-id');
      expect(result).toBe(false);
    });
  });
});
