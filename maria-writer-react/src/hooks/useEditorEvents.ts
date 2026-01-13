import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Character } from '../types';
import {
  createEventMarkup,
  removeEventMarkup,
  finalizeEventMarkup
} from '../utils/editorEvents';
import { findCharactersInPlainText } from '../utils/editorMentions';
import { unwrapCommentElement } from '../utils/editorComments';
import { htmlToMarkdown } from '../utils/editorMarkdown';

interface UseEditorEventsProps {
  activeChapterId: string | undefined;
  activeChapterDate: string | undefined;
  viewMode: string;
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  contentEditableRef: React.MutableRefObject<HTMLDivElement | null>;
  characters: Character[];
  content: string;
  setContent: (value: string) => void;
  dispatch: any;
  turndownService: any;
  state: any;
}

interface UseEditorEventsReturn {
  pendingEventId: string | null;
  setPendingEventId: (id: string | null) => void;
  handleCreateEvent: (selectedText: string) => void;
  handleEventModalClose: () => void;
}

export const useEditorEvents = ({
  activeChapterId,
  activeChapterDate,
  viewMode,
  textareaRef,
  contentEditableRef,
  characters,
  content,
  setContent,
  dispatch,
  turndownService,
  state
}: UseEditorEventsProps): UseEditorEventsReturn => {
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

  // Watch for modal close to finalize or cancel pending event
  useEffect(() => {
    if (state.activeModal === 'none' && pendingEventId) {
      const isSaved = state.events.some((e: any) => e.id === pendingEventId);
      
      if (isSaved) {
        // Finalize: Remove pending attribute
        if (viewMode === 'write' && contentEditableRef.current) {
          const span = contentEditableRef.current.querySelector(`span[data-event-id="${pendingEventId}"]`);
          if (span) {
            span.removeAttribute('data-event-pending');
            // Parent will sync
          }
        } else {
          const newContent = finalizeEventMarkup(content, pendingEventId);
          setContent(newContent);
          if (activeChapterId) {
            dispatch({
              type: 'UPDATE_CHAPTER',
              payload: { id: activeChapterId, updates: { content: newContent } }
            });
          }
        }
      } else {
        // Cancelled: Remove marking
        if (viewMode === 'write' && contentEditableRef.current) {
          const span = contentEditableRef.current.querySelector(`span[data-event-id="${pendingEventId}"]`);
          if (span) {
            const parent = span.parentNode;
            if (parent) {
              while (span.firstChild) {
                parent.insertBefore(span.firstChild, span);
              }
              parent.removeChild(span);
            }
          }
        } else {
          const newContent = removeEventMarkup(content, pendingEventId);
          setContent(newContent);
          if (activeChapterId) {
            dispatch({
              type: 'UPDATE_CHAPTER',
              payload: { id: activeChapterId, updates: { content: newContent } }
            });
          }
        }
      }
      setPendingEventId(null);
    }
  }, [state.activeModal, pendingEventId, state.events, viewMode, content, activeChapterId, dispatch, setContent]);

  const handleCreateEvent = (selectedText: string) => {
    if (!selectedText.trim()) {
      alert('Please select some text to create an event');
      return;
    }

    const tempEventId = uuidv4();
    const foundCharacterIds = findCharactersInPlainText(selectedText, characters);

    dispatch({ 
      type: 'SET_PREFILLED_EVENT_DATA', 
      payload: { 
        id: tempEventId,
        description: selectedText, 
        date: activeChapterDate || '',
        characters: foundCharacterIds
      } 
    });

    setPendingEventId(tempEventId);

    if (viewMode === 'write' && contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          const span = document.createElement('span');
          span.setAttribute('data-event-id', tempEventId);
          span.setAttribute('data-event-pending', 'true');
          
          const content = range.extractContents();
          span.appendChild(content);
          range.insertNode(span);
        }
      }
    } else if (viewMode === 'source' && textareaRef.current) {
      const markup = createEventMarkup(tempEventId, selectedText, true);
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + markup + content.substring(end);
      setContent(newContent);
      if (activeChapterId) {
        dispatch({
          type: 'UPDATE_CHAPTER',
          payload: { id: activeChapterId, updates: { content: newContent } }
        });
      }
    }

    dispatch({ type: 'OPEN_MODAL', payload: { type: 'event' } });
  };

  const handleEventModalClose = () => {
    // This is called when modal is cancelled from parent
    if (pendingEventId && viewMode === 'write' && contentEditableRef.current) {
      unwrapCommentElement(contentEditableRef.current, pendingEventId);
      const newHtml = contentEditableRef.current.innerHTML;
      const markdownContent = htmlToMarkdown(newHtml, turndownService);
      setContent(markdownContent);
      if (activeChapterId) {
        dispatch({
          type: 'UPDATE_CHAPTER',
          payload: { id: activeChapterId, updates: { content: markdownContent } }
        });
      }
      setPendingEventId(null);
    }
  };

  return {
    pendingEventId,
    setPendingEventId,
    handleCreateEvent,
    handleEventModalClose
  };
};
