/**
 * Auth Service (Frontend) — Phase 2
 *
 * API client for /api/auth/* endpoints. Manages the access token in memory
 * and handles 401 → silent refresh → retry logic.
 */

const API_URL = import.meta.env.VITE_API_URL || '';

export interface CreatorConnection {
  id: string;
  name: string;
  kind: 'follow' | 'private-read' | 'collaborator';
  note?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: 'USER' | 'EDITOR' | 'ADMIN';
  tier: 'DEFAULT';
  genreTags: string | null;
  profilePicture: string | null;
  dob?: string | null;
  aliases?: string | null;
  bio?: string | null;
  profileColor?: string | null;
  creatorConnections?: CreatorConnection[] | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  genreTags?: string;
  profilePicture?: string;
}

export interface UpdateProfilePayload {
  displayName?: string | null;
  genreTags?: string | null;
  profilePicture?: string | null;
  dob?: string | null;
  aliases?: string | null;
  bio?: string | null;
  profileColor?: string | null;
  creatorConnections?: CreatorConnection[] | null;
}

class AuthApiService {
  private accessToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  private authHeaders(): HeadersInit {
    return this.accessToken
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${this.accessToken}` }
      : { 'Content-Type': 'application/json' };
  }

  async register(payload: RegisterPayload): Promise<{ user: AuthUser; accessToken: string }> {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  }

  async login(payload: LoginPayload): Promise<{ user: AuthUser; accessToken: string }> {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  }

  /**
   * Silently attempt to refresh the access token using the httpOnly cookie.
   * Returns the new access token on success, null on failure.
   */
  async refresh(): Promise<{ user: AuthUser; accessToken: string } | null> {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return res.json();
  }

  async logout(): Promise<void> {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: this.authHeaders(),
      credentials: 'include',
    });
    this.accessToken = null;
  }

  async getMe(): Promise<AuthUser | null> {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: this.authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const res = await this.fetchWithAuth(`${API_URL}/api/auth/profile`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update profile');
    }

    const data = await res.json();
    return data.user;
  }

  /**
   * Make an authenticated fetch. On 401, attempts a silent refresh once
   * and retries the original request. If refresh also fails, returns the
   * original 401 response.
   */
  async fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const headers = {
      ...init?.headers,
      ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
    };

    const res = await fetch(input, { ...init, headers, credentials: 'include' });

    if (res.status !== 401) return res;

    // Try silent refresh
    const refreshed = await this.refresh();
    if (!refreshed) return res; // Let the caller handle the 401

    this.accessToken = refreshed.accessToken;

    // Retry with new token
    return fetch(input, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${this.accessToken}` },
      credentials: 'include',
    });
  }
}

export const authApiService = new AuthApiService();
