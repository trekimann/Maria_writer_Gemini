import { useEffect, useRef, useState } from 'react';
import {
  htmlToMarkdown,
  markdownToHtml,
  extractTitleFromMarkdown,
  createTurndownService
} from '../utils/editorMarkdown';
import { Chapter, StoryComment, Character } from '../types';

interface UseEditorContentProps {
  activeChapter: Chapter | undefined;
  viewMode: string;
  chapterComments: StoryComment[];
  dispatch: any;
}

interface UseEditorContentReturn {
  content: string;
  setContent: (value: string) => void;
  syncStoreContent: (newMarkdown: string) => void;
  getMarkdownHtml: (markdownOverride?: string, isCleanPreview?: boolean) => string;
  lastStoreContent: React.MutableRefObject<string>;
  turndownService: any;
}

const turndownService = createTurndownService();

export const useEditorContent = ({
  activeChapter,
  viewMode,
  chapterComments,
  dispatch
}: UseEditorContentProps): UseEditorContentReturn => {
  const [content, setContentState] = useState(activeChapter?.content || '');
  const lastStoreContent = useRef(activeChapter?.content || '');

  // Update local content when store changes EXTERNALLY (e.g. metadata modal)
  useEffect(() => {
    if (activeChapter && activeChapter.content !== lastStoreContent.current) {
      console.log('[Sync] External change detected, updating local state');
      setContentState(activeChapter.content);
      lastStoreContent.current = activeChapter.content;
    }
  }, [activeChapter?.content]);

  const setContent = (newContent: string) => {
    setContentState(newContent);
    lastStoreContent.current = newContent;
  };

  const syncStoreContent = (newMarkdown: string) => {
    if (!activeChapter) return;
    setContent(newMarkdown);
    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { id: activeChapter.id, updates: { content: newMarkdown } }
    });
  };

  const getMarkdownHtml = (markdownOverride?: string, isCleanPreview: boolean = false) => {
    const markdownToProcess = markdownOverride !== undefined ? markdownOverride : content;
    const commentsToUse = isCleanPreview ? [] : chapterComments;
    // Characters will be handled at higher level; pass empty for now
    const charactersToUse: Character[] = [];
    return markdownToHtml(markdownToProcess, commentsToUse, charactersToUse, viewMode);
  };

  return {
    content,
    setContent,
    syncStoreContent,
    getMarkdownHtml,
    lastStoreContent,
    turndownService
  };
};
