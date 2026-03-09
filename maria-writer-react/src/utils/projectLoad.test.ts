import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildLoadedState, validateImportedState } from './projectLoad';
import { initialState } from '../context/StoreContext';

vi.mock('../services/cloudStorage', () => ({
  cloudStorageService: {
    getGuestId: () => 'guest-123',
  },
}));

describe('projectLoad utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates a complete imported state', () => {
    const project = {
      meta: { title: 'Novel', author: 'Author', description: '', tags: [] },
      chapters: [],
      characters: [],
      events: [],
      relationships: [],
      comments: {},
      timeline: {},
    };

    expect(validateImportedState(project)).toBeNull();
  });

  it('returns an error for invalid imported state', () => {
    expect(validateImportedState({ meta: { title: 'Only title' } })).toMatch(/author is required/i);
  });

  it('builds a loaded state and preserves local settings', () => {
    const currentState = {
      ...initialState,
      saveSettings: { ...initialState.saveSettings, saveToCloud: true },
      cloudSync: { ...initialState.cloudSync, guestId: 'guest-existing' },
    };

    const loaded = buildLoadedState({
      meta: { title: 'Loaded Novel', author: 'Writer', description: '', tags: [] },
      chapters: [{ id: 'ch-1', title: 'Chapter', content: '', order: 0 }],
      characters: [],
      events: [],
      relationships: [],
      comments: {},
      timeline: { edges: [] },
    }, currentState, 'cloud-1');

    expect(loaded.meta.title).toBe('Loaded Novel');
    expect(loaded.activeChapterId).toBe('ch-1');
    expect(loaded.saveSettings?.saveToLocal).toBe(true);
    expect(loaded.cloudSync?.projectId).toBe('cloud-1');
    expect(loaded.cloudSync?.guestId).toBe('guest-existing');
    expect(loaded.cloudSync?.lastSyncedAt).toBe('2026-03-09T12:00:00.000Z');
  });
});
