import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './StoreContext';
import { v4 as uuidv4 } from 'uuid';
import { StoryComment } from '../types';

describe('StoreContext - Comment Actions Integration', () => {
  describe('ADD_COMMENT', () => {
    it('should add a comment to the store and chapter', () => {
      const chapterId = initialState.chapters[0].id;
      const comment: StoryComment = {
        id: uuidv4(),
        author: 'John Doe',
        text: 'Great writing!',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'selected text'
      };

      const newState = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment }
      });

      // Comment should be added to comments object
      expect(newState.comments[comment.id]).toEqual(comment);
      
      // Comment ID should be added to chapter's commentIds
      const chapter = newState.chapters.find(c => c.id === chapterId);
      expect(chapter?.commentIds).toContain(comment.id);
    });

    it('should handle adding multiple comments to the same chapter', () => {
      const chapterId = initialState.chapters[0].id;
      
      const comment1: StoryComment = {
        id: 'comment-1',
        author: 'Author 1',
        text: 'First comment',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text 1'
      };

      const comment2: StoryComment = {
        id: 'comment-2',
        author: 'Author 2',
        text: 'Second comment',
        timestamp: Date.now() + 1000,
        isSuggestion: false,
        isHidden: false,
        originalText: 'text 2'
      };

      let state = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment: comment1 }
      });

      state = reducer(state, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment: comment2 }
      });

      expect(Object.keys(state.comments)).toHaveLength(2);
      const chapter = state.chapters.find(c => c.id === chapterId);
      expect(chapter?.commentIds).toEqual(['comment-1', 'comment-2']);
    });

    it('should not add comment if chapter does not exist', () => {
      const comment: StoryComment = {
        id: 'comment-1',
        author: 'Author',
        text: 'Comment',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text'
      };

      const newState = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId: 'non-existent-chapter', comment }
      });

      expect(newState).toEqual(initialState);
    });

    it('should add suggestion comment with replacement text', () => {
      const chapterId = initialState.chapters[0].id;
      const comment: StoryComment = {
        id: 'suggestion-1',
        author: 'Editor',
        text: 'Consider this change',
        timestamp: Date.now(),
        isSuggestion: true,
        replacementText: 'improved text',
        isHidden: false,
        originalText: 'original text'
      };

      const newState = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment }
      });

      const savedComment = newState.comments['suggestion-1'];
      expect(savedComment.isSuggestion).toBe(true);
      expect(savedComment.replacementText).toBe('improved text');
    });
  });

  describe('UPDATE_COMMENT', () => {
    it('should update comment properties', () => {
      // First add a comment
      const chapterId = initialState.chapters[0].id;
      const comment: StoryComment = {
        id: 'comment-1',
        author: 'Author',
        text: 'Original text',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text'
      };

      let state = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment }
      });

      // Update the comment
      state = reducer(state, {
        type: 'UPDATE_COMMENT',
        payload: {
          chapterId,
          commentId: 'comment-1',
          updates: { text: 'Updated text' }
        }
      });

      expect(state.comments['comment-1'].text).toBe('Updated text');
      expect(state.comments['comment-1'].author).toBe('Author'); // Other fields unchanged
    });

    it('should not update non-existent comment', () => {
      const newState = reducer(initialState, {
        type: 'UPDATE_COMMENT',
        payload: {
          chapterId: 'any',
          commentId: 'non-existent',
          updates: { text: 'New text' }
        }
      });

      expect(newState).toEqual(initialState);
    });

    it('should update multiple fields at once', () => {
      const chapterId = initialState.chapters[0].id;
      const comment: StoryComment = {
        id: 'comment-1',
        author: 'Author',
        text: 'Text',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'original'
      };

      let state = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment }
      });

      state = reducer(state, {
        type: 'UPDATE_COMMENT',
        payload: {
          chapterId,
          commentId: 'comment-1',
          updates: {
            text: 'Updated text',
            isSuggestion: true,
            replacementText: 'replacement'
          }
        }
      });

      const updated = state.comments['comment-1'];
      expect(updated.text).toBe('Updated text');
      expect(updated.isSuggestion).toBe(true);
      expect(updated.replacementText).toBe('replacement');
    });
  });

  describe('HIDE_COMMENT', () => {
    it('should toggle comment hidden status', () => {
      const chapterId = initialState.chapters[0].id;
      const comment: StoryComment = {
        id: 'comment-1',
        author: 'Author',
        text: 'Text',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text'
      };

      let state = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment }
      });

      // Hide the comment
      state = reducer(state, {
        type: 'HIDE_COMMENT',
        payload: 'comment-1'
      });

      expect(state.comments['comment-1'].isHidden).toBe(true);

      // Unhide the comment
      state = reducer(state, {
        type: 'HIDE_COMMENT',
        payload: 'comment-1'
      });

      expect(state.comments['comment-1'].isHidden).toBe(false);
    });

    it('should not modify state if comment does not exist', () => {
      const newState = reducer(initialState, {
        type: 'HIDE_COMMENT',
        payload: 'non-existent'
      });

      expect(newState).toEqual(initialState);
    });
  });

  describe('DELETE_COMMENT', () => {
    it('should remove comment from store and chapter', () => {
      const chapterId = initialState.chapters[0].id;
      const comment: StoryComment = {
        id: 'comment-1',
        author: 'Author',
        text: 'Text',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text'
      };

      let state = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment }
      });

      state = reducer(state, {
        type: 'DELETE_COMMENT',
        payload: { chapterId, commentId: 'comment-1' }
      });

      // Comment should be removed from comments object
      expect(state.comments['comment-1']).toBeUndefined();
      
      // Comment ID should be removed from chapter's commentIds
      const chapter = state.chapters.find(c => c.id === chapterId);
      expect(chapter?.commentIds).not.toContain('comment-1');
    });

    it('should only delete the specified comment', () => {
      const chapterId = initialState.chapters[0].id;
      
      const comment1: StoryComment = {
        id: 'comment-1',
        author: 'Author 1',
        text: 'Text 1',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text 1'
      };

      const comment2: StoryComment = {
        id: 'comment-2',
        author: 'Author 2',
        text: 'Text 2',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text 2'
      };

      let state = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment: comment1 }
      });

      state = reducer(state, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment: comment2 }
      });

      state = reducer(state, {
        type: 'DELETE_COMMENT',
        payload: { chapterId, commentId: 'comment-1' }
      });

      expect(state.comments['comment-1']).toBeUndefined();
      expect(state.comments['comment-2']).toBeDefined();
      
      const chapter = state.chapters.find(c => c.id === chapterId);
      expect(chapter?.commentIds).toEqual(['comment-2']);
    });
  });

  describe('Comment Persistence Across Actions', () => {
    it('should maintain comments when updating chapter content', () => {
      const chapterId = initialState.chapters[0].id;
      const comment: StoryComment = {
        id: 'comment-1',
        author: 'Author',
        text: 'Comment',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text'
      };

      let state = reducer(initialState, {
        type: 'ADD_COMMENT',
        payload: { chapterId, comment }
      });

      state = reducer(state, {
        type: 'UPDATE_CHAPTER',
        payload: {
          id: chapterId,
          updates: { content: 'New content' }
        }
      });

      expect(state.comments['comment-1']).toBeDefined();
      const chapter = state.chapters.find(c => c.id === chapterId);
      expect(chapter?.commentIds).toContain('comment-1');
    });

    it('should maintain comments when deleting other chapters', () => {
      // Add a second chapter first
      let state = reducer(initialState, { type: 'ADD_CHAPTER' });
      const firstChapterId = state.chapters[0].id;
      const secondChapterId = state.chapters[1].id;

      const comment: StoryComment = {
        id: 'comment-1',
        author: 'Author',
        text: 'Comment',
        timestamp: Date.now(),
        isSuggestion: false,
        isHidden: false,
        originalText: 'text'
      };

      state = reducer(state, {
        type: 'ADD_COMMENT',
        payload: { chapterId: firstChapterId, comment }
      });

      state = reducer(state, {
        type: 'DELETE_CHAPTER',
        payload: secondChapterId
      });

      expect(state.comments['comment-1']).toBeDefined();
      expect(state.chapters[0].commentIds).toContain('comment-1');
    });
  });
});
