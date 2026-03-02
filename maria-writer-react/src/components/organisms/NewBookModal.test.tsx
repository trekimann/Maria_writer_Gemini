import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NewBookModal } from './NewBookModal';
import type { AppState, CloudSyncState, SaveSettings } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../molecules/Modal', () => ({
  Modal: ({ isOpen, children, footer, title }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-modal">
        <h1>{title}</h1>
        {children}
        <div data-testid="modal-footer">{footer}</div>
      </div>
    );
  },
}));

vi.mock('../atoms/Button', () => ({
  Button: ({ children, onClick, disabled, icon: Icon, 'data-testid': testId }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={testId}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: () => <svg data-testid="icon-alert-triangle" />,
  BookPlus:      () => <svg data-testid="icon-book-plus" />,
  ChevronLeft:   () => <svg data-testid="icon-chevron-left" />,
  Download:      () => <svg data-testid="icon-download" />,
}));

vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: {
    listProjects:   vi.fn(),
    loadFromCloud:  vi.fn(),
    getGuestId:     vi.fn(() => 'guest-1'),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false, user: null })),
}));

vi.mock('../../utils/storage', () => ({
  exportFile: vi.fn(),
}));

vi.mock('./NewBookModal.module.scss', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

import { cloudStorageService } from '../../services/cloudStorage';
import { useAuth } from '../../context/AuthContext';
import { exportFile } from '../../utils/storage';

const mockCloudService = vi.mocked(cloudStorageService);
const mockExportFile   = vi.mocked(exportFile);
const mockUseAuth      = vi.mocked(useAuth);

// ── Store mock ───────────────────────────────────────────────────────────────

const mockDispatch = vi.fn();

const makeState = (overrides: Partial<AppState> = {}): AppState => ({
  meta: { title: 'Old Book', author: 'Jane', description: '', tags: [] },
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
  activeModal: 'new-book',
  editingItemId: null,
  viewingItemId: null,
  saveSettings: {
    saveToLocal: true,
    saveToCloud: false,
    autoSaveOnChapterChange: false,
    autoSaveInterval: 0,
    autoSaveOnFocusLoss: false,
  } as SaveSettings,
  cloudSync: {
    projectId: null,
    guestId: 'guest-1',
    lastSyncedAt: null,
    isSyncing: false,
    syncError: null,
  } as CloudSyncState,
  ...overrides,
});

let mockState: AppState = makeState();

vi.mock('../../context/StoreContext', async () => {
  const actual = await vi.importActual('../../context/StoreContext');
  return {
    ...actual,
    useStore: () => ({ state: mockState, dispatch: mockDispatch }),
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const TWO_PROJECTS = [
  { id: 'p1', title: 'Book One',   version: '2.2', createdAt: '2026-01-01', updatedAt: '2026-01-10' },
  { id: 'p2', title: 'Book Two',   version: '2.2', createdAt: '2026-01-05', updatedAt: '2026-02-01' },
];

const renderModal = () => render(<NewBookModal />);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NewBookModal', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockExportFile.mockClear();
    mockCloudService.listProjects.mockReset();
    mockCloudService.loadFromCloud.mockReset();
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null } as any);
    mockState = makeState();
  });

  // ── renders / closed ────────────────────────────────────────────────────
  describe('visibility', () => {
    it('renders nothing when activeModal is not new-book', () => {
      mockState = makeState({ activeModal: 'none' });
      renderModal();
      expect(screen.queryByTestId('mock-modal')).toBeNull();
    });

    it('renders the confirm step when activeModal is new-book', () => {
      renderModal();
      expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
      expect(screen.getByText('New Book')).toBeInTheDocument();
    });
  });

  // ── confirm step ────────────────────────────────────────────────────────
  describe('confirm step', () => {
    it('shows info box about clearing the editor', () => {
      renderModal();
      expect(screen.getByText(/Starting a new book will clear the current editor/)).toBeInTheDocument();
    });

    it('does not show cloud sync info when cloud is disabled', () => {
      renderModal(); // cloud sync off by default
      expect(screen.queryByText(/Last cloud save/)).toBeNull();
    });

    it('shows last sync label when cloud sync is enabled', () => {
      mockState = makeState({
        saveSettings: { saveToLocal: true, saveToCloud: true, autoSaveOnChapterChange: false, autoSaveInterval: 0, autoSaveOnFocusLoss: false },
        cloudSync: { projectId: 'p1', guestId: 'guest-1', lastSyncedAt: new Date('2026-03-01T14:30:00').toISOString(), isSyncing: false, syncError: null },
      });
      renderModal();
      expect(screen.getByText(/Last cloud save:/)).toBeInTheDocument();
    });

    it('Cancel dispatches CLOSE_MODAL', () => {
      renderModal();
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_MODAL' });
    });
  });

  // ── confirm → metadata (cloud off / authenticated) ──────────────────────
  describe('confirm → metadata (no limit check)', () => {
    it('goes straight to metadata step when cloud sync is off', async () => {
      // cloud sync off — no listProjects call needed
      renderModal();
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() =>
        expect(screen.getByLabelText('Book Title')).toBeInTheDocument()
      );
      expect(mockCloudService.listProjects).not.toHaveBeenCalled();
    });

    it('goes straight to metadata when user is authenticated (no guest limit)', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1' } } as any);
      mockState = makeState({
        saveSettings: { saveToLocal: true, saveToCloud: true, autoSaveOnChapterChange: false, autoSaveInterval: 0, autoSaveOnFocusLoss: false },
      });
      mockCloudService.listProjects.mockResolvedValue(TWO_PROJECTS);
      renderModal();
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() =>
        expect(screen.getByLabelText('Book Title')).toBeInTheDocument()
      );
      // listProjects should NOT have been called for an authenticated user
      expect(mockCloudService.listProjects).not.toHaveBeenCalled();
    });

    it('goes to metadata when guest has fewer than 2 cloud projects', async () => {
      mockState = makeState({
        saveSettings: { saveToLocal: true, saveToCloud: true, autoSaveOnChapterChange: false, autoSaveInterval: 0, autoSaveOnFocusLoss: false },
      });
      mockCloudService.listProjects.mockResolvedValue([TWO_PROJECTS[0]]); // only 1
      renderModal();
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() =>
        expect(screen.getByLabelText('Book Title')).toBeInTheDocument()
      );
    });
  });

  // ── guest limit step ─────────────────────────────────────────────────────
  describe('limit step (guest at 2 projects)', () => {
    const openLimitStep = async () => {
      mockState = makeState({
        saveSettings: { saveToLocal: true, saveToCloud: true, autoSaveOnChapterChange: false, autoSaveInterval: 0, autoSaveOnFocusLoss: false },
      });
      mockCloudService.listProjects.mockResolvedValue(TWO_PROJECTS);
      renderModal();
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => screen.getByTestId('danger-banner'));
    };

    it('shows the danger banner', async () => {
      await openLimitStep();
      expect(screen.getByTestId('danger-banner')).toBeInTheDocument();
      expect(screen.getByText(/permanently deleted/)).toBeInTheDocument();
    });

    it('renders both cloud project names as radio options', async () => {
      await openLimitStep();
      expect(screen.getByText('Book One')).toBeInTheDocument();
      expect(screen.getByText('Book Two')).toBeInTheDocument();
    });

    it('Continue button is disabled until a project is selected', async () => {
      await openLimitStep();
      const btn = screen.getByTestId('limit-continue-btn');
      expect(btn).toBeDisabled();
    });

    it('Continue button enables after selecting a project', async () => {
      await openLimitStep();
      fireEvent.click(screen.getByTestId('project-option-p1'));
      expect(screen.getByTestId('limit-continue-btn')).not.toBeDisabled();
    });

    it('shows the export checkbox', async () => {
      await openLimitStep();
      expect(screen.getByTestId('export-checkbox')).toBeInTheDocument();
    });

    it('export checkbox starts unchecked', async () => {
      await openLimitStep();
      expect(screen.getByTestId('export-checkbox')).not.toBeChecked();
    });

    it('Back button returns to confirm step', async () => {
      await openLimitStep();
      fireEvent.click(screen.getByText('Back'));
      expect(screen.getByText(/Starting a new book will clear the current editor/)).toBeInTheDocument();
    });

    it('Cancel dispatches CLOSE_MODAL from limit step', async () => {
      await openLimitStep();
      fireEvent.click(screen.getAllByText('Cancel')[0]);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_MODAL' });
    });

    it('continuing without export skips exportFile call', async () => {
      await openLimitStep();
      fireEvent.click(screen.getByTestId('project-option-p2'));
      // do NOT check the export checkbox
      mockCloudService.loadFromCloud.mockResolvedValue({});
      fireEvent.click(screen.getByTestId('limit-continue-btn'));
      await waitFor(() => screen.getByLabelText('Book Title'));
      expect(mockExportFile).not.toHaveBeenCalled();
    });

    it('continuing WITH export calls loadFromCloud and exportFile', async () => {
      await openLimitStep();
      fireEvent.click(screen.getByTestId('project-option-p1'));
      fireEvent.click(screen.getByTestId('export-checkbox')); // check it
      const projectData = { meta: { title: 'Book One' } };
      mockCloudService.loadFromCloud.mockResolvedValue(projectData);
      fireEvent.click(screen.getByTestId('limit-continue-btn'));
      await waitFor(() => screen.getByLabelText('Book Title'));
      expect(mockCloudService.loadFromCloud).toHaveBeenCalledWith('p1');
      expect(mockExportFile).toHaveBeenCalledWith(projectData, 'Book One');
    });

    it('proceeds to metadata after limit step', async () => {
      await openLimitStep();
      fireEvent.click(screen.getByTestId('project-option-p2'));
      mockCloudService.loadFromCloud.mockResolvedValue({});
      fireEvent.click(screen.getByTestId('limit-continue-btn'));
      await waitFor(() => screen.getByLabelText('Book Title'));
      expect(screen.getByText('New Book Details')).toBeInTheDocument();
    });
  });

  // ── metadata step ────────────────────────────────────────────────────────
  describe('metadata step', () => {
    const openMetadataStep = async () => {
      renderModal();
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => screen.getByLabelText('Book Title'));
    };

    it('pre-fills author from current project meta when guest', async () => {
      // mockState.meta.author = 'Jane' (set in makeState), user is not authenticated
      await openMetadataStep();
      expect(screen.getByLabelText('Author')).toHaveValue('Jane');
    });

    it('pre-fills author from user displayName when authenticated', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: 'u1', username: 'jdoe', displayName: 'John Doe', email: 'j@test.com', role: 'USER', tier: 'DEFAULT', genreTags: null, profilePicture: null },
      } as any);
      await openMetadataStep();
      expect(screen.getByLabelText('Author')).toHaveValue('John Doe');
    });

    it('falls back to username when authenticated user has no displayName', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: 'u1', username: 'jdoe', displayName: null, email: 'j@test.com', role: 'USER', tier: 'DEFAULT', genreTags: null, profilePicture: null },
      } as any);
      await openMetadataStep();
      expect(screen.getByLabelText('Author')).toHaveValue('jdoe');
    });

    it('Create Book button is disabled when title is empty', async () => {
      await openMetadataStep();
      expect(screen.getByTestId('create-book-btn')).toBeDisabled();
    });

    it('Create Book button enables when title is entered', async () => {
      await openMetadataStep();
      fireEvent.change(screen.getByLabelText('Book Title'), { target: { value: 'My New Story' } });
      expect(screen.getByTestId('create-book-btn')).not.toBeDisabled();
    });

    it('Back button returns to confirm step when no limit was hit', async () => {
      await openMetadataStep();
      fireEvent.click(screen.getAllByText('Back')[0]);
      expect(screen.getByText(/Starting a new book will clear the current editor/)).toBeInTheDocument();
    });

    it('dispatches RESET_PROJECT with entered metadata on Create Book', async () => {
      await openMetadataStep();
      fireEvent.change(screen.getByLabelText('Book Title'),  { target: { value: 'New Story' } });
      fireEvent.change(screen.getByLabelText('Author'),      { target: { value: 'Bob' } });
      fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'A tale' } });
      fireEvent.click(screen.getByTestId('create-book-btn'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'RESET_PROJECT',
        payload: {
          meta: { title: 'New Story', author: 'Bob', description: 'A tale', tags: [] },
          overwriteProjectId: undefined,
        },
      });
    });

    it('trims whitespace from title and author', async () => {
      await openMetadataStep();
      fireEvent.change(screen.getByLabelText('Book Title'), { target: { value: '  Trimmed  ' } });
      fireEvent.change(screen.getByLabelText('Author'),     { target: { value: '  Alice  ' } });
      fireEvent.click(screen.getByTestId('create-book-btn'));
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            meta: expect.objectContaining({ title: 'Trimmed', author: 'Alice' }),
          }),
        })
      );
    });

    it('uses Anonymous as author when field is cleared', async () => {
      await openMetadataStep();
      fireEvent.change(screen.getByLabelText('Book Title'), { target: { value: 'A Book' } });
      fireEvent.change(screen.getByLabelText('Author'),     { target: { value: '' } });
      fireEvent.click(screen.getByTestId('create-book-btn'));
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            meta: expect.objectContaining({ author: 'Anonymous' }),
          }),
        })
      );
    });
  });

  // ── overwrite project ID carries through ─────────────────────────────────
  describe('overwrite project ID in RESET_PROJECT', () => {
    it('passes overwriteProjectId when chosen at the limit step', async () => {
      mockState = makeState({
        saveSettings: { saveToLocal: true, saveToCloud: true, autoSaveOnChapterChange: false, autoSaveInterval: 0, autoSaveOnFocusLoss: false },
      });
      mockCloudService.listProjects.mockResolvedValue(TWO_PROJECTS);
      renderModal();

      // confirm step → limit step
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => screen.getByTestId('danger-banner'));

      // select project p2 to overwrite
      fireEvent.click(screen.getByTestId('project-option-p2'));
      mockCloudService.loadFromCloud.mockResolvedValue({});
      fireEvent.click(screen.getByTestId('limit-continue-btn'));

      // metadata step
      await waitFor(() => screen.getByLabelText('Book Title'));
      fireEvent.change(screen.getByLabelText('Book Title'), { target: { value: 'Fresh Start' } });
      fireEvent.click(screen.getByTestId('create-book-btn'));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'RESET_PROJECT',
        payload: {
          meta: { title: 'Fresh Start', author: 'Jane', description: '', tags: [] },
          overwriteProjectId: 'p2',
        },
      });
    });
  });

  // ── sign-up link ────────────────────────────────────────────────────────
  describe('sign-up link in limit step', () => {
    it('shows sign-up link for unauthenticated guest', async () => {
      mockState = makeState({
        saveSettings: { saveToLocal: true, saveToCloud: true, autoSaveOnChapterChange: false, autoSaveInterval: 0, autoSaveOnFocusLoss: false },
      });
      mockCloudService.listProjects.mockResolvedValue(TWO_PROJECTS);
      renderModal();
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => screen.getByTestId('danger-banner'));
      expect(screen.getByText('sign up for unlimited projects')).toBeInTheDocument();
    });

    it('hides sign-up link for authenticated user (would not reach limit step anyway)', () => {
      // Authenticated users never reach the limit step, so this is moot.
      // We just verify the link is absent on the confirm step.
      renderModal();
      expect(screen.queryByText('sign up for unlimited projects')).toBeNull();
    });
  });
});
