import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StoryComment } from '../types';
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
} from '../utils/editorComments';
import { htmlToMarkdown } from '../utils/editorMarkdown';

interface UseEditorCommentsProps {
  activeChapterId: string | undefined;
  viewMode: string;
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  contentEditableRef: React.MutableRefObject<HTMLDivElement | null>;
  chapterComments: StoryComment[];
  content: string;
  setContent: (value: string) => void;
  dispatch: any;
  turndownService: any;
}

interface UseEditorCommentsReturn {
  activeCommentId: string | null;
  showCommentModal: boolean;
  commentModalPosition: { x: number; y: number };
  selectedText: string;
  isCommentPaneOpen: boolean;
  pendingCommentId: string | null;
  setActiveCommentId: (id: string | null) => void;
  setShowCommentModal: (show: boolean) => void;
  setCommentModalPosition: (pos: { x: number; y: number }) => void;
  setIsCommentPaneOpen: (open: boolean) => void;
  setPendingCommentId: (id: string | null) => void;
  handleSaveComment: (commentData: any) => void;
  handleHideComment: (commentId: string) => void;
  handleDeleteComment: (commentId: string) => void;
  handlePreviewSuggestion: (commentId: string) => void;
  handleApplySuggestion: (commentId: string) => void;
  handleCommentClick: (commentId: string) => void;
  openCommentModal: (selText: string, x: number, y: number) => boolean;
}

export const useEditorComments = ({
  activeChapterId,
  viewMode,
  textareaRef,
  contentEditableRef,
  chapterComments,
  content,
  setContent,
  dispatch,
  turndownService
}: UseEditorCommentsProps): UseEditorCommentsReturn => {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentModalPosition, setCommentModalPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isCommentPaneOpen, setIsCommentPaneOpen] = useState(false);
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);

  // Update CSS classes on comment elements based on active state
  useEffect(() => {
    updateCommentElementClasses(chapterComments, activeCommentId);
  }, [activeCommentId, chapterComments, content]);

  const handleSaveComment = (commentData: {
    author: string;
    text: string;
    isSuggestion: boolean;
    replacementText?: string;
  }) => {
    console.log('[Comment] handleSaveComment called', { 
      commentData, 
      viewMode, 
      selectedText,
      activeChapterId
    });
    if (!activeChapterId) return;

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
      payload: { chapterId: activeChapterId, comment }
    });
    console.log('[Comment] Dispatched ADD_COMMENT');

    // Insert comment markup into content based on mode
    if (viewMode === 'source' && textareaRef.current) {
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
        payload: { id: activeChapterId, updates: { content: newText } }
      });
      console.log('[Comment] Source mode - content updated');
    } else if (viewMode === 'write' && contentEditableRef.current) {
      console.log('[Comment] Write mode - updating existing wrapper or creating new');
      
      if (pendingCommentId) {
        console.log('[Comment] Found pending wrapper, updating ID from', pendingCommentId, 'to', commentId);
        updateCommentElementId(contentEditableRef.current, pendingCommentId, commentId);
        setPendingCommentId(null);
        console.log('[Comment] Updated pending element to permanent');
      } else {
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
        payload: { id: activeChapterId, updates: { content: markdownContent } }
      });
      console.log('[Comment] Write mode - content synced (Markdown)');
    } else {
      console.log('[Comment] Preview/other mode - replacing in content');
      const commentMarkup = createCommentMarkup(commentId, selectedText);
      const newContent = content.replace(selectedText, commentMarkup);
      console.log('[Comment] Preview mode - replaced text, new length:', newContent.length);
      setContent(newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapterId, updates: { content: newContent } }
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
    if (!activeChapterId) return;
    
    const newContent = removeCommentMarkup(content, commentId);
    console.log('[Comment] Removed comment markup, content changed:', content.length, '->', newContent.length);
    
    if (viewMode === 'write' && contentEditableRef.current) {
      unwrapCommentElement(contentEditableRef.current, commentId);
      console.log('[Comment] Removing element from DOM');
      const domContent = contentEditableRef.current.innerHTML;
      const markdownContent = htmlToMarkdown(domContent, turndownService);
      setContent(markdownContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapterId, updates: { content: markdownContent } }
      });
    } else {
      setContent(newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapterId, updates: { content: newContent } }
      });
    }
    
    dispatch({
      type: 'DELETE_COMMENT',
      payload: { chapterId: activeChapterId, commentId }
    });
    
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
    console.log('[Comment] Delete completed');
  };

  const handlePreviewSuggestion = (commentId: string) => {
    console.log('[Suggestion] handlePreviewSuggestion called', { commentId, activeChapterId });
    if (!activeChapterId) return;

    const comment = chapterComments.find(c => c.id === commentId);
    console.log('[Suggestion] Found comment:', comment);
    if (!comment || !comment.isSuggestion || !comment.replacementText) {
      console.warn('[Suggestion] Invalid comment or not a suggestion');
      return;
    }

    const newIsPreviewing = !comment.isPreviewing;
    console.log('[Suggestion] Toggling isPreviewing:', comment.isPreviewing, '->', newIsPreviewing);

    dispatch({
      type: 'UPDATE_COMMENT',
      payload: {
        chapterId: activeChapterId,
        commentId: commentId,
        updates: { isPreviewing: newIsPreviewing }
      }
    });

    const textToShow = newIsPreviewing ? comment.replacementText : comment.originalText;
    console.log('[Suggestion] Preview toggle - showing:', textToShow);
    const newContent = replaceCommentText(content, commentId, textToShow);

    if (viewMode === 'write' && contentEditableRef.current) {
      const element = contentEditableRef.current.querySelector(`u[data-comment-id="${commentId}"]`);
      if (element) {
        console.log('[Suggestion] Updating DOM element text to', textToShow);
        element.textContent = textToShow;
      }
    }

    setContent(newContent);
    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { id: activeChapterId, updates: { content: newContent } }
    });
    console.log('[Suggestion] Preview toggle completed');
  };

  const handleApplySuggestion = (commentId: string) => {
    console.log('[Suggestion] handleApplySuggestion (permanent) called', { commentId });
    if (!activeChapterId) return;

    const comment = chapterComments.find(c => c.id === commentId);
    if (!comment || !comment.isSuggestion || !comment.replacementText) {
      console.warn('[Suggestion] Invalid comment or not a suggestion');
      return;
    }

    console.log('[Suggestion] Permanently applying suggestion');

    const newContent = applySuggestionToContent(content, commentId, comment.replacementText);

    setContent(newContent);
    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { id: activeChapterId, updates: { content: newContent } }
    });

    dispatch({
      type: 'DELETE_COMMENT',
      payload: { chapterId: activeChapterId, commentId }
    });

    console.log('[Suggestion] Suggestion applied permanently and comment removed');
  };

  const handleCommentClick = (commentId: string) => {
    setActiveCommentId(commentId);
    setIsCommentPaneOpen(true);
  };

  const openCommentModal = (selText: string, x: number, y: number): boolean => {
    const tempCommentId = uuidv4();
    
    if (viewMode === 'source' && textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      
      const textContent = textareaRef.current.value;
      const selectedPortion = textContent.substring(start, end);
      if (hasOverlappingComments(selectedPortion)) {
        alert("Cannot add a comment to text that is already commented. Please select text without existing comments.");
        return false;
      }
    } else if (viewMode === 'write' && contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        if (tempDiv.querySelector('u[data-comment-id]')) {
          alert("Cannot add a comment to text that is already commented. Please select text without existing comments.");
          return false;
        }
      }
      
      if (selection && selection.rangeCount > 0) {
        const wrapped = wrapSelectionWithComment(selection, tempCommentId, true);
        if (!wrapped) {
          alert("Cannot add a comment to text that is already commented. Please select text without existing comments.");
          return false;
        }
        console.log('[Comment] Wrapped selection immediately with temp ID:', tempCommentId);
        setPendingCommentId(tempCommentId);
      }
    }

    setSelectedText(selText);
    setCommentModalPosition({ x, y });
    setShowCommentModal(true);
    return true;
  };

  return {
    activeCommentId,
    showCommentModal,
    commentModalPosition,
    selectedText,
    isCommentPaneOpen,
    pendingCommentId,
    setActiveCommentId,
    setShowCommentModal,
    setCommentModalPosition,
    setIsCommentPaneOpen,
    setPendingCommentId,
    handleSaveComment,
    handleHideComment,
    handleDeleteComment,
    handlePreviewSuggestion,
    handleApplySuggestion,
    handleCommentClick,
    openCommentModal
  };
};
