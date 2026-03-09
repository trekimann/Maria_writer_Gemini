import type { ReaderFontSize } from './useReaderPagination';

const READ_PAGE_PREFERENCES_KEY = 'maria_read_page_preferences';

export type ReadPagePreferences = {
  fontSize: ReaderFontSize;
  lastLocation: {
    chapterId: string | null;
    projectId: string | null;
  };
  pagePositions: Record<string, number>;
  sidebarCollapsed: boolean;
};

const DEFAULT_PREFERENCES: ReadPagePreferences = {
  fontSize: 'medium',
  lastLocation: {
    chapterId: null,
    projectId: null,
  },
  pagePositions: {},
  sidebarCollapsed: false,
};

const isFontSize = (value: unknown): value is ReaderFontSize => (
  value === 'small' || value === 'medium' || value === 'large'
);

export const getReadPagePositionKey = (projectId?: string | null, chapterId?: string | null) => {
  if (!projectId || !chapterId) {
    return null;
  }

  return `${projectId}:${chapterId}`;
};

export const loadReadPagePreferences = (): ReadPagePreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(READ_PAGE_PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<ReadPagePreferences>;
    const pagePositions = Object.fromEntries(
      Object.entries(parsed.pagePositions ?? {}).filter(([, value]) => typeof value === 'number' && value >= 0),
    );

    return {
      fontSize: isFontSize(parsed.fontSize) ? parsed.fontSize : DEFAULT_PREFERENCES.fontSize,
      lastLocation: {
        chapterId: typeof parsed.lastLocation?.chapterId === 'string' ? parsed.lastLocation.chapterId : null,
        projectId: typeof parsed.lastLocation?.projectId === 'string' ? parsed.lastLocation.projectId : null,
      },
      pagePositions,
      sidebarCollapsed: typeof parsed.sidebarCollapsed === 'boolean'
        ? parsed.sidebarCollapsed
        : DEFAULT_PREFERENCES.sidebarCollapsed,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const saveReadPagePreferences = (preferences: ReadPagePreferences) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(READ_PAGE_PREFERENCES_KEY, JSON.stringify(preferences));
};
