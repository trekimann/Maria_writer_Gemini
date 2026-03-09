import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildLoadedState, validateImportedState } from './projectLoad';
import { initialState } from '../context/StoreContext';
import { AppState } from '../types';

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
    const baseSaveSettings = initialState.saveSettings!;
    const baseCloudSync = initialState.cloudSync!;
    const currentState: AppState = {
      ...initialState,
      saveSettings: { ...baseSaveSettings, saveToCloud: true },
      cloudSync: { ...baseCloudSync, guestId: 'guest-existing' },
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

  it('ignores imported cloud sync data for local file loads', () => {
    const baseCloudSync = initialState.cloudSync!;
    const currentState: AppState = {
      ...initialState,
      viewMode: 'preview',
      context: 'codex',
      activeCodexTab: 'relationships',
      activeModal: 'character',
      editingItemId: 'editing-runtime',
      viewingItemId: 'viewing-runtime',
      prefilledEventData: { title: 'Runtime Event' },
      cloudSync: {
        ...baseCloudSync,
        guestId: 'guest-runtime',
        projectId: 'current-cloud-project',
        lastSyncedAt: '2026-03-08T12:00:00.000Z',
        isSyncing: true,
        syncError: 'current error',
      },
    };

    const loaded = buildLoadedState({
      meta: { title: 'Imported Novel', author: 'Writer', description: '', tags: [] },
      chapters: [{ id: 'ch-1', title: 'Chapter', content: '', order: 0 }],
      characters: [],
      events: [],
      relationships: [],
      comments: {},
      timeline: { edges: [] },
      viewMode: 'write',
      context: 'writer',
      activeCodexTab: 'timeline',
      activeModal: 'event',
      editingItemId: 'editing-imported',
      viewingItemId: 'viewing-imported',
      prefilledEventData: { title: 'Imported Event' },
      cloudSync: {
        projectId: 'stale-cloud-project',
        guestId: 'guest-imported',
        lastSyncedAt: '2026-03-01T12:00:00.000Z',
        isSyncing: true,
        syncError: 'stale error',
      },
    }, currentState);

    expect(loaded.cloudSync).toEqual({
      ...initialState.cloudSync,
      guestId: 'guest-runtime',
      projectId: null,
      lastSyncedAt: null,
      isSyncing: false,
      syncError: null,
    });
    expect(loaded.viewMode).toBe('preview');
    expect(loaded.context).toBe('codex');
    expect(loaded.activeCodexTab).toBe('relationships');
    expect(loaded.activeModal).toBe('none');
    expect(loaded.editingItemId).toBeNull();
    expect(loaded.viewingItemId).toBeNull();
    expect(loaded.prefilledEventData).toBeUndefined();
  });

  it('rebuilds cloud sync state for cloud loads using the selected project id', () => {
    const baseCloudSync = initialState.cloudSync!;
    const currentState: AppState = {
      ...initialState,
      cloudSync: { ...baseCloudSync, guestId: 'guest-runtime' },
    };

    const loaded = buildLoadedState({
      meta: { title: 'Cloud Novel', author: 'Writer', description: '', tags: [] },
      chapters: [{ id: 'ch-1', title: 'Chapter', content: '', order: 0 }],
      characters: [],
      events: [],
      relationships: [],
      comments: {},
      timeline: { edges: [] },
      cloudSync: {
        projectId: 'different-project',
        guestId: 'guest-imported',
        lastSyncedAt: '2026-03-01T12:00:00.000Z',
        isSyncing: true,
        syncError: 'stale error',
      },
    }, currentState, 'cloud-1');

    expect(loaded.cloudSync).toEqual({
      ...initialState.cloudSync,
      guestId: 'guest-runtime',
      projectId: 'cloud-1',
      lastSyncedAt: '2026-03-09T12:00:00.000Z',
      isSyncing: false,
      syncError: null,
    });
  });
});
