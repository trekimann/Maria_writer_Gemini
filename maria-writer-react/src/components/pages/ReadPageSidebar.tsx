import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Inbox, MessageSquare } from 'lucide-react';
import { Button } from '../atoms/Button';
import type { CloudProjectRecord } from '../../services/cloudStorage';
import type { SharedProjectSummary } from '../../services/collaborationService';
import type { Chapter } from '../../types';
import { getOwnerName, getRoleLabel } from './readPageUtils';
import styles from './ReadPage.module.scss';

type ReadPageSidebarProps = {
  isSidebarCollapsed: boolean;
  libraryError: string | null;
  isLoadingLibrary: boolean;
  libraryProjectCount: number;
  ownedProjects: Array<{ id: string; title: string; updatedAt: string }>;
  sharedProjects: SharedProjectSummary[];
  selectedProjectId: string | null;
  selectedProject: CloudProjectRecord | null;
  isReviewDrawerOpen: boolean;
  reviewCount: number;
  chapters: Chapter[];
  selectedChapterId?: string | null;
  onSelectProject: (projectId: string) => void;
  onSelectChapter: (chapterId: string) => void;
  onToggleReviews: () => void;
  onOpenInvitations: () => void;
};

export const ReadPageSidebar: React.FC<ReadPageSidebarProps> = ({
  isSidebarCollapsed,
  libraryError,
  isLoadingLibrary,
  libraryProjectCount,
  ownedProjects,
  sharedProjects,
  selectedProjectId,
  selectedProject,
  isReviewDrawerOpen,
  reviewCount,
  chapters,
  selectedChapterId,
  onSelectProject,
  onSelectChapter,
  onToggleReviews,
  onOpenInvitations,
}) => {
  const [isActionsOpen, setIsActionsOpen] = useState(true);
  const [isOwnedOpen, setIsOwnedOpen] = useState(true);
  const [isSharedOpen, setIsSharedOpen] = useState(true);
  const [isChaptersOpen, setIsChaptersOpen] = useState(true);

  const SectionToggle = ({
    title,
    isOpen,
    onToggle,
  }: {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <button type="button" className={styles.sectionToggle} onClick={onToggle}>
      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      <span className={styles.sectionTitle}>{title}</span>
    </button>
  );

  return (
    <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      {!isSidebarCollapsed && (
        <>
          {libraryError && <p className={styles.error}>{libraryError}</p>}
          {!libraryError && !isLoadingLibrary && libraryProjectCount === 0 && (
            <p className={styles.emptyState}>No readable projects yet. Save a project to your account or accept an invitation.</p>
          )}

          <div className={styles.sidebarSection}>
            <SectionToggle title="Reader actions" isOpen={isActionsOpen} onToggle={() => setIsActionsOpen((current) => !current)} />
            {isActionsOpen && (
              <div className={styles.sidebarActions}>
                <Button variant="secondary" size="sm" icon={MessageSquare} onClick={onToggleReviews}>
                  {isReviewDrawerOpen ? 'Hide Reviews' : `Reviews${reviewCount > 0 ? ` (${reviewCount})` : ''}`}
                </Button>
                <Button variant="secondary" size="sm" icon={Inbox} onClick={onOpenInvitations}>
                  Invitations
                </Button>
              </div>
            )}
          </div>

          <div className={styles.sidebarSection}>
            <SectionToggle title="Your stories" isOpen={isOwnedOpen} onToggle={() => setIsOwnedOpen((current) => !current)} />
            {isOwnedOpen && (
              <>
                {ownedProjects.length === 0 ? (
                  <p className={styles.sectionEmpty}>No owned projects yet.</p>
                ) : ownedProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={`${styles.projectButton} ${selectedProjectId === project.id ? styles.projectButtonActive : ''}`}
                    onClick={() => onSelectProject(project.id)}
                  >
                    <div>
                      <strong>{project.title}</strong>
                      <span>Updated {new Date(project.updatedAt).toLocaleString()}</span>
                    </div>
                    <span className={styles.ownedBadge}>Owner</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className={styles.sidebarSection}>
            <SectionToggle title="Shared with you" isOpen={isSharedOpen} onToggle={() => setIsSharedOpen((current) => !current)} />
            {isSharedOpen && (
              <>
                {sharedProjects.length === 0 ? (
                  <p className={styles.sectionEmpty}>No shared projects yet.</p>
                ) : sharedProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={`${styles.projectButton} ${selectedProjectId === project.id ? styles.projectButtonActive : ''}`}
                    onClick={() => onSelectProject(project.id)}
                  >
                    <div>
                      <strong>{project.title}</strong>
                      <span>From {getOwnerName({ ...project, source: 'shared' })}</span>
                    </div>
                    <span className={styles.sharedBadge}>{getRoleLabel(project.collaborator.role)}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          {selectedProject && (
            <div className={styles.sidebarSection}>
              <SectionToggle title="Chapters" isOpen={isChaptersOpen} onToggle={() => setIsChaptersOpen((current) => !current)} />
              {isChaptersOpen && (
                <>
                  {chapters.length === 0 ? (
                    <p className={styles.sectionEmpty}>This project has no chapters yet.</p>
                  ) : chapters.map((chapter, index) => (
                    <button
                      key={chapter.id}
                      type="button"
                      className={`${styles.chapterButton} ${selectedChapterId === chapter.id ? styles.chapterButtonActive : ''}`}
                      onClick={() => onSelectChapter(chapter.id)}
                    >
                      <span className={styles.chapterNumber}>{index + 1}</span>
                      <span>{chapter.title || `Chapter ${index + 1}`}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
};
