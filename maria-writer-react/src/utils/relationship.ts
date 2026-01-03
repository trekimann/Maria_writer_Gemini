import { Relationship, Character, RelationshipType } from '../types';

/**
 * Validates if a relationship has at least 2 characters
 */
export const isValidRelationship = (relationship: Partial<Relationship>): boolean => {
  return (relationship.characterIds?.length ?? 0) >= 2;
};

/**
 * Gets all relationships for a specific character
 */
export const getCharacterRelationships = (
  characterId: string,
  relationships: Relationship[]
): Relationship[] => {
  return relationships.filter(rel => rel.characterIds.includes(characterId));
};

/**
 * Gets all characters connected to a given character through relationships
 */
export const getConnectedCharacters = (
  characterId: string,
  relationships: Relationship[],
  characters: Character[]
): Character[] => {
  const connectedIds = new Set<string>();
  
  relationships
    .filter(rel => rel.characterIds.includes(characterId))
    .forEach(rel => {
      rel.characterIds.forEach(id => {
        if (id !== characterId) {
          connectedIds.add(id);
        }
      });
    });
  
  return characters.filter(char => connectedIds.has(char.id));
};

/**
 * Finds relationships between two specific characters
 */
export const findRelationshipBetween = (
  characterId1: string,
  characterId2: string,
  relationships: Relationship[]
): Relationship[] => {
  return relationships.filter(rel => 
    rel.characterIds.includes(characterId1) && 
    rel.characterIds.includes(characterId2)
  );
};

/**
 * Gets relationships by type
 */
export const getRelationshipsByType = (
  type: RelationshipType,
  relationships: Relationship[]
): Relationship[] => {
  return relationships.filter(rel => rel.type === type);
};

/**
 * Checks if two characters have a specific type of relationship
 */
export const hasRelationshipType = (
  characterId1: string,
  characterId2: string,
  type: RelationshipType,
  relationships: Relationship[]
): boolean => {
  return relationships.some(rel => 
    rel.type === type &&
    rel.characterIds.includes(characterId1) && 
    rel.characterIds.includes(characterId2)
  );
};

/**
 * Creates a relationship description based on type and characters
 */
export const generateRelationshipDescription = (
  type: RelationshipType,
  characterNames: string[]
): string => {
  if (characterNames.length === 0) return '';
  
  const names = characterNames.join(' and ');
  
  switch (type) {
    case 'parent-child':
      return `${characterNames[0]} is the parent of ${characterNames.slice(1).join(', ')}`;
    case 'sibling':
      return `${names} are siblings`;
    case 'spouse':
      return `${names} are married`;
    case 'romantic':
      return `${names} are in a romantic relationship`;
    case 'friend':
      return `${names} are friends`;
    case 'colleague':
      return `${names} work together`;
    case 'mentor-student':
      return `${characterNames[0]} mentors ${characterNames.slice(1).join(', ')}`;
    case 'rival':
      return `${names} are rivals`;
    case 'enemy':
      return `${names} are enemies`;
    case 'acquaintance':
      return `${names} are acquainted`;
    case 'family':
      return `${names} are family`;
    default:
      return `${names} have a relationship`;
  }
};

/**
 * Validates relationship dates (end date should be after start date)
 */
export const validateRelationshipDates = (startDate?: string, endDate?: string): boolean => {
  if (!startDate || !endDate) return true;
  
  // Simple string comparison works for DD/MM/YYYY format
  const [startDay, startMonth, startYear] = startDate.split('/').map(Number);
  const [endDay, endMonth, endYear] = endDate.split('/').map(Number);
  
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  
  return end >= start;
};
