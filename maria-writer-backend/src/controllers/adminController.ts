/**
 * Admin Controller — Phase 2
 *
 * User management endpoints, accessible only to ADMIN role.
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AppError } from '../middleware/errorHandler';

class AdminController {
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const search = req.query.search ? String(req.query.search) : undefined;

      const result = await authService.listUsers(page, limit, search);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getUser(String(req.params.id));
      if (!user) throw new AppError('User not found', 404);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const { newPassword } = req.body;
      await authService.resetPassword(String(req.params.id), newPassword, req.user.id);
      res.json({ success: true, message: 'Password updated' });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
