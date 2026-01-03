import { describe, it, expect } from 'vitest';
import {
  isValidRelationship,
  getCharacterRelationships,
  getConnectedCharacters,
  findRelationshipBetween,
  getRelationshipsByType,
  hasRelationshipType,
  generateRelationshipDescription,
  validateRelationshipDates,
} from './relationship';
import { Relationship, Character } from '../types';

describe('relationship utils', () => {
  const mockCharacters: Character[] = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
    { id: '4', name: 'Diana' },
  ];

  const mockRelationships: Relationship[] = [
    {
      id: 'r1',
      type: 'friend',
      characterIds: ['1', '2'],
      description: 'Best friends',
    },
    {
      id: 'r2',
      type: 'spouse',
      characterIds: ['1', '3'],
      description: 'Married',
    },
    {
      id: 'r3',
      type: 'parent-child',
      characterIds: ['1', '4'],
      description: 'Alice is Diana\'s mother',
    },
    {
      id: 'r4',
      type: 'friend',
      characterIds: ['2', '3', '4'],
      description: 'Friend group',
    },
  ];

  describe('isValidRelationship', () => {
    it('should return true for relationship with 2 characters', () => {
      expect(isValidRelationship({ characterIds: ['1', '2'] })).toBe(true);
    });

    it('should return true for relationship with more than 2 characters', () => {
      expect(isValidRelationship({ characterIds: ['1', '2', '3'] })).toBe(true);
    });

    it('should return false for relationship with less than 2 characters', () => {
      expect(isValidRelationship({ characterIds: ['1'] })).toBe(false);
    });

    it('should return false for relationship with no characters', () => {
      expect(isValidRelationship({ characterIds: [] })).toBe(false);
    });

    it('should return false for relationship with undefined characterIds', () => {
      expect(isValidRelationship({})).toBe(false);
    });
  });

  describe('getCharacterRelationships', () => {
    it('should return all relationships for a character', () => {
      const results = getCharacterRelationships('1', mockRelationships);
      expect(results).toHaveLength(3);
      expect(results.map(r => r.id)).toEqual(['r1', 'r2', 'r3']);
    });

    it('should return empty array if character has no relationships', () => {
      const results = getCharacterRelationships('999', mockRelationships);
      expect(results).toHaveLength(0);
    });

    it('should include group relationships', () => {
      const results = getCharacterRelationships('2', mockRelationships);
      expect(results).toHaveLength(2);
      expect(results.some(r => r.id === 'r4')).toBe(true);
    });
  });

  describe('getConnectedCharacters', () => {
    it('should return all characters connected to a given character', () => {
      const results = getConnectedCharacters('1', mockRelationships, mockCharacters);
      expect(results).toHaveLength(3);
      expect(results.map(c => c.id).sort()).toEqual(['2', '3', '4']);
    });

    it('should not include the character itself', () => {
      const results = getConnectedCharacters('1', mockRelationships, mockCharacters);
      expect(results.find(c => c.id === '1')).toBeUndefined();
    });

    it('should return empty array if character has no connections', () => {
      const results = getConnectedCharacters('999', mockRelationships, mockCharacters);
      expect(results).toHaveLength(0);
    });

    it('should handle group relationships correctly', () => {
      const results = getConnectedCharacters('2', mockRelationships, mockCharacters);
      expect(results).toHaveLength(3); // Alice (through r1), Charlie and Diana (through r4)
    });
  });

  describe('findRelationshipBetween', () => {
    it('should find direct relationship between two characters', () => {
      const results = findRelationshipBetween('1', '2', mockRelationships);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('r1');
    });

    it('should find multiple relationships between two characters', () => {
      const results = findRelationshipBetween('2', '3', mockRelationships);
      expect(results).toHaveLength(1); // They're both in r4
      expect(results[0].id).toBe('r4');
    });

    it('should return empty array if no relationship exists', () => {
      const results = findRelationshipBetween('1', '999', mockRelationships);
      expect(results).toHaveLength(0);
    });

    it('should work regardless of character order', () => {
      const results1 = findRelationshipBetween('1', '2', mockRelationships);
      const results2 = findRelationshipBetween('2', '1', mockRelationships);
      expect(results1).toEqual(results2);
    });
  });

  describe('getRelationshipsByType', () => {
    it('should return all relationships of a specific type', () => {
      const results = getRelationshipsByType('friend', mockRelationships);
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id).sort()).toEqual(['r1', 'r4']);
    });

    it('should return empty array if no relationships of that type exist', () => {
      const results = getRelationshipsByType('enemy', mockRelationships);
      expect(results).toHaveLength(0);
    });

    it('should return single relationship for unique type', () => {
      const results = getRelationshipsByType('spouse', mockRelationships);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('r2');
    });
  });

  describe('hasRelationshipType', () => {
    it('should return true if characters have specific relationship type', () => {
      expect(hasRelationshipType('1', '2', 'friend', mockRelationships)).toBe(true);
      expect(hasRelationshipType('1', '3', 'spouse', mockRelationships)).toBe(true);
    });

    it('should return false if characters do not have specific relationship type', () => {
      expect(hasRelationshipType('1', '2', 'enemy', mockRelationships)).toBe(false);
    });

    it('should return false if characters have no relationship', () => {
      expect(hasRelationshipType('1', '999', 'friend', mockRelationships)).toBe(false);
    });

    it('should work regardless of character order', () => {
      expect(hasRelationshipType('1', '2', 'friend', mockRelationships)).toBe(true);
      expect(hasRelationshipType('2', '1', 'friend', mockRelationships)).toBe(true);
    });
  });

  describe('generateRelationshipDescription', () => {
    it('should generate description for parent-child', () => {
      expect(generateRelationshipDescription('parent-child', ['Alice', 'Bob']))
        .toBe('Alice is the parent of Bob');
    });

    it('should generate description for sibling', () => {
      expect(generateRelationshipDescription('sibling', ['Alice', 'Bob']))
        .toBe('Alice and Bob are siblings');
    });

    it('should generate description for spouse', () => {
      expect(generateRelationshipDescription('spouse', ['Alice', 'Bob']))
        .toBe('Alice and Bob are married');
    });

    it('should generate description for friend', () => {
      expect(generateRelationshipDescription('friend', ['Alice', 'Bob']))
        .toBe('Alice and Bob are friends');
    });

    it('should handle multiple characters in parent-child', () => {
      expect(generateRelationshipDescription('parent-child', ['Alice', 'Bob', 'Charlie']))
        .toBe('Alice is the parent of Bob, Charlie');
    });

    it('should handle empty character array', () => {
      expect(generateRelationshipDescription('friend', [])).toBe('');
    });

    it('should handle other relationship type', () => {
      expect(generateRelationshipDescription('other', ['Alice', 'Bob']))
        .toBe('Alice and Bob have a relationship');
    });
  });

  describe('validateRelationshipDates', () => {
    it('should return true if end date is after start date', () => {
      expect(validateRelationshipDates('01/01/2020', '31/12/2020')).toBe(true);
    });

    it('should return true if dates are the same', () => {
      expect(validateRelationshipDates('01/01/2020', '01/01/2020')).toBe(true);
    });

    it('should return false if end date is before start date', () => {
      expect(validateRelationshipDates('31/12/2020', '01/01/2020')).toBe(false);
    });

    it('should return true if only start date is provided', () => {
      expect(validateRelationshipDates('01/01/2020', undefined)).toBe(true);
    });

    it('should return true if only end date is provided', () => {
      expect(validateRelationshipDates(undefined, '31/12/2020')).toBe(true);
    });

    it('should return true if neither date is provided', () => {
      expect(validateRelationshipDates(undefined, undefined)).toBe(true);
    });

    it('should handle dates across years correctly', () => {
      expect(validateRelationshipDates('01/12/2019', '01/01/2020')).toBe(true);
      expect(validateRelationshipDates('01/01/2020', '01/12/2019')).toBe(false);
    });
  });
});
