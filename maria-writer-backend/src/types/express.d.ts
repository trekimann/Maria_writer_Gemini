/**
 * Augment Express Request to carry the authenticated user after requireAuth
 * middleware has verified the access token.
 */

import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};
