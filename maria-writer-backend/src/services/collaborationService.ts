import crypto from 'crypto';
import { ProjectAccessRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { accessService } from './accessService';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getInvitationBaseUrl(): string {
  return process.env.APP_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
}

function buildAcceptUrl(token: string): string {
  return `${getInvitationBaseUrl().replace(/\/$/, '')}/invitations?token=${token}`;
}

class CollaborationService {
  async listCollaborators(projectId: string, requesterId: string) {
    await accessService.assertProjectOwner(projectId, requesterId);

    return prisma.projectCollaborator.findMany({
      where: {
        projectId,
        acceptedAt: { not: null },
        revokedAt: null,
      },
      orderBy: { acceptedAt: 'asc' },
      select: {
        id: true,
        role: true,
        invitedAt: true,
        acceptedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }

  async listProjectInvitations(projectId: string, requesterId: string) {
    await accessService.assertProjectOwner(projectId, requesterId);

    return prisma.projectInvitation.findMany({
      where: {
        projectId,
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async createInvitation(projectId: string, inviterId: string, payload: { email: string; role: ProjectAccessRole }) {
    const project = await accessService.assertProjectOwner(projectId, inviterId);
    const email = normalizeEmail(payload.email);

    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { id: true, email: true },
    });

    if (!inviter) {
      throw new AppError('Inviter not found', 404);
    }

    if (normalizeEmail(inviter.email) === email) {
      throw new AppError('You cannot invite yourself to your own project', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const existingCollaborator = await prisma.projectCollaborator.findUnique({
        where: { projectId_userId: { projectId, userId: existingUser.id } },
        select: { id: true, revokedAt: true },
      });

      if (existingCollaborator && !existingCollaborator.revokedAt) {
        throw new AppError('That user already has access to this project', 409);
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const activeInvite = await prisma.projectInvitation.findFirst({
      where: {
        projectId,
        email,
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    const invitation = activeInvite
      ? await prisma.projectInvitation.update({
          where: { id: activeInvite.id },
          data: {
            role: payload.role,
            token,
            invitedBy: inviterId,
            createdAt: new Date(),
            expiresAt,
          },
        })
      : await prisma.projectInvitation.create({
          data: {
            projectId: project.id,
            email,
            role: payload.role,
            token,
            invitedBy: inviterId,
            expiresAt,
          },
        });

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
      },
      acceptUrl: buildAcceptUrl(token),
      delivery: 'link-only',
    };
  }

  async listPendingInvitations(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return prisma.projectInvitation.findMany({
      where: {
        email: normalizeEmail(user.email),
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        createdAt: true,
        expiresAt: true,
        project: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                id: true,
                email: true,
                displayName: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  async acceptInvitation(token: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                id: true,
                email: true,
                displayName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!invitation || invitation.revokedAt || invitation.declinedAt || invitation.acceptedAt) {
      throw new AppError('Invitation is no longer valid', 404);
    }

    if (invitation.expiresAt <= new Date()) {
      throw new AppError('Invitation has expired', 410);
    }

    if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) {
      throw new AppError('This invitation is for a different account email', 403);
    }

    const collaborator = await prisma.projectCollaborator.upsert({
      where: { projectId_userId: { projectId: invitation.projectId, userId } },
      update: {
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        invitedAt: invitation.createdAt,
        acceptedAt: new Date(),
        revokedAt: null,
      },
      create: {
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        invitedAt: invitation.createdAt,
        acceptedAt: new Date(),
      },
    });

    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return {
      collaboratorId: collaborator.id,
      project: invitation.project,
      role: collaborator.role,
    };
  }

  async declineInvitation(token: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      select: { id: true, email: true, acceptedAt: true, declinedAt: true, revokedAt: true, expiresAt: true },
    });

    if (!invitation || invitation.revokedAt || invitation.acceptedAt) {
      throw new AppError('Invitation is no longer valid', 404);
    }

    if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) {
      throw new AppError('This invitation is for a different account email', 403);
    }

    if (invitation.declinedAt) {
      return { success: true };
    }

    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { declinedAt: new Date() },
    });

    return { success: true };
  }

  async updateCollaborator(projectId: string, requesterId: string, collaboratorId: string, role: ProjectAccessRole) {
    await accessService.assertProjectOwner(projectId, requesterId);

    const collaborator = await prisma.projectCollaborator.findFirst({
      where: {
        id: collaboratorId,
        projectId,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (!collaborator) {
      throw new AppError('Collaborator not found', 404);
    }

    return prisma.projectCollaborator.update({
      where: { id: collaborator.id },
      data: { role },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }

  async revokeCollaborator(projectId: string, requesterId: string, collaboratorId: string) {
    await accessService.assertProjectOwner(projectId, requesterId);

    const collaborator = await prisma.projectCollaborator.findFirst({
      where: {
        id: collaboratorId,
        projectId,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (!collaborator) {
      throw new AppError('Collaborator not found', 404);
    }

    await prisma.projectCollaborator.update({
      where: { id: collaborator.id },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }
}

export const collaborationService = new CollaborationService();