import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import styles from './Editor.module.scss';

export const Editor: React.FC = () => {
  const { state, dispatch } = useStore();
  const [content, setContent] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeChapter = state.chapters.find(c => c.id === state.activeChapterId);

  useEffect(() => {
    if (activeChapter) {
      setContent(activeChapter.content);
    }
  }, [activeChapter?.id]);

  useEffect(() => {
    const handleFormat = (e: CustomEvent) => {
      if (state.viewMode !== 'edit' || !textareaRef.current || !activeChapter) return;
      
      const { format } = e.detail;
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const selected = text.substring(start, end);
      const after = text.substring(end);

      let newText = text;

      if (format === 'bold') {
        newText = `${before}**${selected}**${after}`;
      } else if (format === 'italic') {
        newText = `${before}*${selected}*${after}`;
      } else if (format === 'underline') {
        newText = `${before}__${selected}__${after}`;
      } else if (format === 'comment') {
        if (start === end) {
          alert("Select text to comment on.");
          return;
        }
        const commentText = prompt("Enter comment:");
        if (commentText) {
          const cid = uuidv4();
          dispatch({ type: 'ADD_COMMENT', payload: { id: cid, text: commentText, timestamp: Date.now() } });
          newText = `${before}<span class="maria-comment" data-comment-id="${cid}">${selected}</span>${after}`;
        } else {
          return;
        }
      }

      if (newText !== text) {
        setContent(newText);
        dispatch({
            type: 'UPDATE_CHAPTER',
            payload: { id: activeChapter.id, updates: { content: newText } }
        });
        
        setTimeout(() => {
            if(textareaRef.current) {
                textareaRef.current.focus();
            }
        }, 0);
      }
    };

    window.addEventListener('maria-editor-format', handleFormat as EventListener);
    return () => window.removeEventListener('maria-editor-format', handleFormat as EventListener);
  }, [state.viewMode, activeChapter, content, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (activeChapter) {
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });
    }
  };

  const getMarkdownHtml = () => {
    if (!content) return '';
    const rawHtml = marked.parse(content) as string;
    return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['span'],
        ADD_ATTR: ['class', 'data-comment-id']
    });
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const commentSpan = target.closest('.maria-comment') as HTMLElement;
    if (commentSpan) {
      const cid = commentSpan.dataset.commentId;
      if (cid) setActiveCommentId(cid);
    } else {
      setActiveCommentId(null);
    }
  };

  if (!activeChapter) {
    return <div className={styles.emptyState}>Select a chapter to start writing.</div>;
  }

  const activeComment = activeCommentId ? state.comments[activeCommentId] : null;

  return (
    <div className={styles.editorContainer}>
      {state.viewMode === 'edit' ? (
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={content}
          onChange={handleChange}
          placeholder="Start writing your masterpiece..."
          spellCheck={false}
        />
      ) : (
        <div className={styles.previewContainer}>
          <div 
            className={styles.preview}
            dangerouslySetInnerHTML={{ __html: getMarkdownHtml() }}
            onClick={handlePreviewClick}
          />
          {activeComment && (
            <div className={styles.commentPanel}>
              <div className={styles.commentBox}>
                <p className={styles.commentText}>{activeComment.text}</p>
                <p className={styles.commentDate}>{new Date(activeComment.timestamp).toLocaleString()}</p>
                <button className={styles.closeComment} onClick={() => setActiveCommentId(null)}>&times;</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
