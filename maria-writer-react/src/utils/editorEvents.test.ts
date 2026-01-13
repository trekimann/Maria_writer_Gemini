import { describe, it, expect } from 'vitest';
import { createEventMarkup, removeEventMarkup, finalizeEventMarkup } from './editorEvents';

describe('editorEvents', () => {
  describe('createEventMarkup', () => {
    it('should create correct event markup', () => {
      const markup = createEventMarkup('evt-123', 'Important Moment');
      expect(markup).toBe('<span data-event-id="evt-123" class="event-marker">Important Moment</span>');
    });

    it('should create pending event markup', () => {
      const markup = createEventMarkup('evt-123', 'Important Moment', true);
      expect(markup).toContain('data-event-pending="true"');
      expect(markup).toContain('class="event-marker"');
    });
  });

  describe('finalizeEventMarkup', () => {
    it('should remove pending attribute', () => {
      const pendingHtml = '<span data-event-id="evt-123" data-event-pending="true" class="event-marker">Text</span>';
      const finalized = finalizeEventMarkup(pendingHtml, 'evt-123');
      expect(finalized).not.toContain('data-event-pending');
      expect(finalized).toContain('data-event-id="evt-123"');
      expect(finalized).toContain('class="event-marker"');
    });

    it('should not affect normal events', () => {
      const normalHtml = '<span data-event-id="evt-123" class="event-marker">Text</span>';
      const result = finalizeEventMarkup(normalHtml, 'evt-123');
      expect(result).toBe(normalHtml);
    });
  });

  describe('removeEventMarkup', () => {
    it('should remove event span but keep text', () => {
      const html = 'Before <span data-event-id="evt-123" class="event-marker">Event Text</span> After';
      const result = removeEventMarkup(html, 'evt-123');
      expect(result).toBe('Before Event Text After');
    });
  });
});
