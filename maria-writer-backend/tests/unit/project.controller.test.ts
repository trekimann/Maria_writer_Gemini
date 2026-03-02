/**
 * Unit tests for ProjectController.
 *
 * Tests both the guest path (guestId) and the authenticated user path (req.user).
 * projectService is fully mocked.
 */

const mockProjectService = {
  listProjects:                  jest.fn(),
  listProjectsByUser:            jest.fn(),
  createOrUpdateProject:         jest.fn(),
  createOrUpdateProjectByUser:   jest.fn(),
  getProject:                    jest.fn(),
  getProjectByUser:              jest.fn(),
  updateProject:                 jest.fn(),
  updateProjectByUser:           jest.fn(),
  deleteProject:                 jest.fn(),
  deleteProjectByUser:           jest.fn(),
};

jest.mock('../../src/services/projectService', () => ({ projectService: mockProjectService }));
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { projectController } from '../../src/controllers/projectController';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res: Record<string, jest.Mock> = {};
  res.json   = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as unknown as import('express').Response;
}

function makeReq(overrides: object = {}): import('express').Request {
  return { body: {}, params: {}, query: {}, ...overrides } as import('express').Request;
}

const noop = jest.fn() as unknown as import('express').NextFunction;

const GUEST_ID = '12345678-1234-4123-8123-123456789012';
const USER     = { id: 'user-uuid-1', email: 'test@example.com', role: 'USER' };

const MOCK_PROJECT = {
  id: 'proj-1',
  title: 'My Novel',
  updatedAt: new Date('2026-01-01'),
};

// ---------------------------------------------------------------------------
// listProjects()
// ---------------------------------------------------------------------------

describe('ProjectController.listProjects()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists projects by guestId when no user', async () => {
    mockProjectService.listProjects.mockResolvedValue([MOCK_PROJECT]);
    const req = makeReq({ query: { guestId: GUEST_ID } });
    const res = makeRes();

    await projectController.listProjects(req, res, noop);
    expect(mockProjectService.listProjects).toHaveBeenCalledWith(GUEST_ID);
    expect(res.json).toHaveBeenCalledWith({ projects: [MOCK_PROJECT] });
  });

  it('lists projects by userId when authenticated', async () => {
    mockProjectService.listProjectsByUser.mockResolvedValue([MOCK_PROJECT]);
    const req = makeReq({ user: USER });
    const res = makeRes();

    await projectController.listProjects(req, res, noop);
    expect(mockProjectService.listProjectsByUser).toHaveBeenCalledWith(USER.id);
  });

  it('returns 400 when no guestId and not authenticated', async () => {
    const next = jest.fn();
    await projectController.listProjects(makeReq(), makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

// ---------------------------------------------------------------------------
// createOrUpdateProject()
// ---------------------------------------------------------------------------

describe('ProjectController.createOrUpdateProject()', () => {
  beforeEach(() => jest.clearAllMocks());

  const data = { meta: { title: 'T' }, chapters: [], characters: [], events: [], relationships: [], comments: {}, activeChapterId: null, viewMode: 'write', context: 'writer', activeCodexTab: 'timeline', activeModal: 'none', editingItemId: null, viewingItemId: null };

  it('creates a new guest project (201)', async () => {
    mockProjectService.createOrUpdateProject.mockResolvedValue({ project: MOCK_PROJECT, isNew: true });
    const req = makeReq({ body: { guestId: GUEST_ID, title: 'My Novel', data } });
    const res = makeRes();

    await projectController.createOrUpdateProject(req, res, noop);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-1', isNew: true }));
  });

  it('updates an existing guest project (200)', async () => {
    mockProjectService.createOrUpdateProject.mockResolvedValue({ project: MOCK_PROJECT, isNew: false });
    const req = makeReq({ body: { guestId: GUEST_ID, title: 'My Novel', data } });
    const res = makeRes();

    await projectController.createOrUpdateProject(req, res, noop);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('creates project for authenticated user (201)', async () => {
    mockProjectService.createOrUpdateProjectByUser.mockResolvedValue({ project: MOCK_PROJECT, isNew: true });
    const req = makeReq({ user: USER, body: { title: 'My Novel', data } });
    const res = makeRes();

    await projectController.createOrUpdateProject(req, res, noop);
    expect(mockProjectService.createOrUpdateProjectByUser).toHaveBeenCalledWith(USER.id, 'My Novel', data);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('forwards errors to next()', async () => {
    mockProjectService.createOrUpdateProject.mockRejectedValue(new Error('db error'));
    const next = jest.fn();
    await projectController.createOrUpdateProject(
      makeReq({ body: { guestId: GUEST_ID, title: 'T', data } }),
      makeRes(),
      next as any,
    );
    expect(next).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getProject()
// ---------------------------------------------------------------------------

describe('ProjectController.getProject()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns project for guest', async () => {
    mockProjectService.getProject.mockResolvedValue(MOCK_PROJECT);
    const req = makeReq({ params: { id: 'proj-1' }, query: { guestId: GUEST_ID } });
    const res = makeRes();

    await projectController.getProject(req, res, noop);
    expect(res.json).toHaveBeenCalledWith({ project: MOCK_PROJECT });
  });

  it('returns 404 when guest project not found', async () => {
    mockProjectService.getProject.mockResolvedValue(null);
    const next = jest.fn();
    const req = makeReq({ params: { id: 'ghost' }, query: { guestId: GUEST_ID } });

    await projectController.getProject(req, makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns project for authenticated user', async () => {
    mockProjectService.getProjectByUser.mockResolvedValue(MOCK_PROJECT);
    const req = makeReq({ params: { id: 'proj-1' }, user: USER });
    const res = makeRes();

    await projectController.getProject(req, res, noop);
    expect(mockProjectService.getProjectByUser).toHaveBeenCalledWith('proj-1', USER.id);
  });

  it('returns 400 when guestId missing', async () => {
    const next = jest.fn();
    await projectController.getProject(
      makeReq({ params: { id: 'proj-1' } }),
      makeRes(),
      next as any,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

// ---------------------------------------------------------------------------
// updateProject()
// ---------------------------------------------------------------------------

describe('ProjectController.updateProject()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates a guest project', async () => {
    mockProjectService.updateProject.mockResolvedValue(MOCK_PROJECT);
    const req = makeReq({ params: { id: 'proj-1' }, query: { guestId: GUEST_ID }, body: { title: 'New Title' } });
    const res = makeRes();

    await projectController.updateProject(req, res, noop);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-1' }));
  });

  it('updates an authenticated user project', async () => {
    mockProjectService.updateProjectByUser.mockResolvedValue(MOCK_PROJECT);
    const req = makeReq({ params: { id: 'proj-1' }, user: USER, body: { title: 'New Title' } });
    const res = makeRes();

    await projectController.updateProject(req, res, noop);
    expect(mockProjectService.updateProjectByUser).toHaveBeenCalledWith('proj-1', USER.id, expect.any(Object));
  });

  it('maps "Record to update not found" Prisma error to 404', async () => {
    mockProjectService.updateProject.mockRejectedValue(new Error('Record to update not found'));
    const next = jest.fn();
    const req = makeReq({ params: { id: 'ghost' }, query: { guestId: GUEST_ID }, body: {} });

    await projectController.updateProject(req, makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

// ---------------------------------------------------------------------------
// deleteProject()
// ---------------------------------------------------------------------------

describe('ProjectController.deleteProject()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a guest project and returns success', async () => {
    mockProjectService.deleteProject.mockResolvedValue(undefined);
    const req = makeReq({ params: { id: 'proj-1' }, query: { guestId: GUEST_ID } });
    const res = makeRes();

    await projectController.deleteProject(req, res, noop);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Project deleted' });
  });

  it('deletes an authenticated user project', async () => {
    mockProjectService.deleteProjectByUser.mockResolvedValue(undefined);
    const req = makeReq({ params: { id: 'proj-1' }, user: USER });
    const res = makeRes();

    await projectController.deleteProject(req, res, noop);
    expect(mockProjectService.deleteProjectByUser).toHaveBeenCalledWith('proj-1', USER.id);
  });

  it('maps "Record to delete" Prisma error to 404', async () => {
    mockProjectService.deleteProject.mockRejectedValue(new Error('Record to delete does not exist'));
    const next = jest.fn();
    const req = makeReq({ params: { id: 'ghost' }, query: { guestId: GUEST_ID } });

    await projectController.deleteProject(req, makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns 400 when guestId missing and not authenticated', async () => {
    const next = jest.fn();
    await projectController.deleteProject(
      makeReq({ params: { id: 'proj-1' } }),
      makeRes(),
      next as any,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
