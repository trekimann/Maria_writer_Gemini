import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookPlus, ChevronLeft, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { cloudStorageService, CloudProject } from '../../services/cloudStorage';
import { exportFile } from '../../utils/storage';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import styles from './NewBookModal.module.scss';

// Guest accounts are limited to this many cloud projects.
// Mirrors the GUEST_MAX_PROJECTS env-var on the backend.
const GUEST_MAX_PROJECTS = 2;

type Step = 'confirm' | 'limit' | 'metadata';

export const NewBookModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const { isAuthenticated, user } = useAuth();
  const isOpen = state.activeModal === 'new-book';

  // ── wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('confirm');
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [overwriteProjectId, setOverwriteProjectId] = useState<string | null>(null);
  const [exportBeforeOverwrite, setExportBeforeOverwrite] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Step 2 — metadata
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);

  // ── cloud sync settings ───────────────────────────────────────────────────
  const settings = state.saveSettings ?? { saveToCloud: false };
  const cloudSync = state.cloudSync ?? { lastSyncedAt: null };
  const cloudEnabled = settings.saveToCloud;

  // ── reset local state on open/close ──────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setCloudProjects([]);
      setOverwriteProjectId(null);
      setExportBeforeOverwrite(false);
      setTitle('');
      // Authenticated users: prefer profile display name, then username.
      // Guests: fall back to the current book's author field.
      const profileName = isAuthenticated && user
        ? (user.displayName ?? user.username)
        : (state.meta.author ?? '');
      setAuthor(profileName);
      setDescription('');
    }
  }, [isOpen, isAuthenticated, user, state.meta.author]);

  // ── auto-focus title when we reach the metadata step ─────────────────────
  useEffect(() => {
    if (step === 'metadata') {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [step]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const handleClose = () => dispatch({ type: 'CLOSE_MODAL' });

  /** Check whether the guest has hit the project limit. */
  const checkGuestLimit = async (): Promise<boolean> => {
    if (isAuthenticated) return false; // auth users have no frontend limit
    if (!cloudEnabled) return false;   // cloud sync off — no cloud slots consumed
    setIsLoadingProjects(true);
    try {
      const projects = await cloudStorageService.listProjects();
      setCloudProjects(projects);
      return projects.length >= GUEST_MAX_PROJECTS;
    } catch {
      // If we can't check, don't block the user
      return false;
    } finally {
      setIsLoadingProjects(false);
    }
  };

  /** Step 1 → either 'limit' or 'metadata' */
  const handleConfirmContinue = async () => {
    const atLimit = await checkGuestLimit();
    setStep(atLimit ? 'limit' : 'metadata');
  };

  /** From the limit screen: proceed after the user has chosen a project to overwrite */
  const handleLimitContinue = async () => {
    if (!overwriteProjectId) return;

    if (exportBeforeOverwrite) {
      // Find the full project data for the chosen slot and export it
      setIsExporting(true);
      try {
        const projectData = await cloudStorageService.loadFromCloud(overwriteProjectId);
        const projectTitle = cloudProjects.find(p => p.id === overwriteProjectId)?.title ?? 'project';
        exportFile(projectData, projectTitle);
      } catch {
        // Non-fatal — warn but continue
        alert('Export failed. Please export manually before continuing.');
      } finally {
        setIsExporting(false);
      }
    }

    setStep('metadata');
  };

  /** Final step: create the new book */
  const handleCreate = () => {
    if (!title.trim()) return;

    dispatch({
      type: 'RESET_PROJECT',
      payload: {
        meta: {
          title: title.trim(),
          author: author.trim() || 'Anonymous',
          description: description.trim(),
          tags: [],
        },
        overwriteProjectId: overwriteProjectId ?? undefined,
      },
    });
  };

  // ── last-sync label ───────────────────────────────────────────────────────
  const lastSyncLabel = cloudSync.lastSyncedAt
    ? `Last cloud save: ${new Date(cloudSync.lastSyncedAt).toLocaleTimeString()}`
    : 'Not yet synced to cloud';

  // ── modal title per step ──────────────────────────────────────────────────
  const modalTitle =
    step === 'confirm' ? 'New Book'
    : step === 'limit'  ? 'Project Limit Reached'
    :                     'New Book Details';

  // ── rendered steps ────────────────────────────────────────────────────────
  const renderConfirm = () => (
    <div className={styles.step}>
      <div className={styles.infoBox}>
        <BookPlus size={20} className={styles.infoIcon} />
        <div>
          <p className={styles.infoTitle}>Starting a new book will clear the current editor.</p>
          <p className={styles.infoSub}>
            Your work is auto-saved locally. {cloudEnabled && <span>{lastSyncLabel}.</span>}
          </p>
        </div>
      </div>
      <p className={styles.hint}>
        You can always reload your previous project from <strong>Open → Load Project</strong>.
      </p>
    </div>
  );

  const renderLimit = () => (
    <div className={styles.step}>
      {/* Red danger banner */}
      <div className={styles.dangerBanner} data-testid="danger-banner">
        <AlertTriangle size={20} className={styles.dangerIcon} />
        <div>
          <p className={styles.dangerTitle}>
            ⚠️ The cloud save of the overwritten project will be <strong>permanently deleted</strong> and is unrecoverable.
          </p>
          <p className={styles.dangerSub}>
            Exported .maria files are your only backup. We strongly recommend exporting first.
          </p>
        </div>
      </div>

      <p className={styles.limitInfo}>
        You&apos;ve used all <strong>{GUEST_MAX_PROJECTS}</strong> guest project slots.
        Select a project below to overwrite with your new book.
        {!isAuthenticated && (
          <> Or <a href="/register" className={styles.upgradeLink}>sign up for unlimited projects</a>.</>
        )}
      </p>

      <div className={styles.projectList} data-testid="project-list">
        {cloudProjects.map(project => (
          <label
            key={project.id}
            className={`${styles.projectItem} ${overwriteProjectId === project.id ? styles.selected : ''}`}
            data-testid={`project-option-${project.id}`}
          >
            <input
              type="radio"
              name="overwrite-project"
              value={project.id}
              checked={overwriteProjectId === project.id}
              onChange={() => setOverwriteProjectId(project.id)}
              className={styles.radio}
            />
            <div className={styles.projectInfo}>
              <span className={styles.projectTitle}>{project.title}</span>
              <span className={styles.projectDate}>
                Last saved: {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </label>
        ))}
      </div>

      <label className={styles.exportCheckbox} data-testid="export-before-overwrite-label">
        <input
          type="checkbox"
          checked={exportBeforeOverwrite}
          onChange={e => setExportBeforeOverwrite(e.target.checked)}
          data-testid="export-checkbox"
        />
        <span>Export the selected project as <strong>.maria</strong> before overwriting</span>
      </label>
    </div>
  );

  const renderMetadata = () => (
    <div className={styles.step}>
      <div className={styles.field}>
        <label htmlFor="new-book-title">Book Title</label>
        <input
          id="new-book-title"
          ref={titleRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="My New Novel"
          className={styles.input}
          autoComplete="off"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="new-book-author">Author</label>
        <input
          id="new-book-author"
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Anonymous"
          className={styles.input}
          autoComplete="off"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="new-book-description">Description <span className={styles.optional}>(optional)</span></label>
        <textarea
          id="new-book-description"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="A brief summary of your book…"
          className={styles.textarea}
        />
      </div>
    </div>
  );

  // ── footer per step ───────────────────────────────────────────────────────
  const renderFooter = () => {
    if (step === 'confirm') {
      return (
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirmContinue} disabled={isLoadingProjects}>
            {isLoadingProjects ? 'Checking…' : 'Continue →'}
          </Button>
        </>
      );
    }

    if (step === 'limit') {
      return (
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            variant="ghost"
            icon={ChevronLeft}
            onClick={() => setStep('confirm')}
          >
            Back
          </Button>
          <Button
            variant="danger"
            icon={exportBeforeOverwrite ? Download : undefined}
            onClick={handleLimitContinue}
            disabled={!overwriteProjectId || isExporting}
            data-testid="limit-continue-btn"
          >
            {isExporting ? 'Exporting…' : exportBeforeOverwrite ? 'Export & Continue' : 'Continue →'}
          </Button>
        </>
      );
    }

    // metadata step
    return (
      <>
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button
          variant="ghost"
          icon={ChevronLeft}
          onClick={() => setStep(cloudProjects.length >= GUEST_MAX_PROJECTS && cloudEnabled && !isAuthenticated ? 'limit' : 'confirm')}
        >
          Back
        </Button>
        <Button
          variant="primary"
          icon={BookPlus}
          onClick={handleCreate}
          disabled={!title.trim()}
          data-testid="create-book-btn"
        >
          Create Book
        </Button>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      headerColor={step === 'limit' ? 'gray' : 'emerald'}
      size="md"
      footer={renderFooter()}
    >
      {step === 'confirm' && renderConfirm()}
      {step === 'limit'   && renderLimit()}
      {step === 'metadata' && renderMetadata()}
    </Modal>
  );
};
