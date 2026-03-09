import { ProjectAccessRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface EffectiveProjectAccess {
  projectId: string;
  ownerId: string | null;
  isOwner: boolean;
  role: 'OWNER' | ProjectAccessRole;
  canRead: boolean;
  canComment: boolean;
  canEditProject: boolean;
  collaboratorId: string | null;
}

function buildCapabilities(role: ProjectAccessRole): Pick<EffectiveProjectAccess, 'canRead' | 'canComment' | 'canEditProject'> {
  return {
    canRead: true,
    canComment: role === ProjectAccessRole.COMMENT || role === ProjectAccessRole.EDIT,
    canEditProject: role === ProjectAccessRole.EDIT,
  };
}

class AccessService {
  async getProjectAccess(projectId: string, userId: string): Promise<EffectiveProjectAccess | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        collaborators: {
          where: {
            userId,
            acceptedAt: { not: null },
            revokedAt: null,
          },
          orderBy: { acceptedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    if (project.ownerId === userId) {
      return {
        projectId: project.id,
        ownerId: project.ownerId,
        isOwner: true,
        role: 'OWNER',
        canRead: true,
        canComment: true,
        canEditProject: true,
        collaboratorId: null,
      };
    }

    const collaborator = project.collaborators[0];
    if (!collaborator) {
      return null;
    }

    return {
      projectId: project.id,
      ownerId: project.ownerId,
      isOwner: false,
      role: collaborator.role,
      collaboratorId: collaborator.id,
      ...buildCapabilities(collaborator.role),
    };
  }

  async assertProjectOwner(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true, title: true },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (!project.ownerId) {
      throw new AppError('Guest projects cannot be shared', 400);
    }

    if (project.ownerId !== userId) {
      throw new AppError('Only the project owner can perform this action', 403);
    }

    return project;
  }
}

export const accessService = new AccessService();