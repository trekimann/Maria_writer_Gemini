import { initialState } from '../context/StoreContext';
import { APP_VERSION } from '../constants/version';
import { cloudStorageService } from '../services/cloudStorage';
import { AppState } from '../types';

export function validateImportedState(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'File does not contain a valid project object.';

  const project = value as Record<string, unknown>;
  const meta = project.meta as Record<string, unknown> | undefined;

  if (!meta || typeof meta !== 'object') return 'Missing metadata section.';
  if (typeof meta.title !== 'string') return 'Invalid metadata: title is required.';
  if (typeof meta.author !== 'string') return 'Invalid metadata: author is required.';
  if (typeof meta.description !== 'string') return 'Invalid metadata: description is required.';
  if (!Array.isArray(meta.tags)) return 'Invalid metadata: tags must be an array.';

  if (!Array.isArray(project.chapters)) return 'Invalid data: chapters must be an array.';
  if (!Array.isArray(project.characters)) return 'Invalid data: characters must be an array.';
  if (!Array.isArray(project.events)) return 'Invalid data: events must be an array.';
  if (!Array.isArray(project.relationships)) return 'Invalid data: relationships must be an array.';

  if (!project.comments || typeof project.comments !== 'object' || Array.isArray(project.comments)) {
    return 'Invalid data: comments must be an object.';
  }

  if (!project.timeline || typeof project.timeline !== 'object' || Array.isArray(project.timeline)) {
    return 'Invalid data: timeline must be an object.';
  }

  return null;
}

export function buildLoadedState(raw: any, currentState: AppState, cloudProjectId?: string): AppState {
  const guestId = currentState.cloudSync?.guestId || cloudStorageService.getGuestId();

  const merged = {
    ...initialState,
    ...raw,
    meta: {
      ...initialState.meta,
      ...(raw.meta || {}),
      bookVersion: raw.meta?.bookVersion || raw.meta?.version || initialState.meta.bookVersion,
      bookRevision: raw.meta?.bookRevision || initialState.meta.bookRevision,
      appVersion: raw.meta?.appVersion || APP_VERSION,
    },
    saveSettings: {
      ...initialState.saveSettings,
      ...currentState.saveSettings,
      ...(raw.saveSettings || {}),
      saveToLocal: true,
    },
    cloudSync: {
      ...initialState.cloudSync,
      ...currentState.cloudSync,
      ...(raw.cloudSync || {}),
      guestId,
      ...(cloudProjectId
        ? {
            projectId: cloudProjectId,
            lastSyncedAt: new Date().toISOString(),
            syncError: null,
          }
        : {}),
    },
    activeModal: 'none',
    editingItemId: null,
  } as AppState;

  if (!merged.activeChapterId && merged.chapters.length > 0) {
    merged.activeChapterId = merged.chapters[0].id;
  }

  return merged;
}
