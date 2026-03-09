/**
 * Unit tests for AuthController.
 *
 * authService is fully mocked — only the Express glue is tested here:
 *   • cookie setting / clearing
 *   • HTTP status codes
 *   • response shape
 *   • error forwarding to next()
 */

// ---------------------------------------------------------------------------
// Mocks — must come before any import that uses these modules
// ---------------------------------------------------------------------------

const mockAuthService = {
  register:       jest.fn(),
  login:          jest.fn(),
  refreshTokens:  jest.fn(),
  logout:         jest.fn(),
  getUser:        jest.fn(),
  updateProfile:  jest.fn(),
};

jest.mock('../../src/services/authService', () => ({
  authService: mockAuthService,
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------

import { authController } from '../../src/controllers/authController';
import { AppError } from '../../src/middleware/errorHandler';

// ---------------------------------------------------------------------------
// Request / Response / next factories
// ---------------------------------------------------------------------------

function makeRes() {
  const res: Record<string, jest.Mock> = {};
  res.cookie     = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.json       = jest.fn().mockReturnValue(res);
  res.status     = jest.fn().mockReturnValue(res);
  return res as unknown as import('express').Response;
}

function makeReq(overrides: Partial<import('express').Request> = {}): import('express').Request {
  return { body: {}, cookies: {}, ...overrides } as import('express').Request;
}

const noop = jest.fn() as unknown as import('express').NextFunction;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_USER = {
  id: 'user-1', email: 'test@example.com', username: 'tester',
  displayName: 'Tester', role: 'USER', tier: 'DEFAULT',
  genreTags: null, profilePicture: null, dob: null, aliases: null, bio: null, profileColor: '#4f46e5', creatorConnections: [],
};
const FAKE_TOKENS = {
  accessToken:  'at-jwt-string',
  refreshToken: 'rt-jwt-string',
};
const FAKE_RESULT = { user: FAKE_USER, tokens: FAKE_TOKENS };

const COOKIE_NAME = 'maria_rt';

// ---------------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------------

describe('AuthController.register()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets an httpOnly cookie and returns 201 with user + accessToken', async () => {
    mockAuthService.register.mockResolvedValue(FAKE_RESULT);

    const req = makeReq({ body: { email: 'test@example.com', username: 'tester', password: 'pw' } });
    const res = makeRes();

    await authController.register(req, res, noop);

    // 201 status
    expect(res.status).toHaveBeenCalledWith(201);

    // cookie was set
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      FAKE_TOKENS.refreshToken,
      expect.objectContaining({ httpOnly: true })
    );

    // body
    expect(res.json).toHaveBeenCalledWith({
      user:        FAKE_USER,
      accessToken: FAKE_TOKENS.accessToken,
    });
  });

  it('forwards errors to next()', async () => {
    const err = new AppError('Email already registered', 409);
    mockAuthService.register.mockRejectedValue(err);

    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = jest.fn() as unknown as import('express').NextFunction;

    await authController.register(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// login()
// ---------------------------------------------------------------------------

describe('AuthController.login()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets cookie with 7-day maxAge when rememberMe is false', async () => {
    mockAuthService.login.mockResolvedValue(FAKE_RESULT);

    const req = makeReq({ body: { email: 'test@example.com', password: 'pw', rememberMe: false } });
    const res = makeRes();

    await authController.login(req, res, noop);

    const [, , cookieOpts] = (res.cookie as jest.Mock).mock.calls[0];
    // 7 * 24 * 60 * 60 * 1000
    expect(cookieOpts.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    expect(res.json).toHaveBeenCalledWith({ user: FAKE_USER, accessToken: FAKE_TOKENS.accessToken });
  });

  it('sets cookie with 30-day maxAge when rememberMe is true', async () => {
    mockAuthService.login.mockResolvedValue(FAKE_RESULT);

    const req = makeReq({ body: { email: 'test@example.com', password: 'pw', rememberMe: true } });
    const res = makeRes();

    await authController.login(req, res, noop);

    const [, , cookieOpts] = (res.cookie as jest.Mock).mock.calls[0];
    expect(cookieOpts.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('forwards 401 to next() on bad credentials', async () => {
    mockAuthService.login.mockRejectedValue(new AppError('Invalid email or password', 401));

    const next = jest.fn() as unknown as import('express').NextFunction;
    await authController.login(makeReq({ body: {} }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

// ---------------------------------------------------------------------------
// refresh()
// ---------------------------------------------------------------------------

describe('AuthController.refresh()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 via next() when no cookie is present', async () => {
    const req  = makeReq({ cookies: {} });      // no maria_rt
    const res  = makeRes();
    const next = jest.fn() as unknown as import('express').NextFunction;

    await authController.refresh(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(mockAuthService.refreshTokens).not.toHaveBeenCalled();
  });

  it('rotates cookie and returns new accessToken on valid refresh', async () => {
    mockAuthService.refreshTokens.mockResolvedValue(FAKE_RESULT);

    const req = makeReq({ cookies: { [COOKIE_NAME]: 'old-rt' } });
    const res = makeRes();

    await authController.refresh(req, res, noop);

    expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('old-rt');
    expect(res.cookie).toHaveBeenCalledWith(COOKIE_NAME, FAKE_TOKENS.refreshToken, expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ user: FAKE_USER, accessToken: FAKE_TOKENS.accessToken });
  });
});

// ---------------------------------------------------------------------------
// logout()
// ---------------------------------------------------------------------------

describe('AuthController.logout()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('revokes the token and clears the cookie when cookie is present', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);

    const req = makeReq({ cookies: { [COOKIE_NAME]: 'some-rt' } });
    const res = makeRes();

    await authController.logout(req, res, noop);

    expect(mockAuthService.logout).toHaveBeenCalledWith('some-rt');
    expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('still clears cookie and returns success when no cookie is present', async () => {
    const req = makeReq({ cookies: {} });
    const res = makeRes();

    await authController.logout(req, res, noop);

    expect(mockAuthService.logout).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

// ---------------------------------------------------------------------------
// me()
// ---------------------------------------------------------------------------

describe('AuthController.me()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 via next() when req.user is not set', async () => {
    const req  = makeReq(); // no user on request
    const res  = makeRes();
    const next = jest.fn() as unknown as import('express').NextFunction;

    await authController.me(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('returns 404 via next() when user no longer exists in DB', async () => {
    mockAuthService.getUser.mockResolvedValue(null);

    const req  = { body: {}, cookies: {}, user: { id: 'ghost-id' } } as unknown as import('express').Request;
    const res  = makeRes();
    const next = jest.fn() as unknown as import('express').NextFunction;

    await authController.me(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns user data on success', async () => {
    mockAuthService.getUser.mockResolvedValue(FAKE_USER);

    const req = { body: {}, cookies: {}, user: { id: FAKE_USER.id } } as unknown as import('express').Request;
    const res = makeRes();

    await authController.me(req, res, noop);

    expect(mockAuthService.getUser).toHaveBeenCalledWith(FAKE_USER.id);
    expect(res.json).toHaveBeenCalledWith({ user: FAKE_USER });
  });
});

// ---------------------------------------------------------------------------
// updateProfile()
// ---------------------------------------------------------------------------

describe('AuthController.updateProfile()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 via next() when req.user is not set', async () => {
    const req = makeReq({ body: { displayName: 'Updated' } });
    const res = makeRes();
    const next = jest.fn() as unknown as import('express').NextFunction;

    await authController.updateProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('returns the updated user on success', async () => {
    mockAuthService.updateProfile.mockResolvedValue({ ...FAKE_USER, displayName: 'Updated' });

    const req = { body: { displayName: 'Updated' }, cookies: {}, user: { id: FAKE_USER.id } } as unknown as import('express').Request;
    const res = makeRes();

    await authController.updateProfile(req, res, noop);

    expect(mockAuthService.updateProfile).toHaveBeenCalledWith(FAKE_USER.id, { displayName: 'Updated' });
    expect(res.json).toHaveBeenCalledWith({ user: expect.objectContaining({ displayName: 'Updated' }) });
  });
});
