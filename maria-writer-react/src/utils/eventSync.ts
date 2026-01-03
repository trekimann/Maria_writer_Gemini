import { Character, Event, Relationship, LifeEventType, LifeEvent } from '../types';
import { normalizeDDMMYYYYHHMMSS } from './date';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for life event fields that should auto-create/update timeline events
 */
export const LIFE_EVENT_FIELDS: Array<{ field: keyof Character; label: string }> = [
  { field: 'dob', label: 'Born' },
  { field: 'deathDate', label: 'Died' },
];

/**
 * Generates the expected event title for a character life event
 */
export const getLifeEventTitle = (charName: string, label: string): string => {
  return `${charName} ${label}`;
};

/**
 * Finds an existing life event for a character based on the event label
 * This looks for events that match the pattern "{CharName} {Label}" and are linked to the character
 */
export const findExistingLifeEvent = (
  events: Event[],
  characterId: string,
  characterName: string,
  label: string
): Event | undefined => {
  const expectedTitle = getLifeEventTitle(characterName, label);
  return events.find(e =>
    e.title === expectedTitle &&
    (e.characters || []).includes(characterId)
  );
};

/**
 * Result of syncing character events
 */
export interface SyncResult {
  events: Event[];
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
}

/**
 * Extended sync result that includes relationships
 */
export interface ExtendedSyncResult extends SyncResult {
  relationships: Relationship[];
  characters: Character[];
  relationshipsCreated: number;
  relationshipsUpdated: number;
  relationshipsDeleted: number;
}

/**
 * Syncs character life fields (dob, deathDate) to timeline events.
 * - Creates new events if the field has a value and no event exists
 * - Updates existing events if the field value changed
 * - Removes events if the field was cleared
 * 
 * @param character - The updated character data
 * @param previousCharacter - The character data before the update (null if new)
 * @param currentEvents - The current list of all events
 * @returns Updated events array and counts of changes
 */
export const syncCharacterToEvents = (
  character: Character,
  previousCharacter: Character | null,
  currentEvents: Event[]
): SyncResult => {
  let events = [...currentEvents];
  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;

  // Handle character name changes first - update event titles BEFORE looking for events by new name
  if (previousCharacter && previousCharacter.name !== character.name) {
    for (const { label } of LIFE_EVENT_FIELDS) {
      const oldTitle = getLifeEventTitle(previousCharacter.name, label);
      const newTitle = getLifeEventTitle(character.name, label);
      
      events = events.map(e => {
        if (e.title === oldTitle && (e.characters || []).includes(character.id)) {
          updatedCount++;
          return {
            ...e,
            title: newTitle,
            description: newTitle,
          };
        }
        return e;
      });
    }
  }

  for (const { field, label } of LIFE_EVENT_FIELDS) {
    const newValue = character[field] as string | undefined;
    const oldValue = previousCharacter?.[field] as string | undefined;
    
    // Normalize the new date value
    const normalizedNewValue = newValue ? normalizeDDMMYYYYHHMMSS(newValue) : null;
    
    // Find existing event for this life event type (now using updated names)
    const existingEvent = findExistingLifeEvent(events, character.id, character.name, label);
    
    if (normalizedNewValue) {
      // We have a date value
      if (existingEvent) {
        // Update existing event if date changed
        if (existingEvent.date !== normalizedNewValue) {
          events = events.map(e =>
            e.id === existingEvent.id
              ? { ...e, date: normalizedNewValue }
              : e
          );
          updatedCount++;
        }
      } else {
        // Create new event
        const newEvent: Event = {
          id: uuidv4(),
          title: getLifeEventTitle(character.name, label),
          date: normalizedNewValue,
          description: getLifeEventTitle(character.name, label),
          characters: [character.id],
        };
        events.push(newEvent);
        createdCount++;
      }
    } else if (existingEvent && oldValue) {
      // Field was cleared - remove the event
      events = events.filter(e => e.id !== existingEvent.id);
      deletedCount++;
    }
  }

  return { events, createdCount, updatedCount, deletedCount };
};

/**
 * Checks if an event is a "Born" event for a specific character
 */
export const isBornEvent = (event: Event, characterId: string, characterName: string): boolean => {
  return event.title === getLifeEventTitle(characterName, 'Born') &&
    (event.characters || []).includes(characterId);
};

/**
 * Checks if an event is a "Died" event for a specific character
 */
export const isDiedEvent = (event: Event, characterId: string, characterName: string): boolean => {
  return event.title === getLifeEventTitle(characterName, 'Died') &&
    (event.characters || []).includes(characterId);
};

/**
 * Syncs a timeline event back to the corresponding character's profile.
 * When a "Born" or "Died" event is updated, this updates the character's dob/deathDate.
 * 
 * @param event - The updated event
 * @param _previousEvent - The event data before the update (null if new) - reserved for future use
 * @param currentCharacters - The current list of all characters
 * @returns Updated characters array with synced dates
 */
export const syncEventToCharacters = (
  event: Event,
  _previousEvent: Event | null,
  currentCharacters: Character[]
): Character[] => {
  let characters = [...currentCharacters];
  
  // Only sync if the event has characters linked
  if (!event.characters || event.characters.length === 0) {
    return characters;
  }

  // Check each character linked to this event
  for (const characterId of event.characters) {
    const character = characters.find(c => c.id === characterId);
    if (!character) continue;

    // Check if this is a "Born" event for this character
    if (isBornEvent(event, characterId, character.name)) {
      // Sync the event date to the character's dob
      const normalizedDate = event.date ? normalizeDDMMYYYYHHMMSS(event.date) || event.date : '';
      if (character.dob !== normalizedDate) {
        characters = characters.map(c =>
          c.id === characterId
            ? { ...c, dob: normalizedDate }
            : c
        );
      }
    }
    
    // Check if this is a "Died" event for this character
    if (isDiedEvent(event, characterId, character.name)) {
      // Sync the event date to the character's deathDate
      const normalizedDate = event.date ? normalizeDDMMYYYYHHMMSS(event.date) || event.date : '';
      if (character.deathDate !== normalizedDate) {
        characters = characters.map(c =>
          c.id === characterId
            ? { ...c, deathDate: normalizedDate }
            : c
        );
      }
    }
  }

  return characters;
};

/**
 * When an event is deleted, this clears the corresponding character fields.
 * For example, deleting a "Born" event clears the character's dob.
 * 
 * @param event - The event being deleted
 * @param currentCharacters - The current list of all characters
 * @returns Updated characters array with cleared dates
 */
export const clearCharacterFieldsOnEventDelete = (
  event: Event,
  currentCharacters: Character[]
): Character[] => {
  let characters = [...currentCharacters];
  
  if (!event.characters || event.characters.length === 0) {
    return characters;
  }

  for (const characterId of event.characters) {
    const character = characters.find(c => c.id === characterId);
    if (!character) continue;

    // Check if this is a "Born" event - clear dob
    if (isBornEvent(event, characterId, character.name)) {
      characters = characters.map(c =>
        c.id === characterId
          ? { ...c, dob: '' }
          : c
      );
    }
    
    // Check if this is a "Died" event - clear deathDate
    if (isDiedEvent(event, characterId, character.name)) {
      characters = characters.map(c =>
        c.id === characterId
          ? { ...c, deathDate: '' }
          : c
      );
    }
  }

  return characters;
};

/**
 * Syncs a life event (marriage, friendship, birth-of-child) to create appropriate relationships
 * and update character records.
 * 
 * @param lifeEventType - Type of life event (marriage, friendship, birth-of-child)
 * @param eventData - The timeline event data
 * @param currentRelationships - Current list of relationships
 * @param currentCharacters - Current list of characters
 * @returns Extended sync result with updated relationships and characters
 */
export const syncLifeEventToRelationships = (
  lifeEventType: LifeEventType,
  eventData: Event,
  currentRelationships: Relationship[],
  currentCharacters: Character[]
): ExtendedSyncResult => {
  let relationships = [...currentRelationships];
  let characters = [...currentCharacters];
  let relationshipsCreated = 0;
  let relationshipsUpdated = 0;
  
  const characterIds = eventData.characters || [];
  
  if (lifeEventType === 'marriage' && characterIds.length === 2) {
    // Check if spouse relationship already exists
    const existingRel = relationships.find(r => 
      r.type === 'spouse' &&
      r.characterIds.length === 2 &&
      r.characterIds.includes(characterIds[0]) &&
      r.characterIds.includes(characterIds[1])
    );
    
    if (!existingRel) {
      // Create spouse relationship
      const newRelationship: Relationship = {
        id: uuidv4(),
        type: 'spouse',
        characterIds,
        description: `Married on ${eventData.date}`,
        startDate: eventData.date,
      };
      relationships.push(newRelationship);
      relationshipsCreated++;
    }
    
    // Update characters with marriage life event
    characterIds.forEach(charId => {
      const character = characters.find(c => c.id === charId);
      if (character) {
        const lifeEvent: LifeEvent = {
          id: uuidv4(),
          type: 'marriage',
          date: eventData.date || '',
          characters: characterIds,
          notes: eventData.description,
        };
        
        // Check if life event already exists
        const hasLifeEvent = character.lifeEvents?.some(le => 
          le.type === 'marriage' &&
          le.date === eventData.date &&
          le.characters.length === characterIds.length &&
          le.characters.every(id => characterIds.includes(id))
        );
        
        if (!hasLifeEvent) {
          characters = characters.map(c =>
            c.id === charId
              ? { ...c, lifeEvents: [...(c.lifeEvents || []), lifeEvent] }
              : c
          );
        }
      }
    });
  } else if (lifeEventType === 'friendship' && characterIds.length >= 2) {
    // Create friend relationship (handles group friendships)
    const existingRel = relationships.find(r =>
      r.type === 'friend' &&
      r.characterIds.length === characterIds.length &&
      r.characterIds.every(id => characterIds.includes(id))
    );
    
    if (!existingRel) {
      const newRelationship: Relationship = {
        id: uuidv4(),
        type: 'friend',
        characterIds,
        description: `Became friends on ${eventData.date}`,
        startDate: eventData.date,
      };
      relationships.push(newRelationship);
      relationshipsCreated++;
    }
    
    // Update characters with friendship life event
    characterIds.forEach(charId => {
      const character = characters.find(c => c.id === charId);
      if (character) {
        const lifeEvent: LifeEvent = {
          id: uuidv4(),
          type: 'friendship',
          date: eventData.date || '',
          characters: characterIds,
          notes: eventData.description,
        };
        
        const hasLifeEvent = character.lifeEvents?.some(le =>
          le.type === 'friendship' &&
          le.date === eventData.date &&
          le.characters.length === characterIds.length &&
          le.characters.every(id => characterIds.includes(id))
        );
        
        if (!hasLifeEvent) {
          characters = characters.map(c =>
            c.id === charId
              ? { ...c, lifeEvents: [...(c.lifeEvents || []), lifeEvent] }
              : c
          );
        }
      }
    });
  } else if (lifeEventType === 'birth-of-child' && characterIds.length >= 2) {
    // First character is child, rest are parents
    const childId = characterIds[0];
    const parentIds = characterIds.slice(1);
    
    // Create parent-child relationships
    parentIds.forEach(parentId => {
      const existingRel = relationships.find(r =>
        r.type === 'parent-child' &&
        r.characterIds.length === 2 &&
        r.characterIds[0] === parentId &&
        r.characterIds[1] === childId
      );
      
      if (!existingRel) {
        const newRelationship: Relationship = {
          id: uuidv4(),
          type: 'parent-child',
          characterIds: [parentId, childId],
          description: 'Parent-child relationship',
          startDate: eventData.date,
        };
        relationships.push(newRelationship);
        relationshipsCreated++;
      }
    });
    
    // Update all characters with birth life event
    characterIds.forEach(charId => {
      const character = characters.find(c => c.id === charId);
      if (character) {
        const lifeEvent: LifeEvent = {
          id: uuidv4(),
          type: 'birth-of-child',
          date: eventData.date || '',
          characters: characterIds,
          childId: childId,
          notes: eventData.description,
        };
        
        const hasLifeEvent = character.lifeEvents?.some(le =>
          le.type === 'birth-of-child' &&
          le.date === eventData.date &&
          le.childId === childId
        );
        
        if (!hasLifeEvent) {
          characters = characters.map(c =>
            c.id === charId
              ? { ...c, lifeEvents: [...(c.lifeEvents || []), lifeEvent] }
              : c
          );
        }
      }
    });
  }
  
  return {
    events: [eventData],
    relationships,
    characters,
    createdCount: 0,
    updatedCount: 0,
    deletedCount: 0,
    relationshipsCreated,
    relationshipsUpdated,
    relationshipsDeleted: 0,
  };
};

/**
 * Detects if an event is a life event based on its properties
 * 
 * @param event - The event to check
 * @returns Life event type if detected, null otherwise
 */
export const detectLifeEventType = (event: Event): LifeEventType | null => {
  const title = event.title.toLowerCase();
  
  if (title.includes('marriage') || title.includes('married') || title === 'marriage') {
    return 'marriage';
  }
  if (title.includes('friendship') || title.includes('friend')) {
    return 'friendship';
  }
  if (title.includes('birth') || title.includes('child')) {
    return 'birth-of-child';
  }
  
  return null;
};

/**
 * Syncs life events from character records to relationships and timeline events
 * This ensures consistency when characters are updated with life events
 * 
 * @param character - The updated character
 * @param currentEvents - Current list of events
 * @param currentRelationships - Current list of relationships
 * @param allCharacters - All characters (for name lookup)
 * @returns Extended sync result
 */
export const syncCharacterLifeEventsToTimeline = (
  character: Character,
  currentEvents: Event[],
  currentRelationships: Relationship[],
  allCharacters: Character[]
): ExtendedSyncResult => {
  let events = [...currentEvents];
  let relationships = [...currentRelationships];
  let characters = [...allCharacters];
  let createdCount = 0;
  let relationshipsCreated = 0;
  
  const lifeEvents = character.lifeEvents || [];
  
  for (const lifeEvent of lifeEvents) {
    // Check if timeline event exists for this life event
    const eventExists = events.some(e =>
      e.date === lifeEvent.date &&
      e.characters?.includes(character.id) &&
      detectLifeEventType(e) === lifeEvent.type
    );
    
    if (!eventExists) {
      // Create timeline event
      let title = '';
      if (lifeEvent.type === 'marriage') {
        title = 'Marriage';
      } else if (lifeEvent.type === 'friendship') {
        title = 'Friendship Formed';
      } else if (lifeEvent.type === 'birth-of-child') {
        title = 'Birth of Child';
      }
      
      const newEvent: Event = {
        id: uuidv4(),
        title,
        date: lifeEvent.date,
        description: lifeEvent.notes || title,
        characters: lifeEvent.characters,
      };
      
      events.push(newEvent);
      createdCount++;
      
      // Also create relationship
      const syncResult = syncLifeEventToRelationships(
        lifeEvent.type,
        newEvent,
        relationships,
        characters
      );
      
      relationships = syncResult.relationships;
      characters = syncResult.characters;
      relationshipsCreated += syncResult.relationshipsCreated;
    }
  }
  
  return {
    events,
    relationships,
    characters,
    createdCount,
    updatedCount: 0,
    deletedCount: 0,
    relationshipsCreated,
    relationshipsUpdated: 0,
    relationshipsDeleted: 0,
  };
};

/**
 * Syncs a relationship to create a corresponding timeline event.
 * When adding a relationship, this creates an event marking when it started.
 * 
 * @param relationship - The relationship being added
 * @param currentEvents - Current list of events
 * @param allCharacters - All characters (for name lookup)
 * @returns Updated events array and count of changes
 */
export const syncRelationshipToEvent = (
  relationship: Relationship,
  currentEvents: Event[],
  allCharacters: Character[]
): SyncResult => {
  let events = [...currentEvents];
  let createdCount = 0;
  
  // Only create an event if the relationship has a start date
  if (!relationship.startDate || relationship.characterIds.length < 2) {
    return { events, createdCount, updatedCount: 0, deletedCount: 0 };
  }
  
  // Get character names for the event title
  const characterNames = relationship.characterIds
    .map(id => allCharacters.find(c => c.id === id)?.name)
    .filter(name => name !== undefined) as string[];
  
  if (characterNames.length < 2) {
    return { events, createdCount, updatedCount: 0, deletedCount: 0 };
  }
  
  // Create event title based on relationship type
  let title = '';
  let description = relationship.description || '';
  
  switch (relationship.type) {
    case 'spouse':
      title = `${characterNames.join(' & ')} - Marriage`;
      description = description || `${characterNames.join(' and ')} got married`;
      break;
    case 'parent-child':
      title = `${characterNames[1]} Born`;
      description = description || `${characterNames[1]} born to ${characterNames[0]}`;
      break;
    case 'friend':
      title = `${characterNames.join(' & ')} - Friendship`;
      description = description || `${characterNames.join(' and ')} became friends`;
      break;
    case 'romantic':
      title = `${characterNames.join(' & ')} - Relationship`;
      description = description || `${characterNames.join(' and ')} started dating`;
      break;
    case 'sibling':
      title = `${characterNames.join(' & ')} - Siblings`;
      description = description || `${characterNames.join(' and ')} are siblings`;
      break;
    case 'colleague':
      title = `${characterNames.join(' & ')} - Colleagues`;
      description = description || `${characterNames.join(' and ')} became colleagues`;
      break;
    case 'mentor-student':
      title = `${characterNames[0]} mentors ${characterNames[1]}`;
      description = description || `${characterNames[0]} became ${characterNames[1]}'s mentor`;
      break;
    case 'rival':
      title = `${characterNames.join(' vs ')} - Rivalry`;
      description = description || `${characterNames.join(' and ')} became rivals`;
      break;
    case 'enemy':
      title = `${characterNames.join(' vs ')} - Enmity`;
      description = description || `${characterNames.join(' and ')} became enemies`;
      break;
    case 'family':
      title = `${characterNames.join(' & ')} - Family Connection`;
      description = description || `${characterNames.join(' and ')} are family`;
      break;
    case 'acquaintance':
      title = `${characterNames.join(' & ')} - Met`;
      description = description || `${characterNames.join(' and ')} met`;
      break;
    default:
      title = `${characterNames.join(' & ')} - ${relationship.type}`;
      description = description || `${characterNames.join(' and ')} relationship: ${relationship.type}`;
  }
  
  // Check if an event already exists for this relationship
  const eventExists = events.some(e =>
    e.title === title &&
    e.date === relationship.startDate &&
    e.characters?.length === relationship.characterIds.length &&
    e.characters?.every(id => relationship.characterIds.includes(id))
  );
  
  if (!eventExists) {
    const newEvent: Event = {
      id: uuidv4(),
      title,
      date: relationship.startDate,
      description,
      characters: relationship.characterIds,
    };
    
    events.push(newEvent);
    createdCount++;
  }
  
  return { events, createdCount, updatedCount: 0, deletedCount: 0 };
};
