const mockCollaborationService = {
  listCollaborators: jest.fn(),
  listProjectInvitations: jest.fn(),
  createInvitation: jest.fn(),
  listPendingInvitations: jest.fn(),
  acceptInvitation: jest.fn(),
  declineInvitation: jest.fn(),
  updateCollaborator: jest.fn(),
  revokeCollaborator: jest.fn(),
  listReviewComments: jest.fn(),
  createReviewComment: jest.fn(),
  applyReviewSuggestion: jest.fn(),
};

jest.mock('../../src/services/collaborationService', () => ({
  collaborationService: mockCollaborationService,
}));

import { collaborationController } from '../../src/controllers/collaborationController';

function makeRes() {
  const res: Record<string, jest.Mock> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as unknown as import('express').Response;
}

function makeReq(overrides: Partial<import('express').Request> = {}): import('express').Request {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 'user-1', email: 'test@example.com', role: 'USER' as any },
    ...overrides,
  } as import('express').Request;
}

describe('CollaborationController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists collaborators', async () => {
    mockCollaborationService.listCollaborators.mockResolvedValue([{ id: 'collab-1' }]);
    const res = makeRes();

    await collaborationController.listCollaborators(makeReq({ params: { id: 'project-1' } }), res, jest.fn() as any);
    expect(res.json).toHaveBeenCalledWith({ collaborators: [{ id: 'collab-1' }] });
  });

  it('creates invitation with 201', async () => {
    mockCollaborationService.createInvitation.mockResolvedValue({ invitation: { id: 'invite-1' } });
    const res = makeRes();

    await collaborationController.createInvitation(
      makeReq({ params: { id: 'project-1' }, body: { email: 'friend@example.com', role: 'READ' } }),
      res,
      jest.fn() as any,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ invitation: { id: 'invite-1' } });
  });

  it('lists pending invitations for the current user', async () => {
    mockCollaborationService.listPendingInvitations.mockResolvedValue([{ id: 'invite-1' }]);
    const res = makeRes();

    await collaborationController.listPendingInvitations(makeReq(), res, jest.fn() as any);
    expect(res.json).toHaveBeenCalledWith({ invitations: [{ id: 'invite-1' }] });
  });

  it('accepts invitation', async () => {
    mockCollaborationService.acceptInvitation.mockResolvedValue({ collaboratorId: 'collab-1' });
    const res = makeRes();

    await collaborationController.acceptInvitation(makeReq({ params: { token: 'token-1' } }), res, jest.fn() as any);
    expect(res.json).toHaveBeenCalledWith({ collaboratorId: 'collab-1' });
  });

  it('forwards errors to next()', async () => {
    const next = jest.fn();
    mockCollaborationService.revokeCollaborator.mockRejectedValue(new Error('boom'));

    await collaborationController.revokeCollaborator(
      makeReq({ params: { id: 'project-1', collaboratorId: 'collab-1' } }),
      makeRes(),
      next as any,
    );

    expect(next).toHaveBeenCalled();
  });

  it('lists review comments for a project', async () => {
    mockCollaborationService.listReviewComments.mockResolvedValue([{ id: 'review-1' }]);
    const res = makeRes();

    await collaborationController.listReviewComments(makeReq({ params: { id: 'project-1' } }), res, jest.fn() as any);
    expect(res.json).toHaveBeenCalledWith({ comments: [{ id: 'review-1' }] });
  });

  it('creates a review comment with 201', async () => {
    mockCollaborationService.createReviewComment.mockResolvedValue({ id: 'review-1' });
    const res = makeRes();

    await collaborationController.createReviewComment(
      makeReq({
        params: { id: 'project-1' },
        body: { chapterId: 'chapter-1', text: 'Comment', isSuggestion: false, originalText: 'Text' },
      }),
      res,
      jest.fn() as any,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ comment: { id: 'review-1' } });
  });

  it('applies a review suggestion', async () => {
    mockCollaborationService.applyReviewSuggestion.mockResolvedValue({ success: true, commentId: 'review-1' });
    const res = makeRes();

    await collaborationController.applyReviewSuggestion(
      makeReq({ params: { id: 'project-1', commentId: 'review-1' } }),
      res,
      jest.fn() as any,
    );

    expect(res.json).toHaveBeenCalledWith({ success: true, commentId: 'review-1' });
  });
});
