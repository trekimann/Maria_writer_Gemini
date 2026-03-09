import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Inbox, RefreshCw, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { HelpButton } from '../atoms/HelpButton';
import { AppPageLayout } from '../templates/AppPageLayout';
import { collaborationService, type AcceptedInvitation, type PendingInvitation } from '../../services/collaborationService';
import styles from './InvitationsPage.module.scss';

export const InvitationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [acceptedInvitation, setAcceptedInvitation] = useState<AcceptedInvitation | null>(null);

  const tokenFromUrl = searchParams.get('token');

  const refreshInvitations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextInvitations = await collaborationService.listPendingInvitations();
      setInvitations(nextInvitations);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invitations.');
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshInvitations();
  }, []);

  const featuredInvitation = useMemo(
    () => invitations.find((invitation) => invitation.token === tokenFromUrl) ?? null,
    [invitations, tokenFromUrl],
  );

  const handleAccept = async (token: string) => {
    setPendingToken(token);
    setActionError(null);

    try {
      const result = await collaborationService.acceptInvitation(token);
      setAcceptedInvitation(result);
      setInvitations((prev) => prev.filter((invitation) => invitation.token !== token));

      if (searchParams.get('token') === token) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('token');
        setSearchParams(nextParams, { replace: true });
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to accept invitation.');
    } finally {
      setPendingToken(null);
    }
  };

  const handleDecline = async (token: string) => {
    setPendingToken(token);
    setActionError(null);

    try {
      await collaborationService.declineInvitation(token);
      setInvitations((prev) => prev.filter((invitation) => invitation.token !== token));

      if (searchParams.get('token') === token) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('token');
        setSearchParams(nextParams, { replace: true });
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to decline invitation.');
    } finally {
      setPendingToken(null);
    }
  };

  return (
    <AppPageLayout
      headerActions={
        <div className={styles.headerActions}>
          <HelpButton helpId="invitations" />
          <Button variant="secondary" icon={Inbox} onClick={() => navigate('/read')}>
            Reader library
          </Button>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/editor')}>
            Back to Editor
          </Button>
        </div>
      }
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Invitations</p>
            <h1 className={styles.title}>Manage project invites</h1>
            <p className={styles.subtitle}>
              Review invitations from other creators, then accept them into your reader library or decline them.
            </p>
          </div>

          <Button variant="secondary" icon={RefreshCw} onClick={refreshInvitations} disabled={isLoading}>
            {isLoading ? 'Refreshing…' : 'Refresh invitations'}
          </Button>
        </section>

        {acceptedInvitation && (
          <div className={styles.successBanner}>
            <CheckCircle2 size={18} />
            <div>
              <strong>Invitation accepted.</strong>
              <p>
                {acceptedInvitation.project.title} is now in your reader library.
              </p>
            </div>
            <Button variant="primary" onClick={() => navigate(`/read?project=${acceptedInvitation.project.id}`)}>
              Open in reader
            </Button>
          </div>
        )}

        {featuredInvitation && (
          <div className={styles.featuredCard}>
            <p className={styles.eyebrow}>Invite link detected</p>
            <h2>{featuredInvitation.project.title}</h2>
            <p>
              {featuredInvitation.project.owner.displayName || featuredInvitation.project.owner.username} invited you to {featuredInvitation.role === 'COMMENT' ? 'comment on' : 'read'} this project.
            </p>
          </div>
        )}

        {(error || actionError) && <p className={styles.error}>{error || actionError}</p>}

        {!error && !isLoading && invitations.length === 0 && (
          <p className={styles.emptyState}>You have no pending invitations right now.</p>
        )}

        <div className={styles.list}>
          {invitations.map((invitation) => {
            const isFeatured = invitation.token === tokenFromUrl;
            const ownerName = invitation.project.owner.displayName || invitation.project.owner.username || invitation.project.owner.email;

            return (
              <article
                key={invitation.id}
                className={`${styles.card} ${isFeatured ? styles.cardFeatured : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div>
                    <h2>{invitation.project.title}</h2>
                    <p>From {ownerName}</p>
                  </div>
                  <span className={styles.roleBadge}>{invitation.role}</span>
                </div>

                <p className={styles.meta}>
                  Expires {new Date(invitation.expiresAt).toLocaleString()}
                </p>

                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    icon={CheckCircle2}
                    onClick={() => handleAccept(invitation.token)}
                    disabled={pendingToken === invitation.token}
                  >
                    {pendingToken === invitation.token ? 'Working…' : 'Accept'}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={XCircle}
                    onClick={() => handleDecline(invitation.token)}
                    disabled={pendingToken === invitation.token}
                  >
                    Decline
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppPageLayout>
  );
};