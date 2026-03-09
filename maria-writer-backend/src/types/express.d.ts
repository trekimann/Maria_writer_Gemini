/**
 * Augment Express Request to carry the authenticated user after requireAuth
 * middleware has verified the access token.
 */

import { ProjectAccessRole, UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
      projectAccess?: {
        projectId: string;
        ownerId: string | null;
        isOwner: boolean;
        role: 'OWNER' | ProjectAccessRole;
        canRead: boolean;
        canComment: boolean;
        canEditProject: boolean;
        collaboratorId: string | null;
      };
    }
  }
}

export {};
