import React from 'react';
import { AppPageLayout } from '../templates/AppPageLayout';
import { LoadingSpinner } from '../atoms/LoadingSpinner.tsx';
import styles from './AdminPage.module.scss';

export const AdminPage: React.FC = () => {
  return (
    <AppPageLayout>
      <div className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Admin</p>
          <h1 className={styles.title}>Admin console</h1>
          <p className={styles.subtitle}>
            Future admin tabs will live here. For now, this page renders the shared loading spinner inside a panel.
          </p>
        </section>

        <section className={styles.panel} aria-label="Admin preview panel">
          <LoadingSpinner label="Loading admin tools…" size="lg" />
        </section>
      </div>
    </AppPageLayout>
  );
};