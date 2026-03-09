import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchWithAuth = vi.fn();

vi.mock('./authService', () => ({
  authApiService: {
    fetchWithAuth: mockFetchWithAuth,
  },
}));

describe('collaborationService', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset();
  });

  const getService = async () => {
    vi.resetModules();
    const mod = await import('./collaborationService');
    return mod.collaborationService;
  };

  it('lists shared projects and normalizes collaborator metadata', async () => {
    const service = await getService();

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        projects: [
          {
            id: 'p1',
            title: 'Shared Project',
            version: '2.3.0',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-02',
            owner: { id: 'u1', email: 'owner@example.com', username: 'owner', displayName: 'Owner' },
            collaborators: [{ id: 'c1', role: 'READ', acceptedAt: '2026-01-03' }],
          },
        ],
      }),
    });

    await expect(service.listSharedProjects()).resolves.toEqual([
      expect.objectContaining({
        id: 'p1',
        collaborator: expect.objectContaining({ id: 'c1', role: 'READ' }),
      }),
    ]);
  });

  it('creates an invitation', async () => {
    const service = await getService();

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        invitation: {
          id: 'i1',
          email: 'reader@example.com',
          role: 'READ',
          createdAt: '2026-01-01',
          expiresAt: '2026-01-08',
        },
        acceptUrl: 'http://localhost:5173/invitations?token=abc',
        delivery: 'link-only',
      }),
    });

    const result = await service.createInvitation('project-1', { email: 'reader@example.com', role: 'READ' });

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/projects/project-1/invitations', expect.objectContaining({ method: 'POST' }));
    expect(result.acceptUrl).toContain('token=abc');
  });

  it('accepts an invitation', async () => {
    const service = await getService();

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        collaboratorId: 'c1',
        role: 'READ',
        project: {
          id: 'p1',
          title: 'Story',
          owner: { id: 'u1', email: 'owner@example.com', username: 'owner', displayName: 'Owner' },
        },
      }),
    });

    await expect(service.acceptInvitation('invite-token')).resolves.toEqual(expect.objectContaining({ collaboratorId: 'c1' }));
  });

  it('lists review comments', async () => {
    const service = await getService();

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        comments: [{ id: 'review-1', chapterId: 'chapter-1', text: 'Comment' }],
      }),
    });

    await expect(service.listReviewComments('project-1')).resolves.toEqual([
      expect.objectContaining({ id: 'review-1', chapterId: 'chapter-1' }),
    ]);
  });

  it('creates a review comment', async () => {
    const service = await getService();

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        comment: { id: 'review-1', chapterId: 'chapter-1', text: 'Looks good' },
      }),
    });

    await expect(service.createReviewComment('project-1', {
      chapterId: 'chapter-1',
      text: 'Looks good',
      isSuggestion: false,
      originalText: 'Original text',
    })).resolves.toEqual(expect.objectContaining({ id: 'review-1' }));
  });

  it('applies a review suggestion', async () => {
    const service = await getService();

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        commentId: 'review-1',
        chapterId: 'chapter-1',
        content: 'Updated text',
        status: 'RESOLVED',
      }),
    });

    await expect(service.applyReviewSuggestion('project-1', 'review-1')).resolves.toEqual(
      expect.objectContaining({ success: true, status: 'RESOLVED' }),
    );
  });
});