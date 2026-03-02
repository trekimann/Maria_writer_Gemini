/**
 * Tests for AuthContext / AuthProvider / useAuth hook.
 *
 * authApiService is mocked module-wide so no fetch calls happen.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Mock authApiService
// ---------------------------------------------------------------------------

const mockRefresh   = vi.fn();
const mockLogin     = vi.fn();
const mockRegister  = vi.fn();
const mockLogout    = vi.fn();
const mockSetToken  = vi.fn();

vi.mock('../services/authService', () => ({
  authApiService: {
    refresh:        (...args: unknown[]) => mockRefresh(...args),
    login:          (...args: unknown[]) => mockLogin(...args),
    register:       (...args: unknown[]) => mockRegister(...args),
    logout:         (...args: unknown[]) => mockLogout(...args),
    setAccessToken: (...args: unknown[]) => mockSetToken(...args),
    getAccessToken: () => null,
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'u-1',
  email: 'a@b.com',
  username: 'user1',
  displayName: 'User One',
  role: 'USER' as const,
  tier: 'DEFAULT' as const,
  genreTags: null,
  profilePicture: null,
};

// Encode a JWT-like payload (not signature-verified, just for scheduleRefresh decode)
function fakeJwt(expiresInMs = 120_000): string {
  const exp = Math.floor((Date.now() + expiresInMs) / 1000);
  const payload = btoa(JSON.stringify({ sub: 'u-1', exp }));
  return `header.${payload}.signature`;
}

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Initial load — silent refresh
// ---------------------------------------------------------------------------

describe('AuthProvider – initial state', () => {
  it('starts with isLoading=true, isAuthenticated=false', async () => {
    mockRefresh.mockResolvedValueOnce(null); // no session

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('restores session when refresh succeeds on mount', async () => {
    const at = fakeJwt();
    mockRefresh.mockResolvedValueOnce({ user: MOCK_USER, accessToken: at });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(MOCK_USER);
    expect(result.current.accessToken).toBe(at);
  });

  it('sets isLoading=false and isAuthenticated=false when refresh throws (e.g. backend down)', async () => {
    // Simulate a network error — fetch itself throws rather than returning a non-OK response
    mockRefresh.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Should not stay stuck on isLoading=true forever
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// login()
// ---------------------------------------------------------------------------

describe('AuthProvider – login()', () => {
  it('sets user and isAuthenticated=true on success', async () => {
    mockRefresh.mockResolvedValueOnce(null);
    const at = fakeJwt();
    mockLogin.mockResolvedValueOnce({ user: MOCK_USER, accessToken: at });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'pw' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(MOCK_USER);
  });

  it('propagates error from authApiService.login', async () => {
    mockRefresh.mockResolvedValueOnce(null);
    mockLogin.mockRejectedValueOnce(new Error('Invalid email or password'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => { await result.current.login({ email: 'bad', password: 'bad' }); })
    ).rejects.toThrow('Invalid email or password');

    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------------

describe('AuthProvider – register()', () => {
  it('sets user after successful registration', async () => {
    mockRefresh.mockResolvedValueOnce(null);
    const at = fakeJwt();
    mockRegister.mockResolvedValueOnce({ user: MOCK_USER, accessToken: at });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returnVal: { isNewUser: boolean } | undefined;
    await act(async () => {
      returnVal = await result.current.register({
        email: 'a@b.com',
        username: 'user1',
        password: 'Secure1!',
      });
    });

    expect(returnVal).toEqual({ isNewUser: true });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(MOCK_USER);
  });
});

// ---------------------------------------------------------------------------
// logout()
// ---------------------------------------------------------------------------

describe('AuthProvider – logout()', () => {
  it('clears user state on logout', async () => {
    const at = fakeJwt();
    mockRefresh.mockResolvedValueOnce({ user: MOCK_USER, accessToken: at });
    mockLogout.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => { await result.current.logout(); });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setReturnTo()
// ---------------------------------------------------------------------------

describe('AuthProvider – setReturnTo()', () => {
  it('stores and clears the returnTo value', async () => {
    mockRefresh.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setReturnTo('/dashboard'); });
    expect(result.current.returnTo).toBe('/dashboard');

    act(() => { result.current.setReturnTo(null); });
    expect(result.current.returnTo).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// useAuth outside provider
// ---------------------------------------------------------------------------

describe('useAuth()', () => {
  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });
});
