import React from 'react';
import { PanelLeftClose, PanelLeftOpen, RefreshCw } from 'lucide-react';
import { Button } from '../atoms/Button';
import { HelpButton } from '../atoms/HelpButton';
import type { CloudProjectRecord } from '../../services/cloudStorage';
import type { LibraryProject } from './readPageUtils';
import { getOwnerName, getRoleLabel } from './readPageUtils';
import type { ReaderFontSize } from './useReaderPagination';
import styles from './ReadPage.module.scss';

type ReadPageMenuBarProps = {
  selectedProject: CloudProjectRecord | null;
  selectedLibraryProject: LibraryProject | null;
  selectedChapterTitle: string | null;
  selectedChapterIndex: number;
  chapterCount: number;
  isSidebarCollapsed: boolean;
  isRefreshing: boolean;
  fontSize: ReaderFontSize;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  onFontSizeChange: (fontSize: ReaderFontSize) => void;
};

export const ReadPageMenuBar: React.FC<ReadPageMenuBarProps> = ({
  selectedProject,
  selectedLibraryProject,
  selectedChapterTitle,
  selectedChapterIndex,
  chapterCount,
  isSidebarCollapsed,
  isRefreshing,
  fontSize,
  onToggleSidebar,
  onRefresh,
  onPreviousChapter,
  onNextChapter,
  onFontSizeChange,
}) => (
  <div className={styles.menuBarInner}>
    <div className={styles.menuBarLeft}>
      <Button
        variant="ghost"
        size="sm"
        icon={isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose}
        onClick={onToggleSidebar}
        title={isSidebarCollapsed ? 'Show library' : 'Hide library'}
      />

      <div className={styles.menuDivider} />

      <div className={styles.menuProjectMeta}>
        <strong>{selectedProject?.data.meta.title || selectedLibraryProject?.title || 'Reader'}</strong>
        <span>
          {selectedLibraryProject
            ? `${selectedLibraryProject.source === 'owned' ? 'Your project' : `Shared by ${getOwnerName(selectedLibraryProject)}`} · ${getRoleLabel(selectedProject?.access?.role)}`
            : 'Choose a project from the library'}
        </span>
      </div>
    </div>

    <div className={styles.menuBarCenter}>
      {selectedChapterTitle && (
        <div className={styles.menuChapterMeta}>
          <span className={styles.menuChapterEyebrow}>Chapter {selectedChapterIndex + 1}</span>
          <strong>{selectedChapterTitle}</strong>
        </div>
      )}

      <div className={styles.chapterJump}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onPreviousChapter}
          disabled={selectedChapterIndex <= 0}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onNextChapter}
          disabled={selectedChapterIndex < 0 || selectedChapterIndex >= chapterCount - 1}
        >
          Next
        </Button>
      </div>
    </div>

    <div className={styles.menuBarRight}>
      <div className={styles.fontSizeControls} role="group" aria-label="Reader font size">
        <Button
          variant={fontSize === 'small' ? 'secondary' : 'ghost'}
          size="sm"
          className={fontSize === 'small' ? styles.fontSizeButtonActive : undefined}
          aria-pressed={fontSize === 'small'}
          onClick={() => onFontSizeChange('small')}
          title="Small text"
        >
          Small
        </Button>
        <Button
          variant={fontSize === 'medium' ? 'secondary' : 'ghost'}
          size="sm"
          className={fontSize === 'medium' ? styles.fontSizeButtonActive : undefined}
          aria-pressed={fontSize === 'medium'}
          onClick={() => onFontSizeChange('medium')}
          title="Medium text"
        >
          Medium
        </Button>
        <Button
          variant={fontSize === 'large' ? 'secondary' : 'ghost'}
          size="sm"
          className={fontSize === 'large' ? styles.fontSizeButtonActive : undefined}
          aria-pressed={fontSize === 'large'}
          onClick={() => onFontSizeChange('large')}
          title="Large text"
        >
          Large
        </Button>
      </div>
      <HelpButton helpId="reader-library" />
      <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRefresh} disabled={isRefreshing} title="Refresh library" />
    </div>
  </div>
);
