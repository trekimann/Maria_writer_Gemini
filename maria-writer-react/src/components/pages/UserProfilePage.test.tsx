import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProfilePage } from './UserProfilePage';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockUpdateProfile = vi.fn();
const mockDispatch = vi.fn();
const mockListProjects = vi.fn();
const mockLoadFromCloud = vi.fn();
const mockSaveToLocal = vi.fn();

const MOCK_USER = {
  id: 'u-1',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER' as const,
  tier: 'DEFAULT' as const,
  genreTags: 'Fantasy,Sci-Fi',
  profilePicture: null,
  dob: '04/05/1990 00:00:00',
  aliases: 'Tess,Writer Prime',
  bio: 'An author with a dramatic streak.',
  profileColor: '#4f46e5',
  creatorConnections: [
    { id: 'c1', name: 'Alice', kind: 'follow' as const, note: 'Reads every draft' },
    { id: 'c2', name: 'Bob', kind: 'collaborator' as const },
  ],
};

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: MOCK_USER,
    logout: mockLogout,
    updateProfile: mockUpdateProfile,
  }),
}));

vi.mock('../../context/StoreContext', () => ({
  useStore: () => ({
    state: { meta: { title: 'Starfall' } },
    dispatch: mockDispatch,
  }),
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

vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: {
    getGuestId: () => 'guest-uuid-1234',
    listProjects: (...args: unknown[]) => mockListProjects(...args),
    loadFromCloud: (...args: unknown[]) => mockLoadFromCloud(...args),
  },
}));

vi.mock('../../utils/storage', () => ({
  loadGuestSnapshot: vi.fn(() => ({ meta: { title: 'Guest Novel', author: 'Guest', description: '', tags: [] }, chapters: [] })),
  saveToLocal: (...args: unknown[]) => mockSaveToLocal(...args),
}));

vi.mock('@utils/profileCharacter', () => ({
  addProfileAsCharacter: vi.fn(() => 'char-123'),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

describe('UserProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListProjects.mockResolvedValue([
      { id: 'p1', title: 'Starfall', version: '1.0.0', createdAt: '2026-03-08T10:00:00.000Z', updatedAt: '2026-03-09T10:30:00.000Z' },
    ]);
    mockLoadFromCloud.mockResolvedValue({
      meta: { title: 'Loaded Novel', author: 'Author', description: '', tags: [] },
      chapters: [{ id: 'ch-1', title: 'Chapter 1', content: '', order: 0 }],
      characters: [],
      events: [],
      relationships: [],
      comments: {},
      timeline: { edges: [] },
    });
  });

  it('renders profile details, cloud projects, and creator relationships', async () => {
    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Test User' })).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText('Fantasy')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.getByText('04/05/1990 00:00:00')).toBeInTheDocument();
    expect(screen.getByText('Tess')).toBeInTheDocument();
    expect(screen.getByText('Writer Prime')).toBeInTheDocument();
    expect(screen.getByText('An author with a dramatic streak.')).toBeInTheDocument();
    expect(screen.getByText('guest-uuid-1234')).toBeInTheDocument();
    expect(await screen.findByText('Starfall')).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /create character in/i })).toBeInTheDocument();
  });

  it('copies the guest id', async () => {
    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /copy guest id/i }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('guest-uuid-1234'));
  });

  it('creates a character and returns to the editor', () => {
    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /create character in/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/editor');
  });

  it('saves edited profile fields', async () => {
    mockUpdateProfile.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Captain Maria' } });
    fireEvent.change(screen.getByPlaceholderText(/tell readers a little about yourself here/i), { target: { value: 'Updated bio' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
      displayName: 'Captain Maria',
      bio: 'Updated bio',
      profileColor: '#4f46e5',
    })));
  });

  it('quick loads a cloud project into the editor', async () => {
    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /quick load/i }));

    await waitFor(() => expect(mockLoadFromCloud).toHaveBeenCalledWith('p1'));
    expect(mockSaveToLocal).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOAD_STATE' }));
    expect(mockNavigate).toHaveBeenCalledWith('/editor');
  });

  it('logs out, restores the guest snapshot, and redirects to login', async () => {
    mockLogout.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOAD_STATE' }));
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
