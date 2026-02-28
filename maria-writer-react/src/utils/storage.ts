import { AppState } from '../types';
import { APP_VERSION } from '../constants/version';

const STORAGE_KEY = 'maria_autosave';
const STORAGE_VERSION = APP_VERSION;

export const loadFromLocal = (): Partial<AppState> | null => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      
      // Ensure relationships array exists (default to empty if missing)
      if (!parsed.relationships) {
        parsed.relationships = [];
      }
      
      // Ensure all characters have lifeEvents array
      if (parsed.characters) {
        parsed.characters = parsed.characters.map((char: any) => ({
          ...char,
          lifeEvents: char.lifeEvents || []
        }));
      }

      // Ensure themeCustomizations array exists
      if (!parsed.themeCustomizations) {
        parsed.themeCustomizations = [];
      }

      // Ensure metadata version exists
      if (!parsed.meta) {
        parsed.meta = {};
      }
      if (!parsed.meta.bookVersion) {
        parsed.meta.bookVersion = parsed.meta.version || '1.0.0';
      }
      if (!parsed.meta.bookRevision) {
        parsed.meta.bookRevision = '0';
      }
      if (!parsed.meta.appVersion) {
        parsed.meta.appVersion = APP_VERSION;
      }
      
      return parsed;
    } catch (e) {
      console.error('Failed to load from local storage', e);
    }
  }
  return null;
};

export const saveToLocal = (state: AppState) => {
  const normalizedState = {
    ...state,
    meta: {
      ...state.meta,
      bookVersion: state.meta.bookVersion || '1.0.0',
      bookRevision: state.meta.bookRevision || '0',
      appVersion: APP_VERSION,
    },
  };

  const stateWithVersion = {
    ...normalizedState,
    _version: STORAGE_VERSION,
    _savedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithVersion));
};

export const exportFile = (state: AppState, fileName?: string) => {
  const normalizedState = {
    ...state,
    meta: {
      ...state.meta,
      bookVersion: state.meta.bookVersion || '1.0.0',
      bookRevision: state.meta.bookRevision || '0',
      appVersion: APP_VERSION,
    },
  };

  const exportData = {
    ...normalizedState,
    _version: STORAGE_VERSION,
    _exportedAt: new Date().toISOString()
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  const finalFileName = (fileName || state.meta.title || "novel") + ".maria";
  downloadAnchorNode.setAttribute("download", finalFileName);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

