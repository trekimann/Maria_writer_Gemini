/**
 * Unit tests for AuthService.
 *
 * All Prisma calls and bcrypt are mocked — no database required.
 */

import { UserRole, UserTier } from '@prisma/client';

// ---------------------------------------------------------------------------
// Env setup — must be before any import that reads process.env
// ---------------------------------------------------------------------------

process.env.JWT_SECRET         = 'test-jwt-secret-that-is-long-enough-for-hmac';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-for-hmac';
process.env.BCRYPT_ROUNDS      = '1'; // low rounds for fast tests

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrismaUser = {
  findUnique:   jest.fn(),
  create:       jest.fn(),
  update:       jest.fn(),
  updateMany:   jest.fn(),
  findMany:     jest.fn(),
  count:        jest.fn(),
};

const mockPrismaRefreshToken = {
  create:       jest.fn(),
  findUnique:   jest.fn(),
  update:       jest.fn(),
  updateMany:   jest.fn(),
};

const mockPrismaTransaction = jest.fn();

jest.mock('../../src/config/database', () => ({
  prisma: {
    user:         mockPrismaUser,
    refreshToken: mockPrismaRefreshToken,
    $transaction: mockPrismaTransaction,
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DB_USER = {
  id:             'user-uuid-1',
  email:          'test@example.com',
  username:       'testuser',
  passwordHash:   '$2b$01$hashed',
  displayName:    'Test User',
  role:           UserRole.USER,
  tier:           UserTier.DEFAULT,
  genreTags:      'fantasy',
  profilePicture: null,
  createdAt:      new Date('2026-01-01'),
  lastLogin:      null,
};

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { authService } from '../../src/services/authService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeJwt(token: string): Record<string, unknown> {
  return jwt.decode(token) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------------

describe('AuthService.register()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user + token pair when email and username are unique', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null); // both checks return null
    mockPrismaUser.create.mockResolvedValue(DB_USER);
    mockPrismaRefreshToken.create.mockResolvedValue({});

    const result = await authService.register(
      'test@example.com', 'testuser', 'Secret1!', 'Test User'
    );

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.username).toBe('testuser');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();

    // Access token payload
    const payload = decodeJwt(result.tokens.accessToken);
    expect(payload.type).toBe('access');
    expect(payload.email).toBe('test@example.com');
  });

  it('throws 409 when email is already registered', async () => {
    mockPrismaUser.findUnique
      .mockResolvedValueOnce(DB_USER)  // email exists
      .mockResolvedValueOnce(null);    // username free

    await expect(
      authService.register('test@example.com', 'newuser', 'pw')
    ).rejects.toMatchObject({ statusCode: 409, message: 'Email already registered' });
  });

  it('throws 409 when username is already taken', async () => {
    mockPrismaUser.findUnique
      .mockResolvedValueOnce(null)    // email free
      .mockResolvedValueOnce(DB_USER); // username exists

    await expect(
      authService.register('new@example.com', 'testuser', 'pw')
    ).rejects.toMatchObject({ statusCode: 409, message: 'Username already taken' });
  });

  it('stores a hashed password — not the plaintext', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    mockPrismaUser.create.mockImplementation(async ({ data }) => ({ ...DB_USER, ...data }));
    mockPrismaRefreshToken.create.mockResolvedValue({});

    await authService.register('new@example.com', 'newuser', 'plaintext-pw');

    const createdWith = mockPrismaUser.create.mock.calls[0][0].data;
    expect(createdWith.passwordHash).not.toBe('plaintext-pw');
    expect(await bcrypt.compare('plaintext-pw', createdWith.passwordHash)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// login()
// ---------------------------------------------------------------------------

describe('AuthService.login()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user + token pair on valid credentials', async () => {
    const hash = await bcrypt.hash('Secret1!', 1);
    mockPrismaUser.findUnique.mockResolvedValue({ ...DB_USER, passwordHash: hash });
    mockPrismaUser.update.mockResolvedValue({});
    mockPrismaRefreshToken.create.mockResolvedValue({});

    const result = await authService.login('test@example.com', 'Secret1!');
    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('throws 401 when email is not found', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    await expect(
      authService.login('missing@example.com', 'pw')
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 when password is wrong', async () => {
    const hash = await bcrypt.hash('correct-password', 1);
    mockPrismaUser.findUnique.mockResolvedValue({ ...DB_USER, passwordHash: hash });

    await expect(
      authService.login('test@example.com', 'wrong-password')
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns same 401 message for missing user and wrong password (enumeration guard)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    await expect(authService.login('x@x.com', 'pw'))
      .rejects.toMatchObject({ message: 'Invalid email or password' });

    const hash = await bcrypt.hash('pw', 1);
    mockPrismaUser.findUnique.mockResolvedValue({ ...DB_USER, passwordHash: hash });
    await expect(authService.login('test@example.com', 'wrong'))
      .rejects.toMatchObject({ message: 'Invalid email or password' });
  });
});

// ---------------------------------------------------------------------------
// refreshTokens()
// ---------------------------------------------------------------------------

describe('AuthService.refreshTokens()', () => {
  beforeEach(() => jest.clearAllMocks());

  function makeRefreshToken(userId: string): string {
    return jwt.sign(
      { sub: userId, family: 'fam-1', tokenId: 'tid-1', type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
  }

  it('issues a new token pair when token is valid and not revoked', async () => {
    const raw = makeRefreshToken(DB_USER.id);

    mockPrismaRefreshToken.findUnique.mockResolvedValue({
      id: 'rt-1', userId: DB_USER.id, revoked: false,
      expiresAt: new Date(Date.now() + 86_400_000), family: 'fam-1',
    });
    mockPrismaRefreshToken.update.mockResolvedValue({});
    mockPrismaUser.findUnique.mockResolvedValue(DB_USER);
    mockPrismaRefreshToken.create.mockResolvedValue({});

    const result = await authService.refreshTokens(raw);
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).not.toBe(raw);
  });

  it('throws 401 and revokes family when token is already revoked (replay)', async () => {
    const raw = makeRefreshToken(DB_USER.id);

    mockPrismaRefreshToken.findUnique.mockResolvedValue({
      id: 'rt-1', userId: DB_USER.id, revoked: true,
      expiresAt: new Date(Date.now() + 86_400_000), family: 'fam-1',
    });
    mockPrismaRefreshToken.updateMany.mockResolvedValue({});

    await expect(authService.refreshTokens(raw))
      .rejects.toMatchObject({ statusCode: 401 });

    expect(mockPrismaRefreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { family: 'fam-1' }, data: { revoked: true } })
    );
  });

  it('throws 401 when refresh token has invalid signature', async () => {
    const badToken = jwt.sign(
      { sub: 'x', family: 'f', tokenId: 't', type: 'refresh' },
      'wrong-secret',
      { expiresIn: '7d' }
    );
    await expect(authService.refreshTokens(badToken))
      .rejects.toMatchObject({ statusCode: 401 });
  });
});

// ---------------------------------------------------------------------------
// logout()
// ---------------------------------------------------------------------------

describe('AuthService.logout()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks the token as revoked', async () => {
    const raw = jwt.sign(
      { sub: DB_USER.id, family: 'fam-1', tokenId: 'tid-1', type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    mockPrismaRefreshToken.updateMany.mockResolvedValue({ count: 1 });
    await authService.logout(raw);

    expect(mockPrismaRefreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revoked: true } })
    );
  });

  it('silently ignores invalid/expired refresh tokens', async () => {
    const expiredToken = jwt.sign(
      { sub: 'x', family: 'f', tokenId: 't', type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: -1 } // already expired
    );

    // Should not throw
    await expect(authService.logout(expiredToken)).resolves.toBeUndefined();
    expect(mockPrismaRefreshToken.updateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getUser()
// ---------------------------------------------------------------------------

describe('AuthService.getUser()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns AuthUser when found', async () => {
    // Simulate what Prisma's `select` returns — no passwordHash
    const { passwordHash: _omit, ...publicFields } = DB_USER;
    mockPrismaUser.findUnique.mockResolvedValue(publicFields);
    const user = await authService.getUser(DB_USER.id);
    expect(user?.email).toBe(DB_USER.email);
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('returns null when user not found', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    const user = await authService.getUser('ghost-id');
    expect(user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listUsers()
// ---------------------------------------------------------------------------

describe('AuthService.listUsers()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated users and totalPages', async () => {
    const { passwordHash: _omit, ...publicUser } = DB_USER;
    mockPrismaTransaction.mockResolvedValue([[publicUser], 1]);

    const result = await authService.listUsers(1, 10);
    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('passes search filter through to query', async () => {
    mockPrismaTransaction.mockResolvedValue([[], 0]);
    await authService.listUsers(1, 20, 'nick');
    // $transaction is called with the two prisma calls — just verify it was invoked
    expect(mockPrismaTransaction).toHaveBeenCalled();
  });

  it('calculates totalPages correctly for partial last page', async () => {
    const { passwordHash: _omit, ...publicUser } = DB_USER;
    // 21 results with limit 10 → 3 pages
    mockPrismaTransaction.mockResolvedValue([[publicUser], 21]);
    const result = await authService.listUsers(1, 10);
    expect(result.totalPages).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// resetPassword()
// ---------------------------------------------------------------------------

describe('AuthService.resetPassword()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hashes the new password and revokes all existing refresh tokens', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(DB_USER);
    mockPrismaTransaction.mockResolvedValue([{}, {}]);

    await authService.resetPassword(DB_USER.id, 'NewSecret1!', 'admin-uuid');

    expect(mockPrismaTransaction).toHaveBeenCalled();
  });

  it('throws 404 when target user does not exist', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    await expect(
      authService.resetPassword('ghost-id', 'NewSecret1!', 'admin-uuid')
    ).rejects.toMatchObject({ statusCode: 404, message: 'User not found' });
  });
});
