/**
 * Auth Middleware — Phase 2
 *
 * requireAuth  — Dual-mode: attaches req.user if a valid Bearer token is
 *                present. If no token (but a guestId is present in
 *                query/body), the request proceeds with req.user = undefined
 *                so guest project routes continue to work.
 *                Routes that require authentication should call
 *                requireAuth followed by requireAuthenticated.
 *
 * requireAuthenticated — Hard gate: rejects with 401 if req.user is not set.
 *                        Use on endpoints where a real account is mandatory.
 *
 * requireRole  — Checks req.user.role meets the minimum required level.
 *                Role hierarchy: USER < EDITOR < ADMIN.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access';
}

const ROLE_LEVEL: Record<UserRole, number> = {
  USER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is not set');
  return secret;
}

/**
 * Dual-mode auth middleware.
 * - If Authorization: Bearer <token> is present and valid → sets req.user.
 * - If the token is present but invalid/expired → 401 immediately.
 * - If no Authorization header → passes through with req.user = undefined
 *   (guest-compatible routes handle this case).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No token — allow through for dual-mode routes (guest access)
    return next();
  }

  if (!authHeader.startsWith('Bearer ')) {
    return next(new AppError('Invalid Authorization header format', 401));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, getJwtSecret()) as AccessTokenPayload;

    if (payload.type !== 'access') {
      return next(new AppError('Invalid token type', 401));
    }

    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired', 401));
    }
    logger.warn('JWT verification failed', { error: err.message });
    return next(new AppError('Invalid access token', 401));
  }
}

/**
 * Hard authentication gate. Must be placed AFTER requireAuth.
 * Rejects with 401 if req.user was not set (no valid token present).
 */
export function requireAuthenticated(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  next();
}

/**
 * Role-based access control. Must be placed AFTER requireAuth.
 * Allows the request through if req.user.role is >= minRole in the hierarchy.
 */
export function requireRole(minRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const userLevel = ROLE_LEVEL[req.user.role] ?? -1;
    const requiredLevel = ROLE_LEVEL[minRole] ?? 999;

    if (userLevel < requiredLevel) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
}
