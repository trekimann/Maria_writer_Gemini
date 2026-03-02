/**
 * AuthContext — Phase 2
 *
 * Manages authentication state for the whole app.
 * On mount, attempts a silent refresh so logged-in users don't see the
 * login screen after a page reload.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authApiService, AuthUser, LoginPayload, RegisterPayload } from '../services/authService';
import { cloudStorageService } from '../services/cloudStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** true while the initial silent refresh is in-flight */
  isLoading: boolean;
  /** Destination to return to after login (modal type or path) */
  returnTo: string | null;
  /** true when the user just logged in/registered and may have guest projects to migrate */
  hasPendingMigration: boolean;
  /** the guest ID that was active before login — used to fetch migratable projects */
  pendingMigrationGuestId: string | null;
}

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  setReturnTo: (destination: string | null) => void;
  clearMigration: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
    returnTo: null,
    hasPendingMigration: false,
    pendingMigrationGuestId: null,
  });

  // Timer reference for proactive token refresh (fires 60s before expiry)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    try {
      // Decode exp from JWT payload (base64 middle segment)
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresInMs = payload.exp * 1000 - Date.now() - 60_000; // 60s early
      if (expiresInMs > 0) {
        refreshTimerRef.current = setTimeout(async () => {
          try {
            const result = await authApiService.refresh();
            if (result) {
              authApiService.setAccessToken(result.accessToken);
              setState((prev) => ({ ...prev, user: result.user, accessToken: result.accessToken }));
              scheduleRefresh(result.accessToken);
            } else {
              // Refresh failed — session ended
              setState((prev) => ({
                ...prev,
                user: null,
                accessToken: null,
                isAuthenticated: false,
              }));
            }
          } catch {
            // Network error during background refresh — keep current session,
            // will retry on next tab focus or navigation.
          }
        }, expiresInMs);
      }
    } catch {
      // Malformed token — ignore, will expire naturally
    }
  }, []);

  // On mount: attempt silent refresh to restore session after page reload
  useEffect(() => {
    authApiService
      .refresh()
      .then((result) => {
        if (result) {
          authApiService.setAccessToken(result.accessToken);
          setState({
            user: result.user,
            accessToken: result.accessToken,
            isAuthenticated: true,
            isLoading: false,
            returnTo: null,
            hasPendingMigration: false,
            pendingMigrationGuestId: null,
          });
          scheduleRefresh(result.accessToken);
        } else {
          // No valid session (cookie missing/expired)
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      })
      .catch(() => {
        // Network error (e.g. backend not reachable) — treat as logged out
        setState((prev) => ({ ...prev, isLoading: false }));
      });

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const login = useCallback(async (payload: LoginPayload) => {
    const preLoginGuestId = cloudStorageService.getGuestId();
    const result = await authApiService.login(payload);
    authApiService.setAccessToken(result.accessToken);
    setState((prev) => ({
      ...prev,
      user: result.user,
      accessToken: result.accessToken,
      isAuthenticated: true,
      hasPendingMigration: true,
      pendingMigrationGuestId: preLoginGuestId,
    }));
    scheduleRefresh(result.accessToken);
  }, [scheduleRefresh]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const preLoginGuestId = cloudStorageService.getGuestId();
    const result = await authApiService.register(payload);
    authApiService.setAccessToken(result.accessToken);
    setState((prev) => ({
      ...prev,
      user: result.user,
      accessToken: result.accessToken,
      isAuthenticated: true,
      hasPendingMigration: true,
      pendingMigrationGuestId: preLoginGuestId,
    }));
    scheduleRefresh(result.accessToken);
    return { isNewUser: true };
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    await authApiService.logout();
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Rotate the guest ID so this browser session cannot see the
    // logged-out user's guest-path cloud projects.
    cloudStorageService.rotateGuestId();
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      returnTo: null,
      hasPendingMigration: false,
      pendingMigrationGuestId: null,
    });
  }, []);

  const setReturnTo = useCallback((destination: string | null) => {
    setState((prev) => ({ ...prev, returnTo: destination }));
  }, []);

  const clearMigration = useCallback(() => {
    setState((prev) => ({ ...prev, hasPendingMigration: false, pendingMigrationGuestId: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, setReturnTo, clearMigration }}>
      {children}
    </AuthContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
