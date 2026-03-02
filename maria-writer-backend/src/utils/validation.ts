import { z } from 'zod';

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password must be no more than 64 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(64, 'Username must be no more than 64 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores, and hyphens'),
  password: passwordSchema,
  displayName: z.string().max(255).optional(),
  genreTags: z.string().max(1000).optional(),
  profilePicture: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  // Do not enforce complexity on login — just pass through what the user typed
  password: z.string().min(1, 'Password is required'),
});

export const ResetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// ---------------------------------------------------------------------------
// App State validation schema (matches frontend types)
// ---------------------------------------------------------------------------

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
  // guestId required for guest access; omitted when using Bearer token auth
  guestId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  data: AppStateSchema,
});

export const UpdateProjectSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  data: AppStateSchema,
});

export const ProjectQuerySchema = z.object({
  // guestId optional — authenticated requests don't send it
  guestId: z.string().uuid().optional(),
});
