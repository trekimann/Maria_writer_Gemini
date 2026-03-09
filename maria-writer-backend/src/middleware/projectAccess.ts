import { NextFunction, Request, Response } from 'express';
import { ProjectAccessRole } from '@prisma/client';
import { accessService } from '../services/accessService';
import { AppError } from './errorHandler';

const ROLE_LEVEL: Record<'OWNER' | ProjectAccessRole, number> = {
  OWNER: 3,
  READ: 0,
  COMMENT: 1,
  EDIT: 2,
};

export function requireProjectAccess(minRole: ProjectAccessRole, projectIdParam = 'id') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const projectId = String(req.params[projectIdParam] || '');
      if (!projectId) {
        throw new AppError('Project id is required', 400);
      }

      const access = await accessService.getProjectAccess(projectId, req.user.id);
      if (!access) {
        throw new AppError('Project not found', 404);
      }

      const actualLevel = ROLE_LEVEL[access.role];
      const requiredLevel = ROLE_LEVEL[minRole];
      if (actualLevel < requiredLevel) {
        throw new AppError('Insufficient project permissions', 403);
      }

      req.projectAccess = access;
      next();
    } catch (error) {
      next(error);
    }
  };
}