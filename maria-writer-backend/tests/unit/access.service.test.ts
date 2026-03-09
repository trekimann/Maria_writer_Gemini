const mockPrismaProject = {
  findUnique: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  prisma: {
    project: mockPrismaProject,
  },
}));

describe('AccessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('returns owner access when user owns the project', async () => {
    mockPrismaProject.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'user-1',
      collaborators: [],
    });

    const { accessService } = await import('../../src/services/accessService');
    const result = await accessService.getProjectAccess('project-1', 'user-1');

    expect(result).toEqual(expect.objectContaining({
      projectId: 'project-1',
      isOwner: true,
      role: 'OWNER',
      canRead: true,
      canComment: true,
      canEditProject: true,
      collaboratorId: null,
    }));
  });

  it('returns collaborator capabilities for accepted collaborator', async () => {
    mockPrismaProject.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
      collaborators: [{ id: 'collab-1', role: 'COMMENT' }],
    });

    const { accessService } = await import('../../src/services/accessService');
    const result = await accessService.getProjectAccess('project-1', 'user-2');

    expect(result).toEqual(expect.objectContaining({
      isOwner: false,
      role: 'COMMENT',
      collaboratorId: 'collab-1',
      canRead: true,
      canComment: true,
      canEditProject: false,
    }));
  });

  it('returns null when project does not exist', async () => {
    mockPrismaProject.findUnique.mockResolvedValue(null);

    const { accessService } = await import('../../src/services/accessService');
    await expect(accessService.getProjectAccess('missing', 'user-1')).resolves.toBeNull();
  });

  it('returns null when user is not owner or collaborator', async () => {
    mockPrismaProject.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
      collaborators: [],
    });

    const { accessService } = await import('../../src/services/accessService');
    await expect(accessService.getProjectAccess('project-1', 'user-2')).resolves.toBeNull();
  });

  it('assertProjectOwner throws 400 for guest project', async () => {
    mockPrismaProject.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: null,
      title: 'Guest Project',
    });

    const { accessService } = await import('../../src/services/accessService');
    await expect(accessService.assertProjectOwner('project-1', 'user-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('assertProjectOwner throws 403 for non-owner', async () => {
    mockPrismaProject.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
      title: 'Owned Project',
    });

    const { accessService } = await import('../../src/services/accessService');
    await expect(accessService.assertProjectOwner('project-1', 'user-2')).rejects.toMatchObject({ statusCode: 403 });
  });
});
