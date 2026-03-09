/**
 * Auth Controller — Phase 2
 *
 * Thin Express glue on top of authService. Handles cookie setting/clearing
 * and JSON response shaping. All business logic lives in authService.
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AppError } from '../middleware/errorHandler';

// Cookie name (per plan §2.14 Decision #5)
const COOKIE_NAME = 'maria_rt';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const REMEMBER_ME_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, password, displayName, genreTags, profilePicture } = req.body;
      const { user, tokens } = await authService.register(email, username, password, displayName, genreTags, profilePicture);

      res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
      res.status(201).json({ user, accessToken: tokens.accessToken });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;
      const { user, tokens } = await authService.login(email, password);

      const cookieOpts = rememberMe ? REMEMBER_ME_COOKIE_OPTIONS : COOKIE_OPTIONS;
      res.cookie(COOKIE_NAME, tokens.refreshToken, cookieOpts);
      res.json({ user, accessToken: tokens.accessToken });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[COOKIE_NAME];
      if (!rawToken) {
        throw new AppError('No refresh token', 401);
      }

      const { user, tokens } = await authService.refreshTokens(rawToken);

      res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
      res.json({ user, accessToken: tokens.accessToken });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[COOKIE_NAME];
      if (rawToken) {
        await authService.logout(rawToken);
      }

      // Clear cookie regardless
      res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: undefined });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.user is set by requireAuth middleware
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const user = await authService.getUser(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const user = await authService.updateProfile(req.user.id, req.body);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
