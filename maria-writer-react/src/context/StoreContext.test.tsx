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
    
    // Check metadata fields are initialized
    const newChap = newState.chapters[newState.chapters.length - 1];
    expect(newChap.relatedEvents).toEqual([]);
    expect(newChap.mentionedCharacters).toEqual([]);
  });

  it('should handle UPDATE_CHAPTER with metadata', () => {
    const chapId = initialState.chapters[0].id;
    const updates = {
      title: 'New Chapter Title',
      date: '01/01/2026 12:00:00',
      relatedEvents: ['e1'],
      mentionedCharacters: ['c1']
    };
    
    const newState = reducer(initialState, {
      type: 'UPDATE_CHAPTER',
      payload: { id: chapId, updates }
    });
    
    const updatedChap = newState.chapters.find(c => c.id === chapId);
    expect(updatedChap?.title).toBe('New Chapter Title');
    expect(updatedChap?.date).toBe('01/01/2026 12:00:00');
    expect(updatedChap?.relatedEvents).toEqual(['e1']);
    expect(updatedChap?.mentionedCharacters).toEqual(['c1']);
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

  // === Tests for bi-directional sync between characters and events ===

  describe('UPDATE_CHARACTER syncing to events', () => {
    it('should create Born event when dob is added to existing character', () => {
      uuidSeq.reset();
      const stateWithChar = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', dob: '', deathDate: '' }],
        events: [],
      };

      const updatedChar = { id: 'c1', name: 'Maria', dob: '15/06/1990', deathDate: '' };
      const newState = reducer(stateWithChar as any, { type: 'UPDATE_CHARACTER', payload: updatedChar as any });

      expect(newState.events).toHaveLength(1);
      expect(newState.events[0].title).toBe('Maria Born');
      expect(newState.events[0].date).toBe('15/06/1990 00:00:00');
    });

    it('should update existing Born event when dob changes', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', dob: '01/01/1990 00:00:00' }],
        events: [
          { id: 'e1', title: 'Maria Born', date: '01/01/1990 00:00:00', description: 'Maria Born', characters: ['c1'] }
        ],
      };

      const updatedChar = { id: 'c1', name: 'Maria', dob: '15/06/1990' };
      const newState = reducer(stateWithCharAndEvent as any, { type: 'UPDATE_CHARACTER', payload: updatedChar as any });

      expect(newState.events).toHaveLength(1);
      expect(newState.events[0].date).toBe('15/06/1990 00:00:00');
    });

    it('should delete Born event when dob is cleared', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', dob: '01/01/1990 00:00:00' }],
        events: [
          { id: 'e1', title: 'Maria Born', date: '01/01/1990 00:00:00', description: 'Maria Born', characters: ['c1'] }
        ],
      };

      const updatedChar = { id: 'c1', name: 'Maria', dob: '' };
      const newState = reducer(stateWithCharAndEvent as any, { type: 'UPDATE_CHARACTER', payload: updatedChar as any });

      expect(newState.events).toHaveLength(0);
    });

    it('should update event title when character name changes', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', dob: '01/01/1990 00:00:00' }],
        events: [
          { id: 'e1', title: 'Maria Born', date: '01/01/1990 00:00:00', description: 'Maria Born', characters: ['c1'] }
        ],
      };

      const updatedChar = { id: 'c1', name: 'Mary', dob: '01/01/1990 00:00:00' };
      const newState = reducer(stateWithCharAndEvent as any, { type: 'UPDATE_CHARACTER', payload: updatedChar as any });

      expect(newState.events).toHaveLength(1);
      expect(newState.events[0].title).toBe('Mary Born');
    });
  });

  describe('UPDATE_EVENT syncing to characters', () => {
    it('should update character dob when Born event date changes', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', dob: '01/01/1990 00:00:00' }],
        events: [
          { id: 'e1', title: 'Maria Born', date: '01/01/1990 00:00:00', characters: ['c1'] }
        ],
      };

      const updatedEvent = { id: 'e1', title: 'Maria Born', date: '15/06/1990 00:00:00', characters: ['c1'] };
      const newState = reducer(stateWithCharAndEvent as any, { type: 'UPDATE_EVENT', payload: updatedEvent });

      expect(newState.characters[0].dob).toBe('15/06/1990 00:00:00');
    });

    it('should update character deathDate when Died event date changes', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', deathDate: '01/01/2050 00:00:00' }],
        events: [
          { id: 'e1', title: 'Maria Died', date: '01/01/2050 00:00:00', characters: ['c1'] }
        ],
      };

      const updatedEvent = { id: 'e1', title: 'Maria Died', date: '15/06/2050 00:00:00', characters: ['c1'] };
      const newState = reducer(stateWithCharAndEvent as any, { type: 'UPDATE_EVENT', payload: updatedEvent });

      expect(newState.characters[0].deathDate).toBe('15/06/2050 00:00:00');
    });

    it('should not modify character when non-life event is updated', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', dob: '01/01/1990 00:00:00' }],
        events: [
          { id: 'e1', title: 'Battle', date: '01/01/1815 00:00:00', characters: ['c1'] }
        ],
      };

      const updatedEvent = { id: 'e1', title: 'Battle', date: '18/06/1815 00:00:00', characters: ['c1'] };
      const newState = reducer(stateWithCharAndEvent as any, { type: 'UPDATE_EVENT', payload: updatedEvent });

      expect(newState.characters[0].dob).toBe('01/01/1990 00:00:00');
    });
  });

  describe('DELETE_EVENT syncing to characters', () => {
    it('should clear character dob when Born event is deleted', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', dob: '01/01/1990 00:00:00' }],
        events: [
          { id: 'e1', title: 'Maria Born', date: '01/01/1990 00:00:00', characters: ['c1'] }
        ],
      };

      const newState = reducer(stateWithCharAndEvent as any, { type: 'DELETE_EVENT', payload: 'e1' });

      expect(newState.events).toHaveLength(0);
      expect(newState.characters[0].dob).toBe('');
    });

    it('should clear character deathDate when Died event is deleted', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', deathDate: '01/01/2050 00:00:00' }],
        events: [
          { id: 'e1', title: 'Maria Died', date: '01/01/2050 00:00:00', characters: ['c1'] }
        ],
      };

      const newState = reducer(stateWithCharAndEvent as any, { type: 'DELETE_EVENT', payload: 'e1' });

      expect(newState.events).toHaveLength(0);
      expect(newState.characters[0].deathDate).toBe('');
    });

    it('should not modify character when non-life event is deleted', () => {
      const stateWithCharAndEvent = {
        ...initialState,
        characters: [{ id: 'c1', name: 'Maria', dob: '01/01/1990 00:00:00' }],
        events: [
          { id: 'e1', title: 'Battle', date: '01/01/1815 00:00:00', characters: ['c1'] }
        ],
      };

      const newState = reducer(stateWithCharAndEvent as any, { type: 'DELETE_EVENT', payload: 'e1' });

      expect(newState.events).toHaveLength(0);
      expect(newState.characters[0].dob).toBe('01/01/1990 00:00:00');
    });
  });

  describe('Timeline Lane Ordering', () => {
    it('should handle REORDER_TIMELINE_LANES', () => {
      const newOrder = ['char3', 'char1', 'char2'];
      const newState = reducer(initialState, { type: 'REORDER_TIMELINE_LANES', payload: newOrder });
      
      expect(newState.timeline.characterLaneOrder).toEqual(newOrder);
    });

    it('should preserve other timeline properties when reordering lanes', () => {
      const stateWithEdges = {
        ...initialState,
        timeline: {
          edges: [{ id: 'e1', from: 'a', to: 'b' }],
          characterLaneOrder: ['old1', 'old2'],
        },
      };

      const newOrder = ['char1', 'char2'];
      const newState = reducer(stateWithEdges as any, { type: 'REORDER_TIMELINE_LANES', payload: newOrder });
      
      expect(newState.timeline.characterLaneOrder).toEqual(newOrder);
      expect(newState.timeline.edges).toEqual([{ id: 'e1', from: 'a', to: 'b' }]);
    });
  });

  describe('ADD_RELATIONSHIP syncing to events', () => {
    it('should create timeline event when adding relationship with start date', () => {
      uuidSeq.reset();
      const stateWithCharacters = {
        ...initialState,
        characters: [
          { id: 'c1', name: 'Alice', tags: [] },
          { id: 'c2', name: 'Bob', tags: [] },
        ],
      };

      const relationship = {
        id: 'r1',
        type: 'spouse' as const,
        characterIds: ['c1', 'c2'],
        startDate: '01/06/2020 14:00:00',
        description: 'Wedding day',
      };

      const newState = reducer(stateWithCharacters as any, { type: 'ADD_RELATIONSHIP', payload: relationship });

      expect(newState.relationships).toHaveLength(1);
      expect(newState.relationships[0]).toEqual(relationship);

      // Should create corresponding event
      expect(newState.events).toHaveLength(1);
      expect(newState.events[0].title).toBe('Alice & Bob - Marriage');
      expect(newState.events[0].date).toBe('01/06/2020 14:00:00');
      expect(newState.events[0].description).toBe('Wedding day');
      expect(newState.events[0].characters).toEqual(['c1', 'c2']);
    });

    it('should not create event when relationship has no start date', () => {
      const stateWithCharacters = {
        ...initialState,
        characters: [
          { id: 'c1', name: 'Alice', tags: [] },
          { id: 'c2', name: 'Bob', tags: [] },
        ],
      };

      const relationship = {
        id: 'r1',
        type: 'friend' as const,
        characterIds: ['c1', 'c2'],
      };

      const newState = reducer(stateWithCharacters as any, { type: 'ADD_RELATIONSHIP', payload: relationship });

      expect(newState.relationships).toHaveLength(1);
      expect(newState.events).toHaveLength(0);
    });

    it('should create event for friend relationship', () => {
      uuidSeq.reset();
      const stateWithCharacters = {
        ...initialState,
        characters: [
          { id: 'c1', name: 'Alice', tags: [] },
          { id: 'c2', name: 'Bob', tags: [] },
        ],
      };

      const relationship = {
        id: 'r1',
        type: 'friend' as const,
        characterIds: ['c1', 'c2'],
        startDate: '15/03/2019 10:00:00',
      };

      const newState = reducer(stateWithCharacters as any, { type: 'ADD_RELATIONSHIP', payload: relationship });

      expect(newState.events).toHaveLength(1);
      expect(newState.events[0].title).toBe('Alice & Bob - Friendship');
      expect(newState.events[0].description).toBe('Alice and Bob became friends');
    });

    it('should create event for parent-child relationship', () => {
      uuidSeq.reset();
      const stateWithCharacters = {
        ...initialState,
        characters: [
          { id: 'c1', name: 'Alice', tags: [] },
          { id: 'c2', name: 'Charlie', tags: [] },
        ],
      };

      const relationship = {
        id: 'r1',
        type: 'parent-child' as const,
        characterIds: ['c1', 'c2'],
        startDate: '20/05/2022 08:30:00',
      };

      const newState = reducer(stateWithCharacters as any, { type: 'ADD_RELATIONSHIP', payload: relationship });

      expect(newState.events).toHaveLength(1);
      expect(newState.events[0].title).toBe('Charlie Born');
      expect(newState.events[0].description).toBe('Charlie born to Alice');
    });

    it('should not duplicate existing event', () => {
      const stateWithCharacters = {
        ...initialState,
        characters: [
          { id: 'c1', name: 'Alice', tags: [] },
          { id: 'c2', name: 'Bob', tags: [] },
        ],
        events: [
          {
            id: 'e1',
            title: 'Alice & Bob - Marriage',
            date: '01/06/2020 14:00:00',
            characters: ['c1', 'c2'],
          }
        ],
      };

      const relationship = {
        id: 'r1',
        type: 'spouse' as const,
        characterIds: ['c1', 'c2'],
        startDate: '01/06/2020 14:00:00',
      };

      const newState = reducer(stateWithCharacters as any, { type: 'ADD_RELATIONSHIP', payload: relationship });

      expect(newState.relationships).toHaveLength(1);
      expect(newState.events).toHaveLength(1); // No duplicate created
    });
  });
});
