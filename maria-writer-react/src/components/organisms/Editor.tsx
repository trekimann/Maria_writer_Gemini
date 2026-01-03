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
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const activeChapter = state.chapters.find(c => c.id === state.activeChapterId);

  useEffect(() => {
    if (activeChapter) {
      setContent(activeChapter.content);
    }
  }, [activeChapter?.id]);

  // Separate effect to update contenteditable div when switching to write mode or content changes
  useEffect(() => {
    if (contentEditableRef.current && state.viewMode === 'write' && activeChapter) {
      // Only update the HTML if switching modes or if content changed externally
      const html = getMarkdownHtml();
      const currentHTML = contentEditableRef.current.innerHTML;
      
      // Check if we need to update (avoid updating during typing)
      if (currentHTML !== html && content === activeChapter.content) {
        contentEditableRef.current.innerHTML = html;
      }
    }
  }, [state.viewMode, activeChapter?.id]);

  useEffect(() => {
    const handleFormat = (e: CustomEvent) => {
      if (!activeChapter) return;
      
      const { format } = e.detail;

      // Handle formatting for source mode (textarea)
      if (state.viewMode === 'source' && textareaRef.current) {
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
        } else if (format.startsWith('heading')) {
          const level = format.replace('heading', '');
          const hashes = '#'.repeat(parseInt(level));
          newText = `${before}${hashes} ${selected}${after}`;
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
      }

      // Handle formatting for write mode (contenteditable)
      if (state.viewMode === 'write' && contentEditableRef.current) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        if (format === 'bold') {
          document.execCommand('bold', false);
        } else if (format === 'italic') {
          document.execCommand('italic', false);
        } else if (format === 'underline') {
          document.execCommand('underline', false);
        } else if (format.startsWith('heading')) {
          const level = format.replace('heading', '');
          document.execCommand('formatBlock', false, `h${level}`);
        } else if (format === 'paragraph') {
          document.execCommand('formatBlock', false, 'p');
        } else if (format === 'comment') {
          if (selection.isCollapsed) {
            alert("Select text to comment on.");
            return;
          }
          const commentText = prompt("Enter comment:");
          if (commentText) {
            const cid = uuidv4();
            dispatch({ type: 'ADD_COMMENT', payload: { id: cid, text: commentText, timestamp: Date.now() } });
            
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.className = 'maria-comment';
            span.setAttribute('data-comment-id', cid);
            range.surroundContents(span);
            
            // Sync the updated HTML back to content
            if (contentEditableRef.current) {
              const newContent = contentEditableRef.current.innerHTML;
              setContent(newContent);
              dispatch({
                type: 'UPDATE_CHAPTER',
                payload: { id: activeChapter.id, updates: { content: newContent } }
              });
            }
          }
        }
      }

      // Handle commenting in preview mode
      if (state.viewMode === 'preview' && format === 'comment') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          alert("Select text to comment on.");
          return;
        }

        const commentText = prompt("Enter comment:");
        if (commentText) {
          const cid = uuidv4();
          dispatch({ type: 'ADD_COMMENT', payload: { id: cid, text: commentText, timestamp: Date.now() } });
          
          // Get the selected text
          const selectedText = selection.toString();
          
          // Find the text in the content and wrap it
          const commentSpan = `<span class="maria-comment" data-comment-id="${cid}">${selectedText}</span>`;
          
          // Update content by finding and replacing the first occurrence
          const newContent = content.replace(selectedText, commentSpan);
          setContent(newContent);
          dispatch({
            type: 'UPDATE_CHAPTER',
            payload: { id: activeChapter.id, updates: { content: newContent } }
          });
        }
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

  const handleContentEditableInput = () => {
    if (contentEditableRef.current && activeChapter) {
      const html = contentEditableRef.current.innerHTML;
      // Convert HTML back to markdown-ish content
      // For now, we'll store the HTML as-is, but we could add html-to-markdown conversion
      const newContent = html;
      setContent(newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });
    }
  };

  const getMarkdownHtml = () => {
    if (!content) return '';
    
    // Check if content already contains HTML (like comment spans)
    // If it does, we should preserve it rather than re-parsing as markdown
    const hasHtmlTags = /<[^>]+>/.test(content);
    
    if (hasHtmlTags) {
      // Content already has HTML, just sanitize it
      return DOMPurify.sanitize(content, {
        ADD_TAGS: ['span', 'h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'u', 'b', 'i', 'blockquote', 'ul', 'ol', 'li'],
        ADD_ATTR: ['class', 'data-comment-id']
      });
    } else {
      // Content is pure markdown, parse it
      const rawHtml = marked.parse(content) as string;
      return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['span'],
        ADD_ATTR: ['class', 'data-comment-id']
      });
    }
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

  const handleWriteModeClick = (e: React.MouseEvent) => {
    // In write mode, also handle comment clicks
    handlePreviewClick(e);
  };

  if (!activeChapter) {
    return <div className={styles.emptyState}>Select a chapter to start writing.</div>;
  }

  const activeComment = activeCommentId ? state.comments[activeCommentId] : null;

  return (
    <div className={styles.editorContainer}>
      {state.viewMode === 'source' ? (
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={content}
          onChange={handleChange}
          placeholder="Start writing your masterpiece..."
          spellCheck={false}
        />
      ) : state.viewMode === 'write' ? (
        <div className={styles.previewContainer}>
          <div 
            ref={contentEditableRef}
            className={`${styles.preview} ${styles.editable}`}
            contentEditable={true}
            onInput={handleContentEditableInput}
            onClick={handleWriteModeClick}
            suppressContentEditableWarning={true}
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
