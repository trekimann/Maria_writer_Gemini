import { describe, it, expect, vi } from 'vitest';

const uuidSeq = vi.hoisted(() => {
  let i = 0;
  return {
    v4: () => `uuid-${++i}`,
    reset: () => {
      i = 0;
    }
  };
});

vi.mock('uuid', () => ({
  v4: uuidSeq.v4,
}));

import { reducer, initialState } from './StoreContext';

describe('StoreContext Reducer', () => {
  it('should handle ADD_CHARACTER', () => {
    const char = { id: 'c1', name: 'Hero', tags: [] };
    const newState = reducer(initialState, { type: 'ADD_CHARACTER', payload: char });
    expect(newState.characters).toContainEqual(char);
  });

  it('should handle SET_META', () => {
    const newState = reducer(initialState, {
      type: 'SET_META',
      payload: { title: 'My Great Book', author: 'Me' }
    });
    expect(newState.meta.title).toBe('My Great Book');
    expect(newState.meta.author).toBe('Me');
  });

  it('should handle ADD_CHAPTER', () => {
    const newState = reducer(initialState, { type: 'ADD_CHAPTER' });
    expect(newState.chapters.length).toBe(initialState.chapters.length + 1);
    expect(newState.activeChapterId).toBeDefined();
  });

  it('should handle DELETE_CHAPTER', () => {
    // Setup state with 2 chapters
    const stateWithChapters = {
      ...initialState,
      chapters: [
        { id: '1', title: 'C1', content: '', order: 0 },
        { id: '2', title: 'C2', content: '', order: 1 }
      ],
      activeChapterId: '1'
    };

    const newState = reducer(stateWithChapters, { type: 'DELETE_CHAPTER', payload: '1' });
    expect(newState.chapters.length).toBe(1);
    expect(newState.chapters[0].id).toBe('2');
    expect(newState.activeChapterId).toBe('2');
  });

  it('auto-creates Born/Died events on ADD_CHARACTER when dob/deathDate present', () => {
    uuidSeq.reset();
    const char = {
      id: 'c1',
      name: 'Maria',
      dob: '01/02/2000',
      deathDate: '03/04/2020 05:06:07',
    };

    const newState = reducer(initialState, { type: 'ADD_CHARACTER', payload: char as any });

    // Character is added
    expect(newState.characters.some(c => c.id === 'c1')).toBe(true);

    // Two events added
    expect(newState.events).toHaveLength(2);

    const born = newState.events.find(e => e.title === 'Maria Born');
    const died = newState.events.find(e => e.title === 'Maria Died');

    expect(born).toBeTruthy();
    expect(died).toBeTruthy();

    expect(born?.description).toBe('Maria Born');
    expect(died?.description).toBe('Maria Died');

    // dob date-only normalizes to midnight
    expect(born?.date).toBe('01/02/2000 00:00:00');
    // death date keeps time
    expect(died?.date).toBe('03/04/2020 05:06:07');

    // Life events tag the character
    expect(born?.characters).toContain('c1');
    expect(died?.characters).toContain('c1');
  });

  it('does not auto-create events when dob/deathDate are missing', () => {
    const char = { id: 'c1', name: 'NoDates' };
    const newState = reducer(initialState, { type: 'ADD_CHARACTER', payload: char as any });
    expect(newState.events).toHaveLength(0);
  });

  it('does not duplicate auto events if they already exist', () => {
    const stateWithExisting = {
      ...initialState,
      events: [
        {
          id: 'e1',
          title: 'Maria Born',
          date: '01/02/2000 00:00:00',
          description: 'Maria Born',
          characters: ['c1'],
        }
      ],
    };

    const char = {
      id: 'c1',
      name: 'Maria',
      dob: '2000-02-01',
    };

    const newState = reducer(stateWithExisting as any, { type: 'ADD_CHARACTER', payload: char as any });
    expect(newState.events).toHaveLength(1);
  });

  it('should handle ADD_EVENT', () => {
    const evt = { id: 'e1', title: 'Inciting Incident' };
    const newState = reducer(initialState, { type: 'ADD_EVENT', payload: evt });
    expect(newState.events).toContainEqual(evt);
  });
});
