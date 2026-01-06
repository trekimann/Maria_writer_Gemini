import { describe, it, expect } from 'vitest';
import {
  applyTextareaFormatting,
  applyContentEditableFormatting
} from './editorFormatting';

describe('editorFormatting', () => {
  describe('applyTextareaFormatting', () => {
    it('should apply bold formatting', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello world';
      textarea.selectionStart = 0;
      textarea.selectionEnd = 5;

      const result = applyTextareaFormatting(textarea, 'bold');
      expect(result.success).toBe(true);
      expect(result.newContent).toBe('**Hello** world');
    });

    it('should apply italic formatting', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello world';
      textarea.selectionStart = 6;
      textarea.selectionEnd = 11;

      const result = applyTextareaFormatting(textarea, 'italic');
      expect(result.success).toBe(true);
      expect(result.newContent).toBe('Hello *world*');
    });

    it('should apply underline formatting', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello world';
      textarea.selectionStart = 0;
      textarea.selectionEnd = 5;

      const result = applyTextareaFormatting(textarea, 'underline');
      expect(result.success).toBe(true);
      expect(result.newContent).toBe('__Hello__ world');
    });

    it('should apply heading formatting', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Title';
      textarea.selectionStart = 0;
      textarea.selectionEnd = 5;

      const result = applyTextareaFormatting(textarea, 'heading1');
      expect(result.success).toBe(true);
      expect(result.newContent).toBe('# Title');

      const result2 = applyTextareaFormatting(textarea, 'heading2');
      expect(result2.newContent).toBe('## Title');
    });

    it('should return original content for unknown format', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello world';
      textarea.selectionStart = 0;
      textarea.selectionEnd = 5;

      const result = applyTextareaFormatting(textarea, 'unknown');
      expect(result.success).toBe(false);
      expect(result.newContent).toBe('Hello world');
    });

    it('should handle empty selection', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello world';
      textarea.selectionStart = 5;
      textarea.selectionEnd = 5;

      const result = applyTextareaFormatting(textarea, 'bold');
      expect(result.success).toBe(true);
      expect(result.newContent).toBe('Hello**** world');
    });
  });

  describe('applyContentEditableFormatting', () => {
    it('should return false when no selection', () => {
      window.getSelection = () => null;
      const result = applyContentEditableFormatting('bold');
      expect(result).toBe(false);
    });

    it('should return false when no range', () => {
      window.getSelection = () => ({
        rangeCount: 0
      } as unknown as Selection);
      const result = applyContentEditableFormatting('bold');
      expect(result).toBe(false);
    });
  });
});
