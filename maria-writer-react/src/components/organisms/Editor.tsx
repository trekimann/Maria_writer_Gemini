import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { v4 as uuidv4 } from 'uuid';
import { Plus } from 'lucide-react';
import { Character } from '../../types';
import { CommentModal } from '../molecules/CommentModal';
import { CommentPane } from './CommentPane';
import { extractMentionedCharacterIds } from '../../utils/mention';
import {
  createTurndownService,
  htmlToMarkdown,
  markdownToHtml,
  extractTitleFromMarkdown
} from '../../utils/editorMarkdown';
import { Statistics } from '../atoms/Statistics';
import {
  extractCleanText,
  calculateWordCount,
  calculateCharacterCount,
  formatReadingTime
} from '../../utils/statistics';
import {
  createCommentMarkup,
  removeCommentMarkup,
  replaceCommentText,
  applySuggestionToContent,
  updateCommentElementClasses,
  hasOverlappingComments,
  unwrapCommentElement,
  wrapSelectionWithComment,
  updateCommentElementId
} from '../../utils/editorComments';
import {
  createMentionMarkup,
  filterCharactersByQuery,
  detectMentionInTextarea,
  detectMentionInContentEditable,
  insertMentionInTextarea,
  insertMentionInContentEditable,
  getTextareaMentionPosition,
  getContentEditableMentionPosition
} from '../../utils/editorMentions';
import {
  applyTextareaFormatting,
  applyContentEditableFormatting
} from '../../utils/editorFormatting';
import {
  performCopy,
  getAutoTaggedHtml,
  getPasteData
} from '../../utils/editorContextMenu';
import styles from './Editor.module.scss';

// Initialize Turndown once
const turndownService = createTurndownService();

export const Editor: React.FC = () => {
  const { state, dispatch } = useStore();
  const activeChapter = state.chapters.find(c => c.id === state.activeChapterId);
  const [content, setContent] = useState(activeChapter?.content || '');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentModalPosition, setCommentModalPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isCommentPaneOpen, setIsCommentPaneOpen] = useState(false);
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  
  // Statistics state
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [readingTime, setReadingTime] = useState('Less than 1 min');
  
  // Character tagging state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ x: number; y: number } | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1); // for textarea
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const lastStoreContent = useRef(activeChapter?.content || '');

  // Get comments for the active chapter
  const chapterComments = activeChapter?.commentIds
    ?.map(id => state.comments[id])
    .filter(Boolean) || [];

  // Update local content when store changes EXTERNALLY (e.g. metadata modal)
  useEffect(() => {
    if (activeChapter && activeChapter.content !== lastStoreContent.current) {
      console.log('[Sync] External change detected, updating local state');
      setContent(activeChapter.content);
      lastStoreContent.current = activeChapter.content;
      
      // If in write mode, also refresh the DOM
      if (state.viewMode === 'write' && contentEditableRef.current) {
        const html = getMarkdownHtml(activeChapter.content);
        if (contentEditableRef.current.innerHTML !== html) {
          contentEditableRef.current.innerHTML = html;
        }
      }
    }
  }, [activeChapter?.content]);

  // Handle mode switches and initialization
  useEffect(() => {
    if (contentEditableRef.current && state.viewMode === 'write' && activeChapter) {
      const html = getMarkdownHtml(content);
      const currentHTML = contentEditableRef.current.innerHTML;
      
      // Update the HTML if switching to write mode or if DOM is empty
      if (currentHTML === '' || currentHTML === '<p><br></p>') {
        contentEditableRef.current.innerHTML = html;
      }
    }
  }, [state.viewMode, activeChapter?.id]);

  // Update statistics whenever content changes
  useEffect(() => {
    const cleanText = extractCleanText(content);
    const newWordCount = calculateWordCount(cleanText);
    const newCharacterCount = calculateCharacterCount(cleanText);
    const newReadingTime = formatReadingTime(newWordCount);

    setWordCount(newWordCount);
    setCharacterCount(newCharacterCount);
    setReadingTime(newReadingTime);
  }, [content]);

  // Helper to sync local content to store
  const syncStoreContent = (newMarkdown: string) => {
    if (!activeChapter) return;
    setContent(newMarkdown);
    lastStoreContent.current = newMarkdown;
    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { id: activeChapter.id, updates: { content: newMarkdown } }
    });
  };

  // Debounced automation: Sync first line H1 and mentioned characters to chapter metadata
  useEffect(() => {
    if (!activeChapter) return;
    
    const timeoutId = setTimeout(() => {
      const updates: any = {};
      
      // 1. Sync Title from H1
      const h1Title = extractTitleFromMarkdown(content);
      if (h1Title && h1Title !== activeChapter.title) {
        updates.title = h1Title;
      }

      // 2. Sync Mentioned Characters from content tags
      const currentMentionedIds = extractMentionedCharacterIds(content);
      const existingMentionedIds = activeChapter.mentionedCharacters || [];
      
      // Check if they are different (order doesn't matter for sync, but we'll sort for consistency)
      const sortedCurrent = [...currentMentionedIds].sort();
      const sortedExisting = [...existingMentionedIds].sort();
      
      if (JSON.stringify(sortedCurrent) !== JSON.stringify(sortedExisting)) {
        updates.mentionedCharacters = currentMentionedIds;
      }

      if (Object.keys(updates).length > 0) {
        dispatch({
          type: 'UPDATE_CHAPTER',
          payload: { id: activeChapter.id, updates }
        });
      }
    }, 1500); // 1.5s cooldown to avoid jumping while typing

    return () => clearTimeout(timeoutId);
  }, [content, activeChapter?.id, activeChapter?.title, activeChapter?.mentionedCharacters, dispatch]);

  // Update CSS classes on comment elements based on active state and applied suggestions
  useEffect(() => {
    updateCommentElementClasses(chapterComments, activeCommentId);
  }, [activeCommentId, chapterComments, content]);

  useEffect(() => {
    const handleFormat = (e: CustomEvent) => {
      if (!activeChapter) return;
      
      const { format } = e.detail;

      // Handle comment format - open modal
      if (format === 'comment') {
        let selection: Selection | null = null;
        let selText = '';
        const tempCommentId = uuidv4(); // Generate ID upfront
        
        if (state.viewMode === 'source' && textareaRef.current) {
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          if (start === end) {
            alert("Select text to comment on.");
            return;
          }
          selText = textareaRef.current.value.substring(start, end);
          
          // Check if selection overlaps with existing comment tags
          const textContent = textareaRef.current.value;
          const selectedPortion = textContent.substring(start, end);
          if (hasOverlappingComments(selectedPortion)) {
            alert("Cannot add a comment to text that is already commented. Please select text without existing comments.");
            return;
          }
        } else if (state.viewMode === 'write' && contentEditableRef.current) {
          selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            alert("Select text to comment on.");
            return;
          }
          selText = selection.toString();
          
          // Check if selection contains existing comment elements
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const fragment = range.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(fragment);
            
            if (tempDiv.querySelector('u[data-comment-id]')) {
              alert("Cannot add a comment to text that is already commented. Please select text without existing comments.");
              return;
            }
          }
          
          // Wrap selection immediately to preserve position
          if (selection.rangeCount > 0) {
            const wrapped = wrapSelectionWithComment(selection, tempCommentId, true);
            if (!wrapped) {
              alert("Cannot add a comment to text that is already commented. Please select text without existing comments.");
              return;
            }
            console.log('[Comment] Wrapped selection immediately with temp ID:', tempCommentId);
            setPendingCommentId(tempCommentId);
          }
        } else {
          // Preview mode
          selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            alert("Select text to comment on.");
            return;
          }
          selText = selection.toString();
        }

        setSelectedText(selText);
        
        // Get mouse position for modal
        const mouseX = (e as any).clientX || window.innerWidth / 2;
        const mouseY = (e as any).clientY || window.innerHeight / 2;
        setCommentModalPosition({ x: mouseX, y: mouseY });
        setShowCommentModal(true);
        return;
      }

      // Handle formatting for source mode (textarea)
      if (state.viewMode === 'source' && textareaRef.current) {
        const result = applyTextareaFormatting(textareaRef.current, format);

        if (result.success) {
          setContent(result.newContent);
          dispatch({
              type: 'UPDATE_CHAPTER',
              payload: { id: activeChapter.id, updates: { content: result.newContent } }
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
        if (applyContentEditableFormatting(format)) {
          // Update state after formatting
          handleContentEditableInput();
        }
      }
    };

    window.addEventListener('maria-editor-format', handleFormat as EventListener);
    return () => window.removeEventListener('maria-editor-format', handleFormat as EventListener);
  }, [state.viewMode, activeChapter, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    lastStoreContent.current = newContent; // Mark as local sync
    if (activeChapter) {
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });
    }

    // Handle @ mentions for source mode
    const cursor = e.target.selectionStart;
    const mentionData = detectMentionInTextarea(newContent, cursor);
    
    if (mentionData) {
      setMentionQuery(mentionData.query);
      setMentionStartIndex(mentionData.startIndex);
      setMentionPosition(getTextareaMentionPosition(e.target));
    } else {
      setMentionQuery(null);
    }
  };

  const handleContentEditableInput = () => {
    if (contentEditableRef.current && activeChapter) {
      const html = contentEditableRef.current.innerHTML;
      // Convert HTML back to markdown
      const newContent = htmlToMarkdown(html, turndownService);
      setContent(newContent);
      lastStoreContent.current = newContent; // Mark as local sync
      
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });

      // Handle @ mentions for write mode
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const mentionData = detectMentionInContentEditable(selection);
        
        if (mentionData) {
          setMentionQuery(mentionData.query);
          setMentionPosition(getContentEditableMentionPosition(mentionData.range));
        } else {
          setMentionQuery(null);
        }
      }
    }
  };

  const handleSaveComment = (commentData: {
    author: string;
    text: string;
    isSuggestion: boolean;
    replacementText?: string;
  }) => {
    console.log('[Comment] handleSaveComment called', { 
      commentData, 
      viewMode: state.viewMode, 
      selectedText,
      activeChapter: activeChapter?.id 
    });
    if (!activeChapter) return;

    const commentId = uuidv4();
    const comment = {
      id: commentId,
      author: commentData.author,
      text: commentData.text,
      timestamp: Date.now(),
      isSuggestion: commentData.isSuggestion,
      replacementText: commentData.replacementText,
      isPreviewing: false,
      isHidden: false,
      originalText: selectedText
    };

    console.log('[Comment] Created comment object', comment);

    // Add comment to store
    dispatch({
      type: 'ADD_COMMENT',
      payload: { chapterId: activeChapter.id, comment }
    });
    console.log('[Comment] Dispatched ADD_COMMENT');

    // Insert comment markup into content based on mode
    if (state.viewMode === 'source' && textareaRef.current) {
      console.log('[Comment] Source mode - inserting markup');
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const commentMarkup = createCommentMarkup(commentId, selectedText);
      const newText = before + commentMarkup + after;
      console.log('[Comment] New content length:', newText.length, 'Markup:', commentMarkup);
      
      setContent(newText);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newText } }
      });
      console.log('[Comment] Source mode - content updated');
    } else if (state.viewMode === 'write' && contentEditableRef.current) {
      console.log('[Comment] Write mode - updating existing wrapper or creating new');
      
      if (pendingCommentId) {
        // We already wrapped it when opening modal, just update the ID
        console.log('[Comment] Found pending wrapper, updating ID from', pendingCommentId, 'to', commentId);
        updateCommentElementId(contentEditableRef.current, pendingCommentId, commentId);
        setPendingCommentId(null);
        console.log('[Comment] Updated pending element to permanent');
      } else {
        // Fallback: do string replacement (shouldn't normally happen)
        console.log('[Comment] No pending element, doing string replacement');
        const currentHTML = contentEditableRef.current.innerHTML;
        const commentMarkup = createCommentMarkup(commentId, selectedText);
        const newContent = currentHTML.replace(selectedText, commentMarkup);
        contentEditableRef.current.innerHTML = newContent;
      }
      
      const newHtml = contentEditableRef.current.innerHTML;
      const markdownContent = htmlToMarkdown(newHtml, turndownService);
      setContent(markdownContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: markdownContent } }
      });
      console.log('[Comment] Write mode - content synced (Markdown)');
    } else {
      // Preview mode - find and replace in content
      console.log('[Comment] Preview/other mode - replacing in content');
      const commentMarkup = createCommentMarkup(commentId, selectedText);
      const newContent = content.replace(selectedText, commentMarkup);
      console.log('[Comment] Preview mode - replaced text, new length:', newContent.length);
      setContent(newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });
    }

    console.log('[Comment] handleSaveComment completed');
    setShowCommentModal(false);
    setSelectedText('');
  };

  const handleHideComment = (commentId: string) => {
    dispatch({ type: 'HIDE_COMMENT', payload: commentId });
  };

  const handleDeleteComment = (commentId: string) => {
    console.log('[Comment] handleDeleteComment called', commentId);
    if (!activeChapter) return;
    
    // Remove comment markup from content, keeping the text
    const newContent = removeCommentMarkup(content, commentId);
    console.log('[Comment] Removed comment markup, content changed:', content.length, '->', newContent.length);
    
    // Also update DOM if in write mode
    if (state.viewMode === 'write' && contentEditableRef.current) {
      unwrapCommentElement(contentEditableRef.current, commentId);
      console.log('[Comment] Removing element from DOM');
      // Update content from DOM (convert back to markdown)
      const domContent = contentEditableRef.current.innerHTML;
      const markdownContent = htmlToMarkdown(domContent, turndownService);
      setContent(markdownContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: markdownContent } }
      });
    } else {
      setContent(newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });
    }
    
    // Delete comment from store
    dispatch({
      type: 'DELETE_COMMENT',
      payload: { chapterId: activeChapter.id, commentId }
    });
    
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
    console.log('[Comment] Delete completed');
  };

  const getMarkdownHtml = (markdownOverride?: string) => {
    const markdownToProcess = markdownOverride !== undefined ? markdownOverride : content;
    return markdownToHtml(markdownToProcess, chapterComments, state.characters, state.viewMode);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (state.viewMode === 'source' && !textareaRef.current) return;
    if (state.viewMode === 'write' && !contentEditableRef.current) return;

    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const handleAutoTag = () => {
    if (!activeChapter) return;
    
    const newHtml = getAutoTaggedHtml(
      state.viewMode,
      content,
      state.characters,
      contentEditableRef,
      getMarkdownHtml
    );

    if (newHtml) {
      const newMarkdown = htmlToMarkdown(newHtml, turndownService);
      syncStoreContent(newMarkdown);
      if (state.viewMode === 'write' && contentEditableRef.current) {
        contentEditableRef.current.innerHTML = newHtml;
      }
    }
    
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleCopy = async () => {
    await performCopy(state.viewMode, textareaRef);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handlePaste = async () => {
    if (!activeChapter) return;
    try {
      const result = await getPasteData(state.viewMode, textareaRef, contentEditableRef);
      
      if (result?.type === 'source') {
        syncStoreContent(result.value);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(result.cursor, result.cursor);
          }
        }, 0);
      } else if (result?.type === 'write') {
        handleContentEditableInput();
      }
    } catch (err) {
      alert('Could not access clipboard. Please use Ctrl+V.');
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    console.log('[Click] Preview/write click', { target: target.tagName, className: target.className });
    
    // Check if clicked on a comment span (for write mode with HTML)
    const commentSpan = target.closest('[data-comment-id]');
    if (commentSpan) {
      const commentId = commentSpan.getAttribute('data-comment-id');
      console.log('[Click] Clicked on comment element', commentId);
      if (commentId) {
        handleCommentClick(commentId);
        return;
      }
    }
    
    // Clicked elsewhere, clear active comment
    setActiveCommentId(null);
  };

  const handleCommentClick = (commentId: string) => {
    setActiveCommentId(commentId);
    setIsCommentPaneOpen(true);
  };

  const handleWriteModeClick = (e: React.MouseEvent) => {
    // In write mode, also handle comment clicks
    handlePreviewClick(e);
  };

  const handlePreviewSuggestion = (commentId: string) => {
    console.log('[Suggestion] handlePreviewSuggestion called', { commentId, activeChapter: activeChapter?.id });
    if (!activeChapter) return;

    const comment = chapterComments.find(c => c.id === commentId);
    console.log('[Suggestion] Found comment:', comment);
    if (!comment || !comment.isSuggestion || !comment.replacementText) {
      console.warn('[Suggestion] Invalid comment or not a suggestion');
      return;
    }

    // Toggle the isPreviewing state
    const newIsPreviewing = !comment.isPreviewing;
    console.log('[Suggestion] Toggling isPreviewing:', comment.isPreviewing, '->', newIsPreviewing);

    // Update comment in store
    dispatch({
      type: 'UPDATE_COMMENT',
      payload: {
        chapterId: activeChapter.id,
        commentId: commentId,
        updates: { isPreviewing: newIsPreviewing }
      }
    });

    // Update the content of the <u> tag
    const textToShow = newIsPreviewing ? comment.replacementText : comment.originalText;
    console.log('[Suggestion] Preview toggle - showing:', textToShow);
    const newContent = replaceCommentText(content, commentId, textToShow);

    // Also update in DOM if in write mode
    if (state.viewMode === 'write' && contentEditableRef.current) {
      const element = contentEditableRef.current.querySelector(`u[data-comment-id="${commentId}"]`);
      if (element) {
        console.log('[Suggestion] Updating DOM element text to', textToShow);
        element.textContent = textToShow;
      }
    }

    setContent(newContent);
    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { id: activeChapter.id, updates: { content: newContent } }
    });
    console.log('[Suggestion] Preview toggle completed');
  };

  const handleApplySuggestion = (commentId: string) => {
    console.log('[Suggestion] handleApplySuggestion (permanent) called', { commentId });
    if (!activeChapter) return;

    const comment = chapterComments.find(c => c.id === commentId);
    if (!comment || !comment.isSuggestion || !comment.replacementText) {
      console.warn('[Suggestion] Invalid comment or not a suggestion');
      return;
    }

    console.log('[Suggestion] Permanently applying suggestion');

    // Replace the <u> tag and its content with just the replacement text
    const newContent = applySuggestionToContent(content, commentId, comment.replacementText);

    // Also update in DOM if in write mode
    if (state.viewMode === 'write' && contentEditableRef.current) {
      // Need to convert markdown to HTML for contentEditable
      const html = markdownToHtml(newContent, chapterComments, state.characters, state.viewMode);
      contentEditableRef.current.innerHTML = html;
    }

    setContent(newContent);
    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { id: activeChapter.id, updates: { content: newContent } }
    });

    // Delete the comment from store
    dispatch({
      type: 'DELETE_COMMENT',
      payload: { chapterId: activeChapter.id, commentId }
    });

    console.log('[Suggestion] Suggestion applied permanently and comment removed');
  };

  const filteredCharacters = filterCharactersByQuery(state.characters, mentionQuery || '');

  const selectCharacter = (character: Character) => {
    if (!activeChapter) return;

    if (state.viewMode === 'source' && textareaRef.current) {
      const result = insertMentionInTextarea(textareaRef.current, mentionStartIndex, createMentionMarkup(character));
      
      setContent(result.newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: result.newContent } }
      });
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(result.cursorPosition, result.cursorPosition);
        }
      }, 0);
    } else if (state.viewMode === 'write' && contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection && insertMentionInContentEditable(selection, character)) {
        handleContentEditableInput();
      }
    }
    
    setMentionQuery(null);
    setMentionSelectedIndex(0);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredCharacters.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev + 1) % filteredCharacters.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev - 1 + filteredCharacters.length) % filteredCharacters.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredCharacters[mentionSelectedIndex]) {
          e.preventDefault();
          selectCharacter(filteredCharacters[mentionSelectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
      }
    } else if (mentionQuery !== null && e.key === 'Escape') {
      setMentionQuery(null);
    }
  };

  if (!activeChapter) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateContent}>
          <p>Select a chapter or create a new one to start writing.</p>
          <button 
            className={styles.addChapterPrompt}
            onClick={() => dispatch({ type: 'ADD_CHAPTER' })}
          >
            <Plus size={20} />
            <span>Add New Chapter</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorMainColumn}>
        <div className={styles.editorContent}>
          {state.viewMode === 'source' ? (
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={content}
              onChange={handleChange}
              onKeyDown={handleEditorKeyDown}
              onContextMenu={handleContextMenu}
              placeholder="Start writing your masterpiece..."
              spellCheck={false}
            />
          ) : state.viewMode === 'write' ? (
            <div 
              ref={contentEditableRef}
              className={`${styles.preview} ${styles.editable}`}
              contentEditable={true}
              onInput={handleContentEditableInput}
              onKeyDown={handleEditorKeyDown}
              onClick={handleWriteModeClick}
              onContextMenu={handleContextMenu}
              suppressContentEditableWarning={true}
            />
          ) : (
            <div 
              className={styles.preview}
              onClick={handlePreviewClick}
              dangerouslySetInnerHTML={{ __html: getMarkdownHtml() }}
            />
          )}
        </div>

        <Statistics
          wordCount={wordCount}
          characterCount={characterCount}
          readingTime={readingTime}
        />
      </div>

      {mentionQuery !== null && mentionPosition && (
        <div 
          className={styles.mentionSuggestions}
          style={{ 
            position: 'fixed', 
            left: mentionPosition.x, 
            top: mentionPosition.y,
            zIndex: 1000
          }}
        >
          {filteredCharacters.length > 0 ? (
            filteredCharacters.map((char, index) => (
              <div
                key={char.id}
                className={`${styles.suggestionItem} ${index === mentionSelectedIndex ? styles.selected : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent focus loss
                  selectCharacter(char);
                }}
              >
                <div className={styles.suggestionContent}>
                  {char.picture ? (
                    <img src={char.picture} alt={char.name} className={styles.suggestionAvatar} />
                  ) : (
                    <div className={styles.suggestionPlaceholder}>{char.name.charAt(0)}</div>
                  )}
                  <span className={styles.suggestionName}>{char.name}</span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noSuggestions}>No characters found</div>
          )}
        </div>
      )}

      <CommentPane
        comments={chapterComments}
        onHideComment={handleHideComment}
        onDeleteComment={handleDeleteComment}
        onCommentClick={setActiveCommentId}
        onPreviewSuggestion={handlePreviewSuggestion}
        onApplySuggestion={handleApplySuggestion}
        activeCommentId={activeCommentId}
        isOpen={isCommentPaneOpen}
      />

      <CommentModal
        isOpen={showCommentModal}
        onClose={() => {
          console.log('[Comment] Modal closed/cancelled');
          // Remove pending comment wrapper if cancelled
          if (pendingCommentId && state.viewMode === 'write' && contentEditableRef.current) {
            unwrapCommentElement(contentEditableRef.current, pendingCommentId);
            console.log('[Comment] Removing pending element');
            // Sync back to content
            const newHtml = contentEditableRef.current.innerHTML;
            const markdownContent = htmlToMarkdown(newHtml, turndownService);
            setContent(markdownContent);
            dispatch({
              type: 'UPDATE_CHAPTER',
              payload: { id: activeChapter.id, updates: { content: markdownContent } }
            });
            setPendingCommentId(null);
          }
          setShowCommentModal(false);
        }}
        onSave={handleSaveComment}
        position={commentModalPosition}
        selectedText={selectedText}
      />

      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 2000,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            padding: '0.5rem 0',
            minWidth: '200px'
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              color: '#374151',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Copy
          </button>
          <button
            onClick={handlePaste}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              color: '#374151',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Paste
          </button>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '0.25rem 0' }} />
          <button
            onClick={handleAutoTag}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              color: '#374151',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Auto-tag Characters
          </button>
        </div>
      )}
    </div>
  );
};
