import React, { useState, useEffect } from 'react';
import styles from './CommentModal.module.scss';
import { useAuth } from '../../context/AuthContext';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    author: string;
    text: string;
    isSuggestion: boolean;
    replacementText?: string;
  }) => void;
  position: { x: number; y: number };
  selectedText: string;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedText
}) => {
  const { user, isAuthenticated } = useAuth();
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [replacementText, setReplacementText] = useState('');

  // Derive profile name: prefer displayName, fall back to username
  const profileName = isAuthenticated && user
    ? (user.displayName ?? user.username)
    : null;

  useEffect(() => {
    if (profileName) {
      setAuthor(profileName);
    } else {
      // Guest: restore previously typed name from localStorage
      const savedAuthor = localStorage.getItem('maria-comment-author');
      if (savedAuthor) setAuthor(savedAuthor);
    }
  }, [profileName]);

  const handleSave = () => {
    if (!author.trim() || !text.trim()) {
      alert('Please enter your name and comment.');
      return;
    }

    if (isSuggestion && !replacementText.trim()) {
      alert('Please enter replacement text for your suggestion.');
      return;
    }

    // Only persist the name for guests — authenticated users get it from profile
    if (!isAuthenticated) {
      localStorage.setItem('maria-comment-author', author);
    }

    onSave({
      author: author.trim(),
      text: text.trim(),
      isSuggestion,
      replacementText: isSuggestion ? replacementText.trim() : undefined
    });

    // Reset form
    setText('');
    setIsSuggestion(false);
    setReplacementText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        data-testid="comment-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h3>Add Comment</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.selectedText}>
          <strong>Selected text:</strong>
          <p>"{selectedText}"</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="author">
            Your Name
            {isAuthenticated && (
              <span className={styles.profileHint}> · from your profile</span>
            )}
          </label>
          <input
            id="author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Enter your name"
            autoFocus
            readOnly={isAuthenticated}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="comment">Comment</label>
          <textarea
            id="comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your comment..."
            rows={4}
          />
        </div>

        <div className={styles.checkboxGroup}>
          <label>
            <input
              type="checkbox"
              checked={isSuggestion}
              onChange={(e) => setIsSuggestion(e.target.checked)}
            />
            <span>This is a suggestion</span>
          </label>
        </div>

        {isSuggestion && (
          <div className={styles.formGroup}>
            <label htmlFor="replacement">Replacement Text</label>
            <textarea
              id="replacement"
              value={replacementText}
              onChange={(e) => setReplacementText(e.target.value)}
              placeholder="Enter suggested replacement text..."
              rows={3}
            />
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>Add Comment</button>
        </div>
      </div>
    </div>
  );
};
