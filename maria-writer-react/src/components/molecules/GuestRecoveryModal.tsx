import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../atoms/Button';
import { cloudStorageService } from '../../services/cloudStorage';
import styles from './GuestRecoveryModal.module.scss';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface GuestRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestRecoveryModal: React.FC<GuestRecoveryModalProps> = ({ isOpen, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setApplied(false);
      setError(null);
      setCurrentId(cloudStorageService.getGuestId());
    }
  }, [isOpen]);

  const handleApply = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('Please enter a Guest ID.');
      return;
    }
    if (!UUID_RE.test(trimmed)) {
      setError('Please enter a valid UUID (e.g. xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx).');
      return;
    }
    const confirmed = window.confirm(
      `Replace your current Guest ID?\n\nCurrent: ${currentId}\nNew:     ${trimmed}\n\nThis will change which cloud projects are visible in this browser. You can restore the original ID at any time by coming back here.`
    );
    if (!confirmed) return;
    cloudStorageService.setGuestId(trimmed);
    setApplied(true);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recover Guest ID"
      headerColor="amber"
      footer={
        applied ? (
          <Button variant="primary" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleApply}>Save</Button>
          </>
        )
      }
    >
      <div className={styles.body}>
        {!applied ? (
          <>
            <div className={styles.currentIdBox}>
              <span className={styles.label}>Current Guest ID</span>
              <code className={styles.uuid}>{currentId}</code>
            </div>

            <p className={styles.description}>
              Enter the Guest ID from your previous browser session to restore access to
              your cloud-saved projects.
            </p>

            <div className={styles.field}>
              <label htmlFor="recovery-id" className={styles.label}>Recovery Guest ID</label>
              <input
                id="recovery-id"
                type="text"
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setError(null); }}
                placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
                spellCheck={false}
                autoFocus
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </div>

            <div className={styles.warning}>
              ⚠️ This will replace your current Guest ID for this browser session. Open{' '}
              <strong>Load Project → Cloud</strong> after applying to see the recovered projects.
            </div>
          </>
        ) : (
          <div className={styles.success}>
            <p>Guest ID updated to:</p>
            <code className={styles.uuid}>{inputValue.trim()}</code>
            <p>
              Close this dialog and open <strong>Load Project → Cloud</strong> to see
              your recovered projects.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
