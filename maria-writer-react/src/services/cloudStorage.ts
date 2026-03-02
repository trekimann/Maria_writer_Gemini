import { authApiService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface CloudSyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  projectId: string | null;
}

export interface CloudProject {
  id: string;
  title: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

class CloudStorageService {
  private guestId: string | null = null;
  private readonly GUEST_ID_KEY = 'maria_guest_id';

  constructor() {
    this.guestId = this.getOrCreateGuestId();
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getOrCreateGuestId(): string {
    let guestId = localStorage.getItem(this.GUEST_ID_KEY);
    if (!guestId) {
      guestId = this.generateUuid();
      localStorage.setItem(this.GUEST_ID_KEY, guestId);
    }
    return guestId;
  }

  /**
   * Returns auth headers for the request.
   * When logged in: includes Authorization: Bearer <token>.
   * When guest: returns only Content-Type if requested.
   */
  private authHeaders(includeContentType = false): HeadersInit {
    const token = authApiService.getAccessToken();
    const headers: Record<string, string> = {};
    if (includeContentType) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  /**
   * Returns `?guestId=<id>` when not authenticated, or '' when authenticated.
   * Authenticated requests let the backend derive the user from the Bearer token.
   */
  private guestParam(): string {
    return authApiService.getAccessToken() ? '' : `?guestId=${this.getGuestId()}`;
  }

  getGuestId(): string {
    return this.guestId || this.getOrCreateGuestId();
  }

  setGuestId(id: string): void {
    this.guestId = id;
    localStorage.setItem(this.GUEST_ID_KEY, id);
  }

  /**
   * Generate a new random guest ID and persist it.
   * Called on logout so the next session cannot see the previous user's
   * guest-path cloud projects.
   */
  rotateGuestId(): string {
    const newId = this.generateUuid();
    this.guestId = newId;
    localStorage.setItem(this.GUEST_ID_KEY, newId);
    return newId;
  }

  async saveToCloud(title: string, data: any): Promise<{ id: string; updatedAt: string }> {
    const token = authApiService.getAccessToken();
    const body = token
      ? JSON.stringify({ title, data })
      : JSON.stringify({ guestId: this.getGuestId(), title, data });

    const response = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: this.authHeaders(true),
      body,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save to cloud');
    }

    return await response.json();
  }

  async listProjects(): Promise<CloudProject[]> {
    const response = await fetch(
      `${API_URL}/api/projects${this.guestParam()}`,
      { headers: this.authHeaders() },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list projects');
    }

    const data = await response.json();
    return data.projects;
  }

  async loadFromCloud(projectId: string): Promise<any> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}${this.guestParam()}`,
      { headers: this.authHeaders() },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load from cloud');
    }

    const data = await response.json();
    return data.project.data;
  }

  async deleteFromCloud(projectId: string): Promise<boolean> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}${this.guestParam()}`,
      { method: 'DELETE', headers: this.authHeaders() },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }

    return true;
  }

  async updateProject(projectId: string, title: string, data: any): Promise<{ id: string; updatedAt: string }> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}${this.guestParam()}`,
      {
        method: 'PUT',
        headers: this.authHeaders(true),
        body: JSON.stringify({ title, data }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }

    return await response.json();
  }

  /**
   * Returns the list of unclaimed guest projects available to migrate into
   * the authenticated user's account. Requires a valid Bearer token.
   */
  async previewGuestProjects(guestId: string): Promise<CloudProject[]> {
    const response = await fetch(
      `${API_URL}/api/projects/claim-preview?guestId=${encodeURIComponent(guestId)}`,
      { headers: this.authHeaders() },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as any).error || 'Failed to fetch guest projects');
    }

    const data = await response.json();
    return data.projects;
  }

  /**
   * Transfers the selected guest projects to the authenticated user's account.
   * After this call the projects are no longer accessible via the guest ID.
   * Requires a valid Bearer token.
   */
  async claimGuestProjects(guestId: string, projectIds: string[]): Promise<{ claimed: number }> {
    const response = await fetch(`${API_URL}/api/projects/claim`, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify({ guestId, projectIds }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as any).error || 'Failed to claim guest projects');
    }

    return await response.json();
  }
}

export const cloudStorageService = new CloudStorageService();
