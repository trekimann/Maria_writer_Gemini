import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

class ProjectController {
  async listSharedProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await projectService.listSharedProjectsByUser(req.user!.id);
      res.json({ projects });
    } catch (error) {
      next(error);
    }
  }

  async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        const projects = await projectService.listProjectsByUser(req.user.id);
        return res.json({ projects });
      }

      const { guestId } = req.query;
      if (!guestId || typeof guestId !== 'string') {
        throw new AppError('guestId is required for guest access', 400);
      }
      const projects = await projectService.listProjects(guestId);
      res.json({ projects });
    } catch (error) {
      next(error);
    }
  }

  async createOrUpdateProject(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        const { title, data } = req.body;
        const result = await projectService.createOrUpdateProjectByUser(req.user.id, title, data);
        return res.status(result.isNew ? 201 : 200).json({
          id: result.project.id,
          title: result.project.title,
          updatedAt: result.project.updatedAt,
          isNew: result.isNew,
        });
      }

      const { guestId, title, data } = req.body;
      const result = await projectService.createOrUpdateProject(guestId, title, data);
      res.status(result.isNew ? 201 : 200).json({
        id: result.project.id,
        title: result.project.title,
        updatedAt: result.project.updatedAt,
        isNew: result.isNew,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      if (req.user) {
        const project = await projectService.getProjectByAuthorizedUser(id, req.user.id);
        if (!project) throw new AppError('Project not found', 404);
        return res.json({ project });
      }

      const { guestId } = req.query;
      if (!guestId || typeof guestId !== 'string') {
        throw new AppError('guestId is required for guest access', 400);
      }
      const project = await projectService.getProject(id, guestId);
      if (!project) throw new AppError('Project not found', 404);
      res.json({ project });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { title, data } = req.body;

      if (req.user) {
        const project = await projectService.updateProjectByUser(id, req.user.id, { title, data });
        return res.json({ id: project.id, title: project.title, updatedAt: project.updatedAt });
      }

      const { guestId } = req.query;
      if (!guestId || typeof guestId !== 'string') {
        throw new AppError('guestId is required for guest access', 400);
      }
      const project = await projectService.updateProject(id, guestId, { title, data });
      res.json({ id: project.id, title: project.title, updatedAt: project.updatedAt });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        next(new AppError('Project not found', 404));
      } else {
        next(error);
      }
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      if (req.user) {
        await projectService.deleteProjectByUser(id, req.user.id);
        return res.json({ success: true, message: 'Project deleted' });
      }

      const { guestId } = req.query;
      if (!guestId || typeof guestId !== 'string') {
        throw new AppError('guestId is required for guest access', 400);
      }
      await projectService.deleteProject(id, guestId);
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        next(new AppError('Project not found', 404));
      } else {
        next(error);
      }
    }
  }

  /** GET /api/projects/claim-preview?guestId=:uuid — auth required */
  async previewGuestProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { guestId } = req.query as { guestId: string };
      const projects = await projectService.previewGuestProjectsForClaim(guestId);
      res.json({ projects });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/projects/claim — auth required */
  async claimGuestProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { guestId, projectIds } = req.body as { guestId: string; projectIds: string[] };
      const result = await projectService.claimGuestProjects(guestId, req.user!.id, projectIds);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
