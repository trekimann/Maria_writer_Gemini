import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '../atoms/Button';
import type { ProjectReviewComment } from '../../services/collaborationService';
import type { Chapter } from '../../types';
import styles from './ReadPage.module.scss';

type ReadPageReviewDrawerProps = {
  isOpen: boolean;
  canComment: boolean;
  canApplySuggestions: boolean;
  selectedChapter: Chapter | null;
  selectedSnippet: string;
  reviewText: string;
  replacementText: string;
  isSuggestion: boolean;
  isSubmittingReview: boolean;
  isLoadingReviews: boolean;
  reviewError: string | null;
  selectedChapterComments: ProjectReviewComment[];
  applyingCommentId: string | null;
  currentUserName: string;
  onClose: () => void;
  onClearSelection: () => void;
  onReviewTextChange: (value: string) => void;
  onReplacementTextChange: (value: string) => void;
  onSuggestionChange: (value: boolean) => void;
  onCreateReviewComment: () => void;
  onApplySuggestion: (comment: ProjectReviewComment) => void;
};

export const ReadPageReviewDrawer: React.FC<ReadPageReviewDrawerProps> = ({
  isOpen,
  canComment,
  canApplySuggestions,
  selectedChapter,
  selectedSnippet,
  reviewText,
  replacementText,
  isSuggestion,
  isSubmittingReview,
  isLoadingReviews,
  reviewError,
  selectedChapterComments,
  applyingCommentId,
  currentUserName,
  onClose,
  onClearSelection,
  onReviewTextChange,
  onReplacementTextChange,
  onSuggestionChange,
  onCreateReviewComment,
  onApplySuggestion,
}) => (
  <aside className={`${styles.reviewDrawer} ${isOpen ? styles.reviewDrawerOpen : ''}`}>
    <div className={styles.reviewDrawerHeader}>
      <div>
        <h3>Review comments</h3>
        <p className={styles.reviewHint}>
          {canComment
            ? 'Select text in the current page to add a comment or suggestion.'
            : 'Review notes appear here while you read.'}
        </p>
      </div>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </div>

    {selectedSnippet && canComment && selectedChapter && (
      <div className={styles.commentComposer}>
        <p className={styles.selectionLabel}>Selected text</p>
        <blockquote className={styles.selectionPreview}>{selectedSnippet}</blockquote>

        <label className={styles.field}>
          <span>{currentUserName} note</span>
          <textarea
            value={reviewText}
            onChange={(event) => onReviewTextChange(event.target.value)}
            rows={4}
            placeholder="What should the author notice here?"
          />
        </label>

        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={isSuggestion}
            onChange={(event) => onSuggestionChange(event.target.checked)}
          />
          <span>Make this a suggested text change</span>
        </label>

        {isSuggestion && (
          <label className={styles.field}>
            <span>Suggested replacement</span>
            <textarea
              value={replacementText}
              onChange={(event) => onReplacementTextChange(event.target.value)}
              rows={3}
              placeholder="Enter the replacement text"
            />
          </label>
        )}

        <div className={styles.composerActions}>
          <Button variant="secondary" onClick={onClearSelection}>
            Clear
          </Button>
          <Button
            variant="primary"
            icon={Check}
            onClick={onCreateReviewComment}
            disabled={isSubmittingReview || !reviewText.trim() || (isSuggestion && !replacementText.trim())}
          >
            {isSubmittingReview ? 'Saving…' : 'Add review note'}
          </Button>
        </div>
      </div>
    )}

    {reviewError && <p className={styles.error}>{reviewError}</p>}
    {isLoadingReviews && <p className={styles.info}>Loading review comments…</p>}
    {!isLoadingReviews && selectedChapterComments.length === 0 && (
      <p className={styles.sectionEmpty}>No review comments for this chapter yet.</p>
    )}

    <div className={styles.reviewList}>
      {selectedChapterComments.map((comment) => {
        const authorName = comment.author.displayName || comment.author.username || comment.author.email;

        return (
          <article key={comment.id} className={styles.reviewCard}>
            <div className={styles.reviewHeader}>
              <div>
                <strong>{authorName}</strong>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <span className={`${styles.reviewBadge} ${comment.status !== 'ACTIVE' ? styles.reviewBadgeResolved : ''}`}>
                {comment.isSuggestion ? 'Suggestion' : 'Comment'} · {comment.status.toLowerCase()}
              </span>
            </div>

            <div className={styles.reviewBody}>
              <p className={styles.reviewOriginalLabel}>On text</p>
              <blockquote className={styles.selectionPreview}>{comment.originalText}</blockquote>
              <p>{comment.text}</p>

              {comment.isSuggestion && comment.replacementText && (
                <div className={styles.suggestionBox}>
                  <p className={styles.reviewOriginalLabel}>Suggested replacement</p>
                  <blockquote className={styles.selectionPreview}>{comment.replacementText}</blockquote>
                </div>
              )}
            </div>

            {comment.isSuggestion && canApplySuggestions && comment.status === 'ACTIVE' && (
              <div className={styles.reviewActions}>
                <Button
                  variant="primary"
                  onClick={() => onApplySuggestion(comment)}
                  disabled={applyingCommentId === comment.id}
                >
                  {applyingCommentId === comment.id ? 'Applying…' : 'Accept suggestion'}
                </Button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  </aside>
);
