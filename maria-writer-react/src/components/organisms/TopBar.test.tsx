import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';
import type { AppState, CloudSyncState, SaveSettings } from '../../types';

const mockDispatch = vi.fn();

const defaultSaveSettings: SaveSettings = {
  saveToLocal: true,
  saveToCloud: false,
  autoSaveOnChapterChange: false,
  autoSaveInterval: 0,
  autoSaveOnFocusLoss: false,
};

const defaultCloudSync: CloudSyncState = {
  projectId: null,
  guestId: 'guest-abc',
  lastSyncedAt: null,
  isSyncing: false,
  syncError: null,
};

let mockState: Partial<AppState>;
let mockAuthState = { isAuthenticated: false };

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

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('./TopBar.module.scss', () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

// Mock HelpButton since it uses HelpContext
vi.mock('../atoms/HelpButton', () => ({
  HelpButton: () => <button data-testid="help-button">Help</button>,
}));

// Mock ThemeToggle
vi.mock('../atoms/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

// Mock UserProfileModal
vi.mock('./UserProfileModal', () => ({
  UserProfileModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="user-profile-modal">
      <button onClick={onClose}>Close Profile</button>
    </div>
  ),
}));

vi.mock('./ShareProjectModal', () => ({
  ShareProjectModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => isOpen ? (
    <div data-testid="share-project-modal">
      <button onClick={onClose}>Close Share</button>
    </div>
  ) : null,
}));

describe('TopBar', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockAuthState = { isAuthenticated: false };
    mockState = {
      viewMode: 'write',
      saveSettings: { ...defaultSaveSettings },
      cloudSync: { ...defaultCloudSync },
    } as Partial<AppState>;
  });

  it('renders the Maria Writer logo', () => {
    render(<TopBar />);
    expect(screen.getByText('Maria Writer')).toBeInTheDocument();
  });

  it('can hide the logo when rendered inside the shared page layout', () => {
    render(<TopBar showBrand={false} />);
    expect(screen.queryByText('Maria Writer')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Open account menu')).toBeInTheDocument();
  });

  describe('save status', () => {
    it('shows "Saved locally" by default', () => {
      render(<TopBar />);
      expect(screen.getByText('Saved locally')).toBeInTheDocument();
    });

    it('shows "Saving to cloud..." when isSyncing is true', () => {
      mockState.cloudSync = { ...defaultCloudSync, isSyncing: true };
      render(<TopBar />);
      expect(screen.getByText(/Saving to cloud/)).toBeInTheDocument();
    });

    it('shows "Saved to cloud" when cloud is enabled and synced', () => {
      mockState.saveSettings = { ...defaultSaveSettings, saveToCloud: true };
      mockState.cloudSync = { ...defaultCloudSync, lastSyncedAt: '2026-01-01T00:00:00Z' };
      render(<TopBar />);
      expect(screen.getByText(/Saved to cloud/)).toBeInTheDocument();
    });

    it('shows "Saved locally" when cloud is enabled but not yet synced', () => {
      mockState.saveSettings = { ...defaultSaveSettings, saveToCloud: true };
      mockState.cloudSync = { ...defaultCloudSync, lastSyncedAt: null };
      render(<TopBar />);
      expect(screen.getByText('Saved locally')).toBeInTheDocument();
    });
  });

  describe('toolbar actions', () => {
    it('opens save-settings modal on Save click', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Save'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'OPEN_MODAL',
        payload: { type: 'save-settings' },
      });
    });

    it('opens load-project modal on Open click', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Open'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'OPEN_MODAL',
        payload: { type: 'load-project' },
      });
    });

    it('opens metadata modal on Info click', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Info'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'OPEN_MODAL',
        payload: { type: 'metadata' },
      });
    });

    it('opens theme-config modal on Theme Configuration click', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Theme Configuration'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'OPEN_MODAL',
        payload: { type: 'theme-config' },
      });
    });

    it('shows the share button for authenticated users', () => {
      mockAuthState = { isAuthenticated: true };
      render(<TopBar />);
      expect(screen.getByTitle('Share Project')).toBeInTheDocument();
    });

    it('opens the share modal for authenticated users', () => {
      mockAuthState = { isAuthenticated: true };
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Share Project'));
      expect(screen.getByTestId('share-project-modal')).toBeInTheDocument();
    });
  });

  describe('view modes', () => {
    it('dispatches SET_VIEW_MODE write when Write is clicked', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Write Mode'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_VIEW_MODE',
        payload: 'write',
      });
    });

    it('dispatches SET_VIEW_MODE source when Source is clicked', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Source Mode'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_VIEW_MODE',
        payload: 'source',
      });
    });

    it('dispatches SET_VIEW_MODE preview when Preview is clicked', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Preview Mode'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_VIEW_MODE',
        payload: 'preview',
      });
    });
  });

  describe('formatting', () => {
    it('dispatches format events via CustomEvent', () => {
      const spy = vi.fn();
      window.addEventListener('maria-editor-format', spy);

      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Bold'));

      expect(spy).toHaveBeenCalled();
      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.format).toBe('bold');

      window.removeEventListener('maria-editor-format', spy);
    });

    it('shows heading dropdown when Headings button is clicked', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByTitle('Headings'));
      expect(screen.getByText('Heading 1')).toBeInTheDocument();
      expect(screen.getByText('Heading 2')).toBeInTheDocument();
      expect(screen.getByText('Heading 3')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
    });
  });

  describe('profile menu button', () => {
    it('renders the account menu button', () => {
      render(<TopBar />);
      expect(screen.getByLabelText('Open account menu')).toBeInTheDocument();
    });

    it('shows UserProfileModal when account button is clicked', () => {
      render(<TopBar />);
      expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Open account menu'));
      expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
    });

    it('hides UserProfileModal when account button is clicked again (toggle)', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByLabelText('Open account menu'));
      expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Open account menu'));
      expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
    });

    it('hides UserProfileModal when modal calls onClose', () => {
      render(<TopBar />);
      fireEvent.click(screen.getByLabelText('Open account menu'));
      expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Close Profile' }));
      expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
    });
  });
});
