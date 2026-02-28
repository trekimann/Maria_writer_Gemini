import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// We need to reset localStorage and re-import for each test group
describe('CloudStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  // Dynamically import so each test gets a fresh module with cleared localStorage
  const getService = async () => {
    // Reset module cache so constructor re-runs
    vi.resetModules();
    const mod = await import('./cloudStorage');
    return mod.cloudStorageService;
  };

  describe('getGuestId', () => {
    it('generates and persists a guest ID on first use', async () => {
      const service = await getService();
      const id = service.getGuestId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(localStorage.getItem('maria_guest_id')).toBe(id);
    });

    it('returns the same ID on subsequent calls', async () => {
      const service = await getService();
      const id1 = service.getGuestId();
      const id2 = service.getGuestId();
      expect(id1).toBe(id2);
    });

    it('reuses an existing ID from localStorage', async () => {
      localStorage.setItem('maria_guest_id', 'existing-guest-id');
      const service = await getService();
      expect(service.getGuestId()).toBe('existing-guest-id');
    });
  });

  describe('saveToCloud', () => {
    it('sends POST with correct body and returns result', async () => {
      localStorage.setItem('maria_guest_id', 'guest-123');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'proj-1', updatedAt: '2026-01-01T00:00:00Z' }),
      });

      const result = await service.saveToCloud('My Novel', { chapters: [] });

      expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: 'guest-123',
          title: 'My Novel',
          data: { chapters: [] },
        }),
      });
      expect(result).toEqual({ id: 'proj-1', updatedAt: '2026-01-01T00:00:00Z' });
    });

    it('throws on non-OK response with server error message', async () => {
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Validation failed' }),
      });

      await expect(service.saveToCloud('Title', {})).rejects.toThrow('Validation failed');
    });

    it('throws with default message when server error has no message', async () => {
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(service.saveToCloud('Title', {})).rejects.toThrow('Failed to save to cloud');
    });
  });

  describe('listProjects', () => {
    it('fetches projects with guestId query param', async () => {
      localStorage.setItem('maria_guest_id', 'guest-456');
      const service = await getService();

      const projects = [
        { id: 'p1', title: 'Book 1', version: '2.2', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects }),
      });

      const result = await service.listProjects();

      expect(mockFetch).toHaveBeenCalledWith('/api/projects?guestId=guest-456');
      expect(result).toEqual(projects);
    });

    it('throws on non-OK response', async () => {
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(service.listProjects()).rejects.toThrow('Unauthorized');
    });
  });

  describe('loadFromCloud', () => {
    it('fetches project data by ID with guestId', async () => {
      localStorage.setItem('maria_guest_id', 'guest-789');
      const service = await getService();

      const projectData = { meta: { title: 'My Book' }, chapters: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ project: { data: projectData } }),
      });

      const result = await service.loadFromCloud('proj-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj-1?guestId=guest-789');
      expect(result).toEqual(projectData);
    });

    it('throws on non-OK response', async () => {
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      await expect(service.loadFromCloud('proj-999')).rejects.toThrow('Not found');
    });
  });

  describe('deleteFromCloud', () => {
    it('sends DELETE request and returns true', async () => {
      localStorage.setItem('maria_guest_id', 'guest-del');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await service.deleteFromCloud('proj-del');

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj-del?guestId=guest-del', {
        method: 'DELETE',
      });
      expect(result).toBe(true);
    });

    it('throws on non-OK response', async () => {
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Forbidden' }),
      });

      await expect(service.deleteFromCloud('proj-x')).rejects.toThrow('Forbidden');
    });
  });

  describe('updateProject', () => {
    it('sends PUT with correct body and returns result', async () => {
      localStorage.setItem('maria_guest_id', 'guest-upd');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'proj-upd', updatedAt: '2026-02-01T00:00:00Z' }),
      });

      const result = await service.updateProject('proj-upd', 'New Title', { chapters: [1] });

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj-upd?guestId=guest-upd', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Title',
          data: { chapters: [1] },
        }),
      });
      expect(result).toEqual({ id: 'proj-upd', updatedAt: '2026-02-01T00:00:00Z' });
    });

    it('throws on non-OK response', async () => {
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(service.updateProject('p', 'T', {})).rejects.toThrow('Failed to update project');
    });
  });
});
