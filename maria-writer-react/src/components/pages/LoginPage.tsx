import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../atoms/Button';
import { AuthPageCard } from '../atoms/AuthPageCard';
import { AppPageLayout } from '../templates/AppPageLayout';
import { saveGuestSnapshot } from '../../utils/storage';
import styles from './LoginPage.module.scss';

export const LoginPage: React.FC = () => {
  const { login, returnTo } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      saveGuestSnapshot();
      await login({ email, password, rememberMe });
      navigate(returnTo || '/editor', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppPageLayout>
      <AuthPageCard
        title="Maria Writer"
        subtitle="Sign in to your account"
        footer={
          <div className={styles.links}>
            <p>
              Don't have an account?{' '}
              <Link to="/register" className={styles.link}>Create a free account →</Link>
            </p>
            <p>
              <button
                type="button"
                className={styles.guestLink}
                onClick={() => navigate('/editor')}
              >
                Continue as Guest (no cloud save)
              </button>
            </p>
          </div>
        }
      >
        {error && <div className={styles.errorBanner} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                className={styles.eyeToggle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.rememberRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
              />
              Remember me for 30 days
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </AuthPageCard>
    </AppPageLayout>
  );
};
