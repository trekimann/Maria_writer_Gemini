import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoadProjectModal } from './LoadProjectModal';
import type { AppState, CloudSyncState } from '../../types';

vi.mock('../molecules/Modal', () => ({
  Modal: ({ isOpen, children, footer, title }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-modal">
        <h1>{title}</h1>
        {children}
        <div>{footer}</div>
      </div>
    );
  },
}));

const mockCloudService = {
  listProjects: vi.fn(),
  loadFromCloud: vi.fn(),
  saveToCloud: vi.fn(),
  deleteFromCloud: vi.fn(),
  updateProject: vi.fn(),
  getGuestId: vi.fn(() => 'guest-1'),
};

vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: mockCloudService,
}));

const mockDispatch = vi.fn();

const baseState: Partial<AppState> = {
  meta: {
    title: 'Book',
    author: 'Author',
    description: 'Desc',
    tags: [],
    bookVersion: '1.0.0',
    bookRevision: '0',
    appVersion: '2.2.0',
  },
  chapters: [],
  activeChapterId: null,
  characters: [],
  events: [],
  relationships: [],
  comments: {},
  timeline: { edges: [] },
  viewMode: 'write',
  context: 'writer',
  activeCodexTab: 'timeline',
  activeModal: 'load-project',
  editingItemId: null,
  viewingItemId: null,
  cloudSync: {
    guestId: 'guest-1',
    projectId: null,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
  } as CloudSyncState,
};

let mockState: Partial<AppState> = baseState;

vi.mock('../../context/StoreContext', async () => {
  const actual = await vi.importActual('../../context/StoreContext');
  return {
    ...actual,
    useStore: () => ({
      state: mockState,
      dispatch: mockDispatch,
    }),
  };
});

describe('LoadProjectModal', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockCloudService.listProjects.mockReset();
    mockCloudService.loadFromCloud.mockReset();
    mockState = { ...baseState };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  const createValidStateFile = (appVersion: string, name = 'book.maria') =>
    new File(
      [
        JSON.stringify({
          meta: {
            title: 'Legacy',
            author: 'A',
            description: 'D',
            tags: [],
            appVersion,
          },
          chapters: [],
          activeChapterId: null,
          characters: [],
          events: [],
          relationships: [],
          comments: {},
          timeline: {},
          viewMode: 'write',
          context: 'writer',
          activeCodexTab: 'timeline',
          activeModal: 'none',
          editingItemId: null,
          viewingItemId: null,
        }),
      ],
      name,
      { type: 'application/json' },
    );

  it('rejects non-.maria files', async () => {
    render(<LoadProjectModal />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"meta":{}}'], 'invalid.json', { type: 'application/json' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Only .maria files are supported.')).toBeInTheDocument();
    });
  });

  it('rejects malformed json in .maria files', async () => {
    render(<LoadProjectModal />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{bad-json'], 'broken.maria', { type: 'application/json' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Malformed JSON. The file could not be parsed.')).toBeInTheDocument();
    });
  });

  it('shows breaking warning only when transition is flagged', async () => {
    render(<LoadProjectModal />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createValidStateFile('2.1.0', 'legacy.maria');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/metadata version model changed between app versions 2.1.0 and 2.2.0/i),
      ).toBeInTheDocument();
    });
  });

  it('does not show breaking warning for unflagged transitions', async () => {
    render(<LoadProjectModal />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createValidStateFile('2.0.0', 'non-breaking.maria');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Ready to load: non-breaking.maria/)).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/metadata version model changed between app versions 2.1.0 and 2.2.0/i),
    ).not.toBeInTheDocument();
  });

  it('blocks load when flagged migration warning confirmation is rejected', async () => {
    (window.confirm as any)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    render(<LoadProjectModal />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createValidStateFile('2.1.0', 'flagged.maria');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Ready to load: flagged.maria/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Load File' }));

    await waitFor(() => {
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'LOAD_STATE' }));
    });
  });

  it('loads cloud list when cloud tab is opened', async () => {
    mockCloudService.listProjects.mockResolvedValue([
      {
        id: 'p1',
        title: 'Cloud Book',
        version: '2.1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<LoadProjectModal />);

    fireEvent.click(screen.getByRole('button', { name: 'Cloud' }));

    await waitFor(() => {
      expect(screen.getByText('Cloud Book')).toBeInTheDocument();
    });
  });
});
