import { z } from 'zod';

// App State validation schema (matches frontend types)
export const AppStateSchema = z.object({
  meta: z.object({
    title: z.string(),
    author: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    currentDate: z.string().optional(),
  }),
  chapters: z.array(z.any()), // Simplified for Phase 1
  activeChapterId: z.string().nullable(),
  characters: z.array(z.any()),
  events: z.array(z.any()),
  relationships: z.array(z.any()),
  comments: z.record(z.any()),
  timeline: z.any(),
  viewMode: z.enum(['write', 'source', 'preview']),
  context: z.enum(['writer', 'codex']),
  activeCodexTab: z.enum(['timeline', 'characters', 'events', 'relationships']),
  activeModal: z.string(),
  editingItemId: z.string().nullable(),
  viewingItemId: z.string().nullable(),
  prefilledEventData: z.any().optional(),
  themeCustomizations: z.array(z.any()).optional(),
});

export const CreateProjectSchema = z.object({
  guestId: z.string().uuid(),
  title: z.string().min(1).max(500),
  data: AppStateSchema,
});

export const UpdateProjectSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  data: AppStateSchema,
});

export const ProjectQuerySchema = z.object({
  guestId: z.string().uuid(),
});
