import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: {
    listProjects: vi.fn(),
    loadFromCloud: vi.fn(),
    saveToCloud: vi.fn(),
    deleteFromCloud: vi.fn(),
    updateProject: vi.fn(),
    getGuestId: vi.fn(() => 'guest-1'),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false, user: null })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Import the mock after vi.mock so we can reference it in tests
import { cloudStorageService } from '../../services/cloudStorage';
const mockCloudService = vi.mocked(cloudStorageService);

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
    const file = createValidStateFile('2.2.0', 'legacy.maria');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/saved before cloud encryption was enabled/i),
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
      screen.queryByText(/saved before cloud encryption was enabled/i),
    ).not.toBeInTheDocument();
  });

  it('blocks load when flagged migration warning confirmation is rejected', async () => {
    (window.confirm as any)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    render(<LoadProjectModal />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createValidStateFile('2.2.0', 'flagged.maria');
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

// ---------------------------------------------------------------------------
// Delete cloud project
// ---------------------------------------------------------------------------

describe('LoadProjectModal — delete cloud project', () => {
  const projects = [
    { id: 'p1', title: 'Book One', version: '2.3', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'p2', title: 'Book Two', version: '2.3', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    mockDispatch.mockClear();
    mockCloudService.listProjects.mockReset();
    mockCloudService.deleteFromCloud.mockReset();
    mockState = { ...baseState };
    mockCloudService.listProjects.mockResolvedValue(projects);
  });

  const openCloudTab = async () => {
    render(<LoadProjectModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Cloud' }));
    await waitFor(() => expect(screen.getByText('Book One')).toBeInTheDocument());
  };

  it('renders a delete button for each cloud project row', async () => {
    await openCloudTab();
    expect(screen.getByRole('button', { name: 'Delete Book One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Book Two' })).toBeInTheDocument();
  });

  it('clicking trash shows the confirmation panel for that project', async () => {
    await openCloudTab();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Book One' }));
    expect(screen.getByText(/Permanent deletion/i)).toBeInTheDocument();
    expect(screen.getByText(/I understand this project will be lost forever/i)).toBeInTheDocument();
  });

  it('clicking trash on a different row switches the panel and resets checkbox', async () => {
    await openCloudTab();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Book One' }));
    const checkbox = screen.getByRole('checkbox', { name: /I understand/i });
    fireEvent.click(checkbox); // check it
    expect(checkbox).toBeChecked();

    // Click trash on the other project
    fireEvent.click(screen.getByRole('button', { name: 'Delete Book Two' }));
    // Checkbox for the new panel starts unchecked
    const newCheckbox = screen.getByRole('checkbox', { name: /I understand/i });
    expect(newCheckbox).not.toBeChecked();
  });

  it('Cancel hides the confirmation panel', async () => {
    await openCloudTab();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Book One' }));
    expect(screen.getByText(/Permanent deletion/i)).toBeInTheDocument();

    // The delete-panel Cancel is the first Cancel in the DOM (before the footer Cancel)
    const cancelBtns = screen.getAllByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtns[0]);
    expect(screen.queryByText(/Permanent deletion/i)).not.toBeInTheDocument();
  });

  it('Delete Permanently button is disabled until checkbox is checked', async () => {
    await openCloudTab();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Book One' }));
    const deleteBtn = screen.getByRole('button', { name: 'Delete Permanently' });
    expect(deleteBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /I understand/i }));
    expect(deleteBtn).not.toBeDisabled();
  });

  it('successful delete removes the project from the list', async () => {
    mockCloudService.deleteFromCloud.mockResolvedValueOnce(true);
    await openCloudTab();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Book One' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Permanently' }));

    await waitFor(() => {
      expect(screen.queryByText('Book One')).not.toBeInTheDocument();
    });
    expect(mockCloudService.deleteFromCloud).toHaveBeenCalledWith('p1');
    expect(screen.getByText('Book Two')).toBeInTheDocument();
  });

  it('clears the radio selection if the deleted project was selected', async () => {
    mockCloudService.deleteFromCloud.mockResolvedValueOnce(true);
    await openCloudTab();

    // Select Book One via the radio
    fireEvent.click(screen.getAllByRole('radio')[0]);

    // Delete Book One
    fireEvent.click(screen.getByRole('button', { name: 'Delete Book One' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Permanently' }));

    await waitFor(() => {
      expect(screen.queryByText('Book One')).not.toBeInTheDocument();
    });

    // Clicking Load Selected with no selection shows an inline error
    const loadBtn = screen.getByRole('button', { name: 'Load Selected' });
    fireEvent.click(loadBtn);
    await waitFor(() => {
      expect(screen.getByText('Select a cloud project first.')).toBeInTheDocument();
    });
  });

  it('shows an inline error when delete fails', async () => {
    mockCloudService.deleteFromCloud.mockRejectedValueOnce(new Error('Server error'));
    await openCloudTab();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Book One' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Permanently' }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
    // Project still in list
    expect(screen.getByText('Book One')).toBeInTheDocument();
  });

  it('disables Refresh List while a delete is in progress', async () => {
    let resolveDelete!: () => void;
    mockCloudService.deleteFromCloud.mockReturnValueOnce(
      new Promise<boolean>((res) => { resolveDelete = () => res(true); }),
    );
    await openCloudTab();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Book One' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Permanently' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refreshing|Refresh List/i })).toBeDisabled();
    });

    await act(async () => { resolveDelete(); });
  });
});
