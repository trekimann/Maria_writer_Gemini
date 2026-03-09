import { NextFunction, Request, Response } from 'express';
import { ProjectAccessRole } from '@prisma/client';
import { collaborationService } from '../services/collaborationService';

class CollaborationController {
  async listCollaborators(req: Request, res: Response, next: NextFunction) {
    try {
      const collaborators = await collaborationService.listCollaborators(String(req.params.id), req.user!.id);
      res.json({ collaborators });
    } catch (error) {
      next(error);
    }
  }

  async listProjectInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const invitations = await collaborationService.listProjectInvitations(String(req.params.id), req.user!.id);
      res.json({ invitations });
    } catch (error) {
      next(error);
    }
  }

  async createInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await collaborationService.createInvitation(String(req.params.id), req.user!.id, {
        email: req.body.email,
        role: req.body.role as ProjectAccessRole,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listPendingInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const invitations = await collaborationService.listPendingInvitations(req.user!.id);
      res.json({ invitations });
    } catch (error) {
      next(error);
    }
  }

  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await collaborationService.acceptInvitation(String(req.params.token), req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async declineInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await collaborationService.declineInvitation(String(req.params.token), req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateCollaborator(req: Request, res: Response, next: NextFunction) {
    try {
      const collaborator = await collaborationService.updateCollaborator(
        String(req.params.id),
        req.user!.id,
        String(req.params.collaboratorId),
        req.body.role as ProjectAccessRole,
      );
      res.json({ collaborator });
    } catch (error) {
      next(error);
    }
  }

  async revokeCollaborator(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await collaborationService.revokeCollaborator(
        String(req.params.id),
        req.user!.id,
        String(req.params.collaboratorId),
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const collaborationController = new CollaborationController();