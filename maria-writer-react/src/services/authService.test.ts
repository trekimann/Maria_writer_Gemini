/**
 * Tests for the frontend AuthApiService.
 *
 * Every network call is intercepted with vi.stubGlobal('fetch', ...) so no
 * actual HTTP requests are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApiService } from './authService';
import type { AuthUser } from './authService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER',
  tier: 'DEFAULT',
  genreTags: 'fantasy,sci-fi',
  profilePicture: null,
};

function mockFetch(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockFetchError(body: unknown, status: number): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

describe('AuthApiService – token management', () => {
  it('getAccessToken returns null by default', () => {
    authApiService.setAccessToken(null);
    expect(authApiService.getAccessToken()).toBeNull();
  });

  it('setAccessToken / getAccessToken round-trip', () => {
    authApiService.setAccessToken('tok-abc');
    expect(authApiService.getAccessToken()).toBe('tok-abc');
    authApiService.setAccessToken(null); // clean up
  });
});

// ---------------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------------

describe('AuthApiService – register()', () => {
  beforeEach(() => { authApiService.setAccessToken(null); });

  it('returns user + accessToken on 201', async () => {
    const fetchMock = mockFetch({ user: MOCK_USER, accessToken: 'at-1' }, 201);
    vi.stubGlobal('fetch', fetchMock);

    const result = await authApiService.register({
      email: 'test@example.com',
      username: 'testuser',
      password: 'Secret1!',
    });

    expect(result.user).toEqual(MOCK_USER);
    expect(result.accessToken).toBe('at-1');
    vi.unstubAllGlobals();
  });

  it('throws with server error message on failure', async () => {
    vi.stubGlobal('fetch', mockFetchError({ error: 'Email already registered' }, 409));

    await expect(
      authApiService.register({ email: 'dup@example.com', username: 'dup', password: 'pw' })
    ).rejects.toThrow('Email already registered');

    vi.unstubAllGlobals();
  });

  it('throws generic message when response has no error field', async () => {
    vi.stubGlobal('fetch', mockFetchError({}, 500));

    await expect(
      authApiService.register({ email: 'x@x.com', username: 'x', password: 'x' })
    ).rejects.toThrow('Registration failed');

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// login()
// ---------------------------------------------------------------------------

describe('AuthApiService – login()', () => {
  it('returns user + accessToken on 200', async () => {
    vi.stubGlobal('fetch', mockFetch({ user: MOCK_USER, accessToken: 'at-2' }));

    const result = await authApiService.login({ email: 'test@example.com', password: 'Secret1!' });
    expect(result.user).toEqual(MOCK_USER);
    expect(result.accessToken).toBe('at-2');
    vi.unstubAllGlobals();
  });

  it('throws on 401 with server message', async () => {
    vi.stubGlobal('fetch', mockFetchError({ error: 'Invalid email or password' }, 401));

    await expect(
      authApiService.login({ email: 'x@x.com', password: 'wrong' })
    ).rejects.toThrow('Invalid email or password');

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// refresh()
// ---------------------------------------------------------------------------

describe('AuthApiService – refresh()', () => {
  it('returns tokens on 200', async () => {
    vi.stubGlobal('fetch', mockFetch({ user: MOCK_USER, accessToken: 'at-3' }));

    const result = await authApiService.refresh();
    expect(result).not.toBeNull();
    expect(result!.accessToken).toBe('at-3');
    vi.unstubAllGlobals();
  });

  it('returns null on 401', async () => {
    vi.stubGlobal('fetch', mockFetchError({}, 401));

    const result = await authApiService.refresh();
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// logout()
// ---------------------------------------------------------------------------

describe('AuthApiService – logout()', () => {
  it('clears the access token', async () => {
    authApiService.setAccessToken('tok-to-clear');
    vi.stubGlobal('fetch', mockFetch({}));

    await authApiService.logout();
    expect(authApiService.getAccessToken()).toBeNull();
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// fetchWithAuth() — 401 → refresh → retry
// ---------------------------------------------------------------------------

describe('AuthApiService – fetchWithAuth()', () => {
  afterEach(() => { vi.unstubAllGlobals(); authApiService.setAccessToken(null); });

  it('returns response directly when status is not 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, status: 200 }));
    authApiService.setAccessToken('valid-token');

    const res = await authApiService.fetchWithAuth('/api/test');
    expect(res.status).toBe(200);
  });

  it('retries with refreshed token after 401', async () => {
    const fetchMock = vi.fn()
      // First call → 401
      .mockResolvedValueOnce({ ok: false, status: 401 })
      // Refresh call → success
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ user: MOCK_USER, accessToken: 'refreshed-token' }) })
      // Retry with new token → success
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal('fetch', fetchMock);
    authApiService.setAccessToken('old-token');

    const res = await authApiService.fetchWithAuth('/api/test');
    expect(res.status).toBe(200);
    expect(authApiService.getAccessToken()).toBe('refreshed-token');
  });

  it('returns original 401 when refresh also fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 401 }); // refresh fails

    vi.stubGlobal('fetch', fetchMock);
    const res = await authApiService.fetchWithAuth('/api/test');
    expect(res.status).toBe(401);
  });
});
