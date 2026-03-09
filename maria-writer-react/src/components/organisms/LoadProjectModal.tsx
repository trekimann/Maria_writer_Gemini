import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, RefreshCw, Cloud, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { cloudStorageService, CloudProject } from '../../services/cloudStorage';
import { APP_VERSION } from '../../constants/version';
import { getBreakingMigrationWarning } from '../../constants/versionCompatibility';
import { buildLoadedState, validateImportedState } from '../../utils/projectLoad';
import { saveToLocal } from '../../utils/storage';
import styles from './LoadProjectModal.module.scss';

type LoadTab = 'local' | 'cloud';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const LoadProjectModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isOpen = state.activeModal === 'load-project';

  const [activeTab, setActiveTab] = useState<LoadTab>('local');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localReadyName, setLocalReadyName] = useState<string | null>(null);
  const [parsedLocalState, setParsedLocalState] = useState<any | null>(null);

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [selectedCloudProjectId, setSelectedCloudProjectId] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const importedVersion = useMemo(() => {
    if (!parsedLocalState?.meta) return null;

    const bookVersion = parsedLocalState.meta.bookVersion || parsedLocalState.meta.version;
    const bookRevision = parsedLocalState.meta.bookRevision;
    const appVersion = parsedLocalState.meta.appVersion;

    return {
      bookVersion: bookVersion ? String(bookVersion) : null,
      bookRevision: bookRevision ? String(bookRevision) : null,
      appVersion: appVersion ? String(appVersion) : null,
    };
  }, [parsedLocalState]);

  const localBreakingWarning = useMemo(
    () => getBreakingMigrationWarning(importedVersion?.appVersion, APP_VERSION),
    [importedVersion],
  );

  const cloudBreakingWarning = useMemo(() => {
    if (!selectedCloudProjectId) return null;
    const project = cloudProjects.find((p) => p.id === selectedCloudProjectId);
    return getBreakingMigrationWarning(project?.version || null, APP_VERSION);
  }, [selectedCloudProjectId, cloudProjects]);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab('local');
    setIsDragOver(false);
    setIsReadingFile(false);
    setLocalError(null);
    setLocalReadyName(null);
    setParsedLocalState(null);
    setCloudError(null);
    setSelectedCloudProjectId(null);
    setDeletingProjectId(null);
    setDeleteConfirmChecked(false);
    setIsDeleting(false);
    setDeleteError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'cloud') return;
    void refreshCloudProjects();
  }, [isOpen, activeTab]);

  const closeModal = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const startDeleteProject = (projectId: string) => {
    setDeletingProjectId(projectId);
    setDeleteConfirmChecked(false);
    setDeleteError(null);
  };

  const cancelDelete = () => {
    setDeletingProjectId(null);
    setDeleteConfirmChecked(false);
    setDeleteError(null);
  };

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await cloudStorageService.deleteFromCloud(deletingProjectId);
      setCloudProjects((prev) => prev.filter((p) => p.id !== deletingProjectId));
      if (selectedCloudProjectId === deletingProjectId) {
        setSelectedCloudProjectId(null);
      }
      setDeletingProjectId(null);
      setDeleteConfirmChecked(false);
    } catch (error: any) {
      setDeleteError(error?.message || 'Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  const refreshCloudProjects = async () => {
    setIsLoadingCloud(true);
    setCloudError(null);
    try {
      const projects = await cloudStorageService.listProjects();
      setCloudProjects(projects);
      if (projects.length > 0 && !selectedCloudProjectId) {
        setSelectedCloudProjectId(projects[0].id);
      }
    } catch (error: any) {
      setCloudError(error?.message || 'Failed to load cloud projects.');
      setCloudProjects([]);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const parseFile = async (file: File) => {
    setLocalError(null);
    setLocalReadyName(null);
    setParsedLocalState(null);

    if (!file.name.toLowerCase().endsWith('.maria')) {
      setLocalError('Only .maria files are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError('File is too large. Maximum size is 10 MB.');
      return;
    }

    setIsReadingFile(true);
    try {
      const content = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        setLocalError('Malformed JSON. The file could not be parsed.');
        return;
      }

      const validationError = validateImportedState(parsed);
      if (validationError) {
        setLocalError(validationError);
        return;
      }

      setParsedLocalState(parsed);
      setLocalReadyName(file.name);
    } catch {
      setLocalError('Failed to read file.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const onDropFile = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await parseFile(file);
  };

  const onChooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await parseFile(file);
    event.target.value = '';
  };

  const executeLoad = async () => {
    if (activeTab === 'local') {
      const confirmed = window.confirm('Loading will replace the current project. Continue?');
      if (!confirmed) return;

      if (!parsedLocalState) {
        setLocalError('Select a valid .maria file first.');
        return;
      }

      const localWarning = getBreakingMigrationWarning(parsedLocalState?.meta?.appVersion || null, APP_VERSION);
      if (localWarning) {
        const proceed = window.confirm(`${localWarning}\n\nContinue loading this file?`);
        if (!proceed) return;
      }

      const nextState = buildLoadedState(parsedLocalState, state);
      dispatch({ type: 'LOAD_STATE', payload: nextState });
      dispatch({ type: 'CLOSE_MODAL' });
      return;
    }

    if (!selectedCloudProjectId) {
      setCloudError('Select a cloud project first.');
      return;
    }

    // --- Save current project before replacing it ---
    setIsSavingCurrent(true);
    setCloudError(null);
    try {
      // Always persist to localStorage
      saveToLocal(state);

      // Also push to cloud if the current project is already cloud-linked
      const currentProjectId = state.cloudSync?.projectId;
      if (state.saveSettings?.saveToCloud && currentProjectId) {
        await cloudStorageService.updateProject(
          currentProjectId,
          state.meta.title || 'Untitled Novel',
          state,
        );
      }
    } catch {
      // Non-fatal: log and continue — the user explicitly asked to load a new project
      console.warn('[LoadProjectModal] Auto-save before load failed — continuing with load.');
    } finally {
      setIsSavingCurrent(false);
    }

    // --- Load the selected cloud project ---
    setIsLoadingProject(true);
    setCloudError(null);
    try {
      const loaded = await cloudStorageService.loadFromCloud(selectedCloudProjectId);
      const validationError = validateImportedState(loaded);
      if (validationError) {
        setCloudError(`Cloud project is invalid: ${validationError}`);
        return;
      }

      const nextState = buildLoadedState(loaded, state, selectedCloudProjectId);
      dispatch({ type: 'LOAD_STATE', payload: nextState });
      dispatch({ type: 'CLOSE_MODAL' });
    } catch (error: any) {
      setCloudError(error?.message || 'Failed to load selected cloud project.');
    } finally {
      setIsLoadingProject(false);
    }
  };

  const selectedCloudProject = cloudProjects.find((project) => project.id === selectedCloudProjectId) || null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Load Project"
      headerColor="indigo"
      size="lg"
      helpId="load-project"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button
            variant="primary"
            onClick={executeLoad}
            disabled={isReadingFile || isLoadingCloud || isLoadingProject || isSavingCurrent || isDeleting}
          >
            {isSavingCurrent
              ? 'Saving current...'
              : isLoadingProject
              ? 'Loading...'
              : activeTab === 'local'
              ? 'Load File'
              : 'Load Selected'}
          </Button>
        </>
      }
    >
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'local' ? styles.active : ''}`}
          onClick={() => setActiveTab('local')}
          type="button"
        >
          Local File
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cloud' ? styles.active : ''}`}
          onClick={() => setActiveTab('cloud')}
          type="button"
        >
          Cloud
        </button>
      </div>

      {activeTab === 'local' && (
        <div className={styles.panel}>
          <div
            className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDropFile}
          >
            <Upload size={20} />
            <p>Drag a .maria file here</p>
            <p className={styles.subtle}>or</p>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} type="button">
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".maria"
              className={styles.hiddenInput}
              onChange={onChooseFile}
            />
          </div>

          {isReadingFile && <div className={styles.info}>Reading file...</div>}
          {localReadyName && <div className={styles.success}>Ready to load: {localReadyName}</div>}
          {importedVersion && (
            <div className={styles.info}>
              Imported metadata: book v{importedVersion.bookVersion || '1.0.0'}
              {importedVersion.bookRevision ? ` rev ${importedVersion.bookRevision}` : ''}
              {importedVersion.appVersion ? ` · app ${importedVersion.appVersion}` : ''}
            </div>
          )}
          {localError && <div className={styles.error}>{localError}</div>}
          {localBreakingWarning && (
            <div className={styles.warning}>{localBreakingWarning}</div>
          )}
          {parsedLocalState && !importedVersion?.appVersion && (
            <div className={styles.info}>Imported file has no app version metadata. It will be set to {APP_VERSION}.</div>
          )}
        </div>
      )}

      {activeTab === 'cloud' && (
        <div className={styles.panel}>
          {!isAuthenticated && (
            <div className={styles.upsellBanner}>
              <span>
                Saving as guest.{' '}
                <button
                  type="button"
                  className={styles.authLink}
                  onClick={() => { closeModal(); navigate('/register'); }}
                >Create a free account</button>
                {' or '}
                <button
                  type="button"
                  className={styles.authLink}
                  onClick={() => { closeModal(); navigate('/login'); }}
                >sign in</button>
                {' for unlimited projects & no data loss.'}
              </span>
            </div>
          )}

          <div className={styles.cloudHeader}>
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={refreshCloudProjects}
              disabled={isLoadingCloud || isDeleting}
              type="button"
            >
              {isLoadingCloud ? 'Refreshing...' : 'Refresh List'}
            </Button>
          </div>

          {cloudError && <div className={styles.error}>{cloudError}</div>}

          {!cloudError && !isLoadingCloud && cloudProjects.length === 0 && (
            <div className={styles.info}>No cloud projects found.</div>
          )}

          {cloudProjects.length > 0 && (
            <div className={styles.cloudList}>
              {cloudProjects.map((project) => (
                <div key={project.id}>
                  <div className={styles.cloudItem}>
                    <input
                      type="radio"
                      name="cloudProject"
                      checked={selectedCloudProjectId === project.id}
                      onChange={() => setSelectedCloudProjectId(project.id)}
                      disabled={isDeleting}
                    />
                    <div className={styles.cloudItemBody}>
                      <div className={styles.cloudTitle}>{project.title}</div>
                      <div className={styles.cloudMeta}>
                        Updated {new Date(project.updatedAt).toLocaleString()} · v{project.version}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.cloudItemDeleteBtn}
                      aria-label={`Delete ${project.title}`}
                      onClick={() => startDeleteProject(project.id)}
                      disabled={isDeleting || isLoadingProject || isSavingCurrent}
                      title="Delete from cloud"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {deletingProjectId === project.id && (
                    <div className={styles.deleteConfirmPanel}>
                      <div className={styles.deleteWarning}>
                        <strong>⚠ Permanent deletion</strong><br />
                        This project will be <strong>permanently removed from the cloud</strong>. This cannot be undone.
                        Export a <code>.maria</code> file first if you want a local backup before deleting.
                      </div>
                      {deleteError && (
                        <div className={styles.deleteError}>{deleteError}</div>
                      )}
                      <label className={styles.deleteCheckRow}>
                        <input
                          type="checkbox"
                          checked={deleteConfirmChecked}
                          onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                          disabled={isDeleting}
                        />
                        <span>I understand this project will be lost forever</span>
                      </label>
                      <div className={styles.deleteActions}>
                        <button
                          type="button"
                          className={styles.deleteCancelBtn}
                          onClick={cancelDelete}
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className={styles.deleteConfirmBtn}
                          onClick={handleDeleteProject}
                          disabled={!deleteConfirmChecked || isDeleting}
                        >
                          {isDeleting ? 'Deleting…' : 'Delete Permanently'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedCloudProject && (
            <div className={styles.info}>
              <Cloud size={16} />
              Selected: {selectedCloudProject.title}
            </div>
          )}
          {cloudBreakingWarning && (
            <div className={styles.warning}>{cloudBreakingWarning}</div>
          )}
        </div>
      )}
    </Modal>
  );
};
