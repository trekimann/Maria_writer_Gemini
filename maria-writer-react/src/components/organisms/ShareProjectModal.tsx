import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import { collaborationService, type CollaborationRole, type CreatedInvitation, type ProjectInvitationSummary } from '../../services/collaborationService';
import styles from './ShareProjectModal.module.scss';

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null | undefined;
  projectTitle: string;
  isAuthenticated: boolean;
}

const ROLE_OPTIONS: Array<{ value: CollaborationRole; label: string; description: string }> = [
  { value: 'READ', label: 'Read only', description: 'Open the story in the reader without editing.' },
  { value: 'COMMENT', label: 'Read + comment', description: 'Read now, with comment access ready for the next review step.' },
];

export const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  isAuthenticated,
}) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaborationRole>('READ');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitation | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitationSummary[]>([]);

  const canSendInvite = isAuthenticated && !!projectId;

  const roleDescription = useMemo(
    () => ROLE_OPTIONS.find((option) => option.value === role)?.description ?? '',
    [role],
  );

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setRole('READ');
      setError(null);
      setCopySuccess(false);
      setCreatedInvitation(null);
      setPendingInvitations([]);
      return;
    }

    if (!projectId || !isAuthenticated) {
      return;
    }

    let isCancelled = false;

    const loadInvitations = async () => {
      setIsLoadingInvites(true);
      setError(null);

      try {
        const invitations = await collaborationService.listProjectInvitations(projectId);
        if (!isCancelled) {
          setPendingInvitations(invitations);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Failed to load pending invitations.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingInvites(false);
        }
      }
    };

    void loadInvitations();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, isOpen, projectId]);

  const handleCopyLink = async () => {
    if (!createdInvitation?.acceptUrl) return;

    try {
      await navigator.clipboard.writeText(createdInvitation.acceptUrl);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      setError('Could not copy the invite link. You can still copy it manually.');
    }
  };

  const handleSubmit = async () => {
    if (!projectId) {
      setError('Save this project to your account before inviting anyone.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await collaborationService.createInvitation(projectId, {
        email: email.trim(),
        role,
      });

      setCreatedInvitation(result);
      setEmail('');
      setPendingInvitations((prev) => [result.invitation, ...prev.filter((item) => item.id !== result.invitation.id)]);
    } catch (err: any) {
      setError(err?.message || 'Failed to create invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Project"
      headerColor="emerald"
      size="lg"
      helpId="share-project"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {canSendInvite && (
            <Button variant="primary" icon={Send} onClick={handleSubmit} disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? 'Sending…' : 'Create invite'}
            </Button>
          )}
        </>
      }
    >
      <div className={styles.content}>
        <div className={styles.introCard}>
          <p className={styles.eyebrow}>Current project</p>
          <h4>{projectTitle}</h4>
          <p>Invite a creator by email. Maria Writer creates a secure invite link that they can accept from their account.</p>
        </div>

        {!isAuthenticated && (
          <div className={styles.noticeCard}>
            <p>You need an account to invite readers or reviewers.</p>
            <div className={styles.inlineActions}>
              <Button variant="primary" onClick={() => { onClose(); navigate('/register'); }}>
                Create account
              </Button>
              <Button variant="secondary" onClick={() => { onClose(); navigate('/login'); }}>
                Sign in
              </Button>
            </div>
          </div>
        )}

        {isAuthenticated && !projectId && (
          <div className={styles.noticeCard}>
            <p>Save this project to your account first. Once it has a cloud project ID, you can generate invite links here.</p>
          </div>
        )}

        {canSendInvite && (
          <div className={styles.formCard}>
            <label className={styles.field}>
              <span>Invite email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="reader@example.com"
              />
            </label>

            <label className={styles.field}>
              <span>Access level</span>
              <select value={role} onChange={(event) => setRole(event.target.value as CollaborationRole)}>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <p className={styles.helpText}>{roleDescription}</p>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {createdInvitation && (
          <div className={styles.successCard}>
            <p className={styles.eyebrow}>Invite ready</p>
            <strong>{createdInvitation.invitation.email}</strong>
            <p>This invite expires {new Date(createdInvitation.invitation.expiresAt).toLocaleString()}.</p>
            <div className={styles.linkRow}>
              <input readOnly value={createdInvitation.acceptUrl} aria-label="Invite link" />
              <Button variant="secondary" icon={copySuccess ? Check : Copy} onClick={handleCopyLink}>
                {copySuccess ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>
        )}

        {canSendInvite && (
          <div className={styles.pendingCard}>
            <div className={styles.pendingHeader}>
              <h4>Pending invitations</h4>
              {isLoadingInvites && <span>Loading…</span>}
            </div>

            {pendingInvitations.length === 0 && !isLoadingInvites ? (
              <p className={styles.helpText}>No active invites for this project yet.</p>
            ) : (
              <div className={styles.pendingList}>
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className={styles.pendingItem}>
                    <div>
                      <strong>{invitation.email}</strong>
                      <span>{invitation.role} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};