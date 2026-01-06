export interface BookMetadata {
  title: string;
  author: string;
  description: string;
  tags: string[];
  currentDate?: string; // Story's current date (dd/MM/yyyy HH:mm:ss) - used for age calculations
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  commentIds?: string[]; // Track comments for this chapter
}

export type LifeEventType = 'birth-of-child' | 'marriage' | 'friendship';

export interface LifeEvent {
  id: string;
  type: LifeEventType;
  date: string;          // Start date (or only date for birth)
  endDate?: string;      // End date for marriage/friendship
  characters: string[];  // Character IDs involved (partner, friend, child)
  childId?: string;      // For birth-of-child: the child character ID
  notes?: string;
}

export interface Character {
  id: string;
  name: string;
  age?: string;
  dob?: string;
  deathDate?: string;
  gender?: string;
  description?: string;
  picture?: string;
  tags?: string[];
  lifeEvents?: LifeEvent[];
}

export interface Event {
  id: string;
  title: string;
  date?: string;
  description?: string;
  characters?: string[]; // Array of Character IDs
  image?: string;
}

export interface StoryComment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  isSuggestion: boolean;
  replacementText?: string;
  isPreviewing?: boolean; // For suggestions: whether replacement text is temporarily shown
  isHidden: boolean;
  originalText: string; // The text that was commented on
}

export interface TimelineEdge {
  id: string;
  from: string;
  to: string;
}

export interface Timeline {
  edges: TimelineEdge[];
  characterLaneOrder?: string[]; // Order of character IDs in timeline view
}

export type RelationshipType = 
  | 'family' 
  | 'parent-child' 
  | 'sibling' 
  | 'spouse' 
  | 'romantic' 
  | 'friend' 
  | 'colleague' 
  | 'mentor-student' 
  | 'rival' 
  | 'enemy' 
  | 'acquaintance'
  | 'other';

export interface Relationship {
  id: string;
  type: RelationshipType;
  characterIds: string[]; // Can have 2+ characters for group relationships
  description?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export type ViewMode = 'write' | 'source' | 'preview';
export type ContextMode = 'writer' | 'codex';
export type CodexTab = 'timeline' | 'characters' | 'events' | 'relationships';
export type ModalType = 'none' | 'save' | 'metadata' | 'character' | 'event' | 'relationship';

export interface AppState {
  meta: BookMetadata;
  chapters: Chapter[];
  activeChapterId: string | null;
  characters: Character[];
  events: Event[];
  relationships: Relationship[];
  comments: Record<string, StoryComment>;
  timeline: Timeline;
  viewMode: ViewMode;
  context: ContextMode;
  activeCodexTab: CodexTab;
  activeModal: ModalType;
  editingItemId: string | null; // For character/event modals
  viewingItemId: string | null; // For detail views
}
