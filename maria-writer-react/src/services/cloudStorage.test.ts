import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Stable mock reference — vi.hoisted runs before vi.mock factories so the
// factory can close over it, and the same fn survives vi.resetModules() cycles.
const mockGetAccessToken = vi.hoisted(() => vi.fn<() => string | null>(() => null));

vi.mock('./authService', () => ({
  authApiService: { getAccessToken: mockGetAccessToken },
}));

// We need to reset localStorage and re-import for each test group
describe('CloudStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    mockGetAccessToken.mockReturnValue(null); // default: guest (no token)
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

      expect(mockFetch).toHaveBeenCalledWith('/api/projects?guestId=guest-456', { headers: {} });
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

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj-1?guestId=guest-789', { headers: {} });
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

  describe('loadProjectRecord', () => {
    it('returns the full project payload including access metadata', async () => {
      mockGetAccessToken.mockReturnValue('mock-token');
      const service = await getService();
      const project = {
        id: 'proj-auth-3',
        title: 'Shared Book',
        version: '2.3.0',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
        data: { meta: { title: 'Shared Book' }, chapters: [] },
        access: { isOwner: false, role: 'READ', canRead: true, canComment: false, canEditProject: false },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ project }),
      });

      const result = await service.loadProjectRecord('proj-auth-3');

      expect(result).toEqual(project);
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
        headers: {},
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

  // ---------------------------------------------------------------------------
  // rotateGuestId
  // ---------------------------------------------------------------------------

  describe('rotateGuestId', () => {
    it('returns a valid UUID v4', async () => {
      const service = await getService();
      const newId = service.rotateGuestId();
      expect(newId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('replaces the previous guest ID in localStorage', async () => {
      localStorage.setItem('maria_guest_id', 'old-id');
      const service = await getService();
      const newId = service.rotateGuestId();
      expect(localStorage.getItem('maria_guest_id')).toBe(newId);
      expect(newId).not.toBe('old-id');
    });

    it('getGuestId returns the new ID after rotation', async () => {
      const service = await getService();
      const before = service.getGuestId();
      const rotated = service.rotateGuestId();
      const after = service.getGuestId();
      expect(after).toBe(rotated);
      expect(after).not.toBe(before);
    });
  });

  // ---------------------------------------------------------------------------
  // Authenticated paths (Bearer token present)
  // ---------------------------------------------------------------------------

  describe('saveToCloud (authenticated)', () => {
    it('sends Bearer token and omits guestId from body', async () => {
      mockGetAccessToken.mockReturnValue('mock-token');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'proj-auth-1', updatedAt: '2026-03-01T00:00:00Z' }),
      });

      await service.saveToCloud('Auth Novel', { chapters: [] });

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/projects');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-token');
      const body = JSON.parse(init.body as string);
      expect(body.guestId).toBeUndefined();
      expect(body.title).toBe('Auth Novel');
    });
  });

  describe('listProjects (authenticated)', () => {
    it('uses no guestId query param and sends Bearer token', async () => {
      mockGetAccessToken.mockReturnValue('mock-token');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: [] }),
      });

      await service.listProjects();

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/projects');
      expect(url).not.toContain('guestId');
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-token');
    });
  });

  describe('loadFromCloud (authenticated)', () => {
    it('uses no guestId query param and sends Bearer token', async () => {
      mockGetAccessToken.mockReturnValue('mock-token');
      const service = await getService();
      const projectData = { meta: { title: 'Auth Book' }, chapters: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ project: { data: projectData } }),
      });

      const result = await service.loadFromCloud('proj-auth-2');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/projects/proj-auth-2');
      expect(url).not.toContain('guestId');
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-token');
      expect(result).toEqual(projectData);
    });
  });

  describe('deleteFromCloud (authenticated)', () => {
    it('uses no guestId query param and sends Bearer token', async () => {
      mockGetAccessToken.mockReturnValue('mock-token');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await service.deleteFromCloud('proj-auth-3');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/projects/proj-auth-3');
      expect(url).not.toContain('guestId');
      expect(init.method).toBe('DELETE');
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-token');
      expect(result).toBe(true);
    });
  });

  describe('updateProject (authenticated)', () => {
    it('uses no guestId query param and sends Bearer token', async () => {
      mockGetAccessToken.mockReturnValue('mock-token');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'proj-auth-4', updatedAt: '2026-03-01T00:00:00Z' }),
      });

      await service.updateProject('proj-auth-4', 'Updated Title', { chapters: [] });

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/projects/proj-auth-4');
      expect(url).not.toContain('guestId');
      expect(init.method).toBe('PUT');
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-token');
      const body = JSON.parse(init.body as string);
      expect(body.title).toBe('Updated Title');
    });
  });

  // ---------------------------------------------------------------------------
  // previewGuestProjects
  // ---------------------------------------------------------------------------

  describe('previewGuestProjects', () => {
    it('GETs claim-preview with the supplied guestId and sends Bearer token', async () => {
      mockGetAccessToken.mockReturnValue('user-token');
      const service = await getService();
      const fakeProjects = [{ id: 'g1', title: 'Guest Book', version: '2.3.0', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: fakeProjects }),
      });

      const result = await service.previewGuestProjects('old-guest-uuid');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/api/projects/claim-preview');
      expect(url).toContain('guestId=old-guest-uuid');
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer user-token');
      expect(result).toEqual(fakeProjects);
    });

    it('throws on non-ok response', async () => {
      mockGetAccessToken.mockReturnValue('user-token');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(service.previewGuestProjects('bad-id')).rejects.toThrow('Unauthorized');
    });
  });

  // ---------------------------------------------------------------------------
  // claimGuestProjects
  // ---------------------------------------------------------------------------

  describe('claimGuestProjects', () => {
    it('POSTs to /api/projects/claim with guestId and projectIds in body', async () => {
      mockGetAccessToken.mockReturnValue('user-token');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ claimed: 2 }),
      });

      const result = await service.claimGuestProjects('old-guest-uuid', ['p1', 'p2']);

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/projects/claim');
      expect(init.method).toBe('POST');
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer user-token');
      const body = JSON.parse(init.body as string);
      expect(body.guestId).toBe('old-guest-uuid');
      expect(body.projectIds).toEqual(['p1', 'p2']);
      expect(result).toEqual({ claimed: 2 });
    });

    it('throws on non-ok response', async () => {
      mockGetAccessToken.mockReturnValue('user-token');
      const service = await getService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Migration failed' }),
      });

      await expect(service.claimGuestProjects('bad-id', ['p1'])).rejects.toThrow('Migration failed');
    });
  });
});
