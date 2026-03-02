/**
 * Tests for UserProfileModal.
 *
 * Covers guest view, authenticated view, logout, copy-to-clipboard, and
 * navigation to login/register.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfileModal } from './UserProfileModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogout   = vi.fn();
const mockNavigate = vi.fn();
const mockOnClose  = vi.fn();
const mockDispatch = vi.fn();

const MOCK_GUEST_SNAPSHOT = {
  meta: { title: 'Guest Novel', author: 'Guest', description: '', tags: [] },
  chapters: [],
};

const MOCK_USER = {
  id: 'u-1',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER' as const,
  tier: 'DEFAULT' as const,
  genreTags: 'Fantasy,Sci-Fi',
  profilePicture: null,
};

const GUEST_ID = 'guest-uuid-1234';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../context/StoreContext', () => ({
  useStore: vi.fn(() => ({ dispatch: mockDispatch, state: {} })),
  initialState: {
    meta: { title: '', author: '', description: '', tags: [], bookVersion: '1.0.0', bookRevision: '0', appVersion: '2.3.0' },
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
    themeCustomizations: [],
  },
}));

vi.mock('../../utils/storage', () => ({
  loadGuestSnapshot: vi.fn(() => MOCK_GUEST_SNAPSHOT),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: {
    getGuestId: () => GUEST_ID,
  },
}));

vi.mock('./UserProfileModal.module.scss', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

// Clipboard API stub
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { useAuth } from '../../context/AuthContext';

const mockedUseAuth = vi.mocked(useAuth);

function setAuthState(overrides: Partial<ReturnType<typeof useAuth>>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    returnTo: null,
    hasPendingMigration: false,
    pendingMigrationGuestId: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: mockLogout,
    setReturnTo: vi.fn(),
    clearMigration: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => { vi.clearAllMocks(); });

// ---------------------------------------------------------------------------
// Guest view
// ---------------------------------------------------------------------------

describe('UserProfileModal – guest view', () => {
  beforeEach(() => setAuthState({ isAuthenticated: false, user: null }));

  it('renders upsell banner', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText(/you're saving as a/i)).toBeInTheDocument();
  });

  it('renders Create a free account and Sign in buttons', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByRole('button', { name: /create a free account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows the Guest ID', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText(GUEST_ID)).toBeInTheDocument();
  });

  it('navigates to /register on Create Account click', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /create a free account/i }));
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('navigates to /login on Sign in click', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('copies guest ID to clipboard', async () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    const copyBtn = screen.getByTitle('Copy Guest ID');
    fireEvent.click(copyBtn);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(GUEST_ID));
  });
});

// ---------------------------------------------------------------------------
// Authenticated view
// ---------------------------------------------------------------------------

describe('UserProfileModal – authenticated view', () => {
  beforeEach(() => setAuthState({ isAuthenticated: true, user: MOCK_USER }));

  it('renders display name', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders @username', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('renders role badge', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('renders email in detail row', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders genre tags as chips', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText('Fantasy')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
  });

  it('shows guest ID for recovery reference', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText(GUEST_ID)).toBeInTheDocument();
  });

  it('renders Sign Out button', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('does NOT render the upsell banner when authenticated', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.queryByText(/saving as a guest/i)).not.toBeInTheDocument();
  });

  it('renders initial letter when no profilePicture', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText('T')).toBeInTheDocument(); // 'T' from 'Test User'
  });

  it('renders profile image when profilePicture is set', () => {
    setAuthState({
      isAuthenticated: true,
      user: { ...MOCK_USER, profilePicture: 'data:image/jpeg;base64,abc' },
    });
    render(<UserProfileModal onClose={mockOnClose} />);
    const img = screen.getByRole('img', { name: /test user/i }) as HTMLImageElement;
    expect(img.src).toContain('base64,abc');
  });
});

// ---------------------------------------------------------------------------
// ADMIN role badge
// ---------------------------------------------------------------------------

describe('UserProfileModal – admin role badge', () => {
  it('shows Admin badge for ADMIN role', () => {
    setAuthState({ isAuthenticated: true, user: { ...MOCK_USER, role: 'ADMIN' } });
    render(<UserProfileModal onClose={mockOnClose} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

describe('UserProfileModal – logout', () => {
  beforeEach(() => setAuthState({ isAuthenticated: true, user: MOCK_USER }));

  it('calls logout and onClose on Sign Out click', async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    render(<UserProfileModal onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('dispatches LOAD_STATE with guest snapshot after logout', async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    render(<UserProfileModal onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOAD_STATE' }),
    ));
  });

  it('disables Sign Out button while logging out', async () => {
    let resolve!: (value?: unknown) => void;
    mockLogout.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<UserProfileModal onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /signing out/i })).toBeDisabled()
    );
    resolve();
  });
});

// ---------------------------------------------------------------------------
// Close behaviour
// ---------------------------------------------------------------------------

describe('UserProfileModal – close', () => {
  beforeEach(() => setAuthState({ isAuthenticated: false, user: null }));

  it('calls onClose when close button is clicked', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    // The overlay is the outermost div; click it directly
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does NOT close when clicking inside the panel', () => {
    render(<UserProfileModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
