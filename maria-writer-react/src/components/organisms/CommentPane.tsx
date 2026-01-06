import React, { useState, useEffect } from 'react';
import { StoryComment } from '../../types';
import { Eye, EyeOff, Trash2, ChevronDown, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import styles from './CommentPane.module.scss';

interface CommentPaneProps {
  comments: StoryComment[];
  onHideComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onCommentClick: (commentId: string) => void;
  onPreviewSuggestion: (commentId: string) => void;
  onApplySuggestion: (commentId: string) => void;
  activeCommentId: string | null;
  isOpen?: boolean;
}

export const CommentPane: React.FC<CommentPaneProps> = ({
  comments,
  onHideComment,
  onDeleteComment,
  onCommentClick,
  onPreviewSuggestion,
  onApplySuggestion,
  activeCommentId,
  isOpen
}) => {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Sync with external isOpen prop when it changes
  useEffect(() => {
    if (isOpen !== undefined) {
      setIsCollapsed(!isOpen);
    }
  }, [isOpen]);

  // Auto-expand active comment
  useEffect(() => {
    if (activeCommentId && !expandedComments.has(activeCommentId)) {
      setExpandedComments(prev => new Set([...prev, activeCommentId]));
    }
  }, [activeCommentId]);

  const toggleExpanded = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  // Sort comments by timestamp (newest first)
  const sortedComments = [...comments].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className={`${styles.pane} ${isCollapsed ? styles.collapsed : ''}`}>
      <button 
        className={styles.collapseBtn} 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand comments' : 'Collapse comments'}
      >
        {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>
      {!isCollapsed && (
        <>
          <div className={styles.header}>
            <h3>Comments ({comments.length})</h3>
          </div>

          <div className={styles.commentList}>
        {sortedComments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No comments yet</p>
            <span>Select text and click the comment button to add one</span>
          </div>
        ) : (
          sortedComments.map((comment) => {
            const isExpanded = expandedComments.has(comment.id);
            const isActive = activeCommentId === comment.id;

            return (
              <div
                key={comment.id}
                className={`${styles.commentItem} ${isActive ? styles.active : ''} ${comment.isHidden ? styles.hidden : ''}`}
              >
                <div
                  className={styles.commentHeader}
                  onClick={() => {
                    toggleExpanded(comment.id);
                    onCommentClick(comment.id);
                  }}
                >
                  <div className={styles.commentMeta}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className={styles.author}>{comment.author}</span>
                    {comment.isSuggestion && (
                      <span className={styles.suggestionBadge}>Suggestion</span>
                    )}
                    {comment.isHidden && (
                      <span className={styles.hiddenBadge}>Hidden</span>
                    )}
                  </div>
                  <span className={styles.date}>
                    {new Date(comment.timestamp).toLocaleDateString()}
                  </span>
                </div>

                {isExpanded && (
                  <div className={styles.commentBody}>
                    <div className={styles.originalText}>
                      <strong>On text:</strong>
                      <p>"{comment.originalText}"</p>
                    </div>

                    <div className={styles.commentText}>
                      <strong>Comment:</strong>
                      <p>{comment.text}</p>
                    </div>

                    {comment.isSuggestion && comment.replacementText && (
                      <div className={styles.replacementText}>
                        <strong>Suggested replacement:</strong>
                        <p className={styles.replacement}>"{comment.replacementText}"</p>
                      </div>
                    )}

                    <div className={styles.commentActions}>
                      {comment.isSuggestion && comment.replacementText && (
                        <>
                          <button
                            className={`${styles.actionBtn} ${comment.isPreviewing ? styles.previewingBtn : styles.previewBtn}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewSuggestion(comment.id);
                            }}
                            title={comment.isPreviewing ? 'Hide preview' : 'Preview suggestion'}
                          >
                            <Eye size={14} />
                            <span>{comment.isPreviewing ? 'Previewing' : 'Preview'}</span>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.applyBtn}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Apply this suggestion permanently? This will replace the text and remove the comment.')) {
                                onApplySuggestion(comment.id);
                              }
                            }}
                            title="Apply suggestion permanently"
                          >
                            <Check size={14} />
                            <span>Apply</span>
                          </button>
                        </>
                      )}
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onHideComment(comment.id);
                        }}
                        title={comment.isHidden ? 'Show comment' : 'Hide comment'}
                      >
                        {comment.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span>{comment.isHidden ? 'Show' : 'Hide'}</span>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this comment?')) {
                            onDeleteComment(comment.id);
                          }
                        }}
                        title="Delete comment"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>

                    <div className={styles.timestamp}>
                      {new Date(comment.timestamp).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        </>
      )}
    </div>
  );
};
