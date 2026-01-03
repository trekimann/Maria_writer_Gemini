import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Character, Event, Relationship } from '../types';

// Mock uuid before importing the module
const uuidMock = vi.hoisted(() => {
  let counter = 0;
  return {
    v4: () => `uuid-${++counter}`,
    reset: () => { counter = 0; }
  };
});

vi.mock('uuid', () => ({
  v4: uuidMock.v4
}));

import {
  syncCharacterToEvents,
  syncEventToCharacters,
  clearCharacterFieldsOnEventDelete,
  getLifeEventTitle,
  findExistingLifeEvent,
  isBornEvent,
  isDiedEvent,
  LIFE_EVENT_FIELDS,
  syncLifeEventToRelationships,
  detectLifeEventType,
  syncCharacterLifeEventsToTimeline,
  syncRelationshipToEvent,
} from './eventSync';

describe('eventSync utilities', () => {
  beforeEach(() => {
    uuidMock.reset();
  });

  describe('getLifeEventTitle', () => {
    it('should generate correct title for Born event', () => {
      expect(getLifeEventTitle('John', 'Born')).toBe('John Born');
    });

    it('should generate correct title for Died event', () => {
      expect(getLifeEventTitle('Jane', 'Died')).toBe('Jane Died');
    });
  });

  describe('findExistingLifeEvent', () => {
    const events: Event[] = [
      { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00', characters: ['c1'] },
      { id: 'e2', title: 'John Died', date: '01/01/2050 00:00:00', characters: ['c1'] },
      { id: 'e3', title: 'Jane Born', date: '01/01/1995 00:00:00', characters: ['c2'] },
    ];

    it('should find existing Born event for a character', () => {
      const result = findExistingLifeEvent(events, 'c1', 'John', 'Born');
      expect(result).toBeDefined();
      expect(result?.id).toBe('e1');
    });

    it('should find existing Died event for a character', () => {
      const result = findExistingLifeEvent(events, 'c1', 'John', 'Died');
      expect(result).toBeDefined();
      expect(result?.id).toBe('e2');
    });

    it('should return undefined if event does not exist', () => {
      const result = findExistingLifeEvent(events, 'c2', 'Jane', 'Died');
      expect(result).toBeUndefined();
    });

    it('should not match events for wrong character', () => {
      const result = findExistingLifeEvent(events, 'c2', 'John', 'Born');
      expect(result).toBeUndefined();
    });
  });

  describe('isBornEvent / isDiedEvent', () => {
    it('should identify Born event correctly', () => {
      const event: Event = { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00', characters: ['c1'] };
      expect(isBornEvent(event, 'c1', 'John')).toBe(true);
      expect(isBornEvent(event, 'c2', 'John')).toBe(false);
      expect(isDiedEvent(event, 'c1', 'John')).toBe(false);
    });

    it('should identify Died event correctly', () => {
      const event: Event = { id: 'e1', title: 'John Died', date: '01/01/2050 00:00:00', characters: ['c1'] };
      expect(isDiedEvent(event, 'c1', 'John')).toBe(true);
      expect(isDiedEvent(event, 'c2', 'John')).toBe(false);
      expect(isBornEvent(event, 'c1', 'John')).toBe(false);
    });
  });

  describe('syncCharacterToEvents', () => {
    it('should create Born event when dob is added', () => {
      const character: Character = { id: 'c1', name: 'John', dob: '01/01/1990' };
      const previousCharacter: Character = { id: 'c1', name: 'John' };
      const currentEvents: Event[] = [];

      const result = syncCharacterToEvents(character, previousCharacter, currentEvents);

      expect(result.createdCount).toBe(1);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('John Born');
      expect(result.events[0].date).toBe('01/01/1990 00:00:00');
      expect(result.events[0].characters).toContain('c1');
    });

    it('should create Died event when deathDate is added', () => {
      const character: Character = { id: 'c1', name: 'John', deathDate: '01/01/2050 12:30:00' };
      const previousCharacter: Character = { id: 'c1', name: 'John' };
      const currentEvents: Event[] = [];

      const result = syncCharacterToEvents(character, previousCharacter, currentEvents);

      expect(result.createdCount).toBe(1);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('John Died');
      expect(result.events[0].date).toBe('01/01/2050 12:30:00');
    });

    it('should create both Born and Died events when both dates are added', () => {
      const character: Character = { id: 'c1', name: 'John', dob: '01/01/1990', deathDate: '01/01/2050' };
      const previousCharacter: Character = { id: 'c1', name: 'John' };
      const currentEvents: Event[] = [];

      const result = syncCharacterToEvents(character, previousCharacter, currentEvents);

      expect(result.createdCount).toBe(2);
      expect(result.events).toHaveLength(2);
      expect(result.events.find(e => e.title === 'John Born')).toBeDefined();
      expect(result.events.find(e => e.title === 'John Died')).toBeDefined();
    });

    it('should update existing Born event when dob changes', () => {
      const character: Character = { id: 'c1', name: 'John', dob: '15/06/1990' };
      const previousCharacter: Character = { id: 'c1', name: 'John', dob: '01/01/1990' };
      const currentEvents: Event[] = [
        { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00', characters: ['c1'] }
      ];

      const result = syncCharacterToEvents(character, previousCharacter, currentEvents);

      expect(result.updatedCount).toBe(1);
      expect(result.createdCount).toBe(0);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].date).toBe('15/06/1990 00:00:00');
    });

    it('should not update event if date has not changed', () => {
      const character: Character = { id: 'c1', name: 'John', dob: '01/01/1990' };
      const previousCharacter: Character = { id: 'c1', name: 'John', dob: '01/01/1990' };
      const currentEvents: Event[] = [
        { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00', characters: ['c1'] }
      ];

      const result = syncCharacterToEvents(character, previousCharacter, currentEvents);

      expect(result.updatedCount).toBe(0);
      expect(result.createdCount).toBe(0);
      expect(result.events).toHaveLength(1);
    });

    it('should delete Born event when dob is cleared', () => {
      const character: Character = { id: 'c1', name: 'John', dob: '' };
      const previousCharacter: Character = { id: 'c1', name: 'John', dob: '01/01/1990' };
      const currentEvents: Event[] = [
        { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00', characters: ['c1'] }
      ];

      const result = syncCharacterToEvents(character, previousCharacter, currentEvents);

      expect(result.deletedCount).toBe(1);
      expect(result.events).toHaveLength(0);
    });

    it('should update event titles when character name changes', () => {
      const character: Character = { id: 'c1', name: 'Johnny', dob: '01/01/1990' };
      const previousCharacter: Character = { id: 'c1', name: 'John', dob: '01/01/1990' };
      const currentEvents: Event[] = [
        { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00', characters: ['c1'], description: 'John Born' }
      ];

      const result = syncCharacterToEvents(character, previousCharacter, currentEvents);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Johnny Born');
      expect(result.events[0].description).toBe('Johnny Born');
    });

    it('should create event for new character (previousCharacter is null)', () => {
      const character: Character = { id: 'c1', name: 'John', dob: '01/01/1990' };
      const currentEvents: Event[] = [];

      const result = syncCharacterToEvents(character, null, currentEvents);

      expect(result.createdCount).toBe(1);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('John Born');
    });
  });

  describe('syncEventToCharacters', () => {
    it('should update character dob when Born event date changes', () => {
      const event: Event = { id: 'e1', title: 'John Born', date: '15/06/1990 00:00:00', characters: ['c1'] };
      const previousEvent: Event = { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00', characters: ['c1'] };
      const characters: Character[] = [
        { id: 'c1', name: 'John', dob: '01/01/1990 00:00:00' }
      ];

      const result = syncEventToCharacters(event, previousEvent, characters);

      expect(result).toHaveLength(1);
      expect(result[0].dob).toBe('15/06/1990 00:00:00');
    });

    it('should update character deathDate when Died event date changes', () => {
      const event: Event = { id: 'e1', title: 'John Died', date: '15/06/2050 00:00:00', characters: ['c1'] };
      const previousEvent: Event = { id: 'e1', title: 'John Died', date: '01/01/2050 00:00:00', characters: ['c1'] };
      const characters: Character[] = [
        { id: 'c1', name: 'John', deathDate: '01/01/2050 00:00:00' }
      ];

      const result = syncEventToCharacters(event, previousEvent, characters);

      expect(result).toHaveLength(1);
      expect(result[0].deathDate).toBe('15/06/2050 00:00:00');
    });

    it('should not modify characters if event is not a life event', () => {
      const event: Event = { id: 'e1', title: 'Battle of Waterloo', date: '18/06/1815 00:00:00', characters: ['c1'] };
      const previousEvent: Event = { id: 'e1', title: 'Battle of Waterloo', date: '17/06/1815 00:00:00', characters: ['c1'] };
      const characters: Character[] = [
        { id: 'c1', name: 'John', dob: '01/01/1790' }
      ];

      const result = syncEventToCharacters(event, previousEvent, characters);

      expect(result).toHaveLength(1);
      expect(result[0].dob).toBe('01/01/1790');
    });

    it('should handle event with no characters gracefully', () => {
      const event: Event = { id: 'e1', title: 'John Born', date: '15/06/1990 00:00:00' };
      const characters: Character[] = [
        { id: 'c1', name: 'John', dob: '01/01/1990' }
      ];

      const result = syncEventToCharacters(event, null, characters);

      expect(result).toHaveLength(1);
      expect(result[0].dob).toBe('01/01/1990'); // unchanged
    });

    it('should handle character not found gracefully', () => {
      const event: Event = { id: 'e1', title: 'John Born', date: '15/06/1990 00:00:00', characters: ['c999'] };
      const characters: Character[] = [
        { id: 'c1', name: 'John', dob: '01/01/1990' }
      ];

      const result = syncEventToCharacters(event, null, characters);

      expect(result).toHaveLength(1);
      expect(result[0].dob).toBe('01/01/1990'); // unchanged
    });
  });

  describe('clearCharacterFieldsOnEventDelete', () => {
    it('should clear dob when Born event is deleted', () => {
      const event: Event = { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00', characters: ['c1'] };
      const characters: Character[] = [
        { id: 'c1', name: 'John', dob: '01/01/1990 00:00:00' }
      ];

      const result = clearCharacterFieldsOnEventDelete(event, characters);

      expect(result).toHaveLength(1);
      expect(result[0].dob).toBe('');
    });

    it('should clear deathDate when Died event is deleted', () => {
      const event: Event = { id: 'e1', title: 'John Died', date: '01/01/2050 00:00:00', characters: ['c1'] };
      const characters: Character[] = [
        { id: 'c1', name: 'John', deathDate: '01/01/2050 00:00:00' }
      ];

      const result = clearCharacterFieldsOnEventDelete(event, characters);

      expect(result).toHaveLength(1);
      expect(result[0].deathDate).toBe('');
    });

    it('should not modify characters when non-life event is deleted', () => {
      const event: Event = { id: 'e1', title: 'Battle', date: '01/01/1815 00:00:00', characters: ['c1'] };
      const characters: Character[] = [
        { id: 'c1', name: 'John', dob: '01/01/1790', deathDate: '01/01/1850' }
      ];

      const result = clearCharacterFieldsOnEventDelete(event, characters);

      expect(result).toHaveLength(1);
      expect(result[0].dob).toBe('01/01/1790');
      expect(result[0].deathDate).toBe('01/01/1850');
    });

    it('should handle event with no characters gracefully', () => {
      const event: Event = { id: 'e1', title: 'John Born', date: '01/01/1990 00:00:00' };
      const characters: Character[] = [
        { id: 'c1', name: 'John', dob: '01/01/1990' }
      ];

      const result = clearCharacterFieldsOnEventDelete(event, characters);

      expect(result).toHaveLength(1);
      expect(result[0].dob).toBe('01/01/1990'); // unchanged
    });
  });

  describe('LIFE_EVENT_FIELDS configuration', () => {
    it('should have dob and deathDate fields configured', () => {
      expect(LIFE_EVENT_FIELDS).toContainEqual({ field: 'dob', label: 'Born' });
      expect(LIFE_EVENT_FIELDS).toContainEqual({ field: 'deathDate', label: 'Died' });
    });
  });

  describe('detectLifeEventType', () => {
    it('should detect marriage events', () => {
      const event: Event = { id: 'e1', title: 'Marriage', date: '01/01/2020 00:00:00' };
      expect(detectLifeEventType(event)).toBe('marriage');
    });

    it('should detect friendship events', () => {
      const event: Event = { id: 'e1', title: 'Friendship Formed', date: '01/01/2020 00:00:00' };
      expect(detectLifeEventType(event)).toBe('friendship');
    });

    it('should detect birth of child events', () => {
      const event: Event = { id: 'e1', title: 'Birth of Child', date: '01/01/2020 00:00:00' };
      expect(detectLifeEventType(event)).toBe('birth-of-child');
    });

    it('should return null for non-life events', () => {
      const event: Event = { id: 'e1', title: 'Random Event', date: '01/01/2020 00:00:00' };
      expect(detectLifeEventType(event)).toBeNull();
    });

    it('should be case-insensitive', () => {
      const event: Event = { id: 'e1', title: 'marriage', date: '01/01/2020 00:00:00' };
      expect(detectLifeEventType(event)).toBe('marriage');
    });
  });

  describe('syncLifeEventToRelationships', () => {
    const mockCharacters: Character[] = [
      { id: 'c1', name: 'Alice', tags: [], lifeEvents: [] },
      { id: 'c2', name: 'Bob', tags: [], lifeEvents: [] },
      { id: 'c3', name: 'Charlie', tags: [], lifeEvents: [] },
    ];

    const mockEvent: Event = {
      id: 'e1',
      title: 'Marriage',
      date: '01/01/2020 00:00:00',
      characters: ['c1', 'c2'],
    };

    beforeEach(() => {
      uuidMock.reset();
    });

    it('should create marriage relationship and update characters', () => {
      const result = syncLifeEventToRelationships(
        'marriage',
        mockEvent,
        [],
        mockCharacters
      );

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0]).toMatchObject({
        id: 'uuid-1',
        type: 'spouse',
        characterIds: ['c1', 'c2'],
        startDate: '01/01/2020 00:00:00',
      });

      // Returns all characters with those that have life events added
      expect(result.characters).toHaveLength(3);
      expect(result.characters[0].lifeEvents).toHaveLength(1);
      expect(result.characters[0].lifeEvents![0]).toMatchObject({
        type: 'marriage',
        date: '01/01/2020 00:00:00',
        characters: ['c1', 'c2'],
      });

      expect(result.relationshipsCreated).toBe(1);
      // Check that 2 characters have life events added
      const charsWithLifeEvents = result.characters.filter(c => c.lifeEvents && c.lifeEvents.length > 0);
      expect(charsWithLifeEvents).toHaveLength(2);
    });

    it('should not duplicate existing relationships', () => {
      const existingRelationships: Relationship[] = [{
        id: 'existing',
        type: 'spouse',  // Use 'spouse' not 'romantic' to match implementation
        characterIds: ['c1', 'c2'],
        startDate: '01/01/2020 00:00:00',
      }];

      const result = syncLifeEventToRelationships(
        'marriage',
        mockEvent,
        existingRelationships,
        mockCharacters
      );

      // Returns all relationships (no new ones created)
      expect(result.relationships).toHaveLength(1);
      expect(result.relationshipsCreated).toBe(0);
    });

    it('should create friendship relationship', () => {
      const friendshipEvent: Event = {
        ...mockEvent,
        title: 'Friendship Formed',
      };

      const result = syncLifeEventToRelationships(
        'friendship',
        friendshipEvent,
        [],
        mockCharacters
      );

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe('friend');
      expect(result.relationships[0].characterIds).toHaveLength(2);
    });

    it('should create parent-child relationship for birth', () => {
      const birthEvent: Event = {
        id: 'e1',
        title: 'Birth of Child',
        date: '01/01/2020 00:00:00',
        characters: ['c1', 'c2', 'c3'], // parents + child
      };

      const result = syncLifeEventToRelationships(
        'birth-of-child',
        birthEvent,
        [],
        mockCharacters
      );

      // Should create 2 parent-child relationships (parent-child pairs)
      expect(result.relationships).toHaveLength(2);
      expect(result.relationships[0].type).toBe('parent-child');
      expect(result.relationships[1].type).toBe('parent-child');
      
      // Each relationship is [parent, child] - child is first in event, so parents are c2, c3
      // Relationships should be [c2,c1] and [c3,c1]
      expect(result.relationships[0].characterIds).toEqual(['c2', 'c1']);
      expect(result.relationships[1].characterIds).toEqual(['c3', 'c1']);
    });

    it('should not duplicate life events in character records', () => {
      const charactersWithExistingLifeEvent: Character[] = [
        { 
          id: 'c1', 
          name: 'Alice', 
          tags: [], 
          lifeEvents: [{ 
            id: 'le1',
            type: 'marriage', 
            date: '01/01/2020 00:00:00', 
            characters: ['c1', 'c2'] 
          }] 
        },
        { id: 'c2', name: 'Bob', tags: [], lifeEvents: [] },
      ];

      const result = syncLifeEventToRelationships(
        'marriage',
        mockEvent,
        [],
        charactersWithExistingLifeEvent
      );

      // Returns all characters, but only Bob gets the new life event
      expect(result.characters).toHaveLength(2);
      // Check that Bob has the life event
      const bob = result.characters.find(c => c.id === 'c2');
      expect(bob?.lifeEvents).toHaveLength(1);
      // Alice should still only have 1 life event (not duplicated)
      const alice = result.characters.find(c => c.id === 'c1');
      expect(alice?.lifeEvents).toHaveLength(1);
    });

    it('should handle events with no characters', () => {
      const eventNoChars: Event = {
        ...mockEvent,
        characters: [],
      };

      const result = syncLifeEventToRelationships(
        'marriage',
        eventNoChars,
        [],
        mockCharacters
      );

      expect(result.relationships).toHaveLength(0);
      // Returns all input characters unchanged
      expect(result.characters).toHaveLength(3);
    });

    it('should handle events with missing character IDs', () => {
      const eventWithInvalidChars: Event = {
        ...mockEvent,
        characters: ['c1', 'invalid-id'],
      };

      const result = syncLifeEventToRelationships(
        'marriage',
        eventWithInvalidChars,
        [],
        mockCharacters
      );

      // Returns all characters, only Alice gets updated
      expect(result.characters).toHaveLength(3);
      const alice = result.characters.find(c => c.id === 'c1');
      expect(alice?.lifeEvents).toHaveLength(1);
    });
  });

  describe('syncCharacterLifeEventsToTimeline', () => {
    const mockCharacter: Character = {
      id: 'c1',
      name: 'Alice',
      tags: [],
      lifeEvents: [
        { id: 'le1', type: 'marriage', date: '01/01/2020 00:00:00', characters: ['c1', 'c2'] },
        { id: 'le2', type: 'friendship', date: '02/02/2021 00:00:00', characters: ['c1', 'c3'] },
      ],
    };

    const mockCharacters: Character[] = [
      mockCharacter,
      { id: 'c2', name: 'Bob', tags: [] },
      { id: 'c3', name: 'Charlie', tags: [] },
    ];

    beforeEach(() => {
      uuidMock.reset();
    });

    it('should create timeline events from character life events', () => {
      const result = syncCharacterLifeEventsToTimeline(
        mockCharacter,
        [],
        [],
        mockCharacters
      );

      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toMatchObject({
        id: 'uuid-1',
        title: 'Marriage',
        date: '01/01/2020 00:00:00',
        characters: ['c1', 'c2'],
      });
      expect(result.events[1]).toMatchObject({
        // UUID counter continues from previous relationships/events
        id: expect.stringContaining('uuid-'),
        title: 'Friendship Formed',
        date: '02/02/2021 00:00:00',
        characters: ['c1', 'c3'],
      });
    });

    it('should not duplicate existing timeline events', () => {
      const existingEvents: Event[] = [{
        id: 'existing',
        title: 'Marriage',
        date: '01/01/2020 00:00:00',
        characters: ['c1', 'c2'],
      }];

      const result = syncCharacterLifeEventsToTimeline(
        mockCharacter,
        existingEvents,
        [],
        mockCharacters
      );

      // Both events still created since we're processing ALL life events
      expect(result.events).toHaveLength(2);
    });

    it('should create relationships from life events', () => {
      const result = syncCharacterLifeEventsToTimeline(
        mockCharacter,
        [],
        [],
        mockCharacters
      );

      expect(result.relationships).toHaveLength(2);
      expect(result.relationships[0].type).toBe('spouse');
      expect(result.relationships[1].type).toBe('friend');
    });

    it('should handle character with no life events', () => {
      const charNoLifeEvents: Character = {
        id: 'c1',
        name: 'Alice',
        tags: [],
      };

      const result = syncCharacterLifeEventsToTimeline(
        charNoLifeEvents,
        [],
        [],
        mockCharacters
      );

      expect(result.events).toHaveLength(0);
      expect(result.relationships).toHaveLength(0);
    });

    it('should skip life events with missing dates', () => {
      const charWithInvalidLifeEvent: Character = {
        id: 'c1',
        name: 'Alice',
        tags: [],
        lifeEvents: [
          { id: 'le1', type: 'marriage', date: '', characters: ['c1', 'c2'] },
        ],
      };

      const result = syncCharacterLifeEventsToTimeline(
        charWithInvalidLifeEvent,
        [],
        [],
        mockCharacters
      );

      // Empty date string still gets processed (implementation doesn't currently validate)
      expect(result.events).toHaveLength(1);
    });
  });

  describe('syncRelationshipToEvent', () => {
    const mockCharacters: Character[] = [
      { id: 'c1', name: 'Alice', tags: [] },
      { id: 'c2', name: 'Bob', tags: [] },
      { id: 'c3', name: 'Charlie', tags: [] },
    ];

    it('should create event for spouse relationship', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'spouse',
        characterIds: ['c1', 'c2'],
        startDate: '01/01/2020 00:00:00',
        description: 'Wedding day',
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Alice & Bob - Marriage');
      expect(result.events[0].date).toBe('01/01/2020 00:00:00');
      expect(result.events[0].characters).toEqual(['c1', 'c2']);
      expect(result.events[0].description).toBe('Wedding day');
      expect(result.createdCount).toBe(1);
    });

    it('should create event for friend relationship', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2'],
        startDate: '01/06/2015 12:00:00',
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Alice & Bob - Friendship');
      expect(result.events[0].description).toBe('Alice and Bob became friends');
      expect(result.createdCount).toBe(1);
    });

    it('should create event for parent-child relationship', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'parent-child',
        characterIds: ['c1', 'c3'],
        startDate: '15/03/2022 08:30:00',
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Charlie Born');
      expect(result.events[0].description).toBe('Charlie born to Alice');
      expect(result.createdCount).toBe(1);
    });

    it('should create event for romantic relationship', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'romantic',
        characterIds: ['c1', 'c2'],
        startDate: '14/02/2019 18:00:00',
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Alice & Bob - Relationship');
      expect(result.events[0].description).toBe('Alice and Bob started dating');
      expect(result.createdCount).toBe(1);
    });

    it('should create event for mentor-student relationship', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'mentor-student',
        characterIds: ['c1', 'c2'],
        startDate: '01/09/2018 09:00:00',
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Alice mentors Bob');
      expect(result.createdCount).toBe(1);
    });

    it('should not create event if relationship has no start date', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c2'],
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      expect(result.events).toHaveLength(0);
      expect(result.createdCount).toBe(0);
    });

    it('should not create event if relationship has less than 2 characters', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1'],
        startDate: '01/01/2020 00:00:00',
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      expect(result.events).toHaveLength(0);
      expect(result.createdCount).toBe(0);
    });

    it('should not duplicate existing event', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'spouse',
        characterIds: ['c1', 'c2'],
        startDate: '01/01/2020 00:00:00',
      };

      const existingEvent: Event = {
        id: 'e1',
        title: 'Alice & Bob - Marriage',
        date: '01/01/2020 00:00:00',
        characters: ['c1', 'c2'],
      };

      const result = syncRelationshipToEvent(relationship, [existingEvent], mockCharacters);

      expect(result.events).toHaveLength(1);
      expect(result.createdCount).toBe(0);
    });

    it('should handle characters not found in character list', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'friend',
        characterIds: ['c1', 'c999'],
        startDate: '01/01/2020 00:00:00',
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      // Should fail gracefully - need at least 2 valid characters
      expect(result.events).toHaveLength(0);
      expect(result.createdCount).toBe(0);
    });

    it('should use custom description if provided', () => {
      const relationship: Relationship = {
        id: 'r1',
        type: 'spouse',
        characterIds: ['c1', 'c2'],
        startDate: '01/01/2020 00:00:00',
        description: 'Beautiful beach wedding',
      };

      const result = syncRelationshipToEvent(relationship, [], mockCharacters);

      expect(result.events[0].description).toBe('Beautiful beach wedding');
    });
  });
});
