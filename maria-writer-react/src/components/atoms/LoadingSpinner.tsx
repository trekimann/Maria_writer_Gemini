import React from 'react';
import styles from './LoadingSpinner.module.scss';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label,
  size = 'md',
  className,
}) => {
  const rootClasses = [styles.root, className].filter(Boolean).join(' ');
  const spinnerClasses = [styles.spinner, styles[size]].join(' ');

  return (
    <div className={rootClasses} role="status" aria-live="polite">
      <div className={spinnerClasses} aria-hidden="true" />
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
};