import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { v4 as uuidv4 } from 'uuid';
import { Character } from '../../types';
import { CommentModal } from '../molecules/CommentModal';
import { CommentPane } from './CommentPane';
import styles from './Editor.module.scss';

// Initialize Turndown once
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**'
});

// Configure turndown to keep <u> tags with attributes for comments
turndownService.addRule('keep-u', {
  filter: ['u'],
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const commentId = el.getAttribute('data-comment-id');
    const className = el.getAttribute('class');
    const attrs = [];
    if (commentId) attrs.push(`data-comment-id="${commentId}"`);
    if (className) attrs.push(`class="${className}"`);
    const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    return `<u${attrString}>${content}</u>`;
  }
});

// Configure turndown to keep character mentions
turndownService.addRule('character-mention', {
  filter: (node) => {
    return node.nodeName === 'SPAN' && (node as HTMLElement).getAttribute('data-character-id') !== null;
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const charId = el.getAttribute('data-character-id');
    const charName = el.getAttribute('data-character-name');
    return `<span data-character-id="${charId}" data-character-name="${charName}" class="character-mention">${content}</span>`;
  }
});

export const Editor: React.FC = () => {
  const { state, dispatch } = useStore();
  const [content, setContent] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentModalPosition, setCommentModalPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isCommentPaneOpen, setIsCommentPaneOpen] = useState(false);
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  
  // Character tagging state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ x: number; y: number } | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1); // for textarea
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const activeChapter = state.chapters.find(c => c.id === state.activeChapterId);

  // Get comments for the active chapter
  const chapterComments = activeChapter?.commentIds
    ?.map(id => state.comments[id])
    .filter(Boolean) || [];

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

  // Update CSS classes on comment elements based on active state and applied suggestions
  useEffect(() => {
    const commentElements = document.querySelectorAll('u[data-comment-id]');
    console.log('[CSS] Updating comment element classes, found:', commentElements.length, 'elements');
    commentElements.forEach(element => {
      const commentId = element.getAttribute('data-comment-id');
      if (!commentId) return;

      const comment = chapterComments.find(c => c.id === commentId);
      
      // Update active class
      if (commentId === activeCommentId) {
        element.classList.add('comment-active');
      } else {
        element.classList.remove('comment-active');
      }

      // Update suggestion-applied class
      if (comment?.isSuggestion && comment.isPreviewing) {
        element.classList.add('suggestion-applied');
      } else {
        element.classList.remove('suggestion-applied');
      }
    });
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
          if (selectedPortion.includes('<u data-comment-id=') || selectedPortion.includes('</u>')) {
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
            const range = selection.getRangeAt(0);
            const u = document.createElement('u');
            u.className = 'comment pending';
            u.setAttribute('data-comment-id', tempCommentId);
            try {
              range.surroundContents(u);
              console.log('[Comment] Wrapped selection immediately with temp ID:', tempCommentId);
              setPendingCommentId(tempCommentId);
            } catch (e) {
              // This shouldn't happen anymore since we check for overlaps above
              console.error('[Comment] Unexpected error wrapping selection', e);
              alert("Could not create comment. Please try selecting different text.");
              return;
            }
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
        }
        
        // Update state after formatting
        handleContentEditableInput();
      }
    };

    window.addEventListener('maria-editor-format', handleFormat as EventListener);
    return () => window.removeEventListener('maria-editor-format', handleFormat as EventListener);
  }, [state.viewMode, activeChapter, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (activeChapter) {
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });
    }

    // Handle @ mentions for source mode
    const cursor = e.target.selectionStart;
    const textBefore = newContent.substring(0, cursor);
    const lastAt = textBefore.lastIndexOf('@');
    
    if (lastAt !== -1 && !textBefore.substring(lastAt).includes(' ')) {
      const query = textBefore.substring(lastAt + 1);
      setMentionQuery(query);
      setMentionStartIndex(lastAt);
      
      // Approximate position for textarea (rough but works for demo)
      const rect = e.target.getBoundingClientRect();
      // This is a very rough approximation without a ghost div
      setMentionPosition({ x: rect.left + 20, y: rect.top + 50 });
    } else {
      setMentionQuery(null);
    }
  };

  const handleContentEditableInput = () => {
    if (contentEditableRef.current && activeChapter) {
      const html = contentEditableRef.current.innerHTML;
      // Convert HTML back to markdown
      const newContent = turndownService.turndown(html);
      setContent(newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });

      // Handle @ mentions for write mode
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textBeforeContent = range.startContainer.textContent || '';
        const offset = range.startOffset;
        const textBeforeCursor = textBeforeContent.substring(0, offset);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1 && !textBeforeCursor.substring(lastAt).includes(' ')) {
          const query = textBeforeCursor.substring(lastAt + 1);
          setMentionQuery(query);
          
          const rect = range.getBoundingClientRect();
          setMentionPosition({ x: rect.left, y: rect.bottom + window.scrollY });
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
      const commentMarkup = `<u data-comment-id="${commentId}" class="comment">${selectedText}</u>`;
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
        const pendingElement = contentEditableRef.current.querySelector(`u[data-comment-id="${pendingCommentId}"]`);
        if (pendingElement) {
          pendingElement.setAttribute('data-comment-id', commentId);
          pendingElement.classList.remove('pending');
          console.log('[Comment] Updated pending element to permanent');
        }
        setPendingCommentId(null);
      } else {
        // Fallback: do string replacement (shouldn't normally happen)
        console.log('[Comment] No pending element, doing string replacement');
        const currentHTML = contentEditableRef.current.innerHTML;
        const commentMarkup = `<u data-comment-id="${commentId}" class="comment">${selectedText}</u>`;
        const newContent = currentHTML.replace(selectedText, commentMarkup);
        contentEditableRef.current.innerHTML = newContent;
      }
      
      const newHtml = contentEditableRef.current.innerHTML;
      const markdownContent = turndownService.turndown(newHtml);
      setContent(markdownContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: markdownContent } }
      });
      console.log('[Comment] Write mode - content synced (Markdown)');
    } else {
      // Preview mode - find and replace in content
      console.log('[Comment] Preview/other mode - replacing in content');
      const commentMarkup = `<u data-comment-id="${commentId}" class="comment">${selectedText}</u>`;
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
    const regex = new RegExp(`<u[^>]*data-comment-id="${commentId}"[^>]*>(.*?)</u>`, 'g');
    const newContent = content.replace(regex, '$1');
    console.log('[Comment] Removed comment markup, content changed:', content.length, '->', newContent.length);
    
    // Also update DOM if in write mode
    if (state.viewMode === 'write' && contentEditableRef.current) {
      const element = contentEditableRef.current.querySelector(`u[data-comment-id="${commentId}"]`);
      if (element) {
        console.log('[Comment] Removing element from DOM');
        const text = element.textContent || '';
        const textNode = document.createTextNode(text);
        element.parentNode?.replaceChild(textNode, element);
        // Update content from DOM (convert back to markdown)
        const domContent = contentEditableRef.current.innerHTML;
        const markdownContent = turndownService.turndown(domContent);
        setContent(markdownContent);
        dispatch({
          type: 'UPDATE_CHAPTER',
          payload: { id: activeChapter.id, updates: { content: markdownContent } }
        });
      }
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

  const getMarkdownHtml = () => {
    if (!content) return '';
    
    let processedContent = content;

    // Handle hidden comments - remove the markup but keep the text
    chapterComments.forEach(comment => {
      if (comment.isHidden) {
        const regex = new RegExp(`<u[^>]*data-comment-id="${comment.id}"[^>]*>(.*?)</u>`, 'g');
        processedContent = processedContent.replace(regex, '$1');
      }
    });

    // Inject character-specific colors into spans
    state.characters.forEach(char => {
      if (char.color) {
        // Find spans with this character id and inject style
        const escapedId = char.id.replace(/"/g, '&quot;');
        const regex = new RegExp(`(<span[^>]*data-character-id=["'](${char.id}|${escapedId})["'][^>]*>)([\\s\\S]*?)(</span>)`, 'g');
        const colorWithAlpha = `${char.color}25`; // 15% opacity for highlight
        const ceAttr = state.viewMode === 'write' ? ' contenteditable="false"' : '';
        processedContent = processedContent.replace(regex, `$1<span style="background-color: ${colorWithAlpha}; color: ${char.color}; border-bottom: 2px solid ${char.color}; padding: 0 4px; border-radius: 4px; font-weight: 500;"${ceAttr}>$3</span>$4`);
      }
    });
    
    // Parse markdown and then sanitize. Marked handles HTML tags like <u> inside markdown.
    const rawHtml = marked.parse(processedContent) as string;
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['u', 'span'],
      ADD_ATTR: ['class', 'data-comment-id', 'data-character-id', 'data-character-name', 'style', 'contenteditable']
    });
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
    const regex = new RegExp(`(<u[^>]*data-comment-id="${commentId}"[^>]*>)(.*?)(</u>)`, 'g');
    const textToShow = newIsPreviewing ? comment.replacementText : comment.originalText;
    console.log('[Suggestion] Preview toggle - showing:', textToShow);
    const newContent = content.replace(regex, `$1${textToShow}$3`);

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
    const regex = new RegExp(`<u[^>]*data-comment-id="${commentId}"[^>]*>.*?</u>`, 'g');
    const newContent = content.replace(regex, comment.replacementText);

    // Also update in DOM if in write mode
    if (state.viewMode === 'write' && contentEditableRef.current) {
      // Need to convert markdown to HTML for contentEditable
      const rawHtml = marked.parse(newContent) as string;
      contentEditableRef.current.innerHTML = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['u', 'span'],
        ADD_ATTR: ['class', 'data-comment-id']
      });
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

  const filteredCharacters = state.characters.filter(char =>
    char.name.toLowerCase().includes((mentionQuery || '').toLowerCase())
  );

  const selectCharacter = (character: Character) => {
    if (!activeChapter) return;

    const mentionHtml = `<span data-character-id="${character.id}" data-character-name="${character.name}" class="character-mention">${character.name}</span>`;

    if (state.viewMode === 'source' && textareaRef.current) {
      const textarea = textareaRef.current;
      const start = mentionStartIndex;
      const end = textarea.selectionStart;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      const newText = before + mentionHtml + ' ' + after;
      setContent(newText);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newText } }
      });
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + mentionHtml.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else if (state.viewMode === 'write' && contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        const textContent = textNode.textContent || '';
        const lastAt = textContent.substring(0, range.startOffset).lastIndexOf('@');
        
        if (lastAt !== -1) {
          // Remove the '@query' part
          range.setStart(textNode, lastAt);
          range.deleteContents();
          
          // Create the mention span
          const span = document.createElement('span');
          span.className = 'character-mention';
          span.setAttribute('data-character-id', character.id);
          span.setAttribute('data-character-name', character.name);
          span.textContent = character.name;
          span.contentEditable = 'false'; // Make the tag itself non-editable to prevent typing inside
          
          // Create a space node specifically AFTER the span
          const spaceNode = document.createTextNode('\u00A0'); // Using NBSP initially to force cursor out
          
          range.insertNode(span);
          span.after(spaceNode);
          
          // Position cursor after the space
          const newRange = document.createRange();
          newRange.setStartAfter(spaceNode);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          // Also insert a trailing regular space after NBSP if needed or just replace NBSP later?
          // Let's stick with a regular space first but ensure contentEditable="false" on the span.
          span.contentEditable = 'false';
          spaceNode.textContent = ' ';
        }
        
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
    return <div className={styles.emptyState}>Select a chapter to start writing.</div>;
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorContent}>
        {state.viewMode === 'source' ? (
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={content}
            onChange={handleChange}
            onKeyDown={handleEditorKeyDown}
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
            const pendingElement = contentEditableRef.current.querySelector(`u[data-comment-id="${pendingCommentId}"]`);
            if (pendingElement) {
              console.log('[Comment] Removing pending element');
              // Unwrap the element, keeping the text
              const text = pendingElement.textContent || '';
              const textNode = document.createTextNode(text);
              pendingElement.parentNode?.replaceChild(textNode, pendingElement);
              // Sync back to content
              const newHtml = contentEditableRef.current.innerHTML;
              const markdownContent = turndownService.turndown(newHtml);
              setContent(markdownContent);
              dispatch({
                type: 'UPDATE_CHAPTER',
                payload: { id: activeChapter.id, updates: { content: markdownContent } }
              });
            }
            setPendingCommentId(null);
          }
          setShowCommentModal(false);
        }}
        onSave={handleSaveComment}
        position={commentModalPosition}
        selectedText={selectedText}
      />
    </div>
  );
};
