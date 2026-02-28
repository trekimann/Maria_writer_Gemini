import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

class ProjectController {
  async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { guestId } = req.query;
      
      if (!guestId || typeof guestId !== 'string') {
        throw new AppError('guestId is required', 400);
      }

      const projects = await projectService.listProjects(guestId);
      res.json({ projects });
    } catch (error) {
      next(error);
    }
  }

  async createOrUpdateProject(req: Request, res: Response, next: NextFunction) {
    try {
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
      const { id } = req.params;
      const { guestId } = req.query;

      if (!guestId || typeof guestId !== 'string') {
        throw new AppError('guestId is required', 400);
      }

      const project = await projectService.getProject(id as string, guestId);
      
      if (!project) {
        throw new AppError('Project not found', 404);
      }

      res.json({ project });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { guestId } = req.query;
      const { title, data } = req.body;

      if (!guestId || typeof guestId !== 'string') {
        throw new AppError('guestId is required', 400);
      }

      const project = await projectService.updateProject(id as string, guestId, { title, data });
      
      res.json({
        id: project.id,
        title: project.title,
        updatedAt: project.updatedAt,
      });
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
      const { id } = req.params;
      const { guestId } = req.query;

      if (!guestId || typeof guestId !== 'string') {
        throw new AppError('guestId is required', 400);
      }

      await projectService.deleteProject(id as string, guestId);
      
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        next(new AppError('Project not found', 404));
      } else {
        next(error);
      }
    }
  }
}

export const projectController = new ProjectController();
