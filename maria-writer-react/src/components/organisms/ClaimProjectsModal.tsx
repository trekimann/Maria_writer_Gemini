/**
 * ClaimProjectsModal
 *
 * Appears once after a user logs in or registers if they have cloud projects
 * saved under their previous guest ID.  It lets them selectively migrate
 * those projects into their account — or skip entirely.
 *
 * After a project is claimed it is re-encrypted under the user's key and its
 * guest_id column is set to NULL so it cannot be accidentally duplicated.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cloudStorageService, CloudProject } from '../../services/cloudStorage';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import styles from './ClaimProjectsModal.module.scss';

type ModalPhase = 'loading' | 'list' | 'migrating' | 'success' | 'error';

export const ClaimProjectsModal: React.FC = () => {
  const { isAuthenticated, hasPendingMigration, pendingMigrationGuestId, clearMigration } = useAuth();

  const isOpen = isAuthenticated && hasPendingMigration;

  const [phase, setPhase] = useState<ModalPhase>('loading');
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [claimedCount, setClaimedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Fetch preview whenever the modal opens ────────────────────────────────
  const fetchProjects = useCallback(async () => {
    if (!pendingMigrationGuestId) {
      clearMigration();
      return;
    }

    setPhase('loading');
    setErrorMsg(null);

    try {
      const list = await cloudStorageService.previewGuestProjects(pendingMigrationGuestId);
      if (list.length === 0) {
        // Nothing to migrate — dismiss silently
        clearMigration();
        return;
      }
      setProjects(list);
      setSelected(new Set(list.map((p) => p.id))); // all selected by default
      setPhase('list');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load your guest projects.');
      setPhase('error');
    }
  }, [pendingMigrationGuestId, clearMigration]);

  useEffect(() => {
    if (isOpen) {
      void fetchProjects();
    }
  }, [isOpen, fetchProjects]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleProject = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === projects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(projects.map((p) => p.id)));
    }
  };

  const handleMigrate = async () => {
    if (!pendingMigrationGuestId || selected.size === 0) return;

    setPhase('migrating');
    setErrorMsg(null);

    try {
      const result = await cloudStorageService.claimGuestProjects(
        pendingMigrationGuestId,
        [...selected],
      );
      setClaimedCount(result.claimed);
      setPhase('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Migration failed. You can try again or skip.');
      setPhase('list');
    }
  };

  const handleSkip = () => clearMigration();
  const handleDone = () => clearMigration();

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const allChecked = selected.size === projects.length && projects.length > 0;
  const someChecked = selected.size > 0 && selected.size < projects.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkip}
      title="Import Guest Projects"
      headerColor="indigo"
      size="md"
      footer={
        phase === 'success' ? (
          <Button variant="primary" onClick={handleDone}>Done</Button>
        ) : phase === 'list' ? (
          <>
            <Button variant="secondary" onClick={handleSkip}>Skip for now</Button>
            <Button
              variant="primary"
              icon={Upload}
              onClick={handleMigrate}
              disabled={selected.size === 0}
            >
              {selected.size === 0
                ? 'Select projects to migrate'
                : `Migrate ${selected.size} project${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </>
        ) : phase === 'error' ? (
          <Button variant="secondary" onClick={handleSkip}>Skip for now</Button>
        ) : null
      }
    >
      {phase === 'loading' && (
        <div className={styles.centred}>
          <p className={styles.muted}>Checking for projects from your previous session…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className={styles.centred}>
          <p className={styles.error}>{errorMsg}</p>
        </div>
      )}

      {phase === 'success' && (
        <div className={styles.centred}>
          <div className={styles.successIcon}>✓</div>
          <p className={styles.successMsg}>
            {claimedCount} project{claimedCount !== 1 ? 's have' : ' has'} been moved to your account.
          </p>
          <p className={styles.muted}>
            They will no longer appear under your guest ID and are now accessible
            from any device when you sign in.
          </p>
        </div>
      )}

      {(phase === 'list' || phase === 'migrating') && (
        <div className={styles.body}>
          <p className={styles.intro}>
            We found {projects.length} project{projects.length !== 1 ? 's' : ''} saved under
            your previous guest session. Select the ones you want to move to your account.
          </p>
          <p className={styles.note}>
            Migrated projects are re-encrypted under your account key and the link to your
            guest ID is removed — they cannot be duplicated or accessed as a guest afterwards.
          </p>

          <label className={styles.selectAllRow}>
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked; }}
              onChange={toggleAll}
              disabled={phase === 'migrating'}
            />
            <span>{allChecked ? 'Deselect all' : 'Select all'}</span>
          </label>

          <div className={styles.projectList}>
            {projects.map((project) => (
              <label key={project.id} className={styles.projectRow}>
                <input
                  type="checkbox"
                  checked={selected.has(project.id)}
                  onChange={() => toggleProject(project.id)}
                  disabled={phase === 'migrating'}
                />
                <div className={styles.projectInfo}>
                  <span className={styles.projectTitle}>{project.title}</span>
                  <span className={styles.projectMeta}>
                    Updated {new Date(project.updatedAt).toLocaleString()} · v{project.version}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {errorMsg && <div className={styles.error}>{errorMsg}</div>}

          {phase === 'migrating' && (
            <div className={styles.muted}>Migrating projects…</div>
          )}
        </div>
      )}
    </Modal>
  );
};
