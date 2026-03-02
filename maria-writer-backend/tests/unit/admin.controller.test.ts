/**
 * Unit tests for AdminController.
 *
 * authService is fully mocked — only the controller glue is exercised.
 */

const mockAuthService = {
  listUsers:     jest.fn(),
  getUser:       jest.fn(),
  resetPassword: jest.fn(),
};

jest.mock('../../src/services/authService', () => ({ authService: mockAuthService }));
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { adminController } from '../../src/controllers/adminController';
import { AppError } from '../../src/middleware/errorHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res: Record<string, jest.Mock> = {};
  res.json   = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as unknown as import('express').Response;
}

function makeReq(overrides: Partial<import('express').Request> = {}): import('express').Request {
  return { body: {}, params: {}, query: {}, ...overrides } as import('express').Request;
}

const noop = jest.fn() as unknown as import('express').NextFunction;

const FAKE_USER = {
  id: 'user-1', email: 'admin@example.com', username: 'admin',
  displayName: 'Admin', role: 'ADMIN', tier: 'DEFAULT',
};

// ---------------------------------------------------------------------------
// listUsers()
// ---------------------------------------------------------------------------

describe('AdminController.listUsers()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated user list with defaults', async () => {
    mockAuthService.listUsers.mockResolvedValue({
      users: [FAKE_USER], total: 1, totalPages: 1,
    });
    const res = makeRes();
    await adminController.listUsers(makeReq(), res, noop);

    expect(mockAuthService.listUsers).toHaveBeenCalledWith(1, 20, undefined);
    expect(res.json).toHaveBeenCalledWith({ users: [FAKE_USER], total: 1, totalPages: 1 });
  });

  it('passes page, limit and search query params through', async () => {
    mockAuthService.listUsers.mockResolvedValue({ users: [], total: 0, totalPages: 0 });
    const req = makeReq({ query: { page: '2', limit: '5', search: 'nick' } } as any);
    const res = makeRes();

    await adminController.listUsers(req, res, noop);
    expect(mockAuthService.listUsers).toHaveBeenCalledWith(2, 5, 'nick');
  });

  it('clamps page to minimum 1', async () => {
    mockAuthService.listUsers.mockResolvedValue({ users: [], total: 0, totalPages: 0 });
    const req = makeReq({ query: { page: '-5' } } as any);
    await adminController.listUsers(req, makeRes(), noop);
    expect(mockAuthService.listUsers).toHaveBeenCalledWith(1, 20, undefined);
  });

  it('clamps limit to maximum 100', async () => {
    mockAuthService.listUsers.mockResolvedValue({ users: [], total: 0, totalPages: 0 });
    const req = makeReq({ query: { limit: '999' } } as any);
    await adminController.listUsers(req, makeRes(), noop);
    expect(mockAuthService.listUsers).toHaveBeenCalledWith(1, 100, undefined);
  });

  it('forwards service errors to next()', async () => {
    const err = new Error('db exploded');
    mockAuthService.listUsers.mockRejectedValue(err);
    const next = jest.fn();
    await adminController.listUsers(makeReq(), makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// getUser()
// ---------------------------------------------------------------------------

describe('AdminController.getUser()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the user when found', async () => {
    mockAuthService.getUser.mockResolvedValue(FAKE_USER);
    const req = makeReq({ params: { id: 'user-1' } } as any);
    const res = makeRes();

    await adminController.getUser(req, res, noop);
    expect(res.json).toHaveBeenCalledWith({ user: FAKE_USER });
  });

  it('throws 404 when user not found', async () => {
    mockAuthService.getUser.mockResolvedValue(null);
    const next = jest.fn();
    const req = makeReq({ params: { id: 'ghost' } } as any);

    await adminController.getUser(req, makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('forwards unexpected errors to next()', async () => {
    const err = new Error('timeout');
    mockAuthService.getUser.mockRejectedValue(err);
    const next = jest.fn();
    await adminController.getUser(makeReq({ params: { id: 'x' } } as any), makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// resetPassword()
// ---------------------------------------------------------------------------

describe('AdminController.resetPassword()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns success on valid reset', async () => {
    mockAuthService.resetPassword.mockResolvedValue(undefined);
    const req = makeReq({
      params:  { id: 'user-1' } as any,
      body:    { newPassword: 'New1!pass' },
      user:    { id: 'admin-1' } as any,
    });
    const res = makeRes();

    await adminController.resetPassword(req, res, noop);
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('user-1', 'New1!pass', 'admin-1');
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Password updated' });
  });

  it('throws 401 when req.user is not set', async () => {
    const next = jest.fn();
    const req = makeReq({ params: { id: 'user-1' } as any, body: { newPassword: 'x' } });

    await adminController.resetPassword(req, makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('forwards service errors to next()', async () => {
    const err = new AppError('User not found', 404);
    mockAuthService.resetPassword.mockRejectedValue(err);
    const next = jest.fn();
    const req = makeReq({
      params: { id: 'ghost' } as any,
      body:   { newPassword: 'x' },
      user:   { id: 'admin-1' } as any,
    });

    await adminController.resetPassword(req, makeRes(), next as any);
    expect(next).toHaveBeenCalledWith(err);
  });
});
