import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Character, Event } from '../types';

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
});
