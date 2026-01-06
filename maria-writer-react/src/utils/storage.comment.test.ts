import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveToLocal, loadFromLocal } from './storage';
import { AppState } from '../types';
import { initialState } from '../context/StoreContext';
import { v4 as uuidv4 } from 'uuid';

describe('Storage - Comment Persistence', () => {
  const STORAGE_KEY = 'maria_autosave';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveToLocal with comments', () => {
    it('should save comments to localStorage', () => {
      const commentId = uuidv4();
      const chapterId = initialState.chapters[0].id;
      
      const stateWithComment: AppState = {
        ...initialState,
        comments: {
          [commentId]: {
            id: commentId,
            author: 'Test Author',
            text: 'Test comment',
            timestamp: Date.now(),
            isSuggestion: false,
            isHidden: false,
            originalText: 'selected text'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [commentId] }
            : c
        )
      };

      saveToLocal(stateWithComment);

      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.comments).toBeDefined();
      expect(parsed.comments[commentId]).toBeDefined();
      expect(parsed.comments[commentId].author).toBe('Test Author');
    });

    it('should save suggestion comments with replacement text', () => {
      const commentId = 'suggestion-1';
      const chapterId = initialState.chapters[0].id;
      
      const stateWithSuggestion: AppState = {
        ...initialState,
        comments: {
          [commentId]: {
            id: commentId,
            author: 'Editor',
            text: 'Better wording',
            timestamp: Date.now(),
            isSuggestion: true,
            replacementText: 'improved text here',
            isHidden: false,
            originalText: 'old text here'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [commentId] }
            : c
        )
      };

      saveToLocal(stateWithSuggestion);

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);
      
      expect(parsed.comments[commentId].isSuggestion).toBe(true);
      expect(parsed.comments[commentId].replacementText).toBe('improved text here');
    });

    it('should save hidden comment state', () => {
      const commentId = 'hidden-comment';
      const chapterId = initialState.chapters[0].id;
      
      const stateWithHiddenComment: AppState = {
        ...initialState,
        comments: {
          [commentId]: {
            id: commentId,
            author: 'Author',
            text: 'Hidden comment',
            timestamp: Date.now(),
            isSuggestion: false,
            isHidden: true,
            originalText: 'text'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [commentId] }
            : c
        )
      };

      saveToLocal(stateWithHiddenComment);

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);
      
      expect(parsed.comments[commentId].isHidden).toBe(true);
    });

    it('should save chapter commentIds array', () => {
      const commentId1 = 'comment-1';
      const commentId2 = 'comment-2';
      const chapterId = initialState.chapters[0].id;
      
      const stateWithComments: AppState = {
        ...initialState,
        comments: {
          [commentId1]: {
            id: commentId1,
            author: 'Author 1',
            text: 'Comment 1',
            timestamp: Date.now(),
            isSuggestion: false,
            isHidden: false,
            originalText: 'text 1'
          },
          [commentId2]: {
            id: commentId2,
            author: 'Author 2',
            text: 'Comment 2',
            timestamp: Date.now(),
            isSuggestion: false,
            isHidden: false,
            originalText: 'text 2'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [commentId1, commentId2] }
            : c
        )
      };

      saveToLocal(stateWithComments);

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);
      
      const chapter = parsed.chapters.find((c: any) => c.id === chapterId);
      expect(chapter.commentIds).toEqual([commentId1, commentId2]);
    });

    it('should save multiple chapters with different comments', () => {
      const comment1Id = 'c1-comment';
      const comment2Id = 'c2-comment';
      
      // Add a second chapter
      let state = { ...initialState };
      const newChapterId = uuidv4();
      state.chapters = [
        ...state.chapters,
        {
          id: newChapterId,
          title: 'Chapter 2',
          content: '',
          order: 1,
          commentIds: [comment2Id]
        }
      ];

      state.comments = {
        [comment1Id]: {
          id: comment1Id,
          author: 'Author 1',
          text: 'Chapter 1 comment',
          timestamp: Date.now(),
          isSuggestion: false,
          isHidden: false,
          originalText: 'text 1'
        },
        [comment2Id]: {
          id: comment2Id,
          author: 'Author 2',
          text: 'Chapter 2 comment',
          timestamp: Date.now(),
          isSuggestion: false,
          isHidden: false,
          originalText: 'text 2'
        }
      };

      state.chapters[0].commentIds = [comment1Id];

      saveToLocal(state);

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);
      
      expect(Object.keys(parsed.comments)).toHaveLength(2);
      expect(parsed.chapters[0].commentIds).toContain(comment1Id);
      expect(parsed.chapters[1].commentIds).toContain(comment2Id);
    });
  });

  describe('loadFromLocal with comments', () => {
    it('should load comments from localStorage', () => {
      const commentId = 'test-comment';
      const chapterId = 'chapter-id';
      
      const savedState = {
        ...initialState,
        comments: {
          [commentId]: {
            id: commentId,
            author: 'Saved Author',
            text: 'Saved comment',
            timestamp: 1234567890,
            isSuggestion: false,
            isHidden: false,
            originalText: 'saved text'
          }
        },
        chapters: [{
          id: chapterId,
          title: 'Chapter',
          content: 'Content',
          order: 0,
          commentIds: [commentId]
        }]
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));

      const loaded = loadFromLocal();
      
      expect(loaded).not.toBeNull();
      expect(loaded!.comments).toBeDefined();
      expect(loaded!.comments![commentId]).toBeDefined();
      expect(loaded!.comments![commentId].author).toBe('Saved Author');
    });

    it('should load suggestion comments correctly', () => {
      const commentId = 'suggestion-id';
      
      const savedState = {
        ...initialState,
        comments: {
          [commentId]: {
            id: commentId,
            author: 'Editor',
            text: 'Suggestion text',
            timestamp: Date.now(),
            isSuggestion: true,
            replacementText: 'replacement',
            isHidden: false,
            originalText: 'original'
          }
        }
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));

      const loaded = loadFromLocal();
      
      expect(loaded!.comments![commentId].isSuggestion).toBe(true);
      expect(loaded!.comments![commentId].replacementText).toBe('replacement');
    });

    it('should load chapter commentIds arrays', () => {
      const chapterId = 'chapter-id';
      const commentIds = ['comment-1', 'comment-2', 'comment-3'];
      
      const savedState = {
        ...initialState,
        chapters: [{
          id: chapterId,
          title: 'Chapter',
          content: 'Content',
          order: 0,
          commentIds: commentIds
        }]
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));

      const loaded = loadFromLocal();
      
      expect(loaded!.chapters![0].commentIds).toEqual(commentIds);
    });

    it('should handle missing commentIds gracefully', () => {
      const savedState = {
        ...initialState,
        chapters: [{
          id: 'chapter-id',
          title: 'Chapter',
          content: 'Content',
          order: 0
          // No commentIds property
        }]
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));

      const loaded = loadFromLocal();
      
      expect(loaded).not.toBeNull();
      expect(loaded!.chapters![0]).toBeDefined();
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json{}}');

      const loaded = loadFromLocal();
      
      expect(loaded).toBeNull();
    });

    it('should return null when no data exists', () => {
      const loaded = loadFromLocal();
      
      expect(loaded).toBeNull();
    });
  });

  describe('Round-trip Comment Persistence', () => {
    it('should preserve all comment data through save and load cycle', () => {
      const commentId = uuidv4();
      const chapterId = initialState.chapters[0].id;
      
      const originalState: AppState = {
        ...initialState,
        comments: {
          [commentId]: {
            id: commentId,
            author: 'Round Trip Author',
            text: 'This comment should survive the round trip',
            timestamp: 1234567890,
            isSuggestion: true,
            replacementText: 'suggested replacement',
            isHidden: false,
            originalText: 'original selected text'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [commentId] }
            : c
        )
      };

      saveToLocal(originalState);
      const loadedState = loadFromLocal();

      expect(loadedState).not.toBeNull();
      expect(loadedState!.comments![commentId]).toEqual(originalState.comments[commentId]);
      
      const chapter = loadedState!.chapters!.find(c => c.id === chapterId);
      expect(chapter?.commentIds).toContain(commentId);
    });

    it('should preserve multiple comments with different properties', () => {
      const comment1Id = 'comment-1';
      const comment2Id = 'comment-2';
      const comment3Id = 'comment-3';
      const chapterId = initialState.chapters[0].id;
      
      const originalState: AppState = {
        ...initialState,
        comments: {
          [comment1Id]: {
            id: comment1Id,
            author: 'Author 1',
            text: 'Regular comment',
            timestamp: 1000,
            isSuggestion: false,
            isHidden: false,
            originalText: 'text 1'
          },
          [comment2Id]: {
            id: comment2Id,
            author: 'Author 2',
            text: 'Suggestion',
            timestamp: 2000,
            isSuggestion: true,
            replacementText: 'better text',
            isHidden: false,
            originalText: 'text 2'
          },
          [comment3Id]: {
            id: comment3Id,
            author: 'Author 3',
            text: 'Hidden comment',
            timestamp: 3000,
            isSuggestion: false,
            isHidden: true,
            originalText: 'text 3'
          }
        },
        chapters: initialState.chapters.map(c =>
          c.id === chapterId
            ? { ...c, commentIds: [comment1Id, comment2Id, comment3Id] }
            : c
        )
      };

      saveToLocal(originalState);
      const loadedState = loadFromLocal();

      expect(loadedState!.comments![comment1Id].isSuggestion).toBe(false);
      expect(loadedState!.comments![comment2Id].isSuggestion).toBe(true);
      expect(loadedState!.comments![comment2Id].replacementText).toBe('better text');
      expect(loadedState!.comments![comment3Id].isHidden).toBe(true);
    });
  });
});
