/**
 * UserProfileModal
 *
 * Opens from the ⋮ button next to the app name in the TopBar.
 *
 * Guest view   — shows Guest ID + upsell banner + Sign In / Register links.
 * Auth view    — shows avatar, name, username, email, role badge, genre tags
 *                and a Logout button. Reuses CharacterDetail avatar styling.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Copy, Check, LogIn, UserPlus, LogOut, User, Shield, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cloudStorageService } from '../../services/cloudStorage';
import { Button } from '../atoms/Button';
import styles from './UserProfileModal.module.scss';

interface Props {
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN:  'Admin',
  EDITOR: 'Editor',
  USER:   'Member',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  ADMIN:  <Shield size={12} />,
  EDITOR: <Star size={12} />,
  USER:   <User size={12} />,
};

export const UserProfileModal: React.FC<Props> = ({ onClose }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const guestId = cloudStorageService.getGuestId();

  const handleCopyGuestId = () => {
    navigator.clipboard.writeText(guestId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navigateTo = (path: string) => {
    onClose();
    navigate(path);
  };

  const avatarColor = '#4f46e5'; // indigo — placeholder until favourite colour field is added
  const initials = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.username?.charAt(0).toUpperCase() ?? '?';

  const genreTags = user?.genreTags
    ? user.genreTags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="User Profile">
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Account</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* ──────────── AUTHENTICATED VIEW ──────────── */}
        {isAuthenticated && user ? (
          <div className={styles.body}>
            {/* Avatar + name row */}
            <div className={styles.profileHeader}>
              <div className={styles.avatar} style={{ outlineColor: avatarColor }}>
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.displayName ?? user.username} />
                ) : (
                  <div className={styles.avatarPlaceholder} style={{ color: avatarColor }}>
                    {initials}
                  </div>
                )}
              </div>
              <div className={styles.profileInfo}>
                <h2 className={styles.displayName}>{user.displayName || user.username}</h2>
                <p className={styles.username}>@{user.username}</p>
                <span className={styles.roleBadge} data-role={user.role}>
                  {ROLE_ICONS[user.role]}
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>
            </div>

            {/* Detail rows */}
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{user.email}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Tier</span>
                <span className={styles.detailValue}>{user.tier}</span>
              </div>
            </div>

            {/* Genre tags */}
            {genreTags.length > 0 && (
              <div className={styles.tagsSection}>
                <span className={styles.detailLabel}>Genres</span>
                <div className={styles.tags}>
                  {genreTags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Guest ID (still shown for data recovery reference) */}
            <div className={styles.guestRow}>
              <span className={styles.detailLabel}>Guest ID</span>
              <span className={styles.guestId}>{guestId}</span>
              <button className={styles.copyBtn} onClick={handleCopyGuestId} title="Copy Guest ID">
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <Button
                variant="danger"
                icon={LogOut}
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Signing out…' : 'Sign Out'}
              </Button>
            </div>
          </div>

        ) : (
        /* ──────────── GUEST VIEW ──────────── */
          <div className={styles.body}>
            {/* Upsell banner */}
            <div className={styles.upsellBanner}>
              <p>You're saving as a <strong>guest</strong>. Create a free account to keep your projects safe, accessible from any device, and linked to your profile.</p>
            </div>

            {/* Action buttons */}
            <div className={styles.authButtons}>
              <Button variant="primary" icon={UserPlus} onClick={() => navigateTo('/register')}>
                Create a free account
              </Button>
              <Button variant="secondary" icon={LogIn} onClick={() => navigateTo('/login')}>
                Sign in
              </Button>
            </div>

            {/* Guest ID */}
            <div className={styles.guestSection}>
              <p className={styles.guestLabel}>Your Guest ID</p>
              <div className={styles.guestIdRow}>
                <code className={styles.guestIdCode}>{guestId}</code>
                <button className={styles.copyBtn} onClick={handleCopyGuestId} title="Copy Guest ID">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              <p className={styles.guestHint}>Keep this safe — it's the key to your cloud-saved projects if you switch browsers or devices.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
