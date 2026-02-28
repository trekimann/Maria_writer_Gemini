import React, { useState } from 'react';
import { X, Save, Cloud, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { cloudStorageService } from '../../services/cloudStorage';
import { saveToLocal, exportFile } from '../../utils/storage';
import styles from './SaveSettingsModal.module.scss';

interface SaveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveSettingsModal: React.FC<SaveSettingsModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useStore();
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFileName, setExportFileName] = useState('');

  if (!isOpen) return null;

  const settings = state.saveSettings || {
    saveToLocal: true,
    saveToCloud: false,
    autoSaveOnChapterChange: false,
    autoSaveInterval: 0,
    autoSaveOnFocusLoss: false,
  };

  const cloudSync = state.cloudSync || {
    projectId: null,
    guestId: null,
    lastSyncedAt: null,
    isSyncing: false,
    syncError: null,
  };

  const handleSettingChange = (key: string, value: boolean | number) => {
    dispatch({
      type: 'UPDATE_SAVE_SETTINGS',
      payload: { [key]: value } as any,
    });
  };

  const handleManualSave = async () => {
    setIsManualSaving(true);
    
    try {
      // Always save locally
      saveToLocal(state);

      // Save to cloud if enabled
      if (settings.saveToCloud) {
        dispatch({ type: 'CLOUD_SYNC_START' });
        
        const result = await cloudStorageService.saveToCloud(
          state.meta.title || 'Untitled Novel',
          state
        );
        
        dispatch({
          type: 'CLOUD_SYNC_SUCCESS',
          payload: {
            projectId: result.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error: any) {
      dispatch({
        type: 'CLOUD_SYNC_ERROR',
        payload: error.message || 'Failed to save',
      });
    } finally {
      setIsManualSaving(false);
    }
  };

  const handleExport = () => {
    if (!showExport) {
      setExportFileName(state.meta.title || 'Untitled');
      setShowExport(true);
      return;
    }
    exportFile(state, exportFileName || 'Untitled');
    setShowExport(false);
  };

  const formatLastSynced = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className={styles.saveSettingsModal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Save Settings</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.section}>
          <h3>Storage Location</h3>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={true} disabled />
              <span>Always save to Browser (Local Storage)</span>
            </label>
            
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.saveToCloud}
                onChange={(e) => handleSettingChange('saveToCloud', e.target.checked)}
              />
              <span>Also save to Cloud (MariaDB) when clicking Save Now</span>
            </label>
          </div>

          {settings.saveToCloud && (
            <div className={styles.cloudInfo}>
              <p><strong>Guest ID:</strong> {cloudStorageService.getGuestId()}</p>
              <p><strong>Last Synced:</strong> {formatLastSynced(cloudSync.lastSyncedAt)}</p>
              {cloudSync.projectId && (
                <p><strong>Project ID:</strong> {cloudSync.projectId.substring(0, 8)}...</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3>Auto-Save Options</h3>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.autoSaveOnChapterChange}
                onChange={(e) => handleSettingChange('autoSaveOnChapterChange', e.target.checked)}
              />
              <span>Save when switching chapters</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.autoSaveInterval > 0}
                onChange={(e) => {
                  handleSettingChange('autoSaveInterval', e.target.checked ? 5 : 0);
                }}
              />
              <span>Save at regular intervals</span>
            </label>

            {settings.autoSaveInterval > 0 && (
              <div className={styles.intervalGroup}>
                <label>Every</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.autoSaveInterval}
                  onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value) || 5)}
                />
                <span>minutes</span>
              </div>
            )}

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.autoSaveOnFocusLoss}
                onChange={(e) => handleSettingChange('autoSaveOnFocusLoss', e.target.checked)}
              />
              <span>Save when switching to another window</span>
            </label>
          </div>
        </div>

        {cloudSync.isSyncing && (
          <div className={`${styles.syncStatus} ${styles.syncing}`}>
            <Cloud size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Syncing to cloud...
          </div>
        )}

        {cloudSync.syncError && (
          <div className={`${styles.syncStatus} ${styles.error}`}>
            Error: {cloudSync.syncError}
          </div>
        )}

        {!cloudSync.isSyncing && !cloudSync.syncError && cloudSync.lastSyncedAt && (
          <div className={`${styles.syncStatus} ${styles.success}`}>
            Last saved {formatLastSynced(cloudSync.lastSyncedAt)}
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button
            className={`${styles.button} ${styles.primary} ${styles.saveNowButton}`}
            onClick={handleManualSave}
            disabled={isManualSaving || cloudSync.isSyncing}
          >
            <Save size={16} style={{ marginRight: '8px' }} />
            {isManualSaving ? 'Saving...' : 'Save Now'}
          </button>
        </div>

        <div className={styles.section}>
          <h3>Export</h3>
          {showExport && (
            <div className={styles.exportField}>
              <label className={styles.exportLabel}>File Name</label>
              <input
                type="text"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
                className={styles.exportInput}
                placeholder="My Novel"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExport();
                  if (e.key === 'Escape') setShowExport(false);
                }}
                autoFocus
              />
            </div>
          )}
          <button
            className={`${styles.button} ${styles.secondary} ${styles.exportButton}`}
            onClick={handleExport}
          >
            <Download size={16} style={{ marginRight: '8px' }} />
            {showExport ? 'Download .maria' : 'Export to .maria File'}
          </button>
          {showExport && (
            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setShowExport(false)}
              style={{ marginTop: '4px' }}
            >
              Cancel
            </button>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <button className={`${styles.button} ${styles.secondary}`} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
