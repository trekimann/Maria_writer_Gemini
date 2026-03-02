import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Camera, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../atoms/Button';
import { saveGuestSnapshot } from '../../utils/storage';
import styles from './RegisterPage.module.scss';

// ---------------------------------------------------------------------------
// Password strength helpers
// ---------------------------------------------------------------------------

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  const map: PasswordStrength[] = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Weak', color: '#ef4444' },
    { score: 2, label: 'Fair', color: '#f59e0b' },
    { score: 3, label: 'Good', color: '#3b82f6' },
    { score: 4, label: 'Strong', color: '#22c55e' },
  ];
  return map[score];
}

// ---------------------------------------------------------------------------
// Avatar helper — resize to 256×256 JPEG via canvas
// ---------------------------------------------------------------------------

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const SIZE = 256;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;
      // Crop to square from center
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RegisterPage: React.FC = () => {
  const { register, returnTo } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [genreTags, setGenreTags] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = getPasswordStrength(password);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const dataUrl = await resizeToDataUrl(file);
      setProfilePicture(dataUrl);
    } catch {
      setError('Could not process image. Please try another file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setIsSubmitting(true);
    try {
      saveGuestSnapshot();
      await register({
        email,
        username,
        password,
        displayName: displayName || undefined,
        genreTags: genreTags || undefined,
        profilePicture: profilePicture ?? undefined,
      });
      navigate(returnTo || '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Maria Writer</h1>
        <p className={styles.subtitle}>Create a free account</p>

        {error && <div className={styles.errorBanner} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>

          {/* ── Avatar ── */}
          <div className={styles.avatarRow}>
            <div
              className={styles.avatarPreview}
              onClick={() => avatarInputRef.current?.click()}
              title="Click to upload a profile picture"
            >
              {profilePicture
                ? <img src={profilePicture} alt="Profile preview" className={styles.avatarImg} />
                : <Camera size={28} className={styles.avatarIcon} />
              }
              {profilePicture && (
                <button
                  type="button"
                  className={styles.avatarClear}
                  onClick={(e) => { e.stopPropagation(); setProfilePicture(null); }}
                  aria-label="Remove profile picture"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={handleAvatarChange}
              disabled={isSubmitting}
            />
            <div className={styles.avatarHint}>
              <span className={styles.avatarHintTitle}>Profile Picture</span>
              <span className={styles.avatarHintSub}>Optional · JPG, PNG, GIF · cropped to square</span>
            </div>
          </div>

          {/* ── Display Name ── */}
          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>
              Display Name <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              autoFocus
              maxLength={255}
              disabled={isSubmitting}
              placeholder="How you'll appear in the app"
            />
          </div>

          {/* ── Username ── */}
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>Username</label>
            <input
              id="username"
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              maxLength={64}
              disabled={isSubmitting}
              placeholder="your_unique_handle"
            />
            <p className={styles.hint}>Letters, numbers, underscores, hyphens · 3–64 chars · must be unique</p>
          </div>

          {/* ── Email ── */}
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* ── Password ── */}
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
              <button type="button" className={styles.eyeToggle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className={styles.strengthMeter}>
                <div className={styles.strengthBars}>
                  {[1, 2, 3, 4].map(level => (
                    <div key={level} className={styles.strengthBar}
                      style={{ backgroundColor: strength.score >= level ? strength.color : undefined }} />
                  ))}
                </div>
                {strength.label && (
                  <span className={styles.strengthLabel} style={{ color: strength.color }}>{strength.label}</span>
                )}
              </div>
            )}
            <p className={styles.hint}>Min 8 chars · at least 1 uppercase · 1 special character</p>
          </div>

          {/* ── Confirm Password ── */}
          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={[styles.input, passwordMismatch ? styles.inputError : ''].join(' ')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
              <button type="button" className={styles.eyeToggle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'} tabIndex={-1}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordMismatch && <p className={styles.fieldError} role="alert">Passwords don't match</p>}
          </div>

          {/* ── Genre Tags ── */}
          <div className={styles.field}>
            <label htmlFor="genreTags" className={styles.label}>
              Favourite Genres <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="genreTags"
              type="text"
              className={styles.input}
              value={genreTags}
              onChange={(e) => setGenreTags(e.target.value)}
              disabled={isSubmitting}
              placeholder="Fantasy, Sci-Fi, Romance, Thriller"
            />
            <p className={styles.hint}>Comma-separated · helps personalise your experience</p>
          </div>

          <Button type="submit" variant="primary" size="lg" className={styles.submitButton}
            disabled={isSubmitting || passwordMismatch}>
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <div className={styles.divider} />

        <div className={styles.links}>
          <p>Already have an account?{' '}
            <Link to="/login" className={styles.link}>Sign in ?</Link>
          </p>
          <p>
            <button type="button" className={styles.guestLink} onClick={() => navigate('/')}>
              Continue as Guest (no cloud save)
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
