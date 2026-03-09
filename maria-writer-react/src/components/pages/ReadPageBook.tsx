import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../atoms/Button';
import type { Chapter } from '../../types';
import { getReaderFontSizeValue, type ReaderFontSize, useReaderPagination } from './useReaderPagination';
import styles from './ReadPage.module.scss';

type ReadPageBookProps = {
  previewHtml: string;
  fontSize: ReaderFontSize;
  currentPageIndex: number;
  selectedChapterIndex: number;
  chapters: Chapter[];
  hasPreviousChapter: boolean;
  hasNextChapter: boolean;
  chapterContentRef: React.RefObject<HTMLDivElement>;
  onPageIndexChange: (pageIndex: number) => void;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  onMouseUp: () => void;
};

export const ReadPageBook: React.FC<ReadPageBookProps> = ({
  previewHtml,
  fontSize,
  currentPageIndex,
  selectedChapterIndex,
  chapters,
  hasPreviousChapter,
  hasNextChapter,
  chapterContentRef,
  onPageIndexChange,
  onPreviousChapter,
  onNextChapter,
  onMouseUp,
}) => {
  const {
    isLandscape,
    maxPageIndex,
    pageStep,
    totalPages,
    visiblePages,
  } = useReaderPagination({
    html: previewHtml,
    fontSize,
    chapterContentRef,
    pageIndex: currentPageIndex,
    onPageIndexChange,
  });

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      onPageIndexChange(Math.max(0, currentPageIndex - pageStep));
      return;
    }

    onPreviousChapter();
  };

  const handleNextPage = () => {
    if (currentPageIndex < maxPageIndex) {
      onPageIndexChange(Math.min(maxPageIndex, currentPageIndex + pageStep));
      return;
    }

    onNextChapter();
  };

  return (
    <div className={styles.readerShell}>
      <div className={styles.readerViewport}>
        <div
          ref={chapterContentRef}
          className={`${styles.readerDocument} ${isLandscape ? styles.readerDocumentLandscape : styles.readerDocumentPortrait}`}
          style={{ '--reader-font-size': getReaderFontSizeValue(fontSize) } as React.CSSProperties}
          onMouseUp={onMouseUp}
        >
          {visiblePages.map((pageHtml, index) => (
            <article key={`${currentPageIndex}-${index}`} className={styles.readerPage}>
              <div className={styles.readerPageInner} dangerouslySetInnerHTML={{ __html: pageHtml }} />
            </article>
          ))}
          {isLandscape && visiblePages.length === 1 && <article className={`${styles.readerPage} ${styles.readerPagePlaceholder}`} />}
        </div>

        <div className={styles.readerFooter}>
          <div className={styles.readerStats}>
            <span>Chapter {Math.max(selectedChapterIndex + 1, 0)} of {chapters.length}</span>
            <span>
              {isLandscape
                ? `Pages ${currentPageIndex + 1}${visiblePages[1] ? `-${currentPageIndex + 2}` : ''} of ${totalPages}`
                : `Page ${currentPageIndex + 1} of ${totalPages}`}
            </span>
          </div>

          <div className={styles.chapterJump}>
            <Button
              variant="secondary"
              icon={ChevronLeft}
              onClick={handlePreviousPage}
              disabled={currentPageIndex <= 0 && !hasPreviousChapter}
            >
              {currentPageIndex <= 0 ? 'Previous chapter' : 'Previous page'}
            </Button>
            <Button
              variant="secondary"
              icon={ChevronRight}
              onClick={handleNextPage}
              disabled={currentPageIndex >= maxPageIndex && !hasNextChapter}
            >
              {currentPageIndex >= maxPageIndex ? 'Next chapter' : 'Next page'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
