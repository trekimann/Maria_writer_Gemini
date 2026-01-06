import React, { useState, useEffect } from 'react';
import styles from './CommentModal.module.scss';

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
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [replacementText, setReplacementText] = useState('');

  useEffect(() => {
    // Load saved author name from localStorage
    const savedAuthor = localStorage.getItem('maria-comment-author');
    if (savedAuthor) {
      setAuthor(savedAuthor);
    }
  }, []);

  const handleSave = () => {
    if (!author.trim() || !text.trim()) {
      alert('Please enter your name and comment.');
      return;
    }

    if (isSuggestion && !replacementText.trim()) {
      alert('Please enter replacement text for your suggestion.');
      return;
    }

    // Save author name to localStorage
    localStorage.setItem('maria-comment-author', author);

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
          <label htmlFor="author">Your Name</label>
          <input
            id="author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Enter your name"
            autoFocus
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
