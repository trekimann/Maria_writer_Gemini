import React from 'react';
import { Chapter } from '../../types';
import styles from './ChapterItem.module.scss';
import { FileText, Trash2, MoreVertical } from 'lucide-react';

interface ChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onSettings: (e: React.MouseEvent) => void;
}

export const ChapterItem: React.FC<ChapterItemProps> = ({ chapter, isActive, onClick, onDelete, onSettings }) => {
  return (
    <li 
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={styles.content}>
        <FileText size={14} className={styles.icon} />
        <span className={styles.title}>{chapter.title}</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onSettings} title="Chapter Settings">
          <MoreVertical size={12} />
        </button>
        <button className={styles.deleteBtn} onClick={onDelete} title="Delete Chapter">
          <Trash2 size={12} />
        </button>
      </div>
    </li>
  );
};
