import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SaveSettingsModal } from './SaveSettingsModal';
import type { AppState, CloudSyncState, SaveSettings } from '../../types';
import { APP_VERSION } from '../../constants/version';

// Mock the dependencies
vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: {
    saveToCloud: vi.fn(),
    getGuestId: vi.fn(() => 'guest-abc'),
  },
}));

vi.mock('../../utils/storage', () => ({
  saveToLocal: vi.fn(),
  exportFile: vi.fn(),
}));

import { cloudStorageService } from '../../services/cloudStorage';
import { saveToLocal, exportFile } from '../../utils/storage';
const mockCloudService = vi.mocked(cloudStorageService);
const mockSaveToLocal = vi.mocked(saveToLocal);
const mockExportFile = vi.mocked(exportFile);

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

// Need to mock the scss module
vi.mock('./SaveSettingsModal.module.scss', () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false, user: null })),
}));

vi.mock('../atoms/HelpButton', () => ({
  HelpButton: () => null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('SaveSettingsModal', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockCloudService.saveToCloud.mockReset();
    mockSaveToLocal.mockReset();
    mockExportFile.mockReset();
    mockState = {
      meta: {
        title: 'Test Novel',
        author: 'Author',
        description: '',
        tags: [],
        bookVersion: '1.0.0',
        bookRevision: '0',
        appVersion: '2.2.0',
      },
      saveSettings: { ...defaultSaveSettings },
      cloudSync: { ...defaultCloudSync },
    } as Partial<AppState>;
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<SaveSettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when isOpen is true', () => {
    render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Save Settings')).toBeInTheDocument();
    expect(screen.getByText('Storage Location')).toBeInTheDocument();
    expect(screen.getByText('Auto-Save Options')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('calls onClose when X close button is clicked', () => {
    const onClose = vi.fn();
    render(<SaveSettingsModal isOpen={true} onClose={onClose} />);
    // The X (close) button
    const closeButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg') && btn.textContent === ''
    );
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Close text button is clicked', () => {
    const onClose = vi.fn();
    render(<SaveSettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop overlay', () => {
    const onClose = vi.fn();
    const { container } = render(<SaveSettingsModal isOpen={true} onClose={onClose} />);
    // Click the outermost div (overlay)
    fireEvent.click(container.firstChild!);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside the modal content', () => {
    const onClose = vi.fn();
    render(<SaveSettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Save Settings'));
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('settings toggles', () => {
    it('dispatches UPDATE_SAVE_SETTINGS when toggling cloud save', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      const cloudCheckbox = screen.getByRole('checkbox', { name: /also save to cloud/i });
      fireEvent.click(cloudCheckbox);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SAVE_SETTINGS',
        payload: { saveToCloud: true },
      });
    });

    it('dispatches UPDATE_SAVE_SETTINGS when toggling auto-save on chapter change', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      const checkbox = screen.getByRole('checkbox', { name: /save when switching chapters/i });
      fireEvent.click(checkbox);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SAVE_SETTINGS',
        payload: { autoSaveOnChapterChange: true },
      });
    });

    it('dispatches UPDATE_SAVE_SETTINGS when toggling auto-save interval', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      const checkbox = screen.getByRole('checkbox', { name: /save at regular intervals/i });
      fireEvent.click(checkbox);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SAVE_SETTINGS',
        payload: { autoSaveInterval: 5 },
      });
    });

    it('dispatches UPDATE_SAVE_SETTINGS when toggling focus loss', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      const checkbox = screen.getByRole('checkbox', { name: /save when switching to another window/i });
      fireEvent.click(checkbox);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SAVE_SETTINGS',
        payload: { autoSaveOnFocusLoss: true },
      });
    });

    it('shows interval input when auto-save interval is enabled', () => {
      mockState.saveSettings = { ...defaultSaveSettings, autoSaveInterval: 5 };
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(5);
    });
  });

  describe('cloud info section', () => {
    it('shows cloud info when saveToCloud is enabled', () => {
      mockState.saveSettings = { ...defaultSaveSettings, saveToCloud: true };
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Guest ID:/)).toBeInTheDocument();
      expect(screen.getByText(/Last Synced:/)).toBeInTheDocument();
    });

    it('shows project ID when present', () => {
      mockState.saveSettings = { ...defaultSaveSettings, saveToCloud: true };
      mockState.cloudSync = { ...defaultCloudSync, projectId: 'proj-12345678-xxxx' };
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Project ID:/)).toBeInTheDocument();
      expect(screen.getByText(/proj-123/)).toBeInTheDocument();
    });

    it('hides cloud info when saveToCloud is disabled', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.queryByText(/Guest ID:/)).toBeNull();
    });
  });

  describe('manual save', () => {
    it('saves locally and dispatches on Save Now click', async () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Save Now'));
      await waitFor(() => {
        expect(mockSaveToLocal).toHaveBeenCalledWith(mockState);
      });
    });

    it('saves to cloud when cloud is enabled', async () => {
      mockState.saveSettings = { ...defaultSaveSettings, saveToCloud: true };
      mockCloudService.saveToCloud.mockResolvedValueOnce({
        id: 'proj-new',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Save Now'));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOUD_SYNC_START' });
      });

      await waitFor(() => {
        expect(mockCloudService.saveToCloud).toHaveBeenCalledWith(
          'Test Novel',
          { ...mockState, meta: { ...mockState.meta, appVersion: APP_VERSION } }
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'CLOUD_SYNC_SUCCESS',
          payload: expect.objectContaining({
            projectId: 'proj-new',
          }),
        });
      });
    });

    it('dispatches CLOUD_SYNC_ERROR on cloud save failure', async () => {
      mockState.saveSettings = { ...defaultSaveSettings, saveToCloud: true };
      mockCloudService.saveToCloud.mockRejectedValueOnce(new Error('Network error'));

      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Save Now'));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'CLOUD_SYNC_ERROR',
          payload: 'Network error',
        });
      });
    });

    it('shows Saving... text while saving', async () => {
      // Make saveToLocal block so we can observe the intermediate state
      mockSaveToLocal.mockImplementation(() => {});
      mockState.saveSettings = { ...defaultSaveSettings, saveToCloud: true };
      
      let resolveCloud: any;
      mockCloudService.saveToCloud.mockReturnValue(
        new Promise((res) => { resolveCloud = res; })
      );

      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Save Now'));

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      resolveCloud({ id: 'p', updatedAt: 'now' });
    });
  });

  describe('export flow', () => {
    it('shows filename input on first Export click', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Export to .maria File'));
      expect(screen.getByDisplayValue('Test Novel')).toBeInTheDocument();
      expect(screen.getByText('Download .maria')).toBeInTheDocument();
    });

    it('calls exportFile with filename on Download click', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      // First click to show input
      fireEvent.click(screen.getByText('Export to .maria File'));
      // Second click to download
      fireEvent.click(screen.getByText('Download .maria'));
      expect(mockExportFile).toHaveBeenCalledWith(mockState, 'Test Novel');
    });

    it('calls exportFile on Enter key', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Export to .maria File'));
      const input = screen.getByDisplayValue('Test Novel');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockExportFile).toHaveBeenCalledWith(mockState, 'Test Novel');
    });

    it('cancels export on Escape key', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Export to .maria File'));
      const input = screen.getByDisplayValue('Test Novel');
      fireEvent.keyDown(input, { key: 'Escape' });
      // Should hide the input, back to Export button
      expect(screen.getByText('Export to .maria File')).toBeInTheDocument();
    });

    it('cancels export on Cancel button click', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Export to .maria File'));
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.getByText('Export to .maria File')).toBeInTheDocument();
    });

    it('allows editing the filename before download', () => {
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText('Export to .maria File'));
      const input = screen.getByDisplayValue('Test Novel');
      fireEvent.change(input, { target: { value: 'Custom Name' } });
      fireEvent.click(screen.getByText('Download .maria'));
      expect(mockExportFile).toHaveBeenCalledWith(mockState, 'Custom Name');
    });
  });

  describe('sync status indicators', () => {
    it('shows syncing status when isSyncing is true', () => {
      mockState.cloudSync = { ...defaultCloudSync, isSyncing: true };
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Syncing to cloud/)).toBeInTheDocument();
    });

    it('shows error when syncError is set', () => {
      mockState.cloudSync = { ...defaultCloudSync, syncError: 'Connection failed' };
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
    });

    it('shows last saved status when lastSyncedAt is set', () => {
      mockState.cloudSync = {
        ...defaultCloudSync,
        lastSyncedAt: new Date().toISOString(),
      };
      render(<SaveSettingsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Last saved Just now/)).toBeInTheDocument();
    });
  });
});
