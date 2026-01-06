import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { StoreProvider, useStore } from './StoreContext';
import { Character, Relationship } from '../types';
import React from 'react';

describe('StoreContext Integration Tests', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StoreProvider>{children}</StoreProvider>
  );

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Relationship Management', () => {
    it('should add a relationship', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2'],
        description: 'Best friends',
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
      });

      expect(result.current.state.relationships).toHaveLength(1);
      expect(result.current.state.relationships[0]).toEqual(relationship);
    });

    it('should update a relationship', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2'],
        description: 'Best friends',
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
      });

      const updatedRelationship: Relationship = {
        ...relationship,
        type: 'spouse',
        description: 'Married',
      };

      act(() => {
        result.current.dispatch({ type: 'UPDATE_RELATIONSHIP', payload: updatedRelationship });
      });

      expect(result.current.state.relationships).toHaveLength(1);
      expect(result.current.state.relationships[0].type).toBe('spouse');
      expect(result.current.state.relationships[0].description).toBe('Married');
    });

    it('should delete a relationship', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2'],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
      });

      expect(result.current.state.relationships).toHaveLength(1);

      act(() => {
        result.current.dispatch({ type: 'DELETE_RELATIONSHIP', payload: 'r1' });
      });

      expect(result.current.state.relationships).toHaveLength(0);
    });
  });

    it('should update character color', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      const character: Character = {
        id: 'c1',
        name: 'Alice',
        description: 'Main character',
        color: '#4f46e5'
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CHARACTER', payload: character });
      });

      const updatedCharacter: Character = {
        ...character,
        color: '#ff0000'
      };

      act(() => {
        result.current.dispatch({ type: 'UPDATE_CHARACTER', payload: updatedCharacter });
      });

      expect(result.current.state.characters[0].color).toBe('#ff0000');
    });

  describe('Character and Relationship Integration', () => {
    it('should manage characters and their relationships together', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      const character1: Character = {
        id: 'c1',
        name: 'Alice',
        description: 'Main character',
      };

      const character2: Character = {
        id: 'c2',
        name: 'Bob',
        description: 'Supporting character',
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CHARACTER', payload: character1 });
        result.current.dispatch({ type: 'ADD_CHARACTER', payload: character2 });
      });

      expect(result.current.state.characters).toHaveLength(2);

      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2'],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
      });

      expect(result.current.state.relationships).toHaveLength(1);
      expect(result.current.state.relationships[0].characterIds).toContain('c1');
      expect(result.current.state.relationships[0].characterIds).toContain('c2');
    });

    it('should allow deleting a character while keeping relationships intact', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      const character1: Character = { id: 'c1', name: 'Alice' };
      const character2: Character = { id: 'c2', name: 'Bob' };

      act(() => {
        result.current.dispatch({ type: 'ADD_CHARACTER', payload: character1 });
        result.current.dispatch({ type: 'ADD_CHARACTER', payload: character2 });
      });

      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2'],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
      });

      // Delete one character
      act(() => {
        result.current.dispatch({ type: 'DELETE_CHARACTER', payload: 'c1' });
      });

      expect(result.current.state.characters).toHaveLength(1);
      // Relationship still exists (app doesn't auto-delete relationships when characters are deleted)
      expect(result.current.state.relationships).toHaveLength(1);
    });
  });

  describe('Group Relationships', () => {
    it('should support relationships with more than 2 characters', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2', 'c3', 'c4'],
        description: 'Friend group',
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
      });

      expect(result.current.state.relationships).toHaveLength(1);
      expect(result.current.state.relationships[0].characterIds).toHaveLength(4);
    });
  });

  describe('Codex Tab Navigation', () => {
    it('should switch to relationships tab', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      expect(result.current.state.activeCodexTab).toBe('timeline');

      act(() => {
        result.current.dispatch({ type: 'SET_CODEX_TAB', payload: 'relationships' });
      });

      expect(result.current.state.activeCodexTab).toBe('relationships');
    });

    it('should clear viewingItemId when switching tabs', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'SET_VIEWING_ITEM', payload: 'c1' });
      });

      expect(result.current.state.viewingItemId).toBe('c1');

      act(() => {
        result.current.dispatch({ type: 'SET_CODEX_TAB', payload: 'relationships' });
      });

      expect(result.current.state.viewingItemId).toBeNull();
    });
  });

  describe('Relationship Modal', () => {
    it('should open relationship modal for creating', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'OPEN_MODAL', payload: { type: 'relationship' } });
      });

      expect(result.current.state.activeModal).toBe('relationship');
      expect(result.current.state.editingItemId).toBeNull();
    });

    it('should open relationship modal for editing', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      act(() => {
        result.current.dispatch({ 
          type: 'OPEN_MODAL', 
          payload: { type: 'relationship', itemId: 'r1' } 
        });
      });

      expect(result.current.state.activeModal).toBe('relationship');
      expect(result.current.state.editingItemId).toBe('r1');
    });

    it('should close relationship modal', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'OPEN_MODAL', payload: { type: 'relationship' } });
      });

      expect(result.current.state.activeModal).toBe('relationship');

      act(() => {
        result.current.dispatch({ type: 'CLOSE_MODAL' });
      });

      expect(result.current.state.activeModal).toBe('none');
      expect(result.current.state.editingItemId).toBeNull();
    });
  });

  describe('State Persistence', () => {
    it('should include relationships in state', () => {
      const { result } = renderHook(() => useStore(), { wrapper });

      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2'],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
      });

      // State should have relationships array
      expect(result.current.state).toHaveProperty('relationships');
      expect(Array.isArray(result.current.state.relationships)).toBe(true);
    });
  });
});
