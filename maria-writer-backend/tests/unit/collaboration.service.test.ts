type CollaborationRole = 'READ' | 'COMMENT' | 'EDIT';

const mockPrismaUser = {
  findUnique: jest.fn(),
};

const mockPrismaProjectCollaborator = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  upsert: jest.fn(),
  update: jest.fn(),
};

const mockPrismaProjectInvitation = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockPrismaProjectReviewComment = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  prisma: {
    user: mockPrismaUser,
    projectCollaborator: mockPrismaProjectCollaborator,
    projectInvitation: mockPrismaProjectInvitation,
    projectReviewComment: mockPrismaProjectReviewComment,
  },
}));

const mockAssertProjectOwner = jest.fn();
const mockGetProjectAccess = jest.fn();

jest.mock('../../src/services/accessService', () => ({
  accessService: {
    assertProjectOwner: mockAssertProjectOwner,
    getProjectAccess: mockGetProjectAccess,
  },
}));

const mockGetProjectByUser = jest.fn();
const mockUpdateProjectByUser = jest.fn();

jest.mock('../../src/services/projectService', () => ({
  projectService: {
    getProjectByUser: mockGetProjectByUser,
    updateProjectByUser: mockUpdateProjectByUser,
  },
}));

describe('CollaborationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.CORS_ORIGIN = 'http://localhost:5173';
  });

  it('creates a new invitation and returns a share link', async () => {
    mockAssertProjectOwner.mockResolvedValue({ id: 'project-1', title: 'Novel' });
    mockPrismaUser.findUnique
      .mockResolvedValueOnce({ id: 'owner-1', email: 'owner@example.com' })
      .mockResolvedValueOnce(null);
    mockPrismaProjectInvitation.findFirst.mockResolvedValue(null);
    mockPrismaProjectInvitation.create.mockResolvedValue({
      id: 'invite-1',
      email: 'reader@example.com',
      role: 'READ' as CollaborationRole,
      createdAt: new Date('2026-03-09T00:00:00.000Z'),
      expiresAt: new Date('2026-03-16T00:00:00.000Z'),
    });

    const { collaborationService } = await import('../../src/services/collaborationService');
    const result = await collaborationService.createInvitation('project-1', 'owner-1', {
      email: ' Reader@Example.com ',
      role: 'READ' as any,
    });

    expect(mockPrismaProjectInvitation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'reader@example.com',
        projectId: 'project-1',
        invitedBy: 'owner-1',
      }),
    }));
    expect(result.delivery).toBe('link-only');
    expect(result.acceptUrl).toContain('/invitations?token=');
  });

  it('rejects self-invites', async () => {
    mockAssertProjectOwner.mockResolvedValue({ id: 'project-1' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'owner-1', email: 'owner@example.com' });

    const { collaborationService } = await import('../../src/services/collaborationService');
    await expect(collaborationService.createInvitation('project-1', 'owner-1', {
      email: 'owner@example.com',
      role: 'READ' as any,
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects invite when an active collaborator already has access', async () => {
    mockAssertProjectOwner.mockResolvedValue({ id: 'project-1' });
    mockPrismaUser.findUnique
      .mockResolvedValueOnce({ id: 'owner-1', email: 'owner@example.com' })
      .mockResolvedValueOnce({ id: 'reader-1' });
    mockPrismaProjectCollaborator.findUnique.mockResolvedValue({ id: 'collab-1', revokedAt: null });

    const { collaborationService } = await import('../../src/services/collaborationService');
    await expect(collaborationService.createInvitation('project-1', 'owner-1', {
      email: 'reader@example.com',
      role: 'READ' as any,
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('accepts a valid invitation for the matching user email', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-2', email: 'reader@example.com' });
    mockPrismaProjectInvitation.findUnique.mockResolvedValue({
      id: 'invite-1',
      projectId: 'project-1',
      email: 'reader@example.com',
      role: 'COMMENT' as CollaborationRole,
      invitedBy: 'owner-1',
      createdAt: new Date('2026-03-09T00:00:00.000Z'),
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      declinedAt: null,
      revokedAt: null,
      project: {
        id: 'project-1',
        title: 'Novel',
        owner: { id: 'owner-1', email: 'owner@example.com', displayName: 'Owner', username: 'owner' },
      },
    });
    mockPrismaProjectCollaborator.upsert.mockResolvedValue({ id: 'collab-1', role: 'COMMENT' });
    mockPrismaProjectInvitation.update.mockResolvedValue({});

    const { collaborationService } = await import('../../src/services/collaborationService');
    const result = await collaborationService.acceptInvitation('token-1', 'user-2');

    expect(mockPrismaProjectCollaborator.upsert).toHaveBeenCalled();
    expect(mockPrismaProjectInvitation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'invite-1' },
      data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
    }));
    expect(result).toEqual(expect.objectContaining({ role: 'COMMENT' }));
  });

  it('rejects invitation acceptance when email does not match logged-in user', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-2', email: 'wrong@example.com' });
    mockPrismaProjectInvitation.findUnique.mockResolvedValue({
      id: 'invite-1',
      projectId: 'project-1',
      email: 'reader@example.com',
      role: 'READ' as CollaborationRole,
      invitedBy: 'owner-1',
      createdAt: new Date('2026-03-09T00:00:00.000Z'),
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      declinedAt: null,
      revokedAt: null,
      project: { id: 'project-1', title: 'Novel', owner: { id: 'owner-1', email: 'owner@example.com', displayName: null, username: 'owner' } },
    });

    const { collaborationService } = await import('../../src/services/collaborationService');
    await expect(collaborationService.acceptInvitation('token-1', 'user-2')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('declines a pending invitation', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-2', email: 'reader@example.com' });
    mockPrismaProjectInvitation.findUnique.mockResolvedValue({
      id: 'invite-1',
      email: 'reader@example.com',
      acceptedAt: null,
      declinedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockPrismaProjectInvitation.update.mockResolvedValue({});

    const { collaborationService } = await import('../../src/services/collaborationService');
    await expect(collaborationService.declineInvitation('token-1', 'user-2')).resolves.toEqual({ success: true });
    expect(mockPrismaProjectInvitation.update).toHaveBeenCalled();
  });

  it('updates collaborator role for owner', async () => {
    mockAssertProjectOwner.mockResolvedValue({ id: 'project-1' });
    mockPrismaProjectCollaborator.findFirst.mockResolvedValue({ id: 'collab-1' });
    mockPrismaProjectCollaborator.update.mockResolvedValue({ id: 'collab-1', role: 'COMMENT' });

    const { collaborationService } = await import('../../src/services/collaborationService');
    const result = await collaborationService.updateCollaborator('project-1', 'owner-1', 'collab-1', 'COMMENT' as any);

    expect(result).toEqual({ id: 'collab-1', role: 'COMMENT' });
  });

  it('revokes collaborator access', async () => {
    mockAssertProjectOwner.mockResolvedValue({ id: 'project-1' });
    mockPrismaProjectCollaborator.findFirst.mockResolvedValue({ id: 'collab-1' });
    mockPrismaProjectCollaborator.update.mockResolvedValue({});

    const { collaborationService } = await import('../../src/services/collaborationService');
    await expect(collaborationService.revokeCollaborator('project-1', 'owner-1', 'collab-1')).resolves.toEqual({ success: true });
    expect(mockPrismaProjectCollaborator.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'collab-1' },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    }));
  });

  it('lists review comments for an authorized reader', async () => {
    mockGetProjectAccess.mockResolvedValue({ projectId: 'project-1', canRead: true });
    mockPrismaProjectReviewComment.findMany.mockResolvedValue([{ id: 'review-1' }]);

    const { collaborationService } = await import('../../src/services/collaborationService');
    await expect(collaborationService.listReviewComments('project-1', 'reader-1')).resolves.toEqual([{ id: 'review-1' }]);
    expect(mockPrismaProjectReviewComment.findMany).toHaveBeenCalled();
  });

  it('creates a review suggestion for collaborators with comment access', async () => {
    mockGetProjectAccess.mockResolvedValue({ projectId: 'project-1', canComment: true });
    mockPrismaProjectReviewComment.create.mockResolvedValue({
      id: 'review-1',
      chapterId: 'chapter-1',
      text: 'Tighter wording',
      isSuggestion: true,
      replacementText: 'Better text',
      originalText: 'Old text',
      author: { id: 'reader-1', email: 'reader@example.com', username: 'reader', displayName: 'Reader' },
    });

    const { collaborationService } = await import('../../src/services/collaborationService');
    const result = await collaborationService.createReviewComment('project-1', 'reader-1', {
      chapterId: 'chapter-1',
      text: 'Tighter wording',
      isSuggestion: true,
      replacementText: 'Better text',
      originalText: 'Old text',
    });

    expect(mockPrismaProjectReviewComment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        projectId: 'project-1',
        authorId: 'reader-1',
        isSuggestion: true,
      }),
    }));
    expect(result.id).toBe('review-1');
  });

  it('applies a review suggestion for the owner and resolves it', async () => {
    mockAssertProjectOwner.mockResolvedValue({ id: 'project-1' });
    mockPrismaProjectReviewComment.findFirst.mockResolvedValue({
      id: 'review-1',
      chapterId: 'chapter-1',
      originalText: 'Old text',
      replacementText: 'New text',
      isSuggestion: true,
      startOffset: null,
      endOffset: null,
    });
    mockGetProjectByUser.mockResolvedValue({
      id: 'project-1',
      data: {
        meta: { title: 'Novel', author: 'Owner', description: '', tags: [] },
        chapters: [{ id: 'chapter-1', content: 'Old text in chapter' }],
      },
    });
    mockUpdateProjectByUser.mockResolvedValue({ id: 'project-1' });
    mockPrismaProjectReviewComment.update.mockResolvedValue({});

    const { collaborationService } = await import('../../src/services/collaborationService');
    const result = await collaborationService.applyReviewSuggestion('project-1', 'owner-1', 'review-1');

    expect(mockUpdateProjectByUser).toHaveBeenCalledWith('project-1', 'owner-1', expect.objectContaining({
      data: expect.objectContaining({
        chapters: [expect.objectContaining({ content: 'New text in chapter' })],
      }),
    }));
    expect(mockPrismaProjectReviewComment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'review-1' },
      data: { status: 'RESOLVED' },
    }));
    expect(result.status).toBe('RESOLVED');
  });
});
