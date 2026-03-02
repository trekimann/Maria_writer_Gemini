import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFromLocal, saveToLocal, exportFile, saveGuestSnapshot, loadGuestSnapshot } from './storage';
import { APP_VERSION } from '../constants/version';
import { AppState } from '../types';
import { initialState } from '../context/StoreContext';

describe('Storage - Core Functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadFromLocal', () => {
    it('returns null when localStorage is empty', () => {
      expect(loadFromLocal()).toBeNull();
    });

    it('returns null and logs error on corrupt JSON', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('maria_autosave', 'not-valid-json{{{');
      expect(loadFromLocal()).toBeNull();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('adds empty relationships array when missing', () => {
      localStorage.setItem('maria_autosave', JSON.stringify({
        chapters: [],
        meta: { title: 'Test' },
      }));
      const result = loadFromLocal();
      expect(result?.relationships).toEqual([]);
    });

    it('preserves existing relationships', () => {
      const rels = [{ id: 'r1', sourceId: 's1', targetId: 't1', type: 'friend', description: '' }];
      localStorage.setItem('maria_autosave', JSON.stringify({
        relationships: rels,
        meta: { title: 'Test' },
      }));
      const result = loadFromLocal();
      expect(result?.relationships).toEqual(rels);
    });

    it('adds empty themeCustomizations array when missing', () => {
      localStorage.setItem('maria_autosave', JSON.stringify({
        meta: { title: 'Test' },
      }));
      const result = loadFromLocal();
      expect(result?.themeCustomizations).toEqual([]);
    });

    it('ensures all characters have lifeEvents array', () => {
      localStorage.setItem('maria_autosave', JSON.stringify({
        characters: [
          { id: 'c1', name: 'Alice' },
          { id: 'c2', name: 'Bob', lifeEvents: ['e1'] },
        ],
        meta: { title: 'Test' },
      }));
      const result = loadFromLocal();
      expect(result?.characters?.[0].lifeEvents).toEqual([]);
      expect(result?.characters?.[1].lifeEvents).toEqual(['e1']);
    });

    it('adds default bookVersion when missing', () => {
      localStorage.setItem('maria_autosave', JSON.stringify({
        meta: { title: 'Test' },
      }));
      const result = loadFromLocal();
      expect(result?.meta?.bookVersion).toBe('1.0.0');
    });

    it('uses meta.version as bookVersion fallback', () => {
      localStorage.setItem('maria_autosave', JSON.stringify({
        meta: { title: 'Test', version: '2.5.0' },
      }));
      const result = loadFromLocal();
      expect(result?.meta?.bookVersion).toBe('2.5.0');
    });

    it('adds default bookRevision when missing', () => {
      localStorage.setItem('maria_autosave', JSON.stringify({
        meta: { title: 'Test' },
      }));
      const result = loadFromLocal();
      expect(result?.meta?.bookRevision).toBe('0');
    });

    it('adds appVersion when missing', () => {
      localStorage.setItem('maria_autosave', JSON.stringify({
        meta: { title: 'Test' },
      }));
      const result = loadFromLocal();
      expect(result?.meta?.appVersion).toBe(APP_VERSION);
    });

    it('creates meta object when entirely missing', () => {
      localStorage.setItem('maria_autosave', JSON.stringify({}));
      const result = loadFromLocal();
      expect(result?.meta).toBeDefined();
      expect(result?.meta?.bookVersion).toBe('1.0.0');
    });
  });

  describe('saveToLocal', () => {
    it('saves state to localStorage with version and timestamp', () => {
      saveToLocal(initialState);
      const saved = JSON.parse(localStorage.getItem('maria_autosave')!);
      expect(saved._version).toBe(APP_VERSION);
      expect(saved._savedAt).toBeDefined();
      expect(new Date(saved._savedAt).getTime()).not.toBeNaN();
    });

    it('normalizes bookVersion to default if missing', () => {
      const state: AppState = {
        ...initialState,
        meta: {
          ...initialState.meta,
          bookVersion: undefined as any,
          bookRevision: undefined as any,
        },
      };
      saveToLocal(state);
      const saved = JSON.parse(localStorage.getItem('maria_autosave')!);
      expect(saved.meta.bookVersion).toBe('1.0.0');
      expect(saved.meta.bookRevision).toBe('0');
    });

    it('stamps appVersion to current APP_VERSION', () => {
      saveToLocal(initialState);
      const saved = JSON.parse(localStorage.getItem('maria_autosave')!);
      expect(saved.meta.appVersion).toBe(APP_VERSION);
    });
  });

  describe('exportFile', () => {
    it('creates a download with the given filename', () => {
      let downloadName = '';
      const origCreate = document.createElement.bind(document);
      document.createElement = function (tag: string) {
        const el = origCreate(tag);
        if (tag === 'a') {
          const origSet = el.setAttribute.bind(el);
          el.setAttribute = function (n: string, v: string) {
            if (n === 'download') downloadName = v;
            return origSet(n, v);
          };
          el.click = () => {};
        }
        return el;
      };

      exportFile(initialState, 'My Book');
      expect(downloadName).toBe('My Book.maria');

      document.createElement = origCreate;
    });

    it('defaults filename to meta.title when no fileName provided', () => {
      let downloadName = '';
      const origCreate = document.createElement.bind(document);
      document.createElement = function (tag: string) {
        const el = origCreate(tag);
        if (tag === 'a') {
          const origSet = el.setAttribute.bind(el);
          el.setAttribute = function (n: string, v: string) {
            if (n === 'download') downloadName = v;
            return origSet(n, v);
          };
          el.click = () => {};
        }
        return el;
      };

      exportFile({
        ...initialState,
        meta: { ...initialState.meta, title: 'Epic Saga' },
      });
      expect(downloadName).toBe('Epic Saga.maria');

      document.createElement = origCreate;
    });

    it('falls back to "novel" when title and fileName are both empty', () => {
      let downloadName = '';
      const origCreate = document.createElement.bind(document);
      document.createElement = function (tag: string) {
        const el = origCreate(tag);
        if (tag === 'a') {
          const origSet = el.setAttribute.bind(el);
          el.setAttribute = function (n: string, v: string) {
            if (n === 'download') downloadName = v;
            return origSet(n, v);
          };
          el.click = () => {};
        }
        return el;
      };

      const state: AppState = {
        ...initialState,
        meta: { ...initialState.meta, title: '' },
      };
      exportFile(state);
      expect(downloadName).toBe('novel.maria');

      document.createElement = origCreate;
    });

    it('includes _version and _exportedAt in exported data', () => {
      let capturedData = '';
      const origCreate = document.createElement.bind(document);
      document.createElement = function (tag: string) {
        const el = origCreate(tag);
        if (tag === 'a') {
          const origSet = el.setAttribute.bind(el);
          el.setAttribute = function (n: string, v: string) {
            if (n === 'href' && v.startsWith('data:text/json')) {
              capturedData = decodeURIComponent(v.split(',')[1]);
            }
            return origSet(n, v);
          };
          el.click = () => {};
        }
        return el;
      };

      exportFile(initialState, 'test');
      const parsed = JSON.parse(capturedData);
      expect(parsed._version).toBe(APP_VERSION);
      expect(parsed._exportedAt).toBeDefined();

      document.createElement = origCreate;
    });
  });
});

// ---------------------------------------------------------------------------
// Guest snapshot helpers
// ---------------------------------------------------------------------------

describe('Storage – Guest snapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveGuestSnapshot', () => {
    it('copies maria_autosave to maria_guest_snapshot', () => {
      const data = JSON.stringify({ meta: { title: 'My Novel' }, chapters: [] });
      localStorage.setItem('maria_autosave', data);

      saveGuestSnapshot();

      expect(localStorage.getItem('maria_guest_snapshot')).toBe(data);
    });

    it('is a no-op when there is no existing autosave', () => {
      saveGuestSnapshot();
      expect(localStorage.getItem('maria_guest_snapshot')).toBeNull();
    });

    it('overwrites an earlier snapshot with the latest autosave', () => {
      localStorage.setItem('maria_guest_snapshot', JSON.stringify({ meta: { title: 'Old' } }));
      localStorage.setItem('maria_autosave', JSON.stringify({ meta: { title: 'New' } }));

      saveGuestSnapshot();

      const snap = JSON.parse(localStorage.getItem('maria_guest_snapshot')!);
      expect(snap.meta.title).toBe('New');
    });
  });

  describe('loadGuestSnapshot', () => {
    it('returns null when no snapshot exists', () => {
      expect(loadGuestSnapshot()).toBeNull();
    });

    it('returns null on corrupt JSON', () => {
      localStorage.setItem('maria_guest_snapshot', 'not-json{{{');
      expect(loadGuestSnapshot()).toBeNull();
    });

    it('returns the parsed snapshot with normalised metadata', () => {
      localStorage.setItem('maria_guest_snapshot', JSON.stringify({
        meta: { title: 'Saved Novel' },
        chapters: [{ id: 'c1' }],
      }));

      const result = loadGuestSnapshot();
      expect(result).not.toBeNull();
      expect(result?.meta?.title).toBe('Saved Novel');
      expect(result?.meta?.bookVersion).toBe('1.0.0');
      expect(result?.relationships).toEqual([]);
      expect(result?.themeCustomizations).toEqual([]);
    });

    it('preserves existing relationships and themeCustomizations', () => {
      localStorage.setItem('maria_guest_snapshot', JSON.stringify({
        meta: { title: 'T', bookVersion: '2.0.0' },
        relationships: [{ id: 'r1' }],
        themeCustomizations: [{ id: 't1' }],
      }));

      const result = loadGuestSnapshot();
      expect(result?.relationships).toEqual([{ id: 'r1' }]);
      expect(result?.themeCustomizations).toEqual([{ id: 't1' }]);
    });

    it('round-trips: save then load returns the same autosave data', () => {
      const state = { meta: { title: 'Round Trip' }, chapters: [{ id: 'c1', title: 'Ch 1' }] };
      localStorage.setItem('maria_autosave', JSON.stringify(state));
      saveGuestSnapshot();

      const loaded = loadGuestSnapshot();
      expect(loaded?.meta?.title).toBe('Round Trip');
    });
  });
});
