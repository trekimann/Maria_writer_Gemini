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

  private getOrCreateGuestId(): string {
    let guestId = localStorage.getItem(this.GUEST_ID_KEY);
    if (!guestId) {
      // Generate a simple UUID v4
      guestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem(this.GUEST_ID_KEY, guestId);
    }
    return guestId;
  }

  getGuestId(): string {
    return this.guestId || this.getOrCreateGuestId();
  }

  setGuestId(id: string): void {
    this.guestId = id;
    localStorage.setItem(this.GUEST_ID_KEY, id);
  }

  async saveToCloud(title: string, data: any): Promise<{ id: string; updatedAt: string }> {
    const response = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guestId: this.getGuestId(),
        title,
        data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save to cloud');
    }

    return await response.json();
  }

  async listProjects(): Promise<CloudProject[]> {
    const response = await fetch(`${API_URL}/api/projects?guestId=${this.getGuestId()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list projects');
    }

    const data = await response.json();
    return data.projects;
  }

  async loadFromCloud(projectId: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/projects/${projectId}?guestId=${this.getGuestId()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load from cloud');
    }

    const data = await response.json();
    return data.project.data;
  }

  async deleteFromCloud(projectId: string): Promise<boolean> {
    const response = await fetch(`${API_URL}/api/projects/${projectId}?guestId=${this.getGuestId()}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }

    return true;
  }

  async updateProject(projectId: string, title: string, data: any): Promise<{ id: string; updatedAt: string }> {
    const response = await fetch(`${API_URL}/api/projects/${projectId}?guestId=${this.getGuestId()}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }

    return await response.json();
  }
}

export const cloudStorageService = new CloudStorageService();
