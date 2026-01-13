import { useEffect, useState } from 'react';
import { Character } from '../types';
import {
  createMentionMarkup,
  filterCharactersByQuery,
  detectMentionInTextarea,
  detectMentionInContentEditable,
  insertMentionInTextarea,
  insertMentionInContentEditable,
  getTextareaMentionPosition,
  getContentEditableMentionPosition
} from '../utils/editorMentions';

interface UseEditorMentionsProps {
  viewMode: string;
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  contentEditableRef: React.MutableRefObject<HTMLDivElement | null>;
  content: string;
  characters: Character[];
  setContent: (value: string) => void;
  dispatch: any;
  activeChapterId: string | undefined;
}

interface UseEditorMentionsReturn {
  mentionQuery: string | null;
  mentionPosition: { x: number; y: number } | null;
  mentionStartIndex: number;
  mentionSelectedIndex: number;
  setMentionQuery: (query: string | null) => void;
  setMentionSelectedIndex: (index: number) => void;
  filteredCharacters: Character[];
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleContentEditableInput: (currentContent: string) => string;
  selectCharacter: (character: Character) => void;
  handleEditorKeyDown: (e: React.KeyboardEvent) => void;
}

export const useEditorMentions = ({
  viewMode,
  textareaRef,
  contentEditableRef,
  content,
  characters,
  setContent,
  dispatch,
  activeChapterId
}: UseEditorMentionsProps): UseEditorMentionsReturn => {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ x: number; y: number } | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const filteredCharacters = filterCharactersByQuery(characters, mentionQuery || '');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (!activeChapterId) return;
    
    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { id: activeChapterId, updates: { content: newContent } }
    });

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

  const handleContentEditableInput = (htmlContent: string): string => {
    // This returns the new markdown content
    // The parent component needs to convert and set it
    
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

    return htmlContent;
  };

  const selectCharacter = (character: Character) => {
    if (!activeChapterId) return;

    if (viewMode === 'source' && textareaRef.current) {
      const result = insertMentionInTextarea(textareaRef.current, mentionStartIndex, createMentionMarkup(character));
      
      setContent(result.newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapterId, updates: { content: result.newContent } }
      });
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(result.cursorPosition, result.cursorPosition);
        }
      }, 0);
    } else if (viewMode === 'write' && contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection && insertMentionInContentEditable(selection, character)) {
        // Parent will handle input event
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

  return {
    mentionQuery,
    mentionPosition,
    mentionStartIndex,
    mentionSelectedIndex,
    setMentionQuery,
    setMentionSelectedIndex,
    filteredCharacters,
    handleChange,
    handleContentEditableInput,
    selectCharacter,
    handleEditorKeyDown
  };
};
