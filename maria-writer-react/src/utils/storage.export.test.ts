import { describe, it, expect } from 'vitest';
import { exportFile } from './storage';
import { AppState } from '../types';
import { initialState } from '../context/StoreContext';
import { v4 as uuidv4 } from 'uuid';

describe('Storage - Export with Comments', () => {
  describe('exportFile', () => {
    it('should include comments in exported data', () => {
      const commentId = uuidv4();
      const chapterId = initialState.chapters[0].id;
      
      const stateWithComments: AppState = {
        ...initialState,
        comments: {
          [commentId]: {
            id: commentId,
            author: 'Export Test Author',
            text: 'This comment should be exported',
            timestamp: Date.now(),
            isSuggestion: false,
            isHidden: false,
            originalText: 'selected for export'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [commentId] }
            : c
        )
      };

      // Mock the download to capture the data
      let capturedData: string | null = null;
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName: string) {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          const originalSetAttribute = element.setAttribute.bind(element);
          element.setAttribute = function(name: string, value: string) {
            if (name === 'href' && value.startsWith('data:text/json')) {
              capturedData = decodeURIComponent(value.split(',')[1]);
            }
            return originalSetAttribute(name, value);
          };
          element.click = () => {}; // Prevent actual download
        }
        return element;
      };

      exportFile(stateWithComments, 'test-export');

      expect(capturedData).not.toBeNull();
      
      if (capturedData) {
        const parsed = JSON.parse(capturedData);
        expect(parsed.comments).toBeDefined();
        expect(parsed.comments[commentId]).toBeDefined();
        expect(parsed.comments[commentId].author).toBe('Export Test Author');
        expect(parsed.comments[commentId].text).toBe('This comment should be exported');
      }

      // Restore original createElement
      document.createElement = originalCreateElement;
    });

    it('should include chapter commentIds in exported data', () => {
      const comment1Id = 'comment-1';
      const comment2Id = 'comment-2';
      const chapterId = initialState.chapters[0].id;
      
      const stateWithComments: AppState = {
        ...initialState,
        comments: {
          [comment1Id]: {
            id: comment1Id,
            author: 'Author 1',
            text: 'Comment 1',
            timestamp: Date.now(),
            isSuggestion: false,
            isHidden: false,
            originalText: 'text 1'
          },
          [comment2Id]: {
            id: comment2Id,
            author: 'Author 2',
            text: 'Comment 2',
            timestamp: Date.now(),
            isSuggestion: true,
            replacementText: 'suggested text',
            isHidden: false,
            originalText: 'text 2'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [comment1Id, comment2Id] }
            : c
        )
      };

      let capturedData: string | null = null;
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName: string) {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          const originalSetAttribute = element.setAttribute.bind(element);
          element.setAttribute = function(name: string, value: string) {
            if (name === 'href' && value.startsWith('data:text/json')) {
              capturedData = decodeURIComponent(value.split(',')[1]);
            }
            return originalSetAttribute(name, value);
          };
          element.click = () => {};
        }
        return element;
      };

      exportFile(stateWithComments, 'test-export');

      expect(capturedData).not.toBeNull();
      
      if (capturedData) {
        const parsed = JSON.parse(capturedData);
        const chapter = parsed.chapters.find((c: any) => c.id === chapterId);
        expect(chapter.commentIds).toEqual([comment1Id, comment2Id]);
        
        // Verify both comments are present
        expect(parsed.comments[comment1Id]).toBeDefined();
        expect(parsed.comments[comment2Id]).toBeDefined();
        expect(parsed.comments[comment2Id].isSuggestion).toBe(true);
        expect(parsed.comments[comment2Id].replacementText).toBe('suggested text');
      }

      document.createElement = originalCreateElement;
    });

    it('should include version and export timestamp', () => {
      const stateWithComment: AppState = {
        ...initialState,
        comments: {
          'test-id': {
            id: 'test-id',
            author: 'Author',
            text: 'Comment',
            timestamp: Date.now(),
            isSuggestion: false,
            isHidden: false,
            originalText: 'text'
          }
        }
      };

      let capturedData: string | null = null;
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName: string) {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          const originalSetAttribute = element.setAttribute.bind(element);
          element.setAttribute = function(name: string, value: string) {
            if (name === 'href' && value.startsWith('data:text/json')) {
              capturedData = decodeURIComponent(value.split(',')[1]);
            }
            return originalSetAttribute(name, value);
          };
          element.click = () => {};
        }
        return element;
      };

      const beforeExport = Date.now();
      exportFile(stateWithComment, 'test-export');
      const afterExport = Date.now();

      expect(capturedData).not.toBeNull();
      
      if (capturedData) {
        const parsed = JSON.parse(capturedData);
        expect(parsed._version).toBeDefined();
        expect(parsed._exportedAt).toBeDefined();
        
        const exportTime = new Date(parsed._exportedAt).getTime();
        expect(exportTime).toBeGreaterThanOrEqual(beforeExport);
        expect(exportTime).toBeLessThanOrEqual(afterExport);
      }

      document.createElement = originalCreateElement;
    });

    it('should export all comment properties correctly', () => {
      const commentId = 'full-comment';
      const chapterId = initialState.chapters[0].id;
      
      const stateWithFullComment: AppState = {
        ...initialState,
        comments: {
          [commentId]: {
            id: commentId,
            author: 'Complete Author',
            text: 'Complete comment with all fields',
            timestamp: 1234567890123,
            isSuggestion: true,
            replacementText: 'This is the suggested replacement text',
            isHidden: true,
            originalText: 'Original selected text goes here'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [commentId] }
            : c
        )
      };

      let capturedData: string | null = null;
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName: string) {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          const originalSetAttribute = element.setAttribute.bind(element);
          element.setAttribute = function(name: string, value: string) {
            if (name === 'href' && value.startsWith('data:text/json')) {
              capturedData = decodeURIComponent(value.split(',')[1]);
            }
            return originalSetAttribute(name, value);
          };
          element.click = () => {};
        }
        return element;
      };

      exportFile(stateWithFullComment, 'test-export');

      expect(capturedData).not.toBeNull();
      
      if (capturedData) {
        const parsed = JSON.parse(capturedData);
        const comment = parsed.comments[commentId];
        
        expect(comment.id).toBe(commentId);
        expect(comment.author).toBe('Complete Author');
        expect(comment.text).toBe('Complete comment with all fields');
        expect(comment.timestamp).toBe(1234567890123);
        expect(comment.isSuggestion).toBe(true);
        expect(comment.replacementText).toBe('This is the suggested replacement text');
        expect(comment.isHidden).toBe(true);
        expect(comment.originalText).toBe('Original selected text goes here');
      }

      document.createElement = originalCreateElement;
    });
  });
});
