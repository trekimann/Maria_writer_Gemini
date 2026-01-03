import { Character, Event } from '../types';
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
