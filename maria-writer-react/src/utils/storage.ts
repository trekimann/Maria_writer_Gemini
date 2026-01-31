import { AppState } from '../types';

const STORAGE_KEY = 'maria_autosave';
const STORAGE_VERSION = '2.1'; // Updated for theme customizations

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
      
      return parsed;
    } catch (e) {
      console.error('Failed to load from local storage', e);
    }
  }
  return null;
};

export const saveToLocal = (state: AppState) => {
  const stateWithVersion = {
    ...state,
    _version: STORAGE_VERSION,
    _savedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithVersion));
};

export const exportFile = (state: AppState, fileName?: string) => {
  const exportData = {
    ...state,
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

