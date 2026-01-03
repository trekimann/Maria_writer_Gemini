import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppState, BookMetadata, Chapter, Character, Event, ViewMode, ContextMode, CodexTab, ModalType, LifeEventType } from '../types';
import { loadFromLocal, saveToLocal } from '../utils/storage';
import { normalizeDDMMYYYYHHMMSS } from '../utils/date';
import { syncCharacterToEvents, syncEventToCharacters, clearCharacterFieldsOnEventDelete } from '../utils/eventSync';

// Initial State
export const initialState: AppState = {
  meta: { title: "New Novel", author: "Anonymous", description: "", tags: [] },
  chapters: [
    { id: uuidv4(), title: "Chapter 1", content: "# Chapter 1\n\nIt was a dark and stormy night...", order: 0 }
  ],
  activeChapterId: null,
  characters: [],
  events: [],
  comments: {},
  timeline: { edges: [] },
  viewMode: 'preview',
  context: 'writer',
  activeCodexTab: 'timeline',
  activeModal: 'none',
  editingItemId: null,
  viewingItemId: null
};

// Actions
type Action =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'SET_META'; payload: Partial<BookMetadata> }
  | { type: 'ADD_CHAPTER' }
  | { type: 'DELETE_CHAPTER'; payload: string }
  | { type: 'UPDATE_CHAPTER'; payload: { id: string; updates: Partial<Chapter> } }
  | { type: 'SET_ACTIVE_CHAPTER'; payload: string }
  | { type: 'REORDER_CHAPTERS'; payload: Chapter[] }
  | { type: 'ADD_CHARACTER'; payload: Character }
  | { type: 'UPDATE_CHARACTER'; payload: Character }
  | { type: 'DELETE_CHARACTER'; payload: string }
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_CONTEXT_MODE'; payload: ContextMode }
  | { type: 'SET_CODEX_TAB'; payload: CodexTab }
  | { type: 'SET_VIEWING_ITEM'; payload: string | null }
  | { type: 'OPEN_MODAL'; payload: { type: ModalType; itemId?: string } }
  | { type: 'CLOSE_MODAL' }
  | { type: 'ADD_TIMELINE_EDGE'; payload: { from: string; to: string; id: string } }
  | { type: 'REMOVE_TIMELINE_EDGE'; payload: string }
  | { type: 'ADD_COMMENT'; payload: { id: string; text: string; timestamp: number } };

// Reducer
export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;
    case 'SET_META':
      return { ...state, meta: { ...state.meta, ...action.payload } };
    case 'ADD_CHAPTER':
      const newChapter: Chapter = {
        id: uuidv4(),
        title: "New Chapter",
        content: "",
        order: state.chapters.length
      };
      return {
        ...state,
        chapters: [...state.chapters, newChapter],
        activeChapterId: newChapter.id
      };
    case 'DELETE_CHAPTER':
      if (state.chapters.length <= 1) return state;
      const newChapters = state.chapters.filter(c => c.id !== action.payload);
      return {
        ...state,
        chapters: newChapters,
        activeChapterId: state.activeChapterId === action.payload ? newChapters[0].id : state.activeChapterId
      };
    case 'UPDATE_CHAPTER':
      return {
        ...state,
        chapters: state.chapters.map(c => c.id === action.payload.id ? { ...c, ...action.payload.updates } : c)
      };
    case 'SET_ACTIVE_CHAPTER':
      return { ...state, activeChapterId: action.payload };
    case 'REORDER_CHAPTERS':
      return { ...state, chapters: action.payload };
    case 'ADD_CHARACTER': {
      console.log('Reducer ADD_CHARACTER payload:', action.payload);

      const nextCharacters = [...state.characters, action.payload];

      // Life events configuration: extensible for future events (marriage, birth of child, etc.)
      // Each entry maps a Character field to a life event label.
      const lifeEventFields: Array<{ field: keyof Character; label: string }> = [
        { field: 'dob', label: 'Born' },
        { field: 'deathDate', label: 'Died' },
        // Future: { field: 'marriageDate', label: 'Married' },
        // Future: { field: 'childBirthDate', label: 'Had a Child' },
      ];

      const createLifeEvent = (
        currentEvents: Event[],
        charId: string,
        charName: string,
        label: string,
        dateValue: string | null
      ): Event[] => {
        if (!dateValue) {
          console.log(`Reducer: skipping life event "${label}" - no date`);
          return currentEvents;
        }

        const title = `${charName} ${label}`;
        const description = `${charName} ${label}`;

        const alreadyExists = currentEvents.some(e =>
          e.title === title &&
          (e.date || '') === dateValue &&
          (e.characters || []).includes(charId)
        );

        if (alreadyExists) {
          console.log(`Reducer: skipping life event "${label}" - already exists`);
          return currentEvents;
        }

        const newEvent: Event = {
          id: uuidv4(),
          title,
          date: dateValue,
          description,
          characters: [charId],
        };
        console.log(`Reducer: creating life event "${label}"`, newEvent);
        return [...currentEvents, newEvent];
      };

      let nextEvents = state.events;
      for (const { field, label } of lifeEventFields) {
        const rawValue = action.payload[field];
        const normalized = rawValue ? normalizeDDMMYYYYHHMMSS(rawValue as string) : null;
        console.log(`Reducer: life event field=${field} raw=${rawValue} normalized=${normalized}`);
        nextEvents = createLifeEvent(nextEvents, action.payload.id, action.payload.name, label, normalized);
      }

      console.log('Reducer ADD_CHARACTER result: characters=', nextCharacters.length, 'events=', nextEvents.length);
      return { ...state, characters: nextCharacters, events: nextEvents };
    }
    case 'UPDATE_CHARACTER': {
      const previousCharacter = state.characters.find(c => c.id === action.payload.id) || null;
      const updatedCharacters = state.characters.map(c => c.id === action.payload.id ? action.payload : c);
      
      // Sync character life fields (dob, deathDate) to timeline events
      const syncResult = syncCharacterToEvents(action.payload, previousCharacter, state.events);
      let nextEvents = syncResult.events;
      
      // Process life events (marriage, birth-of-child, friendship) and create corresponding timeline events
      const lifeEvents = action.payload.lifeEvents || [];
      
      const LIFE_EVENT_LABELS: Record<LifeEventType, string> = {
        'birth-of-child': 'Had a Child',
        'marriage': 'Marriage/Partnership',
        'friendship': 'Friendship',
      };

      for (const lifeEvent of lifeEvents) {
        // Check if a timeline event already exists for this life event
        const eventTitle = `${action.payload.name} - ${LIFE_EVENT_LABELS[lifeEvent.type]}`;
        const alreadyExists = nextEvents.some(e => 
          e.title === eventTitle && 
          e.date === lifeEvent.date &&
          (e.characters || []).includes(action.payload.id)
        );
        
        if (!alreadyExists) {
          let description = LIFE_EVENT_LABELS[lifeEvent.type];
          
          if (lifeEvent.type === 'birth-of-child' && lifeEvent.childId) {
            const child = state.characters.find(c => c.id === lifeEvent.childId);
            description = `Birth of ${child?.name || 'child'}`;
          } else if (lifeEvent.type === 'marriage' || lifeEvent.type === 'friendship') {
            const otherCharIds = lifeEvent.characters.filter(id => id !== action.payload.id);
            const otherNames = otherCharIds
              .map(id => state.characters.find(c => c.id === id)?.name || 'Unknown')
              .join(', ');
            description = `${LIFE_EVENT_LABELS[lifeEvent.type]} with ${otherNames}`;
          }
          
          const newTimelineEvent: Event = {
            id: uuidv4(),
            title: eventTitle,
            date: lifeEvent.date,
            description,
            characters: lifeEvent.characters,
          };
          nextEvents.push(newTimelineEvent);
        }
      }
      
      return { ...state, characters: updatedCharacters, events: nextEvents };
    }
    case 'DELETE_CHARACTER':
      return { ...state, characters: state.characters.filter(c => c.id !== action.payload) };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT': {
      const previousEvent = state.events.find(e => e.id === action.payload.id) || null;
      const updatedEvents = state.events.map(e => e.id === action.payload.id ? action.payload : e);
      // Sync event changes back to character fields (dob, deathDate)
      const updatedCharacters = syncEventToCharacters(action.payload, previousEvent, state.characters);
      return { ...state, events: updatedEvents, characters: updatedCharacters };
    }
    case 'DELETE_EVENT': {
      const eventToDelete = state.events.find(e => e.id === action.payload);
      const filteredEvents = state.events.filter(e => e.id !== action.payload);
      // Clear corresponding character fields if a life event is deleted
      const updatedCharacters = eventToDelete 
        ? clearCharacterFieldsOnEventDelete(eventToDelete, state.characters)
        : state.characters;
      return { ...state, events: filteredEvents, characters: updatedCharacters };
    }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_CONTEXT_MODE':
      return { ...state, context: action.payload };
    case 'SET_CODEX_TAB':
      return { ...state, activeCodexTab: action.payload, viewingItemId: null };
    case 'SET_VIEWING_ITEM':
      return { ...state, viewingItemId: action.payload };
    case 'OPEN_MODAL':
      return { ...state, activeModal: action.payload.type, editingItemId: action.payload.itemId || null };
    case 'CLOSE_MODAL':
      return { ...state, activeModal: 'none', editingItemId: null };
    case 'ADD_TIMELINE_EDGE':
      return { ...state, timeline: { ...state.timeline, edges: [...state.timeline.edges, action.payload] } };
    case 'REMOVE_TIMELINE_EDGE':
      return { ...state, timeline: { ...state.timeline, edges: state.timeline.edges.filter(e => e.id !== action.payload) } };
    case 'ADD_COMMENT':
      return { ...state, comments: { ...state.comments, [action.payload.id]: { id: action.payload.id, text: action.payload.text, timestamp: action.payload.timestamp } } };
    default:
      return state;
  }
};

// Context
interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from local storage on mount
  useEffect(() => {
    const loaded = loadFromLocal();
    if (loaded) {
      // Merge loaded state with initial state to ensure all fields exist
      dispatch({ type: 'LOAD_STATE', payload: { ...initialState, ...loaded } });
    } else {
      // Set initial active chapter if not loaded
      if (initialState.chapters.length > 0) {
        dispatch({ type: 'SET_ACTIVE_CHAPTER', payload: initialState.chapters[0].id });
      }
    }
  }, []);

  // Auto-save
  useEffect(() => {
    saveToLocal(state);
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
