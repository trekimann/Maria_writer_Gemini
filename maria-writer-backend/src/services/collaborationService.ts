import crypto from 'crypto';
import { ProjectAccessRole, ReviewCommentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { accessService } from './accessService';
import { projectService } from './projectService';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getInvitationBaseUrl(): string {
  return process.env.APP_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
}

function buildAcceptUrl(token: string): string {
  return `${getInvitationBaseUrl().replace(/\/$/, '')}/invitations?token=${token}`;
}

function applySuggestionToChapterContent(
  chapterContent: string,
  originalText: string,
  replacementText: string,
  startOffset?: number | null,
  endOffset?: number | null,
): string {
  if (
    startOffset !== undefined
    && startOffset !== null
    && endOffset !== undefined
    && endOffset !== null
    && startOffset >= 0
    && endOffset >= startOffset
    && chapterContent.slice(startOffset, endOffset) === originalText
  ) {
    return `${chapterContent.slice(0, startOffset)}${replacementText}${chapterContent.slice(endOffset)}`;
  }

  const rawIndex = chapterContent.indexOf(originalText);
  if (rawIndex === -1) {
    throw new AppError('Could not locate the original text to apply this suggestion', 409);
  }

  return `${chapterContent.slice(0, rawIndex)}${replacementText}${chapterContent.slice(rawIndex + originalText.length)}`;
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

  async listReviewComments(projectId: string, requesterId: string) {
    const access = await accessService.getProjectAccess(projectId, requesterId);
    if (!access) {
      throw new AppError('Project not found', 404);
    }

    return prisma.projectReviewComment.findMany({
      where: {
        projectId,
        status: { not: ReviewCommentStatus.HIDDEN },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        projectId: true,
        chapterId: true,
        text: true,
        isSuggestion: true,
        replacementText: true,
        originalText: true,
        startOffset: true,
        endOffset: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
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

  async createReviewComment(
    projectId: string,
    requesterId: string,
    payload: {
      chapterId: string;
      text: string;
      isSuggestion: boolean;
      replacementText?: string | null;
      originalText: string;
      startOffset?: number | null;
      endOffset?: number | null;
    },
  ) {
    const access = await accessService.getProjectAccess(projectId, requesterId);
    if (!access) {
      throw new AppError('Project not found', 404);
    }

    if (!access.canComment) {
      throw new AppError('Insufficient project permissions', 403);
    }

    const chapterId = payload.chapterId.trim();
    const chapterText = payload.originalText.trim();
    if (!chapterId || !chapterText) {
      throw new AppError('chapterId and originalText are required', 400);
    }

    return prisma.projectReviewComment.create({
      data: {
        projectId,
        chapterId,
        authorId: requesterId,
        text: payload.text.trim(),
        isSuggestion: payload.isSuggestion,
        replacementText: payload.isSuggestion ? payload.replacementText?.trim() || null : null,
        originalText: chapterText,
        startOffset: payload.startOffset ?? null,
        endOffset: payload.endOffset ?? null,
      },
      select: {
        id: true,
        projectId: true,
        chapterId: true,
        text: true,
        isSuggestion: true,
        replacementText: true,
        originalText: true,
        startOffset: true,
        endOffset: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
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

  async applyReviewSuggestion(projectId: string, requesterId: string, commentId: string) {
    await accessService.assertProjectOwner(projectId, requesterId);

    const reviewComment = await prisma.projectReviewComment.findFirst({
      where: {
        id: commentId,
        projectId,
        status: ReviewCommentStatus.ACTIVE,
      },
      select: {
        id: true,
        chapterId: true,
        originalText: true,
        replacementText: true,
        isSuggestion: true,
        startOffset: true,
        endOffset: true,
      },
    });

    if (!reviewComment) {
      throw new AppError('Review comment not found', 404);
    }

    if (!reviewComment.isSuggestion || !reviewComment.replacementText) {
      throw new AppError('Only suggestions can be applied', 400);
    }

    const project = await projectService.getProjectByUser(projectId, requesterId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const chapters = Array.isArray(project.data?.chapters) ? project.data.chapters : [];
    const chapter = chapters.find((entry: any) => entry.id === reviewComment.chapterId);
    if (!chapter) {
      throw new AppError('Chapter not found for this suggestion', 404);
    }

    const nextContent = applySuggestionToChapterContent(
      String(chapter.content || ''),
      reviewComment.originalText,
      reviewComment.replacementText,
      reviewComment.startOffset,
      reviewComment.endOffset,
    );

    const nextProjectData = {
      ...project.data,
      chapters: chapters.map((entry: any) => (
        entry.id === reviewComment.chapterId
          ? { ...entry, content: nextContent }
          : entry
      )),
    };

    await projectService.updateProjectByUser(projectId, requesterId, { data: nextProjectData });

    await prisma.projectReviewComment.update({
      where: { id: reviewComment.id },
      data: { status: ReviewCommentStatus.RESOLVED },
    });

    return {
      success: true,
      commentId: reviewComment.id,
      chapterId: reviewComment.chapterId,
      content: nextContent,
      status: ReviewCommentStatus.RESOLVED,
    };
  }
}

export const collaborationService = new CollaborationService();