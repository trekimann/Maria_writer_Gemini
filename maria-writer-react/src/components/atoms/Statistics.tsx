import React from 'react';
import styles from './Statistics.module.scss';

interface StatisticsProps {
  wordCount: number;
  characterCount: number;
  readingTime: string;
}

export const Statistics: React.FC<StatisticsProps> = ({
  wordCount,
  characterCount,
  readingTime
}) => {
  return (
    <div className={styles.statisticsContainer}>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>Words</span>
        <span className={styles.statValue}>{wordCount.toLocaleString()}</span>
      </div>
      <div className={styles.divider}></div>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>Characters</span>
        <span className={styles.statValue}>{characterCount.toLocaleString()}</span>
      </div>
      <div className={styles.divider}></div>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>Read Time</span>
        <span className={styles.statValue}>{readingTime}</span>
      </div>
    </div>
  );
};
