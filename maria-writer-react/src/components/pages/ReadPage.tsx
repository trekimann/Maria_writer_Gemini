import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppPageLayout } from '../templates/AppPageLayout';
import { useAuth } from '../../context/AuthContext';
import { ReadPageBook } from './ReadPageBook';
import { ReadPageMenuBar } from './ReadPageMenuBar';
import { ReadPageReviewDrawer } from './ReadPageReviewDrawer';
import { ReadPageSidebar } from './ReadPageSidebar';
import {
  getReadPagePositionKey,
  loadReadPagePreferences,
  saveReadPagePreferences,
  type ReadPagePreferences,
} from './readPagePersistence';
import type { ReaderFontSize } from './useReaderPagination';
import { useReadPageLibrary } from './useReadPageLibrary';
import { useReadPageReviews } from './useReadPageReviews';
import styles from './ReadPage.module.scss';

export const ReadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [readerPreferences, setReaderPreferences] = useState<ReadPagePreferences>(loadReadPagePreferences);
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false);
  const chapterContentRef = useRef<HTMLDivElement>(null);

  const currentUserName = user?.displayName || user?.username || 'Your';
  const isSidebarCollapsed = readerPreferences.sidebarCollapsed;
  const fontSize: ReaderFontSize = readerPreferences.fontSize;

  const {
    chapters,
    goToRelativeChapter,
    handleSelectChapter,
    handleSelectProject,
    isLoadingLibrary,
    isLoadingProject,
    libraryError,
    libraryProjectCount,
    ownedProjects,
    previewHtml,
    projectError,
    refreshLibrary,
    selectedChapter,
    selectedChapterIndex,
    selectedLibraryProject,
    selectedProject,
    selectedProjectId,
    sharedProjects,
    updateChapterContent,
  } = useReadPageLibrary();

  const canComment = Boolean(selectedProject?.access?.canComment);
  const canApplySuggestions = Boolean(selectedProject?.access?.isOwner);

  const {
    applyingCommentId,
    clearSelectionState,
    handleApplySuggestion,
    handleChapterSelection,
    handleCreateReviewComment,
    isLoadingReviews,
    isSubmittingReview,
    isSuggestion,
    replacementText,
    reviewError,
    reviewText,
    selectedChapterComments,
    selectedSnippet,
    setIsSuggestion,
    setReplacementText,
    setReviewText,
  } = useReadPageReviews({
    canApplySuggestions,
    canComment,
    chapterContentRef,
    onOpenReviewDrawer: () => setIsReviewDrawerOpen(true),
    onSuggestionApplied: updateChapterContent,
    selectedChapter,
    selectedProjectId,
  });

  const handleProjectSelection = (projectId: string) => {
    handleSelectProject(projectId);
    setReaderPreferences((previous) => ({
      ...previous,
      sidebarCollapsed: true,
    }));
  };

  const pagePositionKey = useMemo(
    () => getReadPagePositionKey(selectedProjectId, selectedChapter?.id),
    [selectedChapter?.id, selectedProjectId],
  );

  const currentPageIndex = pagePositionKey
    ? readerPreferences.pagePositions[pagePositionKey] ?? 0
    : 0;

  useEffect(() => {
    saveReadPagePreferences(readerPreferences);
  }, [readerPreferences]);

  useEffect(() => {
    setReaderPreferences((previous) => {
      if (previous.lastLocation.projectId === selectedProjectId && previous.lastLocation.chapterId === (selectedChapter?.id ?? null)) {
        return previous;
      }

      return {
        ...previous,
        lastLocation: {
          projectId: selectedProjectId,
          chapterId: selectedChapter?.id ?? null,
        },
      };
    });
  }, [selectedChapter?.id, selectedProjectId]);

  const handleSidebarToggle = () => {
    setReaderPreferences((previous) => ({
      ...previous,
      sidebarCollapsed: !previous.sidebarCollapsed,
    }));
  };

  const handleFontSizeChange = (nextFontSize: ReaderFontSize) => {
    setReaderPreferences((previous) => ({
      ...previous,
      fontSize: nextFontSize,
    }));
  };

  const handlePageIndexChange = (pageIndex: number) => {
    if (!pagePositionKey) {
      return;
    }

    setReaderPreferences((previous) => {
      if (previous.pagePositions[pagePositionKey] === pageIndex) {
        return previous;
      }

      return {
        ...previous,
        pagePositions: {
          ...previous.pagePositions,
          [pagePositionKey]: pageIndex,
        },
      };
    });
  };

  return (
    <AppPageLayout
      menuBar={
        <ReadPageMenuBar
          selectedProject={selectedProject}
          selectedLibraryProject={selectedLibraryProject}
          selectedChapterTitle={selectedChapter?.title || (selectedChapterIndex >= 0 ? `Chapter ${selectedChapterIndex + 1}` : null)}
          selectedChapterIndex={selectedChapterIndex}
          chapterCount={chapters.length}
          isSidebarCollapsed={isSidebarCollapsed}
          isRefreshing={isLoadingLibrary}
          fontSize={fontSize}
          onToggleSidebar={handleSidebarToggle}
          onRefresh={refreshLibrary}
          onPreviousChapter={() => goToRelativeChapter(-1)}
          onNextChapter={() => goToRelativeChapter(1)}
          onFontSizeChange={handleFontSizeChange}
        />
      }
      contentClassName={styles.layoutShell}
      flushContent
    >
      <div className={styles.page}>
        <div className={styles.readerLayout}>
          <ReadPageSidebar
            isSidebarCollapsed={isSidebarCollapsed}
            libraryError={libraryError}
            isLoadingLibrary={isLoadingLibrary}
            libraryProjectCount={libraryProjectCount}
            ownedProjects={ownedProjects}
            sharedProjects={sharedProjects}
            selectedProjectId={selectedProjectId}
            selectedProject={selectedProject}
            isReviewDrawerOpen={isReviewDrawerOpen}
            reviewCount={selectedChapterComments.length}
            chapters={chapters}
            selectedChapterId={selectedChapter?.id}
            onSelectProject={handleProjectSelection}
            onSelectChapter={handleSelectChapter}
            onToggleReviews={() => setIsReviewDrawerOpen((current) => !current)}
            onOpenInvitations={() => navigate('/invitations')}
          />

          <section className={styles.readerStage}>
            {isLoadingProject && <p className={styles.info}>Loading selected project…</p>}
            {projectError && <p className={styles.error}>{projectError}</p>}

            {!isLoadingProject && !projectError && selectedLibraryProject && selectedProject && (
              <div className={styles.workspaceShell}>
                <ReadPageBook
                  previewHtml={previewHtml}
                  fontSize={fontSize}
                  currentPageIndex={currentPageIndex}
                  selectedChapterIndex={selectedChapterIndex}
                  chapters={chapters}
                  hasPreviousChapter={selectedChapterIndex > 0}
                  hasNextChapter={selectedChapterIndex >= 0 && selectedChapterIndex < chapters.length - 1}
                  chapterContentRef={chapterContentRef}
                  onPageIndexChange={handlePageIndexChange}
                  onPreviousChapter={() => goToRelativeChapter(-1)}
                  onNextChapter={() => goToRelativeChapter(1)}
                  onMouseUp={handleChapterSelection}
                />

                <ReadPageReviewDrawer
                  isOpen={isReviewDrawerOpen}
                  canComment={canComment}
                  canApplySuggestions={canApplySuggestions}
                  selectedChapter={selectedChapter}
                  selectedSnippet={selectedSnippet}
                  reviewText={reviewText}
                  replacementText={replacementText}
                  isSuggestion={isSuggestion}
                  isSubmittingReview={isSubmittingReview}
                  isLoadingReviews={isLoadingReviews}
                  reviewError={reviewError}
                  selectedChapterComments={selectedChapterComments}
                  applyingCommentId={applyingCommentId}
                  currentUserName={currentUserName}
                  onClose={() => setIsReviewDrawerOpen(false)}
                  onClearSelection={clearSelectionState}
                  onReviewTextChange={setReviewText}
                  onReplacementTextChange={setReplacementText}
                  onSuggestionChange={setIsSuggestion}
                  onCreateReviewComment={handleCreateReviewComment}
                  onApplySuggestion={handleApplySuggestion}
                />
              </div>
            )}

            {!isLoadingProject && !projectError && !selectedLibraryProject && (
              <div className={styles.readerEmptyState}>
                <h2>Select a project to start reading</h2>
                <p>Open the library sidebar, choose one of your stories or a shared project, and the reader will collapse the chrome around the manuscript.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppPageLayout>
  );
};