/**
 * Tests for ClaimProjectsModal
 *
 * Covers: auto-dismiss when no projects, project list rendering, checkbox
 * selection, migration success, error handling, and skip.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { ClaimProjectsModal } from './ClaimProjectsModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockClearMigration     = vi.fn();
const mockPreviewGuest       = vi.fn();
const mockClaimGuest         = vi.fn();

const GUEST_ID = 'old-guest-uuid-1234';

const MOCK_PROJECTS = [
  { id: 'g1', title: 'Guest Novel 1', version: '2.3.0', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  { id: 'g2', title: 'Guest Novel 2', version: '2.3.0', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-03-02T00:00:00Z' },
];

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: {
    previewGuestProjects: (...args: unknown[]) => mockPreviewGuest(...args),
    claimGuestProjects:   (...args: unknown[]) => mockClaimGuest(...args),
  },
}));

vi.mock('./ClaimProjectsModal.module.scss', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

vi.mock('../molecules/Modal', () => ({
  Modal: ({ children, isOpen, footer }: any) =>
    isOpen
      ? <div data-testid="modal">{children}<div data-testid="modal-footer">{footer}</div></div>
      : null,
}));

vi.mock('../atoms/Button', () => ({
  Button: ({ children, onClick, disabled, icon: _icon, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}));

import { useAuth } from '../../context/AuthContext';
const mockedUseAuth = vi.mocked(useAuth);

function setAuth(overrides: Record<string, unknown> = {}) {
  mockedUseAuth.mockReturnValue({
    user: { id: 'u1', email: 'a@b.com', username: 'user1', displayName: 'User', role: 'USER', tier: 'DEFAULT', genreTags: null, profilePicture: null },
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'tok',
    returnTo: null,
    hasPendingMigration: true,
    pendingMigrationGuestId: GUEST_ID,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setReturnTo: vi.fn(),
    clearMigration: mockClearMigration,
    ...overrides,
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Not open
// ---------------------------------------------------------------------------

describe('ClaimProjectsModal – not open', () => {
  it('renders nothing when not authenticated', () => {
    setAuth({ isAuthenticated: false, hasPendingMigration: true });
    render(<ClaimProjectsModal />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders nothing when hasPendingMigration is false', () => {
    setAuth({ hasPendingMigration: false });
    render(<ClaimProjectsModal />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Auto-dismiss — no guest projects
// ---------------------------------------------------------------------------

describe('ClaimProjectsModal – auto-dismiss when empty', () => {
  it('calls clearMigration immediately when preview returns 0 projects', async () => {
    mockPreviewGuest.mockResolvedValueOnce([]);
    setAuth();

    render(<ClaimProjectsModal />);

    await waitFor(() => expect(mockClearMigration).toHaveBeenCalledTimes(1));
  });

  it('calls clearMigration when no pendingMigrationGuestId', async () => {
    setAuth({ pendingMigrationGuestId: null });
    render(<ClaimProjectsModal />);
    await waitFor(() => expect(mockClearMigration).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
// Project list
// ---------------------------------------------------------------------------

describe('ClaimProjectsModal – project list', () => {
  beforeEach(() => {
    mockPreviewGuest.mockResolvedValueOnce(MOCK_PROJECTS);
    setAuth();
  });

  it('shows all project titles after loading', async () => {
    render(<ClaimProjectsModal />);
    await waitFor(() => expect(screen.getByText('Guest Novel 1')).toBeInTheDocument());
    expect(screen.getByText('Guest Novel 2')).toBeInTheDocument();
  });

  it('all projects are checked by default', async () => {
    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText('Guest Novel 1'));

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is select-all; rest are per-project
    const projectCheckboxes = checkboxes.filter((c) => !c.matches('[indeterminate]'));
    projectCheckboxes.forEach((cb) => expect(cb).toBeChecked());
  });

  it('shows Migrate 2 projects button with both selected', async () => {
    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText(/migrate 2 projects/i));
  });

  it('unchecking a project reduces the button count', async () => {
    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText('Guest Novel 1'));

    const checkboxes = screen.getAllByRole('checkbox');
    // checkboxes[0] = select-all (indeterminate control), [1] = first project, [2] = second
    fireEvent.click(checkboxes[1]);

    expect(screen.getByText(/migrate 1 project\b/i)).toBeInTheDocument();
  });

  it('disables Migrate button when no projects selected', async () => {
    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText('Guest Novel 1'));

    // Uncheck both via select-all toggle (all → none)
    const [selectAll] = screen.getAllByRole('checkbox');
    fireEvent.click(selectAll); // deselect all
    fireEvent.click(selectAll); // select all (toggle back)
    fireEvent.click(selectAll); // deselect all again

    const migrateBtn = screen.getByText(/select projects to migrate/i).closest('button');
    expect(migrateBtn).toBeDisabled();
  });

  it('Skip for now calls clearMigration', async () => {
    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText(/skip for now/i));

    fireEvent.click(screen.getByText(/skip for now/i));
    expect(mockClearMigration).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Migration — success
// ---------------------------------------------------------------------------

describe('ClaimProjectsModal – migration success', () => {
  it('shows success message with claimed count after migration', async () => {
    mockPreviewGuest.mockResolvedValueOnce(MOCK_PROJECTS);
    mockClaimGuest.mockResolvedValueOnce({ claimed: 2 });
    setAuth();

    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText(/migrate 2 projects/i));

    await act(async () => {
      fireEvent.click(screen.getByText(/migrate 2 projects/i));
    });

    await waitFor(() =>
      expect(screen.getByText(/2 projects have been moved to your account/i)).toBeInTheDocument()
    );
  });

  it('calls claimGuestProjects with the correct guestId and selected IDs', async () => {
    mockPreviewGuest.mockResolvedValueOnce(MOCK_PROJECTS);
    mockClaimGuest.mockResolvedValueOnce({ claimed: 2 });
    setAuth();

    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText(/migrate 2 projects/i));

    await act(async () => {
      fireEvent.click(screen.getByText(/migrate 2 projects/i));
    });

    expect(mockClaimGuest).toHaveBeenCalledWith(GUEST_ID, expect.arrayContaining(['g1', 'g2']));
  });

  it('Done button after success calls clearMigration', async () => {
    mockPreviewGuest.mockResolvedValueOnce(MOCK_PROJECTS);
    mockClaimGuest.mockResolvedValueOnce({ claimed: 2 });
    setAuth();

    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText(/migrate 2 projects/i));

    await act(async () => {
      fireEvent.click(screen.getByText(/migrate 2 projects/i));
    });

    await waitFor(() => screen.getByText(/done/i));
    fireEvent.click(screen.getByText(/done/i));
    expect(mockClearMigration).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Migration — error
// ---------------------------------------------------------------------------

describe('ClaimProjectsModal – migration error', () => {
  it('shows inline error and returns to list on migration failure', async () => {
    mockPreviewGuest.mockResolvedValueOnce(MOCK_PROJECTS);
    mockClaimGuest.mockRejectedValueOnce(new Error('Server error'));
    setAuth();

    render(<ClaimProjectsModal />);
    await waitFor(() => screen.getByText(/migrate 2 projects/i));

    await act(async () => {
      fireEvent.click(screen.getByText(/migrate 2 projects/i));
    });

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
    // Still shows project list (not success page)
    expect(screen.getByText('Guest Novel 1')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Preview fetch error
// ---------------------------------------------------------------------------

describe('ClaimProjectsModal – preview fetch error', () => {
  it('shows error state with skip button when preview fails', async () => {
    mockPreviewGuest.mockRejectedValueOnce(new Error('Network error'));
    setAuth();

    render(<ClaimProjectsModal />);

    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
    expect(screen.getByText(/skip for now/i)).toBeInTheDocument();
  });
});
