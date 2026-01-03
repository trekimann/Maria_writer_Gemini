export interface BookMetadata {
  title: string;
  author: string;
  description: string;
  tags: string[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
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

export interface Comment {
  id: string;
  text: string;
  timestamp: number;
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

export type ViewMode = 'edit' | 'preview';
export type ContextMode = 'writer' | 'codex';
export type CodexTab = 'timeline' | 'characters' | 'events';
export type ModalType = 'none' | 'save' | 'metadata' | 'character' | 'event';

export interface AppState {
  meta: BookMetadata;
  chapters: Chapter[];
  activeChapterId: string | null;
  characters: Character[];
  events: Event[];
  comments: Record<string, Comment>;
  timeline: Timeline;
  viewMode: ViewMode;
  context: ContextMode;
  activeCodexTab: CodexTab;
  activeModal: ModalType;
  editingItemId: string | null; // For character/event modals
  viewingItemId: string | null; // For detail views
}
