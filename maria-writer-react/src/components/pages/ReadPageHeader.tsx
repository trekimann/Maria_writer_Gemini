import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../atoms/Button';
import styles from './ReadPage.module.scss';

type ReadPageHeaderProps = {
  isHeroCollapsed: boolean;
  ownedCount: number;
  sharedCount: number;
  isLoadingLibrary: boolean;
  onRefresh: () => void;
};

export const ReadPageHeader: React.FC<ReadPageHeaderProps> = ({
  isHeroCollapsed,
  ownedCount,
  sharedCount,
  isLoadingLibrary,
  onRefresh,
}) => (
  <section className={`${styles.hero} ${isHeroCollapsed ? styles.heroCollapsed : ''}`}>
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>Reader library</p>
      <h1 className={styles.title}>Clean, immersive reading mode</h1>
      {!isHeroCollapsed && (
        <p className={styles.subtitle}>
          Choose a project, collapse the chrome, and read in a centered book layout that prioritizes the manuscript.
        </p>
      )}
    </div>

    <div className={styles.heroControls}>
      <div className={styles.heroChip}><span>Owned</span><strong>{ownedCount}</strong></div>
      <div className={styles.heroChip}><span>Shared</span><strong>{sharedCount}</strong></div>
      <Button variant="secondary" icon={RefreshCw} onClick={onRefresh} disabled={isLoadingLibrary}>
        {isLoadingLibrary ? 'Refreshing…' : 'Refresh'}
      </Button>
    </div>
  </section>
);
