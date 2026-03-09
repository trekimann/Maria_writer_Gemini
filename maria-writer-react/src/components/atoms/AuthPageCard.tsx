import React from 'react';
import styles from './AuthPageCard.module.scss';

interface AuthPageCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthPageCard: React.FC<AuthPageCardProps> = ({ title, subtitle, children, footer }) => {
  return (
    <section className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.body}>{children}</div>
        {footer && (
          <>
            <div className={styles.divider} />
            <div className={styles.footer}>{footer}</div>
          </>
        )}
      </div>
    </section>
  );
};
