import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthFrame.module.scss';

interface AuthFrameProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  loadingMessage?: string;
}

export const AuthFrame: React.FC<AuthFrameProps> = ({
  children,
  requireAuth = false,
  loadingMessage = 'Checking authentication…',
}) => {
  const { isLoading, isAuthenticated, setReturnTo } = useAuth();
  const location = useLocation();

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      setReturnTo(returnTo);
    }
  }, [isAuthenticated, isLoading, requireAuth, returnTo, setReturnTo]);

  if (isLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingCard} role="status" aria-live="polite">
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.loadingText}>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
