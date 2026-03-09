/**
 * Auth Service — Phase 2
 *
 * Handles user registration, login, JWT token generation, refresh token
 * rotation with replay detection, and logout. No Express concerns here —
 * pure business logic.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { UserRole, UserTier } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  tier: UserTier;
  genreTags: string | null;
  profilePicture: string | null;
  dob: string | null;
  aliases: string | null;
  bio: string | null;
  profileColor: string | null;
  creatorConnections: unknown;
}

export interface UpdateProfileInput {
  displayName?: string | null;
  genreTags?: string | null;
  profilePicture?: string | null;
  dob?: string | null;
  aliases?: string | null;
  bio?: string | null;
  profileColor?: string | null;
  creatorConnections?: unknown;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  family: string;
  tokenId: string;
  type: 'refresh';
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is not set');
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET env var is not set');
  return secret;
}

function getBcryptRounds(): number {
  return parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function generateTokenPair(user: AuthUser, existingFamily?: string): TokenPair {
  const family = existingFamily ?? randomUUID();
  const tokenId = randomUUID();

  const accessPayload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };

  const refreshPayload: RefreshTokenPayload = {
    sub: user.id,
    family,
    tokenId,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, getJwtSecret(), { expiresIn: '15m' });
  const refreshToken = jwt.sign(refreshPayload, getJwtRefreshSecret(), { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

function toAuthUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  tier: UserTier;
  genreTags: string | null;
  profilePicture: string | null;
  dob?: string | null;
  aliases?: string | null;
  bio?: string | null;
  profileColor?: string | null;
  creatorConnections?: unknown;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    tier: user.tier,
    genreTags: user.genreTags,
    profilePicture: user.profilePicture,
    dob: user.dob ?? null,
    aliases: user.aliases ?? null,
    bio: user.bio ?? null,
    profileColor: user.profileColor ?? null,
    creatorConnections: user.creatorConnections ?? null,
  };
}

// ---------------------------------------------------------------------------
// Auth Service
// ---------------------------------------------------------------------------

class AuthService {
  /**
   * Register a new user. Throws 409 if email already taken.
   */
  async register(
    email: string,
    username: string,
    password: string,
    displayName?: string,
    genreTags?: string,
    profilePicture?: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingEmail) throw new AppError('Email already registered', 409);
    if (existingUsername) throw new AppError('Username already taken', 409);

    const passwordHash = await bcrypt.hash(password, getBcryptRounds());

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName: displayName ?? null,
        genreTags: genreTags ?? null,
        profilePicture: profilePicture ?? null,
      },
    });

    const authUser = toAuthUser(user);
    const tokens = generateTokenPair(authUser);

    await this._storeRefreshToken(user.id, tokens.refreshToken);

    logger.info(`User registered: ${user.id}`);
    return { user: authUser, tokens };
  }

  /**
   * Login with email + password. Returns token pair on success.
   * Always returns the same 401 message regardless of whether the email
   * exists or the password is wrong — prevents user enumeration.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const genericError = new AppError('Invalid email or password', 401);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always run bcrypt.compare even if user not found, to prevent timing attacks
    const hashToCompare = user?.passwordHash ?? '$2b$12$invalidhashtopreventtimingattackXXXXXXXXXXXX';
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch) {
      throw genericError;
    }

    // Update lastLogin timestamp (non-blocking — don't await)
    prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }).catch((err) => logger.warn('Failed to update lastLogin', { error: err }));

    const authUser = toAuthUser(user);
    const tokens = generateTokenPair(authUser);
    await this._storeRefreshToken(user.id, tokens.refreshToken);

    logger.info(`User logged in: ${user.id}`);
    return { user: authUser, tokens };
  }

  /**
   * Rotate refresh tokens. Implements full replay detection:
   * if a consumed token is replayed, the entire family is revoked.
   */
  async refreshTokens(rawRefreshToken: string): Promise<{ user: AuthUser; tokens: TokenPair }> {
    // 1. Verify JWT signature and expiry
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(rawRefreshToken, getJwtRefreshSecret()) as RefreshTokenPayload;
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    if (payload.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    const tokenHash = hashToken(rawRefreshToken);

    // 2. Look up token in DB
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      // Token not found — possible theft. Revoke entire family.
      logger.warn(`Refresh token replay detected (not found). Revoking family: ${payload.family}`);
      await prisma.refreshToken.updateMany({
        where: { family: payload.family },
        data: { revoked: true },
      });
      throw new AppError('Invalid or expired refresh token', 401);
    }

    if (stored.revoked) {
      // Token found but already revoked — replay attack. Revoke entire family.
      logger.warn(`Refresh token replay detected (revoked). Revoking family: ${payload.family}`);
      await prisma.refreshToken.updateMany({
        where: { family: payload.family },
        data: { revoked: true },
      });
      throw new AppError('Invalid or expired refresh token', 401);
    }

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      throw new AppError('Refresh token expired', 401);
    }

    // 3. Revoke this token and issue a new pair in the same family
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new AppError('User not found', 401);

    const authUser = toAuthUser(user);
    const tokens = generateTokenPair(authUser, payload.family);
    await this._storeRefreshToken(user.id, tokens.refreshToken, payload.family);

    return { user: authUser, tokens };
  }

  /**
   * Revoke the given refresh token. Silent if token is not found.
   */
  async logout(rawRefreshToken: string): Promise<void> {
    let payload: RefreshTokenPayload | null = null;
    try {
      payload = jwt.verify(rawRefreshToken, getJwtRefreshSecret()) as RefreshTokenPayload;
    } catch {
      // Expired or invalid — nothing to revoke
      return;
    }

    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });

    logger.info(`User logged out: ${payload.sub}`);
  }

  /**
   * Get a user by ID, returning safe public fields only.
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        tier: true,
        genreTags: true,
        profilePicture: true,
        dob: true,
        aliases: true,
        bio: true,
        profileColor: true,
        creatorConnections: true,
      } as any,
    });
    return user ? toAuthUser(user as any) : null;
  }

  async updateProfile(userId: string, payload: UpdateProfileInput): Promise<AuthUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: payload.displayName === undefined ? undefined : payload.displayName,
        genreTags: payload.genreTags === undefined ? undefined : payload.genreTags,
        profilePicture: payload.profilePicture === undefined ? undefined : payload.profilePicture,
        dob: payload.dob === undefined ? undefined : payload.dob,
        aliases: payload.aliases === undefined ? undefined : payload.aliases,
        bio: payload.bio === undefined ? undefined : payload.bio,
        profileColor: payload.profileColor === undefined ? undefined : payload.profileColor,
        creatorConnections: payload.creatorConnections === undefined ? undefined : payload.creatorConnections,
      } as any,
    });

    return toAuthUser(user as any);
  }

  /**
   * Admin: reset a user's password and revoke all their sessions.
   */
  async resetPassword(userId: string, newPassword: string, adminId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const passwordHash = await bcrypt.hash(newPassword, getBcryptRounds());

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
    ]);

    logger.info(`Admin ${adminId} reset password for user ${userId}`);
  }

  /**
   * Admin: list users with pagination and optional email search.
   */
  async listUsers(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ users: AuthUser[]; total: number; totalPages: number }> {
    const where = search ? { email: { contains: search } } : {};
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          tier: true,
          genreTags: true,
          profilePicture: true,
          dob: true,
          aliases: true,
          bio: true,
          profileColor: true,
          creatorConnections: true,
          createdAt: true,
          lastLogin: true,
        } as any,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => toAuthUser(user as any)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async _storeRefreshToken(
    userId: string,
    rawToken: string,
    family?: string,
  ): Promise<void> {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.decode(rawToken) as RefreshTokenPayload;
    } catch {
      throw new Error('Failed to decode refresh token for storage');
    }

    const expiresAt = new Date((payload as any).exp * 1000);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        family: family ?? payload.family,
        expiresAt,
      },
    });
  }
}

export const authService = new AuthService();
