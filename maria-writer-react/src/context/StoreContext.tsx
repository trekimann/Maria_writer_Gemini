import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppState, BookMetadata, Chapter, Character, Event, ViewMode, ContextMode, CodexTab, ModalType, Relationship } from '../types';
import { loadFromLocal, saveToLocal } from '../utils/storage';
import { syncCharacterToEvents, syncEventToCharacters, clearCharacterFieldsOnEventDelete, syncCharacterLifeEventsToTimeline, syncRelationshipToEvent } from '../utils/eventSync';

// Initial State
export const initialState: AppState = {
  meta: { title: "New Novel", author: "Anonymous", description: "", tags: [] },
  chapters: [
    { id: uuidv4(), title: "Chapter 1", content: "# Chapter 1\n\nIt was a dark and stormy night...", order: 0 }
  ],
  activeChapterId: null,
  characters: [],
  events: [],
  relationships: [],
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
  | { type: 'ADD_RELATIONSHIP'; payload: Relationship }
  | { type: 'UPDATE_RELATIONSHIP'; payload: Relationship }
  | { type: 'DELETE_RELATIONSHIP'; payload: string }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_CONTEXT_MODE'; payload: ContextMode }
  | { type: 'SET_CODEX_TAB'; payload: CodexTab }
  | { type: 'SET_VIEWING_ITEM'; payload: string | null }
  | { type: 'OPEN_MODAL'; payload: { type: ModalType; itemId?: string } }
  | { type: 'CLOSE_MODAL' }
  | { type: 'ADD_TIMELINE_EDGE'; payload: { from: string; to: string; id: string } }
  | { type: 'REMOVE_TIMELINE_EDGE'; payload: string }
  | { type: 'REORDER_TIMELINE_LANES'; payload: string[] }
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

      // Use centralized sync utility to auto-create Born/Died events
      const syncResult = syncCharacterToEvents(action.payload, null, state.events);

      console.log('Reducer ADD_CHARACTER result: characters=', nextCharacters.length, 'events=', syncResult.events.length);
      return { ...state, characters: nextCharacters, events: syncResult.events };
    }
    case 'UPDATE_CHARACTER': {
      const previousCharacter = state.characters.find(c => c.id === action.payload.id) || null;
      const updatedCharacters = state.characters.map(c => c.id === action.payload.id ? action.payload : c);
      
      // Sync character life fields (dob, deathDate) to timeline events
      const dobDeathSyncResult = syncCharacterToEvents(action.payload, previousCharacter, state.events);
      
      // Sync life events (marriage, friendship, birth-of-child) to timeline and relationships
      const lifeEventsSyncResult = syncCharacterLifeEventsToTimeline(
        action.payload,
        dobDeathSyncResult.events,
        state.relationships,
        updatedCharacters
      );
      
      return { 
        ...state, 
        characters: lifeEventsSyncResult.characters,
        events: lifeEventsSyncResult.events,
        relationships: lifeEventsSyncResult.relationships
      };
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
    case 'ADD_RELATIONSHIP': {
      const newRelationships = [...state.relationships, action.payload];
      
      // Sync relationship to create a corresponding timeline event
      const syncResult = syncRelationshipToEvent(action.payload, state.events, state.characters);
      
      return { 
        ...state, 
        relationships: newRelationships,
        events: syncResult.events 
      };
    }
    case 'UPDATE_RELATIONSHIP':
      return { ...state, relationships: state.relationships.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_RELATIONSHIP':
      return { ...state, relationships: state.relationships.filter(r => r.id !== action.payload) };
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
    case 'REORDER_TIMELINE_LANES':
      return { ...state, timeline: { ...state.timeline, characterLaneOrder: action.payload } };
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
