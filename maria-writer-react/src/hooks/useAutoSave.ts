import { useEffect, useRef } from 'react';
import { AppState, SaveSettings } from '../types';
import { saveToLocal } from '../utils/storage';
import { cloudStorageService } from '../services/cloudStorage';

interface UseAutoSaveOptions {
  state: AppState;
  settings: SaveSettings | undefined;
  onCloudSyncStart: () => void;
  onCloudSyncSuccess: (projectId: string, timestamp: string) => void;
  onCloudSyncError: (error: string) => void;
}

export const useAutoSave = ({
  state,
  settings,
  onCloudSyncStart,
  onCloudSyncSuccess,
  onCloudSyncError,
}: UseAutoSaveOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousChapterIdRef = useRef<string | null>(state.activeChapterId);

  const performSave = async (reason: string) => {
    console.log(`[AutoSave] Saving due to: ${reason}`);

    try {
      // Save to local storage if enabled
      if (settings?.saveToLocal) {
        saveToLocal(state);
      }

      // Save to cloud if enabled
      if (settings?.saveToCloud) {
        onCloudSyncStart();
        
        const result = await cloudStorageService.saveToCloud(
          state.meta.title || 'Untitled Novel',
          state
        );
        
        onCloudSyncSuccess(result.id, new Date().toISOString());
      }
    } catch (error: any) {
      console.error('[AutoSave] Error:', error);
      onCloudSyncError(error.message || 'Failed to save');
    }
  };

  // Auto-save on interval
  useEffect(() => {
    if (settings?.autoSaveInterval && settings.autoSaveInterval > 0) {
      const intervalMs = settings.autoSaveInterval * 60 * 1000;
      
      intervalRef.current = setInterval(() => {
        performSave('interval');
      }, intervalMs);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [settings?.autoSaveInterval, state]);

  // Auto-save on chapter change
  useEffect(() => {
    if (settings?.autoSaveOnChapterChange && previousChapterIdRef.current !== state.activeChapterId) {
      if (previousChapterIdRef.current !== null) {
        // Don't save on initial load
        performSave('chapter change');
      }
      previousChapterIdRef.current = state.activeChapterId;
    }
  }, [state.activeChapterId, settings?.autoSaveOnChapterChange]);

  // Auto-save on focus loss
  useEffect(() => {
    if (settings?.autoSaveOnFocusLoss) {
      const handleBlur = () => {
        performSave('focus loss');
      };

      window.addEventListener('blur', handleBlur);
      return () => window.removeEventListener('blur', handleBlur);
    }
  }, [settings?.autoSaveOnFocusLoss, state]);

  // Manual save function
  const manualSave = () => performSave('manual');

  return { manualSave };
};
