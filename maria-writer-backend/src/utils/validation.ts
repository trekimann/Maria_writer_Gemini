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

const CreatorConnectionSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  kind: z.enum(['follow', 'private-read', 'collaborator']),
  note: z.string().max(500).optional(),
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().max(255).nullable().optional(),
  genreTags: z.string().max(1000).nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  dob: z.string().max(50).nullable().optional(),
  aliases: z.string().max(1000).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
  profileColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'profileColor must be a valid hex color').nullable().optional(),
  creatorConnections: z.array(CreatorConnectionSchema).max(100).nullable().optional(),
});

export const ResetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

const collaborationRoleSchema = z.enum(['READ', 'COMMENT']);

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

export const ClaimPreviewQuerySchema = z.object({
  guestId: z.string().uuid('guestId must be a valid UUID'),
});

export const ClaimProjectsSchema = z.object({
  guestId: z.string().uuid('guestId must be a valid UUID'),
  projectIds: z.array(z.string().uuid()).min(1, 'At least one projectId is required'),
});

export const ProjectQuerySchema = z.object({
  // guestId optional — authenticated requests don't send it
  guestId: z.string().uuid().optional(),
});

export const CreateProjectInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: collaborationRoleSchema,
});

export const UpdateProjectCollaboratorSchema = z.object({
  role: collaborationRoleSchema,
});

export const ProjectIdParamsSchema = z.object({
  id: z.string().uuid('Project id must be a valid UUID'),
});

export const CollaboratorParamsSchema = z.object({
  id: z.string().uuid('Project id must be a valid UUID'),
  collaboratorId: z.string().uuid('Collaborator id must be a valid UUID'),
});

export const InvitationTokenParamsSchema = z.object({
  token: z.string().min(20, 'Invitation token is invalid').max(255),
});
